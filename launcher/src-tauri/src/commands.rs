use std::{
    fs::remove_dir_all,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use serde_json::json;
use tauri::{ipc::Channel, Emitter, Manager, State};
use tauri_plugin_store::StoreExt;

use crate::{
    client::{bring_window_to_top, list_processes, WindowMatch},
    simba::{read_plugins_version, run_simba, run_simba_script},
    LauncherVariables,
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
pub fn get_dev_mode(launcher_vars: State<'_, Mutex<LauncherVariables>>) -> bool {
    let launcher_vars = launcher_vars.lock().unwrap();
    launcher_vars.devmode
}

#[tauri::command]
pub fn set_dev_mode(
    app: tauri::AppHandle,
    launcher: State<'_, Mutex<LauncherVariables>>,
    state: bool,
) {
    let mut launcher = launcher.lock().unwrap();
    launcher.devmode = state;

    let store = app
        .store("settings.json")
        .expect("Failed to retrieve settings.json store!");
    store.set("devmode", state);
}

#[tauri::command]
pub fn get_dev_updates(launcher: State<'_, Mutex<LauncherVariables>>) -> bool {
    let launcher_vars = launcher.lock().unwrap();
    launcher_vars.dev_updates
}

#[tauri::command]
pub fn set_dev_updates(
    app: tauri::AppHandle,
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
    state: bool,
) {
    let mut launcher_vars = launcher_vars.lock().unwrap();
    launcher_vars.dev_updates = state;

    let store = app
        .store("settings.json")
        .expect("Failed to retrieve settings.json store!");
    store.set("dev_updates", state);
}

#[tauri::command]
pub fn get_executable_path(launcher: State<'_, Mutex<LauncherVariables>>, exe: String) -> String {
    let paths = launcher.lock().unwrap();
    match exe.as_str() {
        "simba" => paths.simba.to_str().unwrap().to_string(),
        "devsimba" => paths.devsimba.to_str().unwrap().to_string(),
        _ => paths.simba.to_str().unwrap().to_string(),
    }
}

#[tauri::command]
pub fn set_executable_path(
    app: tauri::AppHandle,
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
    exe: String,
    path: String,
) {
    let mut paths = launcher_vars.lock().unwrap();
    match exe.as_str() {
        "simba" => paths.simba = PathBuf::from(path.clone()),
        "devsimba" => paths.devsimba = PathBuf::from(path.clone()),
        _ => {}
    }

    let store = app
        .store("settings.json")
        .expect("Failed to retrieve settings.json store!");
    // osrs-bot: merge into the existing paths object instead of replacing it,
    // so setting "devsimba" no longer erases a saved "simba" path (and vice
    // versa).
    let mut paths_value = store.get("paths").unwrap_or_else(|| json!({}));
    if !paths_value.is_object() {
        paths_value = json!({});
    }
    if let Some(map) = paths_value.as_object_mut() {
        map.insert(exe, json!(path));
    }
    store.set("paths", paths_value);
}

#[tauri::command]
pub fn delete_cache(
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
    exe: String,
) -> Result<(), String> {
    delete_simba_dir(&launcher_vars, &exe, &["Data", "Cache"], "cache")
}

#[tauri::command]
pub fn delete_assets(
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
    exe: String,
) -> Result<(), String> {
    delete_simba_dir(&launcher_vars, &exe, &["Data", "Assets"], "assets")
}

#[tauri::command]
pub fn delete_configs(
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
    exe: String,
) -> Result<(), String> {
    delete_simba_dir(&launcher_vars, &exe, &["Configs"], "configs")
}

// osrs-bot: remove a Simba subfolder, returning a friendly error instead of
// panicking when it's locked (e.g. Simba still running).
fn delete_simba_dir(
    launcher_vars: &State<'_, Mutex<LauncherVariables>>,
    exe: &str,
    parts: &[&str],
    label: &str,
) -> Result<(), String> {
    let mut path = {
        let paths = launcher_vars.lock().unwrap();
        if exe == "devsimba" {
            paths.devsimba.clone()
        } else {
            paths.simba.clone()
        }
    };
    for p in parts {
        path = path.join(p);
    }
    if path.exists() {
        remove_dir_all(&path)
            .map_err(|e| format!("Failed to delete {label} (is Simba running?): {e}"))?;
        println!("Deleted folder: {:?}", path);
    }
    Ok(())
}

#[tauri::command]
pub async fn run_executable(
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
    exe: String,
    args: Vec<String>,
) -> Result<String, String> {
    let path = {
        let paths = launcher_vars.lock().unwrap();
        match exe.as_str() {
            "simba" => paths.simba.clone(),
            "devsimba" => paths.devsimba.clone(),
            _ => paths.simba.clone(),
        }
    };

    if exe == "simba" || exe == "devsimba" {
        run_simba(path, args).await;
        Ok("Process started successfully".to_string())
    } else {
        Err("Unrecognized executable. Only \"simba\" or \"devsimba\" is allowed.".to_string())
    }
}

#[tauri::command]
pub async fn run_script(
    app: tauri::AppHandle,
    launcher: State<'_, Mutex<LauncherVariables>>,
    args: Vec<String>,
    channel: Channel<String>,
) -> Result<String, String> {
    let (simba_path, hwnd) = {
        let guard = launcher.lock().unwrap();
        match &guard.client {
            Some(client) => (guard.simba.clone(), client.hwnd),
            None => return Err("Client is null".to_string()),
        }
    };

    // osrs-bot: the WaspLib/SRL-T junctions are shared, so a running script of
    // one generation would break if another generation repointed them. Refuse
    // to start a script whose generation differs from what's already running.
    let generation = crate::simba::script_generation(&simba_path, &args[0]).to_string();
    {
        let guard = launcher.lock().unwrap();
        let gens = guard.generations.lock().unwrap();
        if let Some(other) = gens.values().find(|g| *g != &generation) {
            return Err(format!(
                "A '{other}' script is already running. This script needs the '{generation}' \
                 libraries, which can't run at the same time — stop the running script first."
            ));
        }
    }

    let id = channel.id();
    let process = run_simba_script(simba_path, hwnd, args, channel).await?;

    let shared_process = Arc::new(Mutex::new(Some(process)));

    let guard = launcher.lock().unwrap();
    guard
        .scripts
        .lock()
        .unwrap()
        .insert(id, shared_process.clone());
    guard.generations.lock().unwrap().insert(id, generation);

    let app_clone = app.clone();

    std::thread::spawn(move || loop {
        let status = {
            let mut inner_guard = shared_process.lock().unwrap();
            if let Some(child) = inner_guard.as_mut() {
                child.try_wait()
            } else {
                return;
            }
        };

        match status {
            Ok(Some(exit_status)) => {
                println!("Process {} exited with status: {}", id, exit_status);

                if let Some(launcher_state) = app_clone.try_state::<Mutex<LauncherVariables>>() {
                    let guard = launcher_state.lock().unwrap();
                    guard.scripts.lock().unwrap().remove(&id);
                    guard.generations.lock().unwrap().remove(&id);
                }

                let _ = app_clone.emit("process-finished", id);
                break;
            }
            Ok(None) => {
                std::thread::sleep(std::time::Duration::from_millis(500));
            }
            Err(e) => {
                println!("Error checking process status: {}", e);
                break;
            }
        }
    });

    Ok("Process started successfully".to_string())
}

#[tauri::command]
pub async fn kill_script(
    app: tauri::AppHandle,
    launcher: tauri::State<'_, Mutex<LauncherVariables>>,
    id: u32,
) -> Result<String, String> {
    let handle = {
        let launcher_guard = launcher.lock().unwrap();
        let scripts_guard = launcher_guard.scripts.lock().unwrap();
        scripts_guard.get(&id).cloned()
    };

    if let Some(shared_process) = handle {
        let mut process_guard = shared_process.lock().unwrap();

        if let Some(mut child) = process_guard.take() {
            let result = child.kill().map_err(|e| e.to_string());

            let launcher_guard = launcher.lock().unwrap();
            launcher_guard.scripts.lock().unwrap().remove(&id);
            launcher_guard.generations.lock().unwrap().remove(&id);
            let _ = app.emit("process-finished", id);

            match result {
                Ok(_) => Ok(format!("Process {} killed", id)),
                Err(e) => Err(format!("Failed to kill: {}", e)),
            }
        } else {
            Err(format!("Process {} is already stopping or finished", id))
        }
    } else {
        Err(format!("No active script found for ID {}", id))
    }
}

#[tauri::command]
pub fn get_plugin_version(
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
) -> Result<String, String> {
    let path = {
        let paths = launcher_vars.lock().unwrap();
        paths.simba.clone()
    };
    let version_path = path.join("Plugins/wasp-plugins/version.simba");

    read_plugins_version(&version_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_clients() -> Result<Vec<WindowMatch>, String> {
    list_processes()
}

#[tauri::command]
pub async fn set_client(
    launcher: State<'_, Mutex<LauncherVariables>>,
    client: Option<WindowMatch>,
) -> tauri::Result<()> {
    let mut launcher = launcher.lock().unwrap();
    launcher.client = client;
    Ok(())
}

#[tauri::command]
pub async fn show_client(launcher: State<'_, Mutex<LauncherVariables>>) -> Result<(), String> {
    let launcher = launcher.lock().unwrap();
    match &launcher.client {
        Some(client) => {
            let hwnd = client.hwnd;
            if bring_window_to_top(hwnd) {
                Ok(())
            } else {
                Err("Failed to bring window to front. The handle might be invalid.".to_string())
            }
        }
        None => Err("Client is null".to_string()),
    }
}

// ---------------------------------------------------------------------------
// osrs-bot: list scripts from the local Simba/Scripts folder (offline mode),
// returned in the exact shape the Svelte UI expects (see src/lib/types).
// ---------------------------------------------------------------------------
#[derive(serde::Serialize)]
pub struct LocalScriptProtected {
    username: String,
    avatar: String,
    revision: u32,
    updated_at: u64,
}

#[derive(serde::Serialize)]
pub struct LocalScriptMetadata {
    status: String,
    #[serde(rename = "type")]
    kind: String,
    stage: String,
}

#[derive(serde::Serialize)]
pub struct LocalScript {
    id: String,
    url: String,
    title: String,
    description: String,
    content: String,
    published: bool,
    protected: LocalScriptProtected,
    metadata: LocalScriptMetadata,
    access: bool,
}

fn extract_quoted(content: &str, key: &str) -> Option<String> {
    for line in content.lines() {
        if line.contains(key) {
            if let Some(start) = line.find('\'') {
                if let Some(end) = line[start + 1..].find('\'') {
                    return Some(line[start + 1..start + 1 + end].to_string());
                }
            }
        }
    }
    None
}

fn first_comment(content: &str) -> String {
    if let Some(start) = content.find("(*") {
        if let Some(end) = content[start + 2..].find("*)") {
            return content[start + 2..start + 2 + end]
                .trim()
                .chars()
                .take(4000)
                .collect();
        }
    }
    String::new()
}

// osrs-bot / Elixer: read/write the AI-chat config (Configs/elixer.ini). This
// is the same file the WaspLib antiban handler reads at runtime; it holds the
// API key so it is gitignored. Simple single-section [AIChat] INI.
fn elixer_ini_path(launcher: &State<'_, Mutex<LauncherVariables>>) -> PathBuf {
    let simba = launcher.lock().unwrap().simba.clone();
    simba.join("Configs").join("elixer.ini")
}

#[tauri::command]
pub fn get_elixer_config(
    launcher: State<'_, Mutex<LauncherVariables>>,
) -> Result<serde_json::Value, String> {
    let text = std::fs::read_to_string(elixer_ini_path(&launcher)).unwrap_or_default();
    let mut enabled = false;
    let mut level_ups = false;
    let mut api_key = String::new();
    let mut interval = 60i64;
    let mut prompt = String::new();
    for line in text.lines() {
        let line = line.trim();
        if let Some((k, v)) = line.split_once('=') {
            let v = v.trim().to_string();
            match k.trim().to_ascii_lowercase().as_str() {
                "enabled" => enabled = v.eq_ignore_ascii_case("true"),
                "levelups" => level_ups = v.eq_ignore_ascii_case("true"),
                "apikey" => api_key = v,
                "intervalminutes" => interval = v.parse().unwrap_or(60),
                "prompt" => prompt = v,
                _ => {}
            }
        }
    }
    Ok(json!({
        "enabled": enabled,
        "levelUps": level_ups,
        "apiKey": api_key,
        "interval": interval,
        "prompt": prompt
    }))
}

#[tauri::command]
pub fn set_elixer_config(
    launcher: State<'_, Mutex<LauncherVariables>>,
    enabled: bool,
    level_ups: bool,
    api_key: String,
    interval: i64,
    prompt: String,
) -> Result<(), String> {
    // Keep it single-line safe for Simba's ReadINI (values are read to EOL).
    let sanitize = |s: &str| s.replace(['\r', '\n'], " ");
    let contents = format!(
        "[AIChat]\nEnabled={}\nLevelUps={}\nApiKey={}\nIntervalMinutes={}\nPrompt={}\n",
        enabled,
        level_ups,
        sanitize(&api_key),
        interval.max(0),
        sanitize(&prompt)
    );
    let path = elixer_ini_path(&launcher);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

// osrs-bot: read/write flags in Configs/wasplib.json — WaspLib's shared,
// global config. Scripts flip these via their in-Simba GUI and the change
// sticks across every script, so exposing the important ones (remote input)
// in the launcher avoids one script silently breaking another.
fn wasplib_config_path(launcher: &State<'_, Mutex<LauncherVariables>>) -> PathBuf {
    let simba = launcher.lock().unwrap().simba.clone();
    simba.join("Configs").join("wasplib.json")
}

#[tauri::command]
pub fn get_wasplib_config(
    launcher: State<'_, Mutex<LauncherVariables>>,
) -> Result<serde_json::Value, String> {
    let path = wasplib_config_path(&launcher);
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).map_err(|e| e.to_string()),
        Err(_) => Ok(json!({})),
    }
}

// Set one wasplib.json field. `value` is any JSON value (bool/number/string)
// so the frontend can match WaspLib's existing types (some numbers are stored
// as strings, e.g. max_actions "0.00"). `section` "" writes a top-level key;
// otherwise it writes section.key, or section.sub.key when `sub` is set.
#[tauri::command]
pub fn set_wasplib_value(
    launcher: State<'_, Mutex<LauncherVariables>>,
    section: String,
    sub: Option<String>,
    key: String,
    value: serde_json::Value,
) -> Result<(), String> {
    let path = wasplib_config_path(&launcher);
    let mut cfg: serde_json::Value = std::fs::read_to_string(&path)
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_else(|| json!({}));
    if !cfg.is_object() {
        cfg = json!({});
    }
    let target = if section.is_empty() {
        &mut cfg
    } else {
        if !cfg[&section].is_object() {
            cfg[&section] = json!({});
        }
        match sub {
            Some(s) => {
                if !cfg[&section][&s].is_object() {
                    cfg[&section][&s] = json!({});
                }
                &mut cfg[&section][&s]
            }
            None => &mut cfg[&section],
        }
    };
    target[&key] = value;
    let text = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

fn titleize(part: &str) -> String {
    part.split(|c| c == '-' || c == '_')
        .filter(|s| !s.is_empty())
        .map(|w| {
            let mut ch = w.chars();
            match ch.next() {
                Some(f) => f.to_uppercase().collect::<String>() + ch.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn collect_scripts(dir: &std::path::Path, base: &std::path::Path, out: &mut Vec<LocalScript>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            // osrs-bot: skip local-only folders like _audit (backup copies of
            // the same scripts) so the catalog doesn't show duplicates.
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name.starts_with('_') || name.starts_with('.') {
                continue;
            }
            collect_scripts(&path, base, out);
        } else if path.extension().and_then(|e| e.to_str()) == Some("simba") {
            let stem = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("script")
                .to_string();
            let content = std::fs::read_to_string(&path).unwrap_or_default();
            let id = extract_quoted(&content, "SCRIPT_ID")
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| stem.clone());
            let revision = extract_quoted(&content, "SCRIPT_REVISION")
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(1);
            let (name_part, author) = match stem.rfind("-by-") {
                Some(i) => (stem[..i].to_string(), stem[i + 4..].replace(['-', '_'], " ")),
                None => (stem.clone(), String::from("local")),
            };
            let rel = path
                .strip_prefix(base)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");
            let author_display = if author.trim().is_empty() {
                "local".to_string()
            } else {
                author.clone()
            };
            let title_str = titleize(&name_part);
            // osrs-bot: most scripts carry their own documentation in the first
            // (*...*) comment block — show that instead of a generic notice.
            let header_doc = first_comment(&content);
            let doc_body = if header_doc.is_empty() {
                "_This script has no documentation block._".to_string()
            } else {
                // Render the raw header preformatted so ASCII layouts survive.
                format!("```text\n{}\n```", header_doc.replace("```", "'''"))
            };
            let doc = format!(
                "**Author:** {author}  \n**Revision:** {rev}  \n**File:** `{file}`\n\n---\n\n{body}\n\nSelect your game client in the bar below, then press **Run** to launch it in Simba.",
                author = author_display,
                rev = revision,
                file = rel,
                body = doc_body
            );
            out.push(LocalScript {
                id,
                url: rel,
                title: title_str,
                description: format!("Local script by {} — revision {}.", author_display, revision),
                content: doc,
                published: true,
                protected: LocalScriptProtected {
                    username: author_display.clone(),
                    avatar: String::new(),
                    revision,
                    updated_at: 0,
                },
                metadata: LocalScriptMetadata {
                    status: "official".into(),
                    kind: "free".into(),
                    stage: "stable".into(),
                },
                access: true,
            });
        }
    }
}

#[tauri::command]
pub fn list_local_scripts(
    launcher: State<'_, Mutex<LauncherVariables>>,
) -> Result<Vec<LocalScript>, String> {
    let simba = {
        let guard = launcher.lock().unwrap();
        guard.simba.clone()
    };
    let scripts_dir = simba.join("Scripts");
    let mut out = Vec::new();
    // Scripts live flat in Scripts/; collect_scripts skips _/.-prefixed dirs
    // (e.g. the local _audit backup).
    collect_scripts(&scripts_dir, &scripts_dir, &mut out);
    out.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    Ok(out)
}

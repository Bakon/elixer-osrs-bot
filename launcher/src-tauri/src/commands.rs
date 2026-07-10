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
) -> tauri::Result<()> {
    let path = {
        let paths = launcher_vars.lock().unwrap();
        if exe == "devsimba" {
            paths.devsimba.clone()
        } else {
            paths.simba.clone()
        }
    };
    let cache_path = path.join("Data").join("Cache");

    if cache_path.exists() {
        remove_dir_all(&cache_path).expect("Failed to delete cache path.");
        println!("Deleted folder: {:?}", cache_path);
    }

    Ok(())
}

#[tauri::command]
pub fn delete_assets(
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
    exe: String,
) -> tauri::Result<()> {
    let path = {
        let paths = launcher_vars.lock().unwrap();
        if exe == "devsimba" {
            paths.devsimba.clone()
        } else {
            paths.simba.clone()
        }
    };

    let assets_path = path.join("Data").join("Assets");

    if assets_path.exists() {
        remove_dir_all(&assets_path).expect("Failed to delete assets path.");
        println!("Deleted folder: {:?}", assets_path);
    }

    Ok(())
}

#[tauri::command]
pub fn delete_configs(
    launcher_vars: State<'_, Mutex<LauncherVariables>>,
    exe: String,
) -> tauri::Result<()> {
    let path = {
        let paths = launcher_vars.lock().unwrap();
        if exe == "devsimba" {
            paths.devsimba.clone()
        } else {
            paths.simba.clone()
        }
    };

    let configs = path.join("Configs");

    if configs.exists() {
        remove_dir_all(&configs).expect("Failed to delete configs path.");
        println!("Deleted folder: {:?}", configs);
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

    let id = channel.id();
    let process = run_simba_script(simba_path, hwnd, args, channel).await?;

    let shared_process = Arc::new(Mutex::new(Some(process)));

    let guard = launcher.lock().unwrap();
    guard
        .scripts
        .lock()
        .unwrap()
        .insert(id, shared_process.clone());

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
    // osrs-bot: only scan subfolders (waspscripts.com/, community/, ...).
    // Top-level .simba files are the launcher's own scripts, not bots.
    if let Ok(entries) = std::fs::read_dir(&scripts_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = entry.file_name();
                let name = name.to_string_lossy();
                if name.starts_with('_') || name.starts_with('.') {
                    continue;
                }
                collect_scripts(&path, &scripts_dir, &mut out);
            }
        }
    }
    out.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    Ok(out)
}

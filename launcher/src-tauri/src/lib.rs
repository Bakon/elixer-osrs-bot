mod client;
mod commands;
mod simba;

use std::{
    collections::HashMap,
    env,
    path::PathBuf,
    process::Child,
    sync::{Arc, Mutex},
};

use serde_json::json;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

use tauri_plugin_cli::CliExt;

use crate::client::WindowMatch;

#[derive(Default)]
struct LauncherVariables {
    devmode: bool,
    simba: PathBuf,
    devsimba: PathBuf,
    client: Option<WindowMatch>,
    dev_updates: bool,
    scripts: Mutex<HashMap<u32, Arc<Mutex<Option<Child>>>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            // osrs-bot: auto-open devtools in dev builds so errors are visible.
            #[cfg(debug_assertions)]
            window.open_devtools();
            match app.cli().matches() {
                Ok(matches) => {
                    if let Some(arg) = matches.args.get("debug") {
                        if arg.occurrences > 0 {
                            println!("Debug flag present!");
                            window.open_devtools();
                        }
                    }
                }
                Err(_) => {}
            }

            let settings = app.store("settings.json")?;

            let paths: serde_json::Value = settings.get("paths").unwrap_or_else(|| {
                let empty = json!({});
                settings.set("paths", empty.clone());
                empty
            });

            let get_path = |key: &str, fallback: PathBuf| {
                paths
                    .get(key)
                    .and_then(|v| v.as_str())
                    .map(PathBuf::from)
                    .unwrap_or(fallback)
            };

            // osrs-bot: locate the Simba runtime portably — no hardcoded user
            // path. Priority: explicit override in settings.json (paths.simba),
            // else the nearest ancestor of the exe that contains
            // runtime\Simba64.exe (target/release lives inside the repo, so
            // walking up finds the repo root), else .\runtime next to the CWD.
            let detected = env::current_exe().ok().and_then(|exe| {
                exe.ancestors()
                    .find(|a| a.join("runtime").join("Simba64.exe").is_file())
                    .map(|a| a.join("runtime"))
            });
            let fallback = detected.unwrap_or_else(|| {
                println!("osrs-bot: no runtime folder found near the exe; falling back to .\\runtime");
                env::current_dir()
                    .map(|d| d.join("runtime"))
                    .unwrap_or_else(|_| PathBuf::from("runtime"))
            });
            let simba_path = get_path("simba", fallback);
            println!("osrs-bot: using Simba runtime at {:?}", simba_path);
            let _ = simba::ensure_simba_directories(&simba_path);

            let devmode: bool = match settings.get("devmode") {
                Some(value) => value.as_bool().unwrap_or(false),
                None => {
                    settings.set("devmode", false);
                    false
                }
            };

            let dev_updates: bool = match settings.get("dev_updates") {
                Some(value) => value.as_bool().unwrap_or(true),
                None => {
                    settings.set("dev_updates", true);
                    true
                }
            };

            app.manage(Mutex::new(LauncherVariables {
                simba: simba_path.clone(),
                devmode: devmode,
                devsimba: get_path("devsimba", simba_path),
                client: None,
                dev_updates: dev_updates,
                scripts: Mutex::new(HashMap::new()),
            }));

            let _ = window.set_background_color(Some([25, 25, 25].into()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_dev_mode,
            commands::set_dev_mode,
            commands::get_dev_updates,
            commands::set_dev_updates,
            commands::get_executable_path,
            commands::set_executable_path,
            commands::run_executable,
            commands::run_script,
            commands::kill_script,
            commands::delete_cache,
            commands::delete_assets,
            commands::delete_configs,
            commands::get_plugin_version,
            commands::list_clients,
            commands::set_client,
            commands::show_client,
            commands::list_local_scripts
        ])
        .run(tauri::generate_context!())
        .expect("Error while running wasp-launcher");
}

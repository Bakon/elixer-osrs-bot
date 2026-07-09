mod client;
mod commands;
mod server;
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
use tauri_plugin_updater::UpdaterExt;

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

async fn update_launcher(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    println!("Downloaded {downloaded} from {content_length:?}");
                },
                || {
                    println!("Download finished");
                },
            )
            .await?;

        println!("Update installed!");
        app.restart();
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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

            // osrs-bot: never self-update. The updater endpoint points at the
            // upstream WaspScripts releases; pulling one in would overwrite
            // this offline fork's local modifications.
            let _ = update_launcher;

            let settings = app.store("settings.json")?;

            let app_paths = app.path();
            let local_data = app_paths
                .app_local_data_dir()
                .expect("Local Data Dir doesn't exist on this system");

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

            // osrs-bot: drive the matched OLD Simba environment (Simba 1400 +
            // SRL-T + old WaspLib + the purchased scripts). The scripts predate
            // the new self-contained WaspLib and require SRL-T, and old WaspLib
            // bundles its data so everything runs fully offline.
            let _ = local_data; // (was: local_data.join("Simba"))
            let simba_path = PathBuf::from("C:\\Users\\Julio\\Desktop\\osrs-bot\\runtime");
            let _ = simba::ensure_simba_directories(&simba_path);

            // Offline: skip the online plugin sync — v1 already has what it needs.

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
            commands::start_server,
            commands::sign_up,
            commands::save_blob,
            commands::delete_cache,
            commands::delete_assets,
            commands::delete_configs,
            commands::get_plugin_version,
            commands::reinstall_plugins,
            commands::list_clients,
            commands::set_client,
            commands::show_client,
            commands::get_running_scripts,
            commands::list_local_scripts
        ])
        .run(tauri::generate_context!())
        .expect("Error while running wasp-launcher");
}

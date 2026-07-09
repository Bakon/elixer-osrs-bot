use std::{
    fs::{create_dir_all, remove_dir_all, remove_file, write, File},
    io::{self, BufRead, BufReader, Cursor},
    path::{Path, PathBuf},
    process::Stdio,
    thread,
};

use serde::Deserialize;
use tauri::{
    http::{HeaderMap, HeaderValue},
    ipc::Channel,
    Error,
};
use tauri_plugin_http::reqwest::{self, Client};
use zip::ZipArchive;

const SUPABASE_URL: &str = "https://db.waspscripts.dev/";
const SUPABASE_ANON_KEY: &str = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1MTA0MTIwMCwiZXhwIjo0OTA2NzE0ODAwLCJyb2xlIjoiYW5vbiJ9.C_KW5x45BpIyOQrnZc7CKYKjHe0yxB4l-fTSC4z_kYY";

#[derive(Deserialize, Debug)]
struct Plugin {
    version: String,
}

async fn download_and_unzip_file(
    url: &str,
    dest: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    let response = Client::new()
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?;

    let cursor = Cursor::new(response);
    let mut archive = ZipArchive::new(cursor)?;

    if archive.len() != 1 {
        return Err(format!("Expected 1 file in ZIP, found {}", archive.len()).into());
    }

    let mut file = archive.by_index(0)?;
    if file.name().ends_with('/') {
        return Err("Unexpected directory in zip".into());
    }

    // Ensure parent directory exists
    if let Some(parent) = dest.parent() {
        create_dir_all(parent)?;
    }

    // Write the file using `dest` as the output path
    let mut out_file = File::create(dest)?;
    std::io::copy(&mut file, &mut out_file)?;

    Ok(())
}

async fn download_and_unzip_dir(
    path: PathBuf,
    dest: &str,
    db_path: &str,
    src: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let final_path = path.join(dest);
    let zip_path = path.join(format!("{}.zip", src));

    if final_path.exists() {
        println!("Removing old {:?} directory", final_path);
        remove_dir_all(&final_path)?;
    }

    if src == "latest" && zip_path.exists() {
        let _ = remove_file(zip_path.clone());
    }

    if !zip_path.exists() {
        let url = format!("{}storage/v1/object/{}/{}.zip", SUPABASE_URL, db_path, src);
        println!("Downloading {} from {}", src, url);

        let response = Client::new()
            .get(&url)
            .bearer_auth(SUPABASE_ANON_KEY)
            .send()
            .await?
            .error_for_status()?
            .bytes()
            .await?;

        write(&zip_path, &response)?;
    }

    println!("Extracting {} to {:?}", zip_path.display(), final_path);
    let file = File::open(&zip_path)?;
    let mut archive = ZipArchive::new(file)?;

    create_dir_all(&final_path)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let out_path = final_path.join(file.name());

        if file.is_dir() {
            create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                create_dir_all(parent)?;
            }
            let mut outfile = File::create(&out_path)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }

    println!("{}.zip extracted to {:?}", src, path);

    Ok(())
}

pub fn read_plugins_version(path: &Path) -> Result<String, Error> {
    let file = match File::open(path) {
        Ok(f) => f,
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            return Ok("Not installed".to_string());
        }
        Err(e) => return Err(e.into()),
    };
    let reader = BufReader::new(file);

    let mut year = None;
    let mut month = None;
    let mut day = None;
    let mut hash = None;

    for line in reader.lines() {
        let line = line?;
        let line = line.trim();

        if line.starts_with("WL_PLUGINS_VERSION_YEAR") {
            if let Some(val) = line.split('=').nth(1) {
                year = Some(
                    val.trim_end_matches(';')
                        .trim()
                        .parse::<u32>()
                        .expect("Failed to parse year!"),
                );
            }
        } else if line.starts_with("WL_PLUGINS_VERSION_MONTH") {
            if let Some(val) = line.split('=').nth(1) {
                month = Some(
                    val.trim_end_matches(';')
                        .trim()
                        .parse::<u32>()
                        .expect("Failed to parse month!"),
                );
            }
        } else if line.starts_with("WL_PLUGINS_VERSION_DAY") {
            if let Some(val) = line.split('=').nth(1) {
                day = Some(
                    val.trim_end_matches(';')
                        .trim()
                        .parse::<u32>()
                        .expect("Failed to parse day!"),
                );
            }
        } else if line.starts_with("WL_PLUGINS_VERSION_COMMIT_HASH") {
            if let Some(val) = line.split('=').nth(1) {
                let val = val.trim_end_matches(';').trim();
                hash = Some(val.trim_matches('\'').to_string());
            }
        }
    }

    let version = format!(
        "{}.{:02}.{:02}-{}",
        year.expect("Missing year"),
        month.expect("Missing month"),
        day.expect("Missing day"),
        hash.expect("Missing hash")
    );

    Ok(version)
}

async fn fetch_plugins_version() -> Result<String, Box<dyn std::error::Error>> {
    let mut headers = HeaderMap::new();
    headers.insert("apikey", HeaderValue::from_static(SUPABASE_ANON_KEY));
    headers.insert("Accept", HeaderValue::from_static("application/json"));
    headers.insert("Accept-Profile", HeaderValue::from_static("scripts"));

    let url =
        SUPABASE_URL.to_string() + "rest/v1/plugins?select=version&order=created_at.desc&limit=1";

    let client = Client::new();
    let response = client
        .get(url)
        .headers(headers)
        .send()
        .await?
        .error_for_status()?; //ensure HTTP 2xx

    let body = response.text().await?;
    let plugins: Vec<Plugin> = serde_json::from_str(&body)?;

    if let Some(plugin) = plugins.first() {
        Ok(plugin.version.clone())
    } else {
        Err("No plugins found".into())
    }
}

pub async fn sync_plugins_repo(plugins_path: &PathBuf) -> Result<(), Error> {
    let current = read_plugins_version(&plugins_path.join("version.simba"))?;
    println!("Current plugins version: {}", current);

    let latest = fetch_plugins_version()
        .await
        .expect("Failed to fetch latest plugin versions");
    println!("Latest plugins version: {}", latest);
    if current == latest {
        return Ok(());
    }

    let parent_dir = plugins_path.join("..");
    let _ =
        download_and_unzip_dir(parent_dir.to_path_buf(), "wasp-plugins", "plugins", &latest).await;

    Ok(())
}

pub fn ensure_simba_directories(path: &PathBuf) -> std::io::Result<()> {
    create_dir_all(path)?;

    let dirs = [
        "Configs",
        "Data",
        "Includes",
        "Plugins",
        "Screenshots",
        "Scripts",
    ];

    for dir in &dirs {
        create_dir_all(&path.join(dir))?;
    }

    Ok(())
}

pub async fn run_simba(path: PathBuf, args: Vec<String>) {
    println!("Attempt to run Simba from: {:?}", path);

    if args.len() != 6 {
        panic!("Expected 6 arguments, but got {}", args.len());
    }

    // bakon-bot offline: use a local Simba build; never download Simba or
    // WaspLib (the old download path did remove_dir_all(Includes/WaspLib) then
    // re-download, which offline wiped WaspLib).
    let exe_path = {
        let explicit = path.join(format!("Simba-{}.exe", args[1]));
        if explicit.exists() {
            explicit
        } else {
            match find_local_simba(&path) {
                Some(p) => p,
                None => {
                    println!("No local Simba-*.exe found in {:?}; not launching.", path);
                    return;
                }
            }
        }
    };

    let script_file = path.join("Scripts").join(&args[0]);

    let mut cmd = std::process::Command::new(exe_path);
    cmd.arg("--open")
        .arg(script_file)
        .env("SCRIPT_ID", &args[3])
        .env("SCRIPT_REVISION", &args[4])
        .env("WASP_REFRESH_TOKEN", &args[5]);

    if args[1] != "latest" {
        cmd.env("SCRIPT_SIMBA_VERSION", &args[1]);
    }

    if (args[2] != "latest") && (args[2] != "none") {
        cmd.env("SCRIPT_WASPLIB_VERSION", &args[2]);
    }

    let _ = cmd.spawn().map_err(|err| err.to_string());
}

// bakon-bot: find any existing Simba-*.exe in the Simba folder (newest first)
// so we can run offline without downloading a specific build.
fn find_local_simba(dir: &Path) -> Option<PathBuf> {
    let mut candidates: Vec<(std::time::SystemTime, PathBuf)> = std::fs::read_dir(dir)
        .ok()?
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with("Simba") && n.ends_with(".exe"))
                .unwrap_or(false)
        })
        .filter_map(|p| {
            let m = std::fs::metadata(&p).ok()?.modified().ok()?;
            Some((m, p))
        })
        .collect();
    candidates.sort_by(|a, b| b.0.cmp(&a.0));
    candidates.into_iter().next().map(|(_, p)| p)
}

// bakon-bot: repoint an Includes junction (WaspLib / SRL-T) at a target dir,
// so we can switch library generation per script. remove_dir removes the
// junction reparse point without touching the target it points to.
fn repoint_lib(inc: &Path, name: &str, target: &str) {
    let tgt = inc.join(target);
    if !tgt.exists() {
        return; // that generation isn't installed; leave current link as-is
    }
    let link = inc.join(name);
    let _ = std::fs::remove_dir(&link);
    let _ = std::process::Command::new("cmd")
        .arg("/C")
        .arg("mklink")
        .arg("/J")
        .arg(&link)
        .arg(&tgt)
        .output();
}

pub async fn run_simba_script(
    path: PathBuf,
    target: isize,
    args: Vec<String>,
    channel: Channel<String>,
) -> Result<std::process::Child, String> {
    println!("Attempt to run Simba from: {:?}", path);

    if args.len() != 6 {
        return Err(format!("Expected 6 arguments, but got {}", args.len()));
    }

    // bakon-bot offline: use an existing local Simba build; never download
    // Simba or WaspLib from the server (WaspLib already lives in Includes/).
    let exe_path = {
        let explicit = path.join(format!("Simba-{}.exe", args[1]));
        if explicit.exists() {
            explicit
        } else {
            find_local_simba(&path)
                .ok_or_else(|| format!("No Simba-*.exe found in {:?}. Cannot run offline.", path))?
        }
    };

    let script_file: String = path
        .join("Scripts")
        .join(args[0].clone())
        .to_string_lossy()
        .to_string();

    // bakon-bot: pick the library generation this script needs. Removed/old
    // scripts include WaspLib/osr.simba or SRL-T/osr.simba (pre-refactor,
    // TRSObjectV2); everything else uses the current libs. Each run is its own
    // Simba process, so we repoint the junctions right before launch.
    {
        let src = std::fs::read_to_string(&script_file)
            .unwrap_or_default()
            .to_lowercase();
        let suffix = if src.contains("osr.simba") { "old" } else { "new" };
        let inc = path.join("Includes");
        repoint_lib(&inc, "WaspLib", &format!("_WaspLib_{}", suffix));
        repoint_lib(&inc, "SRL-T", &format!("_SRL-T_{}", suffix));
        println!("bakon-bot: using '{}' library generation for this script", suffix);
    }

    let trgt = format!("--target={}", target);
    let mut cmd = std::process::Command::new(exe_path);
    cmd.current_dir(&path); // bakon-bot: scripts load "Resources\..." relative to CWD, so run from the Simba dir

    cmd.arg(trgt)
        .arg("--keep-formatting")
        .arg("--run")
        .arg(script_file)
        .env("SCRIPT_ID", &args[3])
        .env("SCRIPT_REVISION", &args[4])
        .env("WASP_REFRESH_TOKEN", &args[5]);

    if args[1] != "latest" {
        cmd.env("SCRIPT_SIMBA_VERSION", &args[1]);
    }

    if (args[2] != "latest") && (args[2] != "none") {
        cmd.env("SCRIPT_WASPLIB_VERSION", &args[2]);
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    println!("Sending messages to channel: {}", channel.id());

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let process_stdout = channel.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            println!("[SIMBA] {}", line); // bakon-bot: echo to launcher stdout for debugging
            let _ = process_stdout.send(line);
        }
    });

    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            println!("[SIMBA-ERR] {}", line); // bakon-bot: echo to launcher stdout for debugging
            let _ = channel.send(format!("ERROR: {}", line));
        }
    });

    Ok(child)
}

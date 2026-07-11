use std::{
    fs::{create_dir_all, File},
    io::{self, BufRead, BufReader},
    path::{Path, PathBuf},
    process::Stdio,
    thread,
};
#[cfg(windows)]
use std::os::windows::process::CommandExt;

use tauri::{ipc::Channel, Error};

// osrs-bot: suppress the console window Windows would otherwise pop up for
// each spawned child (the mklink junction calls and Simba itself).
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
fn no_window(cmd: &mut std::process::Command) {
    cmd.creation_flags(CREATE_NO_WINDOW);
}
#[cfg(not(windows))]
fn no_window(_cmd: &mut std::process::Command) {}

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

        // osrs-bot: parse leniently — a malformed version.simba must not crash
        // the settings page. Unparseable numbers/missing fields -> "unknown".
        let parse_field = |val: &str| val.trim_end_matches(';').trim().parse::<u32>().ok();
        if line.starts_with("WL_PLUGINS_VERSION_YEAR") {
            if let Some(val) = line.split('=').nth(1) {
                year = parse_field(val);
            }
        } else if line.starts_with("WL_PLUGINS_VERSION_MONTH") {
            if let Some(val) = line.split('=').nth(1) {
                month = parse_field(val);
            }
        } else if line.starts_with("WL_PLUGINS_VERSION_DAY") {
            if let Some(val) = line.split('=').nth(1) {
                day = parse_field(val);
            }
        } else if line.starts_with("WL_PLUGINS_VERSION_COMMIT_HASH") {
            if let Some(val) = line.split('=').nth(1) {
                let val = val.trim_end_matches(';').trim();
                hash = Some(val.trim_matches('\'').to_string());
            }
        }
    }

    match (year, month, day, hash) {
        (Some(y), Some(m), Some(d), Some(h)) => Ok(format!("{}.{:02}.{:02}-{}", y, m, d, h)),
        _ => Ok("unknown".to_string()),
    }
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
        println!("run_simba: expected 6 arguments, got {}; not launching.", args.len());
        return;
    }

    // osrs-bot offline: use a local Simba build; never download Simba or
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

    no_window(&mut cmd);
    let _ = cmd.spawn().map_err(|err| err.to_string());
}

// osrs-bot: find any existing Simba-*.exe in the Simba folder (newest first)
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

// osrs-bot: which library generation a script needs — "v1" if it includes
// the pre-refactor osr.simba entrypoints, "v2" otherwise. `rel` is the script
// path relative to Scripts/ (as passed from the frontend).
pub fn script_generation(path: &Path, rel: &str) -> &'static str {
    let script_file = path.join("Scripts").join(rel);
    let src = std::fs::read_to_string(&script_file)
        .unwrap_or_default()
        .to_lowercase();
    if src.contains("osr.simba") {
        "v1"
    } else {
        "v2"
    }
}

// osrs-bot: repoint an Includes junction (WaspLib / SRL-T) at a target dir,
// so we can switch library generation per script. remove_dir removes the
// junction reparse point without touching the target it points to.
fn repoint_lib(inc: &Path, name: &str, target: &str) -> Result<(), String> {
    let tgt = inc.join(target);
    if !tgt.exists() {
        return Ok(()); // that generation isn't installed; leave current link as-is
    }
    let link = inc.join(name);
    // If it already points at the target, don't churn it.
    if std::fs::read_link(&link).map(|p| p == tgt).unwrap_or(false) {
        return Ok(());
    }
    let _ = std::fs::remove_dir(&link);
    let mut cmd = std::process::Command::new("cmd");
    cmd.arg("/C").arg("mklink").arg("/J").arg(&link).arg(&tgt);
    no_window(&mut cmd);
    match cmd.output() {
        Ok(o) if o.status.success() => Ok(()),
        Ok(o) => Err(format!(
            "mklink for {} failed: {}",
            name,
            String::from_utf8_lossy(&o.stderr).trim()
        )),
        Err(e) => Err(format!("mklink for {} could not run: {}", name, e)),
    }
}

pub async fn run_simba_script(
    path: PathBuf,
    target: isize,
    pid: u32,
    args: Vec<String>,
    channel: Channel<String>,
) -> Result<std::process::Child, String> {
    println!("Attempt to run Simba from: {:?}", path);

    if args.len() != 6 {
        return Err(format!("Expected 6 arguments, but got {}", args.len()));
    }

    // osrs-bot offline: use an existing local Simba build; never download
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

    // osrs-bot: pick the library version this script needs. Pre-refactor
    // scripts include WaspLib/osr.simba or SRL-T/osr.simba (TRSObjectV2 era)
    // and run on the v1 libs; everything else uses v2. Each run is its own
    // Simba process, so we repoint the junctions right before launch.
    {
        let suffix = script_generation(&path, &args[0]);
        let inc = path.join("Includes");
        repoint_lib(&inc, "WaspLib", &format!("WaspLib_{}", suffix))?;
        repoint_lib(&inc, "SRL-T", &format!("SRL-T_{}", suffix))?;
        println!("osrs-bot: using '{}' libraries for this script", suffix);
    }

    let trgt = format!("--target={}", target);
    let mut cmd = std::process::Command::new(exe_path);
    cmd.current_dir(&path); // osrs-bot: scripts load "Resources\..." relative to CWD, so run from the Simba dir

    cmd.arg(trgt)
        .arg("--keep-formatting")
        .arg("--run")
        .arg(script_file)
        // osrs-bot: hand the chosen client's PID to RemoteInput so it pairs THAT
        // client instead of auto-selecting the first one (fixes wrong-client +
        // the "auto select client?" popup when multiple clients are open).
        .env("TARGET_PID", pid.to_string())
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
    no_window(&mut cmd);

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    println!("Sending messages to channel: {}", channel.id());

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let process_stdout = channel.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            println!("[SIMBA] {}", line); // osrs-bot: echo to launcher stdout for debugging
            let _ = process_stdout.send(line);
        }
    });

    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            println!("[SIMBA-ERR] {}", line); // osrs-bot: echo to launcher stdout for debugging
            let _ = channel.send(format!("ERROR: {}", line));
        }
    });

    Ok(child)
}

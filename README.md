# osrs-bot

Personal OSRS bot — a desktop launcher that runs Simba scripts offline.

## Run

Launch via the `osrs-bot launcher` desktop shortcut (or the built exe under
`launcher/src-tauri/target/release/wasp-launcher.exe`), pick a script, and hit
run. The `osrs-bot Simba` shortcut opens the Simba IDE directly for editing
and debugging scripts.

## Layout

- `launcher/` — the desktop app (Tauri + SvelteKit + Rust)
- `runtime/` — the Simba engine payload
  - `runtime/Scripts/` — bot scripts
  - `runtime/Includes/` — the libraries scripts build on
  - `runtime/Configs/`, `runtime/Resources/` — settings and assets

## Build the launcher

    cd launcher
    pnpm install
    pnpm tauri build
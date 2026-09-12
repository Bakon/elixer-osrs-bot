# Elixer Scripts

A fully **offline** Old School RuneScape botting suite: a modern desktop
launcher on top of the [Simba](https://github.com/Villavu/Simba) color-bot
engine. It preserves a collection of WaspScripts-era scripts after the platform
shut down, plus a growing set of custom Elixer scripts and a custom anti-ban
layer on top of WaspLib.

No accounts, no servers, no telemetry — everything runs and stays on your own
machine.

<p>
  <img src="launcher/static/skills/Attack.png" alt="" width="16"/>
  <img src="launcher/static/skills/Mining.png" alt="" width="16"/>
  <img src="launcher/static/skills/Fishing.png" alt="" width="16"/>
  <img src="launcher/static/skills/Magic.png" alt="" width="16"/>
  <img src="launcher/static/skills/Thieving.png" alt="" width="16"/>
  <img src="launcher/static/skills/Woodcutting.png" alt="" width="16"/>
</p>

## Features

- **Script library** — 54 local scripts, searchable and filterable by skill
  via an OSRS-style skills panel, with the real wiki skill icons.
- **Personal metadata** — rename scripts, write your own markdown
  descriptions (requirements, setup, notes), set images, favorite ★, hide,
  and track which scripts *work* or are *broken*. All stored locally in
  `library.json`.
- **Generated documentation** — every script ships with a description
  reconstructed from its source code (what it does, requirements, setup,
  features), shown until you write your own.
- **One-click running** — pick a RuneLite client, hit Run; live console
  output per running script (also written to `runtime/Logs/<script>.log`),
  kill switch included.
- **Shared anti-ban layer** — a custom layer on top of WaspLib (attention
  engine, per-account biohash tuning, breaks/sleep, off-client parking)
  configured per run in the Antiban Manager tab.

## Quick start

New here / setting up on a fresh machine? See **[docs/SETUP.md](docs/SETUP.md)**
for the full first-time setup — the Simba engine (a small release download, the
one thing not in git), a **dedicated clean RuneLite profile**, Fixed - Classic
layout, and Settings Searcher.

1. Launch via the **`osrs-bot launcher`** desktop shortcut (or
   `launcher/src-tauri/target/release/elixer-launcher.exe`).
2. Pick a script, select your game client at the bottom, press **Run**.
3. The **`osrs-bot Simba`** shortcut opens the Simba IDE directly for editing
   and debugging scripts.

Accounts are configured per script in the startup GUI's **Account Manager**
tab (and, for older scripts, via **Settings → Tools → Credentials Helper**).
Credentials stay on your machine and are gitignored.

## Repository structure

```
elixer-osrs-bot/
├── README.md
├── docs/
│   ├── AUDIT.md                  # full codebase audit (findings + severities)
│   └── ROADMAP.md                # phased cleanup plan + decisions
├── launcher/                     # desktop app — Tauri 2 + React 19 (Vite)
│   ├── src/                      # React frontend (CSS Modules, skill icons)
│   └── src-tauri/                # Rust backend (commands, Simba runner)
└── runtime/                      # the Simba 1400 engine + everything it needs
    ├── Simba64.exe               # the color-bot engine (gitignored binary)
    ├── Scripts/                  # every .simba script, flat
    ├── Logs/                     # per-script run logs (gitignored)
    └── Includes/                 # the script libraries
        ├── WaspLib                  # vendored WaspLib (v2)
        ├── SRL-T                    # vendored SRL-T (v2)
        └── WaspQuests               # quest helper library
```

The capitalized `Scripts/`, `Includes/`, `Configs/`, `Data/` folder names are
Simba's own convention — the engine and the scripts' include paths depend on
them, so they're left as-is.

`WaspLib` and `SRL-T` are plain vendored folders. The old v1 (pre-refactor,
`osr.simba`) generation has been retired — everything runs against v2, so
there's no per-run library switching anymore.

## Building the launcher

Requires Node 24 (bundled under `launcher/.tools/`), pnpm and a Rust GNU
toolchain (no MSVC — see `launcher/src-tauri/.cargo/config.toml`).

```sh
cd launcher
pnpm install
pnpm tauri build --no-bundle
```

> **Important:** always build through the Tauri CLI. A plain
> `cargo build --release` produces a dev-flavored exe that tries to load a
> dev server on `localhost:1420` instead of the embedded frontend.

For development with hot reload:

```sh
pnpm tauri dev
```

## Portability

No hardcoded paths: the launcher locates the `runtime/` folder by walking up
from its own executable, so the whole folder can be moved or cloned anywhere.
Per-user state (`runtime/Configs/launcher.json`, `BASettings.ini`,
`credentials.simba`) is gitignored and stays on your machine.

## Credits & licensing

Built on the work of the WaspScripts community — see
[runtime/README.md](runtime/README.md) for full credits (Simba by Villavu,
SRL-T and WaspLib by Torwent, both GPL-3.0) and the licensing status of the
preserved scripts. The launcher itself is a heavily stripped offline fork of
[wasp-launcher](https://github.com/WaspScripts/wasp-launcher) (GPL-3.0).

Personal use only. Botting violates the OSRS terms of service — use at your
own risk, on accounts you can afford to lose.

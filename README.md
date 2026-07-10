# Elixer Scripts

A fully **offline** Old School RuneScape botting suite: a modern desktop
launcher on top of the [Simba](https://github.com/Villavu/Simba) color-bot
engine, preserving a personal collection of WaspScripts-era scripts after the
platform shut down.

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

- **Script library** — 78 local scripts, searchable and filterable by skill
  via an OSRS-style skills panel, with the real wiki skill icons.
- **Personal metadata** — rename scripts, write your own markdown
  descriptions (requirements, setup, notes), set images, favorite ★, hide,
  and track which scripts *work* or are *broken*. All stored locally in
  `library.json`.
- **Generated documentation** — every script ships with a description
  reconstructed from its source code (what it does, requirements, setup,
  features), shown until you write your own.
- **One-click running** — pick a RuneLite client, hit Run; live console
  output per running script, kill switch included.
- **Two library generations** — scripts automatically run against the v1
  (pre-refactor) or v2 (current) SRL-T + WaspLib libraries they were written
  for.

## Quick start

1. Launch via the **`osrs-bot launcher`** desktop shortcut (or
   `launcher/src-tauri/target/release/wasp-launcher.exe`).
2. Pick a script, select your game client at the bottom, press **Run**.
3. The **`osrs-bot Simba`** shortcut opens the Simba IDE directly for editing
   and debugging scripts.

Account credentials are configured once via **Settings → Tools →
Credentials Helper** and stored only in the gitignored
`runtime/credentials.simba`.

## Repository layout

| Path | What it is |
|------|------------|
| `launcher/` | The desktop app — Tauri 2 + SvelteKit 5 (Rust backend, Svelte frontend) |
| `runtime/` | The Simba 1400 engine + everything it needs |
| `runtime/Scripts/waspscripts.com/` | The preserved script collection (see [runtime/README.md](runtime/README.md) for licensing) |
| `runtime/Scripts/community/` | Freely published community scripts |
| `runtime/Includes/_SRL-T_v1`, `_WaspLib_v1` | Library generation for pre-refactor scripts |
| `runtime/Includes/_SRL-T_v2`, `_WaspLib_v2` | Current library generation |
| `docs/` | [Audit report](docs/AUDIT.md) and [roadmap](docs/ROADMAP.md) |

The `runtime/Includes/WaspLib` and `SRL-T` junctions are switched per run by
the launcher to whichever generation the script needs (v1 if it includes
`osr.simba`, v2 otherwise).

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

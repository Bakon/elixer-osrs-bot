# Setup

Getting the bot running from scratch on Windows. If you've never used
Simba/WaspScripts, follow every step in order.

The repo is (almost) run-ready: the Simba engine, the libraries, and their
plugins are all committed. You just install RuneLite, build/grab the launcher,
and set up a clean client profile.

## What you need

1. **RuneLite (64-bit)** — the normal OSRS client. Install it yourself from
   [runelite.net](https://runelite.net) (Download ▾ → **Windows 64-bit**; the
   file is `RuneLiteSetup.exe`). The bot attaches to a running RuneLite.
2. **This repo** — clone or download it. It already contains `Simba64.exe`, the
   libraries, and the plugins — nothing extra to download for the engine.
3. **The launcher** — build it yourself (see the bottom) or grab a prebuilt
   `elixer-launcher.exe` from the repo's **Releases** page if one is attached.

> **64-bit only.** A 64-bit Simba must be paired with a 64-bit RuneLite. This
> setup uses 64-bit throughout — don't install the 32-bit / Legacy Java client.

## Steps

### 1. Get the code

```sh
git clone https://github.com/Bakon/elixer-osrs-bot.git
```

(Or "Download ZIP" from the repo page and extract it.) That's the engine,
libraries and plugins in one go.

### 2. Get the launcher

Build it yourself (see **Building the launcher** below) or, if a prebuilt
`elixer-launcher.exe` is attached to **Releases**, download that. It finds the
`runtime/` folder by walking up from its own location, so the simplest is to
drop it in `launcher/src-tauri/target/release/`.

### 3. Set up a clean RuneLite profile

**Do not bot on your normal RuneLite profile.** The scripts read the screen by
color/position, so random plugins, overlays, and a cluttered layout break them.
Make a dedicated profile and only use *that* one for botting.

1. Open RuneLite, click the **wrench** (settings) → the **Profiles** icon.
2. Create a new profile (e.g. `elixer`) and activate it (double-click → orange
   line on the left = active).
3. On this profile, keep plugins minimal — the defaults are fine. Don't add
   overlay-heavy plugins unless a specific script asks for it (e.g. the Blast
   Furnace script needs RuneLite's **Blast Furnace** plugin overlay).
4. **Collapse the RuneLite sidebar completely** (hover left of the wrench, click
   the arrow). An open sidebar covers the game and causes graphical glitches —
   never run a script with it open.

### 4. Client display + in-game settings

1. In RuneLite settings → the **monitor/display** icon → set **Game client
   layout: Fixed - Classic layout**. Most scripts assume fixed mode.
2. Log into the game on this profile.
3. Run the **Settings Searcher** script from the launcher once — it checks and
   corrects your in-game settings (brightness, zoom, roofs, XP bar, etc.) so
   scripts can read the screen. Do this on the botting profile before your first
   real script.

### 5. Save your account credentials

So the bot can log back in after breaks/sleeps:

- Newer scripts have an **Account Manager** tab in their startup GUI — set your
  account there.
- For older scripts (or to store it globally), run the **Credentials Helper**
  script once and follow its GUI. Credentials are saved locally to the
  gitignored `runtime/credentials.simba` — they never leave your machine.

### 6. Run your first script

1. Make sure RuneLite is open on your **botting profile**, logged in, sidebar
   closed.
2. Launch `elixer-launcher.exe`.
3. Pick a script, press **Run** — the startup GUI opens.
4. Set your account (Account Manager), tweak **Script Settings** and the
   **Antiban Manager** tab, then **Start**.
5. Select your RuneLite client when prompted; the script attaches and runs.
   Live output shows in the launcher (also saved to `runtime/Logs/<script>.log`).

## Per-script setup

Every script has its own requirements (items in the bank, a specific location,
sometimes a RuneLite plugin). Read each script's description in the launcher
before running it. Recurring assumptions: a readable **XP bar**, reasonable
**brightness**, standard camera/zoom, and **Fixed - Classic** layout — all
handled by the Settings Searcher in step 4.

## Troubleshooting

- **Launcher exits instantly / STATUS_ENTRYPOINT_NOT_FOUND** — a build/toolchain
  issue on some mingw-w64 distros; use the prebuilt `elixer-launcher.exe` from
  Releases rather than building it yourself.
- **Script fails to compile: can't find `WaspLib`/`SRL-T`** — the `Includes/`
  folders are missing; make sure the repo cloned fully.
- **No input / mouse does nothing** — the repo didn't clone fully; check
  `Includes/SRL-T/plugins/libremoteinput/` has its `.dll` files.
- **Script misclicks / reads the screen wrong** — you're probably not on the
  clean botting profile, the sidebar is open, or you skipped Settings Searcher.
  Re-check steps 3–4.
- **First launch of Simba** — it initializes its `Data/` folder; give it a moment
  on the first run.

## Golden rules

- **Always** use your dedicated botting RuneLite profile — never your main one.
- **Never** open the RuneLite sidebar while a script runs (glitches + misclicks).
- Run **Settings Searcher** whenever you change client settings or profiles.
- Botting breaks the OSRS ToS — use accounts you can afford to lose.

## Building the launcher yourself (optional)

Needs Node 24 (bundled under `launcher/.tools/`), pnpm and a Rust GNU toolchain.

```sh
cd launcher
pnpm install
pnpm tauri build --no-bundle
```

Always build through the Tauri CLI — a plain `cargo build --release` produces a
dev-flavored exe that expects a dev server on `localhost:1420`. Output lands at
`launcher/src-tauri/target/release/elixer-launcher.exe`.

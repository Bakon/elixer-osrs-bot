# osrs-bot

A personal, offline-capable edition of the Simba color-automation stack,
maintained by Julio as a learning / passion project.

> **Personal use only.** This copy is for running and studying scripts on my
> own machine (including private Zanaris sandbox servers). It is **not** for
> public redistribution. See "Scripts" below.

---

## What this is built on (and credit where it's due)

osrs-bot does not replace the work of the people who built this ecosystem — it
stands on it. Everything here is preserved with its original licensing intact.

| Component | Author | License |
|-----------|--------|---------|
| **Simba** (the engine, `Simba64.exe`) | Villavu | GPL-3.0 |
| **SRL-T** (`Includes/SRL-T`) | Torwent (fork of SRL) | GPL-3.0 |
| **WaspLib** (`Includes/WaspLib`) | Torwent | GPL-3.0 |

The GPL-3.0 license text for WaspLib is preserved at
`Includes/WaspLib/LICENSE`. All original copyright headers are left untouched.
Huge thanks to **Torwent** and the WaspScripts community — this project exists
to keep learning from and building on that work after the platform's shutdown.

## Scripts

The files in `Scripts/waspscripts.com/` are the individual scripts I personally
downloaded/subscribed to before the platform closed. They belong to their
respective authors (Torwent, bigaussie, Flight, aetherdescent, bootje, and
others) and were sold on a subscription basis — they are **not** GPL and are
**not** mine to redistribute. They are kept here only for my own personal use
and study. Any script I share publicly will be my own original work built on
the GPL library above, or something an author has explicitly permitted.

## Local / offline changes made in this copy

These are the only modifications vs. a stock install, all for running
standalone after waspscripts.com goes offline:

1. **Repointed paths** — `Data/packages.ini` and `Data/settings.ini` now point
   at this folder instead of the original `AppData\Local\Simba` install.
2. **Stats telemetry disabled** — `Configs/wasplib.json` → `"stats": false`
   (no XP/gold reporting to the now-offline api.waspscripts.com).
3. **Small library patches for headless/offline runs** — a handful of spots in
   `Includes/` are patched so scripts run via the launcher (headless `--run`)
   on old Simba: forcing the `SIMBAHEADLESS` define, guarding GUI-only calls
   like `ClearDebug`, a native LoseFocus fallback, and skipping the
   rate-the-game step on logout. Every such change is marked with an
   `// osrs-bot:` comment, so `grep -r "osrs-bot:" Includes/` lists them all.

Nothing else in the engine or libraries has been altered.

## Running it

Launch `Simba64.exe` in this folder (or the `osrs-bot Simba` desktop shortcut),
open a script from `Scripts/`, and Run. Scripts compile from source at runtime
— there is nothing to "decompile."

# runtime

The Simba engine and everything it needs to run the scripts. Driven by the
Elixer Scripts launcher (see the [root README](../README.md)).

## Credits & licensing

| Component | Author | License |
|-----------|--------|---------|
| Simba (`Simba64.exe`) | Villavu | GPL-3.0 |
| SRL-T (`Includes/SRL-T_v1`, `_v2`) | Torwent (fork of SRL) | GPL-3.0 |
| WaspLib (`Includes/WaspLib_v1`, `_v2`) | Torwent | GPL-3.0 |

The GPL libraries are vendored unmodified apart from the offline patches
below; original license texts and copyright headers are left intact.

`Scripts/` holds all scripts (flat). Most are from various authors (Torwent,
bigaussie, Flight, aetherdescent, bootje, and others) that were sold on
subscription before the platform shut down — **not** GPL, kept here for
personal use only. A few are freely published community scripts (e.g. from
BigAussie's public repo). The author is encoded in each filename (`-by-<name>`).

## Local changes vs. a stock install

Only these, all to run standalone/offline after waspscripts.com went down:

1. **Repointed paths** — `Data/packages.ini` and `Data/settings.ini` point at
   this folder instead of `AppData\Local\Simba`.
2. **Stats telemetry off** — `Configs/wasplib.json` → `"stats": false`.
3. **Headless/offline library patches** — a few spots in `Includes/` so
   scripts run via the launcher's headless `--run` on Simba 1400 (force
   `SIMBAHEADLESS`, guard GUI-only calls, native LoseFocus fallback, skip
   rate-the-game on logout). Each is tagged `// osrs-bot:` —
   `grep -r "osrs-bot:" Includes/` lists them all.

## Two library generations

Scripts target one of two library versions. The launcher repoints the
`Includes/WaspLib` and `Includes/SRL-T` junctions per run:

- **v1** (`SRL-T_v1` / `WaspLib_v1`) — pre-refactor libs, for scripts that
  include `osr.simba`.
- **v2** (`SRL-T_v2` / `WaspLib_v2`) — current libs, for everything else.

## Running directly

Launch `Simba64.exe` (or the `osrs-bot Simba` desktop shortcut), open a script
from `Scripts/`, and Run. Scripts compile from source at runtime.

# Audit — 2026-07-10

Full read-only audit of the app (launcher backend, launcher frontend, repo/runtime
hygiene). Findings only; fixes are tracked in [ROADMAP.md](ROADMAP.md).

Severity: **H**igh / **M**edium / **L**ow. `✔ fixed` = already resolved.

## Launcher backend (Rust / Tauri, `launcher/src-tauri`)

| # | Sev | Where | Finding |
|---|-----|-------|---------|
| B1 | H | `simba.rs:220`, `commands.rs:446` | `reinstall_plugins` panics offline: `.expect()` on a fetch to `db.waspscripts.dev`. Button is live on both settings pages. A panic while the state mutex is held poisons it, after which **every** command panics until restart. |
| B2 | H | `commands.rs:239` | `run_executable` ("devsimba" branch) silently spawns the same online plugin sync → same panic, plus unwanted outbound calls. |
| B3 | M | `simba.rs:322` | Junction repoint: removes the old `Includes/WaspLib`/`SRL-T` junction first, ignores the result of `mklink`. If `mklink` fails the Includes are gone with no error. |
| B4 | M | `simba.rs:372` | Race: launching an "old" and a "new" script concurrently swaps the shared Includes junctions under the already-running script. |
| B5 | M | `simba.rs:141` | `read_plugins_version` panics on a malformed `version.simba` (five `.expect()`s); triggered from the settings page load. |
| B6 | M | `commands.rs:117,141,165,442` | `delete_cache/assets/configs` + `reinstall_plugins` use `.expect()` on `remove_dir_all` — locked file (Simba running) = panic instead of an error. |
| B7 | M | `simba.rs:255` | `run_simba` hard-panics unless exactly 6 args; `run_simba_script` handles the same case gracefully. Inconsistent. |
| B8 | M | `commands.rs:172` | `save_blob`: (a) webview-controlled path allows `..` traversal; (b) writes to `AppData/.../Simba/Scripts` — a different tree than the runtime everything else uses. |
| B9 | M | `commands.rs:251`, `simba.rs:362` | `run_script`: script name joined to `Scripts/` without validation (`..\..` escapes). |
| B10 | M | `commands.rs:98` | `set_executable_path` overwrites the whole `paths` store object instead of merging — setting `devsimba` erases other saved paths. |
| B11 | M | `lib.rs:115` | Hardcoded runtime path `C:\Users\Julio\Desktop\osrs-bot\runtime` — app breaks if the folder moves; unusable for other users. |
| B12 | M‑H | `tauri.conf.json:23` | `csp: null` — no Content-Security-Policy, combined with a broad command surface. |
| B13 | L | `simba.rs:18`, capabilities | Hardcoded Supabase URL + anon key and full download layer still present; `capabilities/*.json` still allowlist `api./db.waspscripts.dev`. |
| B14 | L | `commands.rs:355,384`, `server.rs` | `start_server` (localhost:5217 OAuth helper) and `sign_up` (POST to waspscripts.dev) are dormant but callable IPC surface. |
| B15 | L | various | Dead code: `download_and_unzip_file`, `get_running_scripts` (empty stub), `update_launcher` (suppressed), `first_comment` result discarded, broken `client/linux.rs`. |
| B16 | L | `tauri.conf.json` | Branding still upstream: productName `wasp-launcher`, identifier `com.wasp-launcher.app`, window title "WaspScripts", CLI plugin description "Tauri CLI Plugin Example", updater config still points at WaspScripts releases (never invoked). |

## Launcher frontend (SvelteKit, `launcher/src`)

| # | Sev | Where | Finding |
|---|-----|-------|---------|
| F1 | H | `Sidebar.svelte:48` | "Simba"/"Dev Simba" buttons silently do nothing offline: they require a live `scripts.wasplib` query before `run_executable`; the query fails → early return, no error. (The Footer **Run** button was patched; these were missed.) |
| F2 | H | `Sidebar.svelte:28` | `getNewSessionToken` beacons to `https://api.waspscripts.dev/session` on every Simba launch (with fake tokens, but still an outbound signal). Duplicate dead copy in `Footer.svelte:49`. |
| F3 | M | `supabase.ts:6-20` | Live Supabase client to `db.waspscripts.dev` with inline anon key still created and passed around; keeps all leftover queries "armed". |
| F4 | M | `scripts/[slug]/+page.svelte:16,41` | Script detail page: live `stats.limits` query + banner image from remote storage on every view — console errors / broken image offline. |
| F5 | M | `Navigation.svelte:22` | Logout calls `supabase.auth.signOut()` (network) but the fake offline session makes logout meaningless. |
| F6 | M | `(app)/+layout.ts:11` | Empty script catalog redirects to `/auth` — a dead Discord OAuth page (full flow still present under `(auth)/auth/`). |
| F7 | M | `Footer.svelte:31,203` | `getVersions` live query feeds a now-cosmetic, always-empty "Revision" dropdown. |
| F8 | L | `supabase.ts:59-136` | `getSubscriptions/getFreeAccess/getBundles/getProducts/getScripts`: zero callers, still perform real queries if ever wired up. |
| F9 | L | `+layout.svelte:15` | Live `onAuthStateChange` listener kept running for nothing. |
| F10 | L | `lib/types/update.ts` | Stray dev codegen script hitting the external API (node-only, not bundled). |
| F11 | L | `svelte.config.js:15` | CSP allowlist still includes all waspscripts.dev hosts + websockets. |

## Repo / runtime hygiene

| # | Sev | Where | Finding |
|---|-----|-------|---------|
| R1 | M | `runtime/Configs/launcher.json` | Tracked per-user state file (update flags, last script, an auth refresh token for the defunct waspscripts platform). Should be untracked user data. |
| R2 | M | `runtime/Configs/BASettings.ini` | Tracked per-user script settings (sections keyed by OSRS account name). No secrets (webhook URL empty), but it's user data and leaks the account name. |
| R3 | M | `runtime/Includes/` | `_old` + `_new` generations of SRL-T and WaspLib fully tracked: ~3600 of 3860 tracked files, duplicated multi-MB zips, `.git` = 109 MB. |
| R4 | M | `runtime/Scripts/waspscripts.com/` | 73 purchased marketplace scripts tracked in a public repo (README itself says "not for public redistribution"). Owner accepts this for now (outdated platform). |
| R5 | L | `runtime/Includes/latest.zip` | Tracked regenerable download artifact. |
| R6 | ✔ fixed | `runtime/Includes/WaspLib`, `SRL-T` | Junctions pointed at the removed `bakon-bot-v1` path after the rename; repointed to the runtime-local `_new` dirs (2026-07-10). |
| R7 | ok | `.gitignore` | Solid otherwise: credentials, screenshots, caches, binaries, `Data/`, build output all correctly ignored; zero exe/dll/node_modules tracked. |
| R8 | ok | `.github/` | Workflows are inert (nested under `launcher/`, owner-gated to WaspScripts). |
| R9 | ok | `Desktop/wasp-assets` | Separate repo next to this one; nothing here references it. |

## Already fixed before/during this audit

- Renamed `bakon-bot` → `osrs-bot` everywhere (folders, junctions, shortcuts, comments, docs).
- `lib.rs` runtime path no longer goes through a desktop junction.
- Startup self-updater (which pointed at upstream WaspScripts releases) disabled.
- Dangling Includes junctions repointed (R6).

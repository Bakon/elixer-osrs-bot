# Roadmap

Long-term cleanup plan for osrs-bot. Finding numbers (B/F/R#) refer to
[AUDIT.md](AUDIT.md). Guiding rule for every phase: **no breakage** — the app
must launch and run scripts after each step, verified before committing.

Phases are ordered so that each one can ship independently. Within a phase,
steps go from safest to riskiest.

## Phase 1 — Cut all WaspScripts/Supabase/auth remnants

Goal: the app makes **zero** network calls and contains no auth machinery.

1. Frontend: patch the Sidebar "Simba"/"Dev Simba" buttons to launch locally
   like the Footer Run button already does; drop `getNewSessionToken` (F1, F2).
2. Frontend: stub or remove the remaining live queries — script limits +
   remote banner (F4), Footer `getVersions`/Revision dropdown (F7), logout
   network call (F5), `onAuthStateChange` (F9).
3. Frontend: delete the dead `(auth)/auth` route and stop redirecting to it on
   an empty catalog — show the (empty) scripts list instead (F6).
4. Frontend: rewrite `supabase.ts` without `createClient`, dropping the
   hardcoded URL/key and the five never-called query functions (F3, F8);
   delete `lib/types/update.ts` (F10).
5. Rust: remove the Supabase download layer (`fetch_plugins_version`,
   `download_and_unzip_*`, `sync_plugins_repo`), `reinstall_plugins` (+ its two
   settings-page buttons), the devsimba sync branch (B1, B2, B13, B15).
6. Rust: remove `start_server`/`sign_up`/`server.rs` and the updater plugin +
   its config/dependency (B14, B16-updater).
7. Config: trim `api./db.waspscripts.dev` from `capabilities/*.json` and the
   waspscripts hosts from the SvelteKit CSP allowlist (B13, F11).
8. Verify: full rebuild; app boots; script list loads; Run works; Simba button
   works; `netstat`/proxy check shows no outbound traffic.

Risk: low-medium. Pure removal of code that is already broken offline; the
only behavior change users see is buttons that start working (Sidebar) or
disappear (reinstall plugins, logout).

## Phase 2 — Portability: no hardcoded paths, all data in the install dir

Goal: clone/copy the folder anywhere and it runs; nothing lives in `AppData`.

1. Replace the hardcoded runtime path in `lib.rs` with detection: walk up from
   the exe location to the first ancestor containing `runtime\Simba64.exe`,
   overridable via the existing settings store (B11).
2. Point the Tauri settings store (`settings.json`) at the install dir instead
   of `AppData` so launcher state travels with the folder.
3. Fix `save_blob` to write under the runtime `Scripts/` dir (and sanitize the
   webview-supplied path) or delete it if unused (B8).
4. Fix `set_executable_path` to merge instead of overwrite the paths store (B10).
5. Untrack per-user state from git (files stay on disk): `launcher.json`,
   `BASettings.ini` + ignore rules and `.example` templates (R1, R2).
6. Strip remaining "bakon" identity strings from the offline stub in
   `supabase.ts` (id/email/username).
7. Verify: move a copy of the repo to another path, launch from there, run a
   script.

Risk: low. Path detection has a conservative fallback; untracking never
touches disk files.

## Phase 3 — Robustness: no more panics, safe junction handling

Goal: no user action can crash or wedge the app.

1. Replace `.expect()`/`panic!` in commands with proper `Result` errors:
   delete_* commands, `read_plugins_version`, `run_simba` arg check (B5, B6, B7).
2. Check the `mklink` result in the junction repoint; restore or report on
   failure instead of silently losing Includes (B3).
3. Serialize script launches across generations, or block launching an
   "old" script while a "new" one runs (and vice versa) — interim fix for the
   junction race until Phase 4 removes the swapping entirely (B4).
4. Validate webview-supplied paths (`run_script`, `save_blob`) against their
   base directories (B8, B9).
5. Audit remaining `lock().unwrap()` sites once panics are gone (the poisoning
   cascade disappears when nothing panics while holding the lock).

Risk: low-medium. Mechanical error-handling changes, but touches the launch
path — test both library generations after.

## Phase 4 — Library consolidation (`_old` / `_new`)

Goal: one clear library setup instead of two full vendored generations swapped
by junctions at launch time.

Investigate first (no changes):
1. Map which scripts in `Scripts/waspscripts.com/` need which generation (the
   launcher picks per script in `simba.rs`; understand and document the rule).
2. Diff `_old` vs `_new` for both libs — they are near-identical file-wise;
   find out what actually differs and which generation each script really
   compiles against.

Then, in increasing ambition (each step optional, stop when satisfied):
3. **Repo slimming (safe):** untrack the `_old` generation and the duplicated
   zips/`latest.zip` from git, keep them on disk (R3, R5). Halves the repo
   with zero runtime impact.
4. **Kill the junction swap:** give old-generation runs their own include path
   (e.g. pass Simba an explicit include dir per run, or maintain two fixed
   junction pairs) so nothing is mutated at launch time. Fixes B4 for good.
5. **Single generation (ambitious):** migrate old-generation scripts to the
   new WaspLib, or freeze them in a `legacy/` runtime. Only after we're
   comfortable editing the scripts themselves.

Risk: step 3 low, step 4 medium (touches the launch mechanism), step 5 high
(script-level changes — needs real familiarity with the scripts).

## Phase 5 — Polish

1. Branding: rename productName/window title to `osrs-bot` (keep the Tauri
   `identifier` or migrate the AppData store deliberately), fix the template
   CLI plugin description (B16).
2. Set a real CSP (`tauri.conf.json`) now that no remote content is needed (B12).
3. Delete remaining dead code: `get_running_scripts` stub, `first_comment`,
   `client/linux.rs`, dicebear fallback, stray `console.log`s (B15, F-low).
4. Remove the inert `.github/` workflows from `launcher/` (R8).
5. Docs: expand the READMEs (architecture overview, how the launcher/runtime
   interact, how to add a script); keep AUDIT.md/ROADMAP.md up to date.
6. Optional: history rewrite to actually shrink `.git` after R3/R4 untracking,
   if repo size ever matters.

## Status

- [x] Phase 0 — rename to osrs-bot, drop desktop junctions, disable
      self-updater, repoint Includes junctions (2026-07-09/10, commit `ce011fe`+)
- [ ] Phase 1 — cut WaspScripts/Supabase/auth
- [ ] Phase 2 — portability
- [ ] Phase 3 — robustness
- [ ] Phase 4 — library consolidation
- [ ] Phase 5 — polish

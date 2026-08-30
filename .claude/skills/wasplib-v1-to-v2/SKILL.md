---
name: wasplib-v1-to-v2
description: Convert an OSRS Simba/WaspLib script from the v1 (osr/TRS*) library generation to v2 (main/Game*). Use when a script includes {$I WaspLib/osr.simba} (or SRL-T/osr.simba) and needs to run on the v2 libraries. Covers the type/enum/global renames, the launcher's generation detection, and the SCRIPT_GUI / remote-input setup gotcha.
---

# WaspLib/SRL-T v1 -> v2 script conversion

Torwent renamed WaspLib (v20.4.34 -> v20.4.42) and SRL-T (v7.21.48 -> v7.21.56):
the `osr/` folder + `osr.simba` include became `main/` + `main.simba`, and most types
dropped their `RS`/`TRS`/`ERS`/`PRS` prefix (a subset became `Game*`).

**The v1 libraries were RETIRED on 2026-08-28** (commit `1347ecb`): only
`Includes/WaspLib_v2` + `Includes/SRL-T_v2` remain, the `Includes/WaspLib` /
`SRL-T` junctions permanently point at `_v2`, and the launcher's
`script_generation` always returns "v2". No junction switching is needed
anymore — every script simply must compile against the v2 tree.

## Procedure (the safe, validated method)

1. **Restore net.** All `Scripts/*.simba` are git-tracked since 2026-08 — git is the
   backup, no `.v1bak` copies needed. (Only make a copy for a genuinely untracked file.)

2. **Inventory the tokens actually used** (targeted > blanket replace):
   ```
   grep -ohE '\b(TRS|ERS|PRS)[A-Za-z0-9_]+|\bRS[A-Z][A-Za-z0-9_]*|\bRS_[A-Z0-9_]+' foo.simba | sort -u
   ```

3. **Exclude the script's OWN types.** A script may define e.g. `TRSDepositBoxItem = record`.
   Do NOT rename those — they'd vanish or collide. Find them:
   ```
   grep -nE '\b(TRS|ERS|PRS)[A-Za-z0-9_]+ *=' foo.simba
   grep -nE '= *record\((TRS|ERS)' foo.simba
   ```

4. **Verify each target exists in v2 before renaming** (don't trust the table blindly):
   ```
   grep -rlE '\bTGameObjectV2\b' Includes/WaspLib_v2 Includes/SRL-T_v2
   ```

5. **Rename with word boundaries** (`sed -i -E 's/\bTOKEN\b/REPL/g'`). `\b` makes prefix
   overlaps safe (e.g. `\bTRSItem\b` won't touch `TRSItemArray`). For `RS_FONT_*` use a
   prefix replace: `s/RS_FONT_/FONT_/g`. Change the include:
   `s#\{\$I WaspLib/osr\.simba\}#{$I WaspLib/main.simba}#`.

6. **Verify the conversion:** re-run the inventory grep (only the script's own types should
   remain), confirm `grep -ciE 'osr\.simba' foo.simba` == 0 (so the launcher sees it as v2).

7. **The GUI / remote-input gotcha (bit us on aeromlm — read this):**
   - v1 scripts often do `{$DEFINE SRL_USE_REMOTEINPUT}`. In v2, **remove it.**
   - If the script has a GUI (`GUI: TScriptForm`, a `TScriptForm.StartScript`/`Setup`
     override), it MUST `{$DEFINE SCRIPT_GUI}`. WaspLib's `TGameClient.Setup` only sets up
     RemoteInput early when `SCRIPT_GUI` is NOT defined — and that early (pre-GUI) setup is
     broken under the hidden/headless launcher, giving `[GameClient][Fatal]: Unable to draw
     on this client` at login. `SCRIPT_GUI` defers setup to the proper time.
   - The shared `TScriptForm.Run()` sets RemoteInput up (gated on `WLSettings remote_input.enabled`),
     but a script with a custom flow may not reach it. Fix: after the script shows its GUI
     (`GUI.Run;`) and before login, add the **GATED** block — NEVER the unconditional
     `Setup()`. An unconditional Setup forces RemoteInput on and breaks Julio's
     "RemoteInput off = real mouse" mode (caused a regression on 2026-08-28, fixed in
     `b7b8a6f` across 18 scripts):
     ```
     {$IFNDEF SRL_DISABLE_REMOTEINPUT}
     if WLSettings.GetObject('remote_input').getBoolean('enabled', True) and (not GameClient.RemoteInput.IsSetup()) then GameClient.RemoteInput.Setup();
     {$ENDIF}
     ```
   - Note: `RemoteInput.Setup` in this repo reads `TARGET_PID` (launcher-passed client PID)
     outside the `SIMBAHEADLESS` guard, so `IsSetup` is true once `Setup()` runs headless.

8. **Compile-test headless** — point the `Includes\SRL-T` / `Includes\WaspLib` junctions at
   the `_v2` folders, then:
   ```powershell
   cd C:\Users\Julio\Desktop\osrs-bot\runtime
   .\Simba64.exe --compile Scripts\foo.simba   # prints "Succesfully compiled" or the first error
   ```
   (Use Start-Process with -RedirectStandardOutput to capture; it exits by itself.)
   The mechanical renames are ~90%; remaining failures are deeper v1->v2 API differences
   (changed method signatures, moved functions) that only surface at compile — fix them one
   red line at a time. In the 2026-08 batch (gemstone crab 7.7k lines, port roberts,
   varlamore hunter, run manager) every script compiled first-try on renames alone.

## Rename rules of thumb
- Drop the leading `RS` / `TRS` / `ERS` / `PRS`.
- A handful of object/client/button/interface types became `Game*` instead of bare-dropping.
  For scripts using `Objects.Get()` / `Objects.GetByCategory`, `TRSObjectV2` -> **`TGameObjectV2`**.
- `RS_*` constants drop `RS_`. `osr/` folder + `osr.simba` -> `main/` + `main.simba`.
- The `Objects` / `Minimap` / `DepositBox` etc. GLOBAL instances keep their (unprefixed) name;
  only the TYPES change. `Map.Objects()` is unchanged.

## Include / folder / define
```
{$I WaspLib/osr.simba}  ->  {$I WaspLib/main.simba}
osr/  (folder)          ->  main/
WL_OSR    -> WL_MAIN       SRL_OSR -> SRL_MAIN
WL_RSREGIONS_INCLUDED -> WL_REGIONS_INCLUDED
```

## The object types (pick by context)
```
TRSObjectV2 -> TObjectV2 -> TGameObjectV2   (SRL-T map object; what Objects.Get() returns -> use TGameObjectV2)
TRSObject   -> TGameObject                   (WaspLib walker object = TWalkerObject-based)
TRSObjectV2Array -> TGameObjectV2Array       (TObjectV2Array does NOT exist in v2 — verified 2026-08)
PRSObjectV2 -> PGameObjectV2
```

## Records / Types (T*) — drop TRS, except the Game* ones noted
```
TRSButton -> TGameButton (+Array/Dimensions)   TRSClient -> TGameClient
TRSGameTab(s) -> TGameTab(s)                    TRSObjects -> TGameObjects
TRSPosition -> TGamePosition                    TRSScrollBar -> TGameScrollBar
```
All other `TRS*` just drop `TRS` -> `T*`, e.g.:
`TRSChat->TChat, TRSChatButtons->TChatButtons, TRSChooseOption(_OptionArray)->TChooseOption(_OptionArray),
TRSDepositBox->TDepositBox, TRSInventory->TInventory, TRSItem(Array/Interface)->TItem(Array/Interface),
TRSItemFinder->TItemFinder, TRSLogin->TLogin, TRSLogout->TLogout, TRSMagic->TMagic, TRSMainScreen->TMainScreen,
TRSMap->TMap, TRSMapObject(s)->TMapObject(s), TRSMinimap->TMinimap, TRSNPC(V2/s)->TNPC(V2/s),
TRSObjectFinder->TObjectFinder, TRSOptions->TOptions, TRSPlayer->TPlayer, TRSPrayer->TPrayer,
TRSStats->TStats, TRSStore->TStore, TRSWalker(V2)->TWalker(V2), TRSWalkerObject(s)->TWalkerObject(s),
TRSXPBar->TXPBar`, etc. (full list in Torwent's diff — drop-prefix is the rule).
```

## Enums (E*) — drop ERS
```
ERSChatButton(State)->EChatButton(State), ERSEquipmentSlot->EEquipmentSlot, ERSGameTab->EGameTab
(ERSGametab typo also -> EGameTab), ERSLogoutButton->ELogoutButton, ERSMinimapDot(s)->EMinimapDot(s),
ERSPrayer->EPrayer, ERSSkill->ESkill (scripts sometimes write ERSSKILL), ERSSpell(Book)->ESpell(Book),
ERSConsumable->EConsumable, ERSOptionsTab->EOptionsTab, ERSEmote->EEmote, ERSAttackType->EAttackType,
ERSAttackOption->EAttackOption, ERSBankMiscButton->EBankMiscButton, ERSClientMode->EClientMode,
ERSLogType->ELogType (birdhouserunner handler's own enum), ...
ERSMap->EGameMap, ERSMapJSON->EGameMapJSON, ERSMapObjectType->EGameMapObjectType (map enums -> EGame*).
```

## Pointer types (P*) — drop PRS (Game* where the type is Game*)
```
PRSNPC->PGameNPC, PRSNPCArray->PGameNPCArray, PRSNPCV2->PNPCV2,
PRSObject->PGameObject, PRSObjectArray->PGameObjectArray, PRSObjectV2->PGameObjectV2,
PRSWalker(V2)->PWalker(V2), PRSWalkerObject->PWalkerObject
```

## Constants / globals
```
RSCacheParser->CacheParser   RSClient->GameClient       RSInterface->GameInterface
RSObject->GameObject         RSObjects->GameObjects     RSTranslator->Translator
RSMAP_PATH->MAP_PATH         RS_FONT_*->FONT_*          RS_ITEM_*->ITEM_*
RS_INSTANT_THROW_SPELLS->INSTANT_THROW_SPELLS
```

## Files that dropped rs prefixes (if a script `{$I}`s them directly)
`rsclient.simba->client.simba, rsobjects.simba->objects.simba, rsmonster(s).simba->monster(s).simba,
rsnpcs.simba->npcs.simba, rsgrounditems.simba->grounditems.simba, rsteleports*.simba->teleports*.simba,
rsfishinghandler.simba->fishinghandler.simba`

## Notes
- Some reference entries reflect intermediate/typo commits later corrected
  (e.g. `ERSGametab` and `ERSGameTab` both -> `EGameTab`).
- Always confirm against the actual `Includes/*_v2` tree, not just this table — it's a snapshot.
- Names that look v1 but are UNCHANGED in v2 (do not rename): `RSMouseZoom` (global),
  `RSW_ADAPTIVE_SCREEN_TOGGLE_DISTANCES`, `RSTeleports.*`, the `TTranslator.RSMap` field,
  and any `RSW`/`RSWWalker` record fields (only their TYPE names change).

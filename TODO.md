# TODO

Findings from actually reading every mod's Steam Workshop page (description,
"Required items", and comments) and checking whether it needs setup beyond
being in `mods.txt` to deliver its intended benefit. Cross-checked against
what `src/*.ts` already automates (see [`MODS.md`](MODS.md)) - only genuinely
open items are listed here. Everything that's been fully automated or
confirmed to need no action has been removed from this file as it's
completed - see `MODS.md` and git history if you need that context again.

## Not auto-fixed - manual decisions and one-time actions

Config-level decisions and hand-authoring that don't depend on the server
having a stable, populated world yet - these can be done any time.

- [ ] **Compatibility/risk items** worth a live-testing pass (vehicle keys
      resetting with Terje-Core+Expansion, Spatial_MaxAccuracy on
      DayZ-Dynamic-AI-Addon, COT's weather panel, Keep-It-Dead + AI mods) -
      see [`TESTS.md`](TESTS.md) for the full test procedures.

## World-crafting checklist (do not start until the server has a stable base)

**Don't start this section yet.** These are hands-on, in-world
building/placement tasks, not code or config fixes - they only make sense
once mods are verified working, the loot economy/AI difficulty is tuned to
taste, and the "Not auto-fixed" section above is resolved. Roughly in the
order worth tackling once that's true:

1. [ ] **Place the safe-zone/economy anchors** - `P2P-Trading-Board`'s
       notice board object (`BTB_TradeBoardNoticeBoard`, via Editor or
       Community Online Tools) somewhere on the map, plus review
       `profiles/Beetle/tradeboard/config/tradeboard_config.json` (it ships
       2 fictitious placeholder `IndividualLotLimits` SteamID entries that
       need replacing with real player SteamIDs, and a `VehicleTrade`
       sub-config already enabled with sane-looking defaults worth tuning).
       Also decide on `DayZ-Expansion-Market`'s 6 existing stock trader
       zones (Svetloyarsk, BalotaAircrafts, KamenkaBoats, GreenMountain,
       Kamenka, Krasnostav under
       `server/mpmissions/dayzOffline.chernarusplus/expansion/traderzones/`)
       once **custom traders** (planned down the road) are designed -
       whether to keep/relocate/replace these zones, and whether individual
       item prices need rebalancing against the currency-scarcity tuning
       already in `src/economy.ts`, are all decisions that should follow the
       custom-trader design rather than precede it.
2. [ ] **Author hazard/danger zones** - `Terje-Radiation` ships exactly one
       example zone (`TerjeRadioactiveScriptableArea` at `341 0 9401` in
       `profiles/TerjeSettings/ScriptableAreas/ScriptableAreasSpawner.xml`)
       but with `Active=0`; decide whether to enable it or author real zones
       (schema: `OuterRadius`/`InnerRadius`/`HeightMin`/`HeightMax`/`Power`).
       `CJ187-RandomMineFields` already ships one real default minefield
       (`profiles/CJ_RandomMineFields/RandomMineFields.json`, two field
       entries around `10173,2606` - `10247,2596`); decide whether that's
       where we want mines or add/relocate fields for our own map layout.
3. [ ] **Wire up remaining vehicle spawns** - `MoreCars` (165 confirmed
       body/spare-part classnames, `src/moreCars.ts`), `UAZ-31514`, and both
       MBM trucks are all already merged into `db/types.xml` with
       `<nominal>0</nominal>` by design - typed and admin/trader-spawnable,
       but absent from the world until real `events.xml` entries (position
       `fixed`, listing color/reskin variants as children, matching
       vanilla's own `VehicleHatchback02`/`VehicleOffroadHatchback`/etc.
       pattern) plus matching `<pos x= z= a=>` coordinates in
       `cfgeventspawns.xml` are authored - real map-placement decisions.
4. [ ] **Place decorative/object packs** - `CS-Modular-Cave` (8 cave segment
       props), `Risus-Bases` (turns out to be a static shack/well/fence
       **prop pack**, not a craftable base-building system - worth
       confirming this matches what we actually wanted from a "bases" mod),
       `HeliWreckNoLoot` (inert wreck/wagon/tool models), `BuilderItems`
       (needs [Community Offline
       Mode](https://github.com/Arkensor/DayZCommunityOfflineMode)
       separately, must load on **every client** not just the server, and
       its own page warns it **conflicts with DayZ Expansion**, which
       already bundles an equivalent - worth checking whether it's a
       redundant/conflicting install), and `Fuel-System`'s
       `extras/generators positions/chernarus/generators.c` (a
       paste-into-init.c script that spawns ~30 `FS_PowerGenerator`/fuel-
       station prop objects at fixed real Chernarus coordinates - one-time,
       run once then remove from init.c). None of these do anything until an
       admin actually places content with them.
5. [ ] **Place `DayZ-Dog` wild-dog territories and dog houses** using the
       mod's own example configs (inspect before copying - author's own
       warning).
6. [ ] **Cherry-pick `Namalsk-Survival` clothing** into the mission's
       `db/types.xml` once the rest of the loot economy is tuned to taste.
       Its Hardcore/Regular variants are actually two complete alternate
       mission-economy folders built for the separate Namalsk **map** (own
       `cfgeconomycore.xml`/`db/economy.xml`/`db/types.xml`/
       `db/types_dzn.xml`/`cfgspawnabletypes.xml`), so don't merge a whole
       variant wholesale (risks pulling in Namalsk-map-only items or
       environmental-hazard flags) - just cherry-pick the new clothing
       `<type>` blocks (Gorka/Sumrak/Yeger camo, vests, ghillies) out of one
       variant's `db/types.xml`.
7. [ ] **Custom-Keycards door placement** - decide which doors get
       keycard-gated once the base map layout/economy feels right, added via
       the mod's own `CustomKeycards/Locations/` config rather than the
       Editor/COT.
8. [ ] **Tune Dynamic Scavenging's `noSearchZones`/`toolZones`** to match
       whatever safe zones/hazard zones were placed in steps 1-2 above
       (ships with one real example entry each already, plus a default
       `requireToolInHand` tool list currently disabled).
9. [ ] **Author `DayZ-Dynamic-AI-Addon` `Spatial_Audio` noise-trigger
       zones** - `Audio_Enabled` is currently `0` in
       `profiles/ExpansionMod/AI/Spatial/SpatialSettings.json`, so no
       `Audio` zone has ever fired; there's nothing to test until it's
       turned on. Unlike roaming `Group` AI (proximity/timer-based), these
       are fixed locations that specifically listen for noise (gunfire
       always triggers the zone; other sounds trigger once loud enough per
       `Spatial_Sensitivity`) - useful for punishing noise at specific
       high-value spots (bases, crash sites, event zones) even when no
       roaming AI happens to be nearby. Once enabled and at least one zone
       is authored, needs a live test pass per
       [`TESTS.md`](TESTS.md)'s existing `Spatial_MaxAccuracy` item (fire a
       weapon inside the zone's `Spatial_TriggerRadius` and watch for AI
       script errors tied to `Audio` entries).
10. [ ] **Author `MoreMaterials` loot economy + recipes from scratch** - its
        own page states outright that it ships **no types file at all** for
        its 350+ raw materials, and adds no crafting recipes of its own
        either - it's a raw crafting-material pack with zero built-in use.
        This is pure creative/design work, not a mechanical port job: decide
        which of the 350+ materials are worth keeping at all, where they fit
        in the loot economy (rarity/nominal/location tags matching the rest
        of the hardcore loot table), and - the actually hard part - design
        and author real crafting recipes that consume them (likely via
        `Crowwolfie-Recipes` or CE `cfgcraftingaction`, whichever is already
        set up for other custom recipes here) so they're not just inert
        clutter. Best tackled once the base loot economy/difficulty already
        feels right, so new recipes can be balanced against it.

## Nice-to-have companion mods surfaced by this research (not currently installed)

- [ ] **`InediaTerjeCompatibility`** - InediaStamina's own wiki recommends
      this separate compatibility mod for "proper" interaction with
      `Terje-Skills` (patches perk bonuses like `HeavyWeight`). Not required - base functionality already works - but recommended by the author if
      we want it done right rather than just working.
- [ ] **`Expansion-Spawn-Selection`** and **`Expansion-Groups`** - both
      suggested as optional pairings on `DayZ-Dynamic-AI-Addon`'s page
      (prevents AI spawning near players at the respawn screen; adds extra
      AI for player groups >2 respectively). Neither is currently installed.

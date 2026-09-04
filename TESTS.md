# TESTS

Live-server, in-game verification passes that can't be scripted by the CLI -
these need an admin actually playing/observing on a running server. Check
items off as they're confirmed; note the outcome (and any follow-up fix
needed) inline or in a linked issue.

## How to use this file

- These are manual/live tests only - nothing here can be verified by the
  Deno CLI or an automated test runner, since they depend on real mod
  runtime behavior on a populated server.
- Check off an item once it's been verified on a live server, and note the
  result (pass/fail + any follow-up) either inline here or in
  [`TODO.md`](TODO.md) if it turns into an actionable fix.
- New risk items surfaced by future mod research should be added here rather
  than left buried in `TODO.md`.

## Open items

- [x] **COT admin UI/keybinds were completely broken - root cause found
      and fixed** (2026-09) - **confirmed fixed live**: `END`/`Y` etc. work
      again after the republish + restart.
      **Root cause**: `DZSurvivalBaseDecay` (base abandonment decay) used to
      live in `serverpack-serveronly/` (server-only, never loaded by
      clients), but it also registers a Community-Online-Tools permission
      (`Admin.DZSurvivalBaseDecay.Trigger`) via a `JMModuleBase` subclass.
      COT requires every registered permission to exist identically on
      both client and server (it compares permission-tree _structure_ when
      syncing roles to a connecting client) - since the client never loaded
      that addon, its local tree had one fewer child under "Admin" than the
      server's, which threw `JMPermission::OnReceive`'s "Received child
      count N for X does not match registered child count M!" while
      deserializing the role sync on every connect. This silently
      corrupted that client's entire permission tree, which broke COT's own
      admin UI/keybinds entirely (`END`/`Y`/`H`/`INSERT`, all gated on
      `HasPermission("COT.View")`) while server-side-only permission checks
      (chat commands like `/restock`/`/basedecay`) kept working fine - the
      confusing split-brain symptom that made this so hard to pin down.
      Found by digging through the client's own RPT at
      `<Proton prefix>/drive_c/users/steamuser/AppData/Local/DayZ/
DayZ_x64_*.RPT` (NOT `Documents/DayZ/` - this client install doesn't
      write RPTs there at all, which cost a lot of time before finding the
      right folder).
      **Fix applied**: moved `DZSurvivalBaseDecay` into `serverpack/`
      (shared client+server pack) - see `serverpack/README.md`'s
      "Current addons" writeup and `src/paths.ts`'s comment on
      `SERVERPACK_SERVERONLY` for the full incident writeup. Its actual
      decay logic stays server-only via `GetGame().IsServer()` guards.
      `serverpack-serveronly/` is now empty; `src/server.ts`'s `doStart()`
      was updated to skip staging/loading it entirely whenever it has no
      addons (previously it unconditionally tried, which would have hard-
      failed the build - `deno task verify-serverpack-serveronly` dies on
      zero addons).
      Still worth a follow-up sanity check next time you're on: confirm
      `/basedecay status` and `/restock now` both still work (moving the
      addon shouldn't have regressed its own commands, but never
      independently re-confirmed after the move).

- [ ] **False "You have entered a safezone!" message - fixed, needs
      confirming on next restart** (2026-09). Separate bug found while
      investigating the above: `SafeZoneSettings.json` had two stock
      DayZ-Expansion-Core default `CircleZones` (a Chernogorsk-area one
      and a coastal-town one near common fresh-spawn beaches) plus an NWAF-
      area `PolygonZone`, none of which this project ever asked for - only
      the custom trader city's own zone was intentional. That's why a
      "safezone" message could appear "several kilometers from the
      trader", right after a fresh spawn on the coastline. Trimmed
      `SafeZoneSettings.json` down to just the trader city's own
      `CircleZone` and re-enabled the module (`Enabled: 1` - it had been
      temporarily set to `0` mid-investigation). `src/traders.ts`'s
      `ensureCustomTraderSafeZone()` only ever adds/updates its own entry
      by matching position, never touches/re-adds anything else, so this
      edit should stick across restarts - worth confirming: after the next
      restart, spawn on the coast and confirm no safezone message appears
      until you're actually near the trader city.

- [ ] **NeonMurder-Lights -> Forever_Burning_Campfire swap - now fully
      automated** (`src/foreverBurningCampfire.ts`,
      `serverpack/addons/DZSurvivalTraderFireplace`) - removed
      `@NeonMurder-Lights` (2822125184), added `@Forever_Burning_Campfire`
      (1890912719). Rather than a manual DayZ-Editor placement, this now
      wires in automatically on every server start. `FBF_FireBarrel`/
      `FBF_Torch` x4/`FBF_AreaLight_Warm` (plain decorative static props,
      confirmed via derapifying the mod's own config.bin) are declared in
      `server/mpmissions/dayzOffline.chernarusplus/expansion/objects/ForeverBurningCampfire.map`
      via DayZ-Expansion-Core's own generic placed-object mechanism -
      confirmed working live (dry-run against the real mission wrote all 6
      lines, including the 2 real user-given torch spots at
      `7993.89 220.883 11307.7`/`7993.91 220.822 11304`). `FBF_Fireplace`
      (the actual eternal flame - a genuine persistent entity, which the
      mod's own docs warn against placing via Editor/init since it'll
      multiply) is spawned + permanently ignited exactly once by a new
      EnforceScript addon, `DZSurvivalTraderFireplace` - confirmed its
      scripts compile cleanly via a real headless server boot
      (`deno task verify-serverpack`).

      **Still needs, on a real live server, since none of this can be
              confirmed from here**:
              1. Confirm all 6 static props actually render at the trader and
                 don't clip into a wall/other prop - the original 4 (barrel/2
                 torches/area light) are a PLACEHOLDER (a few meters off the
                 general trader NPC's own spot, never visually confirmed against
                 the real built town); the other 2 torches are real user-given
                 coordinates but still assumed `FBF_Torch` (no classname was
                 specified when given). If anything needs to move/change, the
                 offsets live in two places that must be updated together:
                 `src/foreverBurningCampfire.ts`'s
                 `PLACEMENTS`/`FIRE_BARREL_OFFSET` and
                 `DZSurvivalTraderFireplace_Module.c`'s `FIRE_POSITION`.
              2. Confirm the fireplace addon actually fires ~20s after mission
                 start - check the `.ADM` admin log (COT reads it live) for
                 `[TraderFireplace] Spawned and permanently ignited FBF_Fireplace...`
              3. Confirm the flame visually sits inside/right next to the barrel
                 prop (not floating/sunk into the ground) and that it's actually
                 burning (lit) rather than just present unlit.
              4. This addon ships inside the already-published
                 `DZSurvivalServerPack` Workshop item - run
                 `deno task publish-serverpack` (auto-verifies first) so players
                 actually receive `DZSurvivalTraderFireplace`.
              5. Separately, the _old_ NeonMurder campfire props are still
                 sitting in the live DayZ-Editor scene
                 (`server/mpmissions/dayzOffline.chernarusplus/EditorFiles/survival-server-1.dze`,
                 confirmed via `strings` referencing
                 `neonm_lights_models\models\campfire.p3d`/`campfireempty.p3d`) -
                 these will fail to load now that the mod is gone. Open
                 DayZ-Editor, delete them (no need to replace them with anything -
                 the new mod's props are auto-placed separately now), then
                 `deno task sync-editor` and restart.
              6. Confirm the new mod's lights don't look jarring/oversaturated at
                 the trader (its own docs warn DayZ struggles with more than 4-5
                 lights in one small area - shadows are already disabled in the
                 mod for performance).

- [ ] **Market variant-integrity fix** (`src/marketGapFill.ts`) - confirmed via a
      direct dry-run (`tuneExpansionMarket()` + `ensureMarketGapFill()` against
      the live, previously-corrupted `profiles/ExpansionMod/Market/*.json`
      files, no full server boot needed) that the `MARKET CONFIGURATION
ERROR` self-reference/multi-parent-claim/chain-conflict counts all drop
      to 0. Still worth a real boot to double-check the server's own log
      (`profiles/script_*.log`) no longer has the ~6,212 `MARKET
CONFIGURATION ERROR` lines it had every start before this fix, and that
      trader stock/prices still look sane in-game (the repair only clears
      bogus `Variants` lists, it doesn't touch pricing/stock).
- [ ] **`DayZ-Dog` wild-dog territories** (`src/wildlifeTerritories.ts`) -
      confirm `Doggo_Wild1..35` actually spawn in the wild across the
      `dog_territories_cherno.xml` zones (dogs roam, chase, and are dangerous
      in packs per the mod's own description), that they don't collide with
      existing wolf/bandit patrol zones in a way that breaks pathing, and that
      the `WildDog` territory doesn't throw a CE "type not found"/missing-model
      error on server start. If dogs never appear, double check the mod's
      `.pbo` actually loaded (it needs both client+server per its Workshop
      page) before assuming the config is wrong.
- [ ] **Colder weather tuning** (`src/weather.ts`) - confirm
      `cfgweather.xml` actually took effect (skies noticeably greyer/foggier on
      average, rain more frequent, a light breeze essentially always present)
      and that it doesn't feel _oppressively_ foggy/dark to the point of
      hurting visibility-dependent play unfairly - if so, ease
      `fog`/`limits`/`max` down a bit in `weather.ts`. Also confirm the
      `<!-- dayz-survival:colder-weather-tuned -->` marker survives a
      `deno task install` (i.e. steamcmd validation doesn't silently revert
      `cfgweather.xml` back to vanilla without re-triggering our tuning - it
      shouldn't, since `doStart()` re-checks the marker on every start, but
      worth a real confirmation once).
- [ ] **NW-cold climate gradient** (`@DDP-Climate-Zones`,
      `src/climateZones.ts`) - confirm on a live server that: 1. It's actually colder walking toward the NW quadrant and the
      transition feels like a gradient rather than 3 sudden jumps at each
      ring's edge (uncertain exactly how the mod blends between two
      _different_-valued overlapping zones at a shared boundary - only
      confirmed how `BlendDistance` blends a single zone's own edge back
      to whatever's outside it, per its own docs). 2. The coldest core (`DZSurvival_NW_ColdCore`, centered at `3200 0
 12300`, radius 3000) is actually on dry, walkable land and not out
      in open water or on an unreachable cliff face - the center was
      picked geometrically (NW quadrant center, nudged toward the Tisy/
      Zub Castle high country) and never verified in-engine. 3. It doesn't stack unpleasantly with `src/weather.ts`'s already-
      colder/foggier global baseline to the point hypothermia becomes
      unfair/instant near the NW core - ease the `TemperatureOffset`
      values in `climateZones.ts` down if so. 4. (Pairing this with a visual NW-only snow reskin was considered
      and decided against - see `TODO.md` item 3. Nothing to verify
      there.)
- [ ] **Terje-Radiation danger zone placement** (`src/hazards.ts`) - the
      zone's position (`341 0 9401`), 500m outer radius, and its `Y=0`
      "auto-snap to ground level" behavior were never independently verified
      on a live map - `X=341` is very close to Chernarus's western edge, so
      confirm in-game that the zone actually lands on dry ground (not
      underwater/off-map) and feels like a sensible, reachable danger zone. If
      it's in the ocean or otherwise broken, relocate it (edit the `<Position>`
      in `profiles/TerjeSettings/ScriptableAreas/ScriptableAreasSpawner.xml` -
      or better, move the authored value into `hazards.ts` once a good spot is
      confirmed, so it survives a fresh install).
- [ ] **New military patrol coordinates** (`ai/AIPatrolSettings.json`) -
      `Roaming_Bandits_Vybor` (`4400, 100, 8850`) and
      `Roaming_Bandits_GreenMountain` (`7650, 400, 11150`) are brand new,
      approximate-from-general-map-knowledge coordinates that have never
      been checked in-game (unlike the other 12 patrols, which have at
      least been running live for a while). Confirm both actually land on
      the real Vybor military base / Green Mountain bunker area (not in a
      field, forest, or off by enough that they don't feel connected to the
      landmark) and nudge their `Waypoints` if not - the in-game admin AI
      menu (see MODS.md) is the easiest way to get an exact position.
- [ ] **No-Build-Zones** (`src/noBuildZones.ts`) - confirm the mod itself
      loaded correctly (client+server) and that building is actually
      blocked within 300m of NWAF (`4501, 10231`) without misfiring
      elsewhere on the map or blocking legitimate trader-town construction
      (the trader city is nowhere near NWAF, so this shouldn't overlap, but
      worth a real confirmation once).
- [ ] **Namalsk clothing cherry-pick** (`src/namalskClothing.ts`) - confirm
      the 12 newly-merged items (`BDUpants`, `GorkaHelmet_Black`,
      `Headtorch_Black`/`Grey`, `HipPack_Black`/`Green`/`Medical`/`Party`,
      `NVGHeadstrap`, `NylonKnifeSheath`, `OMKJacket_Navy`,
      `OMKPants_Navy`) actually spawn in the world (their added `<usage>`
      tags are a best-effort guess based on each item's own `<tag>` hints,
      not verified against a live spawn), and that their models/icons
      render correctly for a Chernarus mission with `@Namalsk-Survival`
      loaded as a regular content mod (it ships as a full map mod, so its
      assets should resolve fine, but this combination hasn't been
      confirmed live).
- [ ] **AI-Bandits Chernarus patrol density** (`src/aiBanditsDensity.ts`) -
      confirm the 6 merged patrol routes (`NWAF_Industrial`, `NWAF_Gate`,
      `TISY_Back`, `TISY_Tents`, `Petrovka_West`, `Severograd_West`) all
      spawn and patrol correctly - these are the mod author's own shipped
      Chernarus example, but they've never been run on this server before.
      Also decide whether to hand-author a real `SniperLocations` entry (the
      shipped one was skipped for shipping a `"0 0 0"` placeholder
      position) and whether `SpawnerBubaku` is worth adding once someone's
      willing to place its trigger zones in-game (see TODO.md item 8).
- [ ] **Ambient hunt-mode pacing** (`src/difficulty.ts`'s
      `tuneSpatialAIDifficulty()`) - confirm hunting `Group` spawns actually
      feel like "genuinely hunted, not point-blank ambushed" in practice:
      the 20-40 minute spawn timer plus the new 20-minute `CleanupTimer`
      floor is a config-only estimate, never played against live. If hunts
      feel too rare, too frequent, or still too short to actually catch up,
      adjust `Spatial_MinTimer`/`Spatial_MaxTimer` (in
      `ai/SpatialSettings.json`, self-generated - not currently tuned by this
      project) and/or `SPATIAL_CLEANUP_TIMER_FLOOR` in `src/difficulty.ts`.
- [ ] **Keycards are now find-only, sell-only (2026-09 update, supersedes
      the old "buyable" test below)** (`src/marketGapFill.ts`,
      `src/traders.ts`) - project owner decided keycards should never be
      purchasable at all, only found in loot and sold back for a modest
      amount. Implemented via `ExpansionMarketTrader`'s per-item `Items`
      map (`CanOnlySell` = 2), set for every `evg_keycards_*` classname on
      the General Store trader identity. Confirm live: 1. Opening the General Store's Utility category, every keycard (and
      `evg_keycards_All`) shows a sell-only indicator (or simply can't be
      bought - no "Buy" button/action succeeds) while still being
      sellable for a real payout if you have one in inventory. 2. Selling a single-location card (`evg_keycards_Blue`/`NWAF01`/
      `Tisy01`/etc.) pays out roughly 9,000-15,000 (60% of the new
      15,000-25,000 basis, Legendary tier). Selling `evg_keycards_All`
      pays out roughly 28,800-31,200 (targeting the project owner's
      requested ~30,000). 3. They still spawn naturally in loot (already confirmed via
      `server/@Custom-Keycards/.info/types.xml` merging into db/types.xml
      with `nominal=2`/`tag=shelves`) - no loot-table change was made this
      pass, only the trader's buy/sell behavior.
- [ ] **Custom vehicle world spawns** (`src/vehicleSpawns.ts`) - confirm
      `UAZ-31514`, both MBM trucks, and the 25 `MoreCars` body variants
      actually spawn at the existing `VehicleOffroadHatchback`/
      `VehicleHatchback02`/`VehicleSedan02`/`VehicleTruck01` positions in
      `cfgeventspawns.xml` (never independently confirmed for this specific
      combination of custom classnames), that they don't visibly crowd out
      the original vanilla-colour cars at those same spots, and that none of
      the 45 classnames throws a CE "type not found" error on server start
      (would indicate a typo'd classname - check `script.log`/`*.RPT`).
- [ ] **Raised military patrol density** (`src/ai.ts`'s `MilitaryPatrols`
      category, now 6/7/8/9 across the 0-10/11-25/26-50/51+ player
      thresholds - raised twice: 3/4/5/6 -> 4/5/6/7 -> 6/7/8/9 - and
      `RoamingBandits` raised alongside it, 5/8/10/12 -> 7/10/12/14) -
      confirm this actually feels like a meaningful bump at
      NWAF/Tisy/Balota/Vybor/Green Mountain and across the wider map without
      tanking server FPS, and that all patrols are actually using the
      category (never independently confirmed on a fresh live merge until
      this change - the live mission file was found stale/missing 2 of the
      5 patrols entirely before an earlier fix reconciled it).
- [ ] **Military garrison event** (`src/militaryMonsters.ts`'s
      `InfectedYuretskiyMilitary`) - confirm the 7 Yuretskiy zombie variants
      actually spawn at all 5 military coordinates, that `position=fixed`/
      `limit=mixed` behaves as expected for a multi-classname/multi-position
      event (never tried with these classnames before), that none of them
      throws a CE "type not found" error on server start, and that the
      combined density (roaming `MilitaryPatrols` bandits + this fixed
      garrison) feels appropriately dangerous rather than overwhelming at
      each base.
- [ ] **Necromutant book event** (`src/necromutant.ts`) - **a real bug was
      found and fixed this session**: the book used to be wired via a
      `position=player` DynamicEvent, which doesn't work for a plain
      `ItemBase` (confirmed via `deno task verify-serverpack`'s RPT:
      `[DynEvent] "NecromutantBook" will be ignored :: failed to determine
spawner type!`) - fixed by dropping the event and giving the book's
      own `<type>` block `<usage>` tags (`Historical`/`Village`) instead, so
      it spawns through the ordinary CE loot economy. Confirmed via a fresh
      `verify-serverpack` boot that the CE no longer logs any error for it.
      Still needs live confirmation: that `JVDS_Book_darkness` actually
      turns up as loot in-game at a reasonable rate, that finishing reading
      it triggers the mod's own zombie wave + boss spawn as documented, and
      that the `JVDS_cross_gravestone` reward actually drops on the
      mutant's death.
- [ ] **BMM Chemical Zombie event** (`src/bmmChemicalZombie.ts`) -
      **confirmed broken as of this session**: `deno task verify-serverpack`'s
      RPT log shows `!!! [CE][DE] (InfectedBMMChemical) :: Unable to create
child (BMM_Chimical_Zombies) as the type does not exist.` followed by
      `DynamicEvent "InfectedBMMChemical" setup is invalid, event will be
disabled.` - the event never spawns anything at all currently. The
      classname was originally confirmed via `strings` on the mod's own
      `bmm_chimical_zombie.pbo` and `BMM_Chimical_Zombies` (plural) does
      appear as a raw string there, but attempting to unpack the PBO
      properly (`armake2 unpack`) to verify the real CfgVehicles class name
      failed outright (`Failed to create output folder: Not a directory`) -
      `armake2 inspect` reveals the PBO is deliberately **obfuscated**
      (17,166 garbled/duplicate file entries, e.g. repeated
      `deobfuscated_file0` paths), so the mod author has intentionally
      hardened it against exactly this kind of inspection. Rather than
      guess a classname fix that could easily be wrong, this needs an
      admin to check in-game: spawn/search for `BMM_Chimical_Zombies` via
      the Community-Online-Tools object spawner (or `#createobject`) to see
      whether the game itself recognizes that exact classname (if COT can
      spawn it, the classname is right and the bug is elsewhere in the
      event wiring; if COT also fails, the real classname differs from what
      `strings` suggested and needs finding some other way - e.g. asking on
      the mod's own Workshop comments, or trying a plausible variant like
      the singular `BMM_Chimical_Zombie` also seen in the same `strings`
      output).
- [ ] **TP-Apoc vehicles** (`src/vehicleSpawns.ts`/`src/fuelSystem.ts`/
      `src/vehicle3pp.ts`) - confirm the SUV/Pickup variants actually world-
      spawn at `VehicleOffroad02` locations, that all driveable variants
      (including the M1025's NoGun/StaticGun forms, trader-only) actually
      spawn/drive/refuel correctly with diesel, and that 3rd-person view
      works for all of them. Also confirm `AnimatedDynamicHelicopters`'
      crash/flight scripting doesn't misbehave on the existing Expansion
      helicopters.
- [ ] **TGK-WeaponPack items at the trader** (`src/tgkWeaponPack.ts`,
      `src/data/marketGapFill.json`) - confirm all ~280 classnames actually
      show up for sale in the correct trader categories (Guns_Military,
      Gun_Attachments_Military, Tools_And_Melee, Gun_Ammo), that none of
      them throw a CE "type not found" error on server start (this is a
      from-scratch types.xml entry for every one of them, never verified
      live), and that the pricing/stock tiers feel right in practice (Rare
      standard rifles, Legendary heavy/sniper weapons and the grenade
      launcher).
- [ ] **Optics / Paragon-Storage / Survivor-Backpack market pricing**
      (`src/data/marketGapFill.json`) - confirm the new Optics attachments,
      Paragon-Storage containers (priced into the high-end Base Building
      tier, similar to "Your personal box"), and Survivor-Backpack bags
      actually show up for sale at sensible prices/categories, and that
      Paragon's non-sellable `Paragon_*` base/deployed forms never
      accidentally appear in the trader (only the purchasable `StorageBox_*`
      kit forms should).
- [ ] **Airborne AI vs. AirRaid overlap** (`@Airborne-AI`, `@AirRaid`) -
      confirm these two behave as complementary (AirRaid bombs locations;
      Airborne AI drops troops) rather than duplicating or conflicting with
      each other now that both are live.
- [ ] **AI War Zones FPS impact** (`@Ai-Warzone`, capped to
      `maxConcurrentZones=2` via `src/aiWorldEvents.ts`) - this is the
      biggest FPS-risk addition of the whole recent AI batch purely from
      stacking on top of DayZ-Expansion-AI/AI-Bandits/Dynamic AI
      Missions/the fixed military garrisons. Watch server FPS closely once
      a zone actually triggers.
- [ ] **hSF Zombie Horde Event point-blank check** (`@hSF-Zombie-Horde-
Event`, `src/aiWorldEvents.ts`) - confirm a horde never spawns right
      on top of a lone player (only nearby) and that the trader city's new
      `SafeZones` exclusion actually keeps hordes out of it.
- [ ] **Sector 31 - Dynamic Hordes** (`@Sector31-DynamicHordes`, id
      `3777397357`, added `server`-side-only in `mods.txt`) - confirmed live
      via the Steam Web API (its own Community page renders a stale/
      misleading "removed" banner - don't trust that page). Not yet
      installed/verified on this dev machine (steamcmd hasn't downloaded it
      here), so still to check on the real server: 1. It actually downloads and the server boots with it active (no
      script/PBO errors specific to it, beyond the benign per-mod
      "Can't load .../Anims/cfg/skeletons.anim.xml" line every mod
      without a skeleton override gets). 2. Hordes actually spawn and roam Chernarus using the built-in
      waypoint network, react to gunfire/engines as advertised, and stay
      out of the trader city (check the self-generated
      `profiles/Maps/dayzOffline.chernarusplus.json` /
      `profiles/Settings.json` for any safe-zone/excluded-area field once
      it exists - if there is one, wire the trader city into it the same
      way `src/aiWorldEvents.ts` does for the other AI-event mods; if
      there isn't, rely on keeping the trader city off the built-in
      waypoint network instead). 3. FPS impact and no overlap/double-spawning with the other zombie/
      horde mods already running (`@hSF-Zombie-Horde-Event`,
      `@InediaInfectedAI`, `@CreepyZombies`, `@Custom-Zombies`,
      `@BMM-Chemical-Zombie`, `@Knock-Knock-Zombies`).
- [ ] **Custom Zombies - Astronaut/Butcher/Bear** (`src/customZombiesTchc.ts`) - **two real bugs were found and fixed this session** getting the
      Zombie Bear working (see that file's header comment for the full
      story): DayZ's DynamicEvent engine resolves spawner "kind" purely from
      the event NAME's prefix (not the child class's inheritance) - a plain
      "TCHCZombieBear" event failed with `failed to determine spawner
type!` regardless of `position` mode, fixed by renaming with the
      required `Animal` prefix. That surfaced a second error, `Missing AI
Template "HerdTCHCZombieBear"` - Animal-kind "Herd" territories need a
      matching AI template baked into core game data with no way to
      register a new one from mission config, so this now reactivates
      vanilla's own dormant "Bear"/"AnimalBear" territory+event pair instead
      (previously 100% inert - `nominal=0`, no `<agent>` block, so this
      doesn't touch any real existing population). Confirmed via a fresh
      `verify-serverpack` boot that the CE no longer logs any error for
      either the zombie trio or the bear. Still needs live confirmation:
      that all 4 classnames (`TCHCAI_TheAstronaut_Zombie_1`/`_2`,
      `TCHC_TheButcher_Zombie`, `TCHC_ZombieBear`) actually spawn and feel
      appropriately rare, and specifically whether the astronaut variants
      are actually killable - there's an unresolved live bug report on the
      mod's own Comments tab claiming they're invincible, and a later author
      "Fixed" reply appears (by comment ordering) to address a different,
      unrelated loading issue, not this one. Also watch for the other
      reported issue ("Client has pbo that is not part of the server") on
      both client and server console/logs.
- [ ] **Moving AI Convoy / Zens ExpansionAI Audio setup** - both were added
      for download+inspection but not yet live-verified: confirm Moving AI
      Convoy doesn't overlap/conflict with `@AirRaid`/`@AI-Bandits`, and
      confirm Zens ExpansionAI Audio's ambient cues actually play on top of
      `DayZ-Expansion-AI` patrols without any extra setup being required.
- [ ] **Buy/sell economics - reverted back to 20%/40%/60% tiered sell
      (2026-09, supersedes the old flat-66% test below)** (`src/market.ts`'s
      `BUY_PRICE_MULTIPLIER` - Rare 2.5x/Legendary 3.5x, unchanged - and
      `src/traders.ts`'s `HARDCORE_SELL_PRICE_PERCENT`, back down to 20 -
      `SELL_PRICE_PERCENT_OVERRIDE` in `src/market.ts` restored to Rare 40/
      Legendary 60, Common/Uncommon inheriting the 20 global via -1) -
      confirm in-game that a Common/Uncommon item now sells for roughly
      20% of its buy price again (not 66%), while a Rare item sells for
      ~40% and a Legendary item for ~60% - i.e. rare/legendary finds are
      deliberately worth noticeably more to cash in than common ones,
      instead of every tier paying out the same flat cut.
- [ ] **Meat/fish as a subtle income source** (`src/market.ts`'s
      Consumables Meat/Fish `priceOverrides`, `src/marketGapFill.ts`'s
      `FOOD_*_PRICE` constants) - raw butchered steaks/fish fillets went
      8-16 (DayZ-Expansion-Market's own default) -> 30-55 -> 180-280, whole
      raw fish 20-40 -> 70-120, uncleaned carcasses (dead birds/rabbit)
      15-28 -> 45-75, exotic meat (Horse/Human steak) 60-100 -> 320-450,
      small critters (rats/Bitterlings) 5-10 -> 10-18, Lard 40-70 -> 70-110 -
      all per the project owner's explicit follow-up request that hunting/
      fishing should be a genuine (if modest) income source, not just "not
      worthless". Never confirmed live - worth checking: 1. Butcher/fillet
      a few different animals and fish, sell the cuts at the trader, and
      confirm the payout actually feels like meaningful (not trivial, not
      economy-breaking) money for the hunting/fishing effort involved -
      these bands were sized relative to the cheapest civilian pistol
      (deagle, 338-563 to buy) as a sanity check, not playtested. 2. Spot-
      check a few Old_ (moldy) canned goods and confirm they now sell for
      noticeably less than their fresh equivalent (they used to be priced
      the same or higher - see this file's own header comment on
      `FOOD_OLD_CAN_PRICE`).

- [ ] **Crash-recovery watchdog full cycle** (`src/server.ts`) - the
      maintenance steps (log pruning, world-state backup) and a normal boot
      were confirmed live, but the actual crash->auto-restart path wasn't:
      once the server is up, `kill -9` the `DayZServer` process specifically
      (not the CLI) and confirm the CLI notices within a few seconds, logs
      the crash to `profiles/crashes.log`, waits ~15s, and relaunches
      automatically - players should just see a brief downtime, not a dead
      server. Separately confirm a plain Ctrl-C (or `kill <cli-pid>`) stops
      everything cleanly with no restart loop, and that a second Ctrl-C
      force-kills promptly if the server is slow to exit.
- [ ] **World-state backup restore path** (`src/maintenance.ts`) - confirm a
      `backups/storage_1-*.tar.gz` actually restores correctly end to end:
      stop the server, replace `mpmissions/<mission>/storage_1` with one
      extracted from a backup, start back up, and confirm characters/bases/
      vehicles/trader stock come back as expected (this was verified to
      _produce_ a valid, non-empty archive live, but the restore direction
      has never been exercised).
- [ ] **Base decay (`DZSurvivalBaseDecay`) live 30-day cycle** - a locked
      fence/tent base is supposed to force-unlock and drop its `CodeLock`
      after 30 real days with no owner/guest activity (see
      `serverpack/README.md`'s "Current addons" entry for the full
      design). Confirmed a clean compile via `deno task verify-serverpack`
      only - the actual 30-day decay behavior has never run live (can't be
      waited out in one sitting). Two ways to smoke-test faster without
      waiting the real 30 days: 1. Temporarily lower `DECAY_DAYS` in
      `serverpack/addons/DZSurvivalBaseDecay/scripts/4_world/DZSurvivalBaseDecay_Module.c`
      (e.g. to `1` or even a fraction of a day), republish/verify, claim
      a fence or tent with a `CodeLock`, don't touch it, and confirm it
      force-unlocks (drops on the ground, `[BaseDecay] Decayed an
 abandoned lock at ...` in the `.ADM` log) after the shortened
      window - then revert back to `30` before any real publish. 2. Or, with `DECAY_DAYS` left at 30: claim a lock normally, stop the
      server, hand-edit `$profile:DZSurvivalServerPack\BaseDecay.json`
      to set that lock's `LastActivityUnix` entry to a timestamp more
      than 30 days in the past (the key is
      `PositionKey(lock.GetPosition())` - `X_Y_Z` rounded to the
      nearest meter), restart, and confirm the next daily tick (or a
      manual `/basedecay now` as an admin) decays it immediately.
- [ ] **Trader-zone warmth - "boiling hot to death" bug fixed, needs live
      re-confirmation** (`serverpack/addons/DZSurvivalTraderWarmth`) - a
      player confirmed this addon was causing real, severe health loss
      while standing in the trader safe zone. Root cause found: it was
      unconditionally _setting_ HeatComfort to `1.0` (absolute max) every
      1.5s, and vanilla's own `HeatComfortMdfr.c` applies real
      `player.AddHealth()` damage (up to 0.30 HP/second) whenever
      HeatComfort stays above `0.45` - so every player in the zone was
      pinned at the maximum burn rate the whole time they stood there.
      Fixed by (1) lowering the target to `0.10` (safely under vanilla's
      `0.15` warning threshold, so this addon can never itself cause any
      water-loss or health-loss penalty) and (2) only ever raising
      HeatComfort up to that floor when the player's real value is
      currently below it, never lowering/overriding a naturally higher
      value. Full writeup in the file header comment and
      `serverpack/README.md`. Confirmed a clean compile via
      `deno task verify-serverpack` only so far - **please re-test live**: 1. Stand in the trader zone for several minutes (including right at
      the spot the crash happened before) and confirm health no longer
      drops. 2. Walk into the zone cold (e.g. wet/no warm clothing in bad
      weather) and confirm HeatComfort still rises to a comfortable level
      (debug stat overlay / `#debug` menu / COT's player stats panel shows
      the raw value), then walk back out and confirm it starts dropping
      again immediately (no lingering buff). 3. Confirm the `.ADM` log
      still shows `[TraderWarmth] Initialized - players within 175m of the
trader city will be kept warm.` on startup.
      Also worth confirming while testing: `/basedecay status` reports a
      sensible count and "days left", and that a base the owner/guest is
      actively opening gates on genuinely never decays (the two
      Action-class hooks working as intended, not just the `CodeLock`
      hooks).

- [ ] **Gun/attachment/ammo price rebalance + "no infinite guns except
      bows/signal flare" (2026-09)** - `src/market.ts`/`src/marketGapFill.ts`
      changes, need a server restart (no serverpack publish needed) then a
      live trader check: 1. Confirm `hnt_Bow` sells for a flat 300 and `hnt_BowRecurve` for a
      flat 600 in the Guns - Civilian category. 2. Confirm `engraved1911` ("engraved Kolt") is a flat 5000, and
      `colt1911` (its real/non-engraved sibling) is still its own
      original ~4815-8018 - the two should sit close together, not the
      engraved one costing noticeably less than the plain one. 3. Confirm `deagle` (Desert Eagle) and `saiga` (Saiga shotgun) now
      appear in **Guns - Military**, not Guns - Civilian. `deagle`
      should be a flat 25000; `saiga` should be unchanged at roughly
      6248-10410. 4. Confirm no civilian pistol (Guns - Civilian) costs more than
      `ak101`/`m16a2`/`famas`/`augshort`/`m4a1`/`aug` (Guns - Military) -
      these six were re-priced to 13250-23000 after being found flat-
      priced below several pistols. `sawedofffamas` is deliberately left
      cheap (matches every other "sawed off" novelty variant already in
      the trader) - that one specific gun still costing less than a
      pistol is expected, not a bug. 5. Confirm every TGK-WeaponPack gun (`Sobr_*`/`SM_*` classnames, both
      Guns - Military and Gun Attachments - Military) now shows varied
      prices by type instead of one flat band for all ~280 of them -
      spot check a pistol (e.g. `SM_Glock_18c`, expect 8000-14000) vs a
      standard rifle (e.g. `SM_AK74`, expect 14000-22000) vs a heavy/
      sniper weapon (e.g. `SM_Rifle_MK47_Mutant_Black`, expect
      30000-45000) vs the grenade launcher (`SM_Grenade_Launcher_
 Milkor_M32A1_MSGL_40mm_FDE`, expect 50000-70000), and an
      attachment (e.g. any `Sobr_Mag_*` magazine, expect 300-600, vs any
      `SM_Suppressor_*`, expect 3500-6000). 6. Confirm TGK ammo is no longer flat - a single round (e.g.
      `SM_Ammo_762x51_M80`) should be ~250-400, a box (e.g.
      `SM_AmmoBox_762x51_M80`) ~4000-7000, and a full crate (e.g.
      `SM_AmmoCrate_762x51_M80`) ~14000-22000 - each tier meaningfully
      pricier than the last. 7. Confirm `SM_Rifle_MK47_Mutant_Black` (and every other Legendary-
      tier gun/gear item, not just this one) can no longer be bought
      infinitely - buy it once, confirm the trader's stock actually
      drops to 0 and stays there until the next restock, instead of
      remaining permanently purchasable. 8. Confirm `Flaregun` (signal flare gun) and both bows
      (`hnt_Bow`/`hnt_BowRecurve`) are the deliberate exception and
      **do** stay permanently purchasable regardless of how many are
      bought (project owner explicitly asked for these three to stay
      unlimited) - everything else in the trader should behave like
      item 7 above.
- [ ] **2026-09 headgear/backpack/base-building/explosives/medical deep
      audit** (`src/marketGapFill.ts`) - needs a server restart (no
      serverpack publish needed), then a live trader check across the
      whole General Store: 1. `MilitaryCap_BDU/Desert/Woodland` (Clothing Head - Military) is now
      a flat 6000 (was 17613-29363, inherited a full helmet's price).
      `T56TankerHelmet_Olive/Tan` in the same category are unchanged. 2. `ALV_TacCap_Black/Snow/Tan` now appear under **Clothing Head -
      Military** (not Civilian) at roughly 3600-6000. 3. `Chainmail`/`Chainmail_Coif`/`Chainmail_Leggings` (Top/Head/Bottom -
      Civilian) are now 2800-4500 (was 355-595). 4. Every `WasteLandZ_*` clothing item (pants/hoodies/waist packs, NOT
      backpacks) is now roughly 1250-2100 (was 640-1090). 5. Backpacks across Clothing Back - Civilian/Military are
      noticeably pricier - spot check `ImprovisedBag` (now 2525-4225,
      was 1148-1920), `SurvivorBackpack_*`/`WasteLandZ_backpack*` (now
      4500-7000), and confirm `AssaultBag_Winter`/`CoyoteBag_Winter`
      (Military) now match their same-model color siblings' price
      instead of being far cheaper. 6. Base Building: `CombinationLock`/`CombinationLock4` now
      3500-5500 (was 675-1125); `StorageBox_BigSafe_*` now 12000-18000;
      the military-themed storage cluster (GunCase/GunRack/GunWall/
      MiliCrate/Mlocker/Weapons_Rack/DGunCase/DGunRack/Compound_Gate/
      Compound_Wall/HeliPad) now 8500-13500; `AmmoBox` now 700-1100 (was
      51675-86130); `bl_coffee_mug` now 80-150. `TerritoryFlag` (the
      raw pole) no longer appears for sale at all - only
      `TerritoryFlagKit`, now a flat 10000. `Plant_Pepper/Potato/
Pumpkin/Tomato/Zucchini` no longer appear for sale (their seed
      packets still do). `bl_candy_toffee/dark/milk/nutty` and
      `bl_potatochips_*`/`bl_coffee_bag` now appear under **Food & Drink**
      (Consumables), not Base Building. 7. Explosives: `M67Grenade`, `RGD5Grenade`, and every
      `M18SmokeGrenade_*`/`RDG2SmokeGrenade_*` variant are now a flat
      1500 (was 33125-55213 for the frags, 4138-8625 for the smokes).
      Every other explosive (flashbang, remote/tripwire charges, plastic
      explosive, chemgas, landmine, claymore) should be unchanged. 8. Medical: `BloodBagFull` ("Blood Bag") now a flat 2500 (was
      350-580); `BloodBagEmpty` ("Blood Collection Kit") now a flat 1250
      (was 27360-45600); `BloodTestKit` now a flat 500 (was 6803-11318);
      `PainKillerTablets` ("Codeine Pills") now a flat 1000 (was
      350-580). 9. Utility: `WoodenStick`/`LongWoodenStick`/`SharpWoodenStick`,
      `Stone`/`SmallStone`/`SpearStone`, and `Stable_dayz` (the built
      structure, not the kit) no longer appear for sale anywhere.
      `StoneKnife`/`Stable_dayz_Kit` should still be sellable/purchasable
      as before.
- [ ] **2026-09 pelt pricing + full exhaustive economy audit** - a
      systematic, whole-trader sweep (grouping every item in every
      `profiles/ExpansionMod/Market/*.json` by identical price band to find
      un-reviewed "category clones Items[0]" gap-fill bugs, rather than
      reacting to individually-reported items) found ~270 more items still
      sitting at a generic gap-fill floor across `Base_Building.json` and
      `Utility.json`. `deno task audit-market` now reports **0 gaps, 0
      review items, 0 price anomalies** (down from 8/282/0) - needs a
      server restart, then a live check: 1. Every pelt (`BearPelt`/`CowPelt`/`DeerPelt`/`FoxPelt`/`GoatPelt`/
      `HorsePelt`/`PigPelt`/`RabbitPelt`/`ReindeerPelt`/`SheepPelt`/
      `WildboarPelt`/`WolfPelt`) now sells for 800-1200 (tiered small/
      standard/predator), up from the old 533-893 flat gap-fill price. 2. `@Paragon-Storage`'s ~100 raw `Paragon_*` classnames (BigSafe/
      GunRack/Locker/Container/CompoundGate/etc.) no longer appear for
      sale at all - confirmed via the mod's own shipped
      `extras/traderconfig.txt`, these are the ALREADY-DEPLOYED prop
      forms; only their `StorageBox_*` counterparts are the real
      purchasable kits. Spot check: `StorageBox_Safe_Black` now
      8000-12000, `StorageBox_SmallSafe_Black` 5000-8000,
      `StorageBox_Adoor_Black` (reinforced lockable door) 6000-9000,
      `StorageBox_Container_Black` 4000-6500, `StorageBox_WallRack_Black`
      600-1000 (civilian rack - NOT the same as the already-fixed
      military `StorageBox_Weapons_Rack_Black` at 8500-13500). 3. Every `TP_Apoc*` vehicle spare part (hoods/trunks/doors/wheels for
      the TP-Apoc SUV/Pickup/M1025) is now purchasable at the Vehicle
      Dealer under Vehicle_Parts, priced the same as every other
      vehicle's generic spare parts (~480-870) - these had never been
      sellable anywhere before. 4. Real vanilla base-building items that were stuck at the generic
      4590-7658 floor now have sensible prices: `FenceKit` 150-300,
      `WatchtowerKit` 2000-3500, `PartyTent_Blue`/`_Brown` ("Canopy
      Tent") 2500-4000, `ShelterKit` 150-300, garden seeds
      (`PepperSeeds`/`PumpkinSeeds`/`TomatoSeeds`/`ZucchiniSeeds`)
      50-120. `GardenPlot`/`GardenPlotGreenhouse`/`GardenPlotPolytunnel`
      (the tilled-soil result of using a hoe), `ShelterSite`/
      `ShelterFabric`/`ShelterLeather`/`ShelterStick` (the BUILT shelter
      itself, confirmed via its real display names "Tarp Shelter"/
      "Leather Shelter"/"Improvised Shelter"), `UndergroundStash`
      ("Mound" - a dug hole, not an item), `Fireplace`/`FireplaceIndoor`/
      `FireplaceFireBarrel`/`OvenIndoor` (built cooking structures),
      `AnniversaryBox`/every `GiftBox_Large/Medium/Small_*` (free holiday
      event novelties), and `HandcuffsLocked`/`ShippingContainerKeys_*`
      no longer appear for sale at all. 5. `@BoomLays-Things` (bl_) furniture/decor now has tiered pricing
      instead of one flat price - decorative houseplants/paintings/
      carpets (`bl_ficus_bonsai`, `bl_painting_1_Kit`, etc.) 100-400,
      functional furniture (pallet tables/cabinets/beds) 300-900,
      real utility upgrades (`bl_workbench_Kit`/`bl_repairbench_Kit`
      1500-2500, `bl_solar_panel_Kit` 2000-3200,
      `bl_rain_collector_Kit` 800-1400). 6. `dog_shed_big_kit`/`dog_shed_small_kit` are purchasable (1000-1800/
      600-1100); the deployed `dog_shed_big`/`dog_shed_small` (+`_static`)
      forms no longer appear for sale. 7. Utility crafting materials/tools now have sensible tiered prices
      instead of the flat 533-893 (e.g. `Bone`/`Rag`/`PlantMaterial`
      30-80, `Torch`/`HandDrillKit`/the `cw_*` crossbow-crafting parts
      150-350, `NailedBaseballBat`/`BarbedBaseballBat` 400-700,
      `Bridle`/`Saddle`/`HorseBags` 800-1400, `ScientificBriefcase`/
      `ScientificBriefcaseKeys` 2000-3500, `Stable_dayz_kit` 2500-4000). 8. AirRaid's own scripted event-marker smoke items (`M18SmokeGrenade_
AirStrike`/`_CH_47_Helicopter_*`/`_MI_8_Helicopter_Crash`/`_UH_1_
Helicopter_Crash`, `Ammo_40mm_Smoke_AirStrike`) and TGK-
      WeaponPack's `SM_Ammo_Empty_Crate` no longer appear for sale (these
      had a real `<category>` tag so kept flagging as a false "missing
      gap" on every audit run otherwise).
- [ ] **Tent Actions Fix mod (`@Tent-Actions-Fix`, 3765278986)** - added to
      `mods.txt` to restore tent packing/opening/closing UI actions broken
      by the vanilla 1.29 "Road To Buglands" update. Needs both a mod-list
      sync and a client update (confirmed via the author's own comments:
      a client without this mod can't even connect to a server running
      it) - pitch/pack/open/close a tent in-game and confirm the actions
      are present again.
- [ ] **Tent warmth (`serverpack/addons/DZSurvivalTentWarmth`)** - same
      safe "floor-raise HeatComfort, never lower it" mechanic as the
      existing trader-city `DZSurvivalTraderWarmth`, but triggered by
      proximity to any real, currently-PITCHED tent anywhere on the map
      instead of one fixed position - pitch any tent (Medium/Large/Car/
      Party), get cold (e.g. at night or in the DDP-Climate-Zones NW cold
      zone), stand at/inside it, and confirm HeatComfort is floored at a
      cozy 0.10 within ~1.5s and never spikes toward the
      boiling-hot-to-death bug already fixed once on the trader-warmth
      addon. Also confirm a PACKED tent (in a backpack or on the ground,
      not pitched) does **not** trigger this - only a pitched tent should
      count. Needs a serverpack publish (a new addon inside
      `@DZSurvivalServerPack`, not a config change) - confirmed a clean
      compile via `deno task verify-serverpack` only so far.
- [ ] **Economy pass: locks/materials/food floor/gun attachment sell%**
      (2026-09) - `deno task audit-market` still reports **0/0/0** after
      this pass (dry-run verified twice for idempotent convergence).
      Needs a server restart, then a live check: 1. `CombinationLock` (3-dial) is now 2500-4000, `CombinationLock4`
      (4-dial) is now 5500-8000 - previously both identical at
      3500-5500. 2. `Nail` is now 40-70 (was 5-10, absurdly cheap next to `NailBox`
      at 450-750 for a full box). `WoodenPlank` is now 120-220 (was
      50-250). `bl_extension_cable_reel`/`bl_pallet`/
      `bl_pallet_frame_solo` are now 90-180 (was 50-150). 3. Every plain food item was floored to a 300 minimum (was as low as
      7-9 for a raw apple/mushroom): wild fruit/veg/mushrooms/
      `Waterbottle`/`Lard`/`Bitterlings`/`SkinnedRat`/`DeadRat_Grey`/
      `DeadRat_White` now 300-450; the `Expansion` bread/cheese loaves
      now 320-520; `CrabCan`/`CrabCan_Opened` now 700-1200 (was 175-290,
      an outlier next to sibling canned goods at 700-2000+). 4. `DeadChicken_Brown`/`_Spotted`/`_White`/`DeadRooster` ("a whole
      Hen") and `DeadRabbit` are now 1000-1500 (was 45-75). 5. Steaks (`BearSteakMeat` etc.) and fish fillets
      (`CarpFilletMeat` etc.) doubled again to 360-560 (was 180-280).
      Whole raw fish (`Carp`/`Sardines`/`Mackerel`/`SteelheadTrout`/
      `WalleyePollock`/`RedCaviar`/`Shrimp`) are now 300-450 (the new
      food floor takes priority over a plain double here). 6. Every `Old_` (moldy/expired) canned food item (42 classnames) is
      now **find-only** - `CanOnlySell` at the trader, never buyable -
      confirm the General Store no longer offers to sell you any
      `Old_*` item, but will still buy one back from you. 7. Gun_Attachments_Military/Civilian now sell for a flat 50% of buy
      price regardless of tier (was 20%/40%/60% by rarity) - sell any
      magazine/optic/suppressor and confirm the payout is exactly half
      its current buy price.
- [ ] **Magazine prices normalized by capacity, not by host weapon**
      (2026-09) - project owner report: "a KA mag for almost 8K!!!!".
      Root cause: every real vanilla magazine's price tracked its
      compatible weapon's own price (confirmed exactly:
      `mag_ssg82_5rnd` was identical to the `ssg82` rifle itself;
      `mag_akm_drum75rnd` cost MORE than the entire `akm` rifle). Every
      vanilla magazine (not TGK-WeaponPack's own reskins, which were
      already fine) is now priced purely by round count: <=10rnd
      300-550, 11-20rnd 450-750, 21-30rnd 600-1000, 31-45rnd 800-1300,
      46-64rnd 1100-1800, 65rnd+ 1500-2500 - `mag_akm_drum75rnd` went
      from 17625-29370 down to 1500-2500, `mag_val_20rnd`/`mag_vss_10rnd`
      (the ones the project owner flagged) went from ~8000-13500 down to
      300-750. Also fixed a related anomaly found in the same pass:
      `m4_suppressor`/`ak_suppressor` (the plain vanilla suppressors)
      were priced at 7283-12135 - MORE than every one of their own
      TGK-WeaponPack reskinned variants (already 3500-6000) - corrected
      to match at 3500-6000. `deno task audit-market` still reports
      **0/0/0**; verified via the scratch-copy dry-run method (checked
      exact final prices land on the intended bands after the 1.5x
      Uncommon-tier multiplier, and a second run converges identically).
      Needs a server restart; no addon republish needed.
- [ ] **Fish/meat/corpse sell%, plus filter bottle/milk bottle/medical
      re-pricing** (2026-09) - a batch of specific project-owner-flagged
      prices: 1. `filteringbottle` (Canteen with filter) is now a flat 1000 (was
      145-240); `expansionmilkbottle` (Milk Bottle) is now a flat 500
      (was 130-220). 2. Every fish (`sardines`/`shrimp`/`mackerel`/`carp`/`steelheadtrout`/
      `walleyepollock`/`redcaviar` and their 3 fillet cuts) and every
      steak (`rabbitlegmeat`/`chickenbreastmeat`/`goatsteakmeat`/
      `sheepsteakmeat`/`pigsteakmeat`/`cowsteakmeat`/`deersteakmeat`/
      `foxsteakmeat`/`boarsteakmeat`/`mouflonsteakmeat`/
      `reindeersteakmeat`/`bearsteakmeat`/`wolfsteakmeat`) now sells for a
      flat 75% of its buy price (was the normal 20% global rate) -
      confirm selling any of these pays out ~75% of its current buy
      price. Buy prices are also now tiered by how hard the animal/fish
      is to obtain instead of one flat band for everything - lowest tier
      (rabbit/chicken/goat/sheep meat, sardines/shrimp) buys at 534-700
      (sells 400-525) and each tier steps up to the apex-predator/rarest
      tier (bear/wolf meat, red caviar) at 1150-1450 (sells 863-1088). 3. `DeadChicken_Brown/Spotted/White`/`DeadRooster`/`DeadRabbit` (whole
      uncleaned carcasses) also now sell for a flat 75% (still 1000-1500
      to buy, unchanged) - confirm selling one of these pays ~75% too.
      `DeadRat_Grey`/`DeadRat_White` deliberately excluded, still the
      normal 20% rate, per the project owner's explicit "not rat corpse"
      exception. 4. Medical re-prices: `vitaminbottle` ("Multivitamins") now a flat
      600 (was 40-65); `disinfectantalcohol` ("Alcohol Tincture") now
      210-340 (was 105-170, a straight double); `morphine`/`startkitiv`/
      `salinebag`/`epinephrine` (Morphine Auto-Injector/IV Starter Kit/
      Saline Bag/Epinephrine Auto-Injector) all now a flat 9000 (was
      27360-46880); `BloodBagFull` ("Blood Bag") now a flat 5000 (was a
      flat 2500 from an earlier session).
      `deno task audit-market` still reports **0/0/0**; verified via the
      scratch-copy dry-run method (checked every price above lands
      exactly on target, and a second run converges identically). Needs
      a server restart; no addon republish needed.

- [ ] **Starting weapon, per-zone keycard prices, gun cabinet, and
      backpack economy pass** (2026-09) - four independent fixes: 1. **Starting weapon** - a real bug meant every new spawn always got
      a `WoodenStick` regardless of what the loadout's random selector
      rolled (an orphaned, unconditional stick claimed the `@InHands` slot
      first). Now fixed to a deterministic `BaseballBat` - confirm a brand
      new character spawns with a Baseball Bat in hand, not a stick. 2. **Keycard sell prices** - Tisy zone keycards (`evg_keycards_tisy01`
      \-`05`) should sell for exactly 1,000/2,000/3,000/4,000/5,000; NWAF
      zone keycards (`evg_keycards_nwaf01`-`03`) the same 1,000/2,000/3,000;
      the all-access master keycard (`evg_keycards_all`) exactly 7,000 -
      confirm selling each pays out precisely that amount (not a range). 3. **Gun cabinet** - the wooden gun cabinet kit (`bl_pallet_cabinet_*_
  Kit`, all 5 sizes) should now buy for 1,500-2,400 (was 400-900) -
      confirm in the Base Building trader menu. The barrel/prefab stove
      kits are unaffected, still 400-900. 4. **Backpacks** - two changes: (a) every color variant of the same
      backpack model (e.g. `AliceBag_Black`/`Camo` vs. `alicebag_green`,
      `ArmyPouch_Black/Camo/Green` vs. `armypouch_beige`, `AssaultBag_
  Green/Ttsko` vs. `assaultbag_black`, `Attack2Bag_Green/Ttsko/Yeger`
      vs. `attack2bag_black`, `CoyoteBag_Green` vs. `coyotebag_brown`,
      `DuffelBagSmall_Green/Medical` vs. `duffelbagsmall_camo`,
      `taloonbag_orange/green` vs. `taloonbag_blue`) now costs the exact
      same to buy regardless of color - confirm none of these can be
      bought cheaper than their canonical sibling. (b) every backpack's
      sell price is now capped so the priciest ones (Coyote Bag, Assault
      Bag) pay out ~5,000 max and the cheapest (Waterproof Bag) pays out
      ~1,000 max, scaling smoothly in between - confirm selling a few
      backpacks across the price range pays out in that ballpark, not the
      old, much higher tier-based percentage.
      `deno task audit-market` still reports **0/0/0**; verified via the
      scratch-copy dry-run method (all four fixes land exactly on target,
      second run converges identically). Needs a server restart; no addon
      republish needed.

- [ ] **Vehicle economy overhaul + gas mask/medical/wood/utility price
      fixes** (2026-09) - a large batch, several parts worth checking
      independently: 1. **Gas masks** - `gasmask`/`gp5gasmask` should now buy for exactly
      15,000 and sell for very close to 2,000 (13.33% of that flat buy
      price - so the actual payout may land at ~1,995-2,000 depending on
      in-game rounding, not necessarily bit-for-bit 2,000). 2. **Medical** - `BloodBagIV` ("IV blood bag") should now buy for a flat
      7,300 (was 350-580). `startkitiv` ("IV Start Kit") should now buy
      for a flat 1,200 - this is a decrease from the 9,000 an earlier
      session set it to, confirm it didn't silently stay at 9,000. 3. **Frying pan** should buy for a flat 2,000 (was 405-675). 4. **Burlap sack** should buy for a flat 1,271 (was 675-1,125). **GPS
      receiver** should buy for 2,566-4,276 (was 1,283-2,138, exactly
      doubled). 5. **Wooden logs and firewood** should no longer be purchasable at
      any price (no "Buy" option at all, same as an old food can or a
      keycard) - but selling a `WoodenLog` should pay out exactly 100,
      and selling `Firewood` should pay out exactly 50. 6. **"Lumber Pile" (`PileOfWoodenPlanks`)** should no longer appear
      anywhere in the trader at all - not buyable, not sellable. If this
      turns out to be the wrong classname for what you meant by "Lumber
      Pile," let me know the real one and I'll fix it. 7. **Gun flashlights moved out of Utility** - `universallight`/
      `tlrlight` should now show up under "Gun Attachments - Military"
      instead of "Utility," priced/tiered the same Uncommon band as
      every other attachment there (and sell for 50% of buy price, same
      as every other attachment in that category). 8. **NVG goggles moved out of Utility** - `nvgoggles` should now show
      up under "Clothing Head - Military" (alongside the helmets and the
      NVG head strap), not "Utility." 9. **Vehicle price ladder** - confirm the full car lineup now climbs
      smoothly instead of clustering at similar prices: tractor (~25-
      50k, unchanged), basic hatchback (~32-56k), sedan (~38-64k),
      civilian sedan (~46-76k), offroad hatchback (~55-90k),
      `Offroad_02` (~60-95k), covered cargo truck (~70-110k), Apoc
      pickup (~90-135k), Apoc SUV (~95-140k), UAZ (~115-155k), M1025
      Humvee (~150-190k), bus (~165-225k), Landrover (~175-235k),
      Vodnik (~250-500k, unchanged). Every color variant of the same
      vehicle should cost the same as its base. 10. **Vehicle parts scarcity** - every individual `Vehicle_Parts`/
      `Batteries` item (hoods, doors, wheels, batteries, etc.) should now
      cap out at just 1 in stock (down from 20-40), and be noticeably
      pricier across the board (roughly 2.5x the old price, with a
      1,000 minimum) - confirm buying the very first vehicle after this
      change still works (parts should start full, at their new cap of 1) but a second purchase of the same part should show 0 in
      stock until the new daily trickle restocks it. 11. **New daily vehicle-parts restock** - requires an addon republish
      (this is the one `.c` code change in this batch, everything else is
      data-only and just needs a normal restart). After republishing,
      deplete a vehicle part (buy it, or check one that's already at 0),
      wait roughly a day (or use `/restock now` as admin, which now also
      force-triggers this pick immediately for testing), and confirm the
      server's `.ADM` admin log shows a `[TraderRestock] Vehicle parts
    daily trickle - restocked ...` line and the part's stock actually
      increased by exactly 1. Confirm it does not restock more than
      once per real day under normal (non-forced) hourly ticks.
      `deno task audit-market` still reports **0/0/0**; verified via the
      scratch-copy dry-run method - every price/category change lands
      exactly on target, and a second and third consecutive run
      converge to byte-identical output on disk (`diff -rq`), not just a
      matching log count. `deno check`/`deno lint`/`deno fmt --check`
      clean on every touched file.

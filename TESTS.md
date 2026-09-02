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
- [ ] **Keycard re-pricing** (`src/marketGapFill.ts`) - confirm the 15
      `evg_keycards_*` room keycards actually show up in the trader at
      their new prices (250k-400k, 800k-1.2M for `evg_keycards_All`) with
      stock capped at 1, and that this feels like the right price point in
      practice (not so expensive it's pointless, not so cheap it trivializes
      finding the loot yourself) - these numbers are a judgment call, not a
      verified-in-game one.
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
- [ ] **Further-tightened buy/sell economics** (`src/market.ts`'s
      `BUY_PRICE_MULTIPLIER`, now Rare 2.5x/Legendary 3.5x - was
      2.0x/2.5x -, `src/traders.ts`'s `HARDCORE_SELL_PRICE_PERCENT`, back
      at 20 after a brief drop to 12, and the new
      `SELL_PRICE_PERCENT_OVERRIDE` in `src/market.ts` - Rare sells for
      40%, Legendary for 60%, Common/Uncommon still inherit the 20%
      global) - confirm in-game that rare/legendary gear (vehicles,
      optics, high-end weapons) actually costs noticeably more to buy,
      that selling a Rare/Legendary item visibly pays out more gold than
      selling a Common/Uncommon one at the same base value, and that
      Common/Uncommon-tier basics (ammo, food, meds, plain clothing) still
      feel buyable/sellable without being ground-stopped - these numbers
      are a judgment call, never played against live.

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
      Also worth confirming while testing: `/basedecay status` reports a
      sensible count and "days left", and that a base the owner/guest is
      actively opening gates on genuinely never decays (the two
      Action-class hooks working as intended, not just the `CodeLock`
      hooks).

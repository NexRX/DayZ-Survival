# Mods

see [`mods.txt`](mods.txt)

For a full catalog of every mission/quest/event these mods can trigger (with
locations and current tuning), see [`MISSIONS.md`](MISSIONS.md).

## Finding new mods

`deno run search <terms>` ([`src/mods.ts`](src/mods.ts)) searches the Steam
Workshop for DayZ (app 221100) via the public `IPublishedFileService/QueryFiles`
Web API, ranked by text relevance - no scraping, no manual browsing. Returns
each match's workshop ID, title, size, subscriber count, and a direct link,
so you can paste the ID straight into `mods.txt`. Requires a Steam Web API
key (`deno task config`, or grab one free at https://steamcommunity.com/dev/apikey)

- the same key `deno task resolve` already uses to verify mod IDs.

```bash
deno task search hunting
```

Add/reorder mods by editing `mods.txt` (`<workshop_id>  @name`, one per line) -
the CLI reads the load order from there.

## The RemnantZ-inspired content pack

Most of `mods.txt` beyond the Expansion/AI core is modeled on **RemnantZ -
BARBA RIJA HARDCORE**, a Chernarus hardcore server whose mod list pairs well
with this project's own hardcore-but-fair philosophy: crafting/skill packs
(Nemsis Craftingpack Redux), dynamic weather and cold survival (Namalsk
Survival - a mechanics pack, not the Namalsk map, so it works fine on our
Chernarus mission), extra animals, vehicles, base building, and economy mods.

A few notes on choices made while porting that list over:

- The old monolithic **DayZ-Expansion-Bundle** was replaced with the modern,
  modular Expansion set (`Core` + `DayZ-Expansion` + `Vehicles` + `Book` +
  `Market`, alongside the `Licensed`/`AI` mods already here) to match what
  RemnantZ actually runs, instead of double-downloading the same content
  under two different mods.
- **RemnantZ serverpack** was intentionally left out - its own Steam
  description says it's "designed to be used by livonia Barba Rija Hardcore
  server", i.e. built for the Livonia map, not our `dayzOffline.chernarusplus`
  mission.
- `CJ187-Money-Euros-Only` (currency reskin) vs. `CJ187-MoreMoney` (loot
  amount tuning) look redundant but aren't - they're a matched set, not
  competing systems.
- Both `Custom-Keycards` and, later, `KeyCard-Rooms-Better` were tried as
  keycard-gated loot systems and both were fully removed (2026-09) - the
  latter's own PBOs never actually shipped any room/bunker assets despite
  the mod's name and screenshots implying otherwise (only door, crate, and
  keycard models existed). `Code-Lock` (door codes) remains the project's
  only access-control mechanic. See `serverpack/README.md` for the history.
- The zombie/bandit mods (`InediaInfectedAI`, `CreepyZombies`, `AI-Bandits`)
  are complementary to, not replacements for, the roaming human patrols from
  `DayZ-Expansion-AI` described below - they add infected behavior and extra
  standalone bandit spawns on top.
- **`InediaTerjeCompatibility`** patches several `Terje-Skills` perks
  (`Strength -> HeavyWeight`, `Athletic -> StrongBones`,
  `Strength -> HeavyAttacksForce`, `Hunting -> ExperiencedHunter`/
  `KnowledgeAnatomy`) that otherwise stack with `InediaStamina`/`InediaPain`/
  `InediaMovement`/`InediaInfectedAI` to make weight, stamina, fracture
  chance, and hunting/melee damage bonuses nearly meaningless at high skill
  levels. Same author as the `Inedia*` mods; load order doesn't matter per
  the author's own guidance.
- **`GameLabs` was deliberately left out**, even though it sits next to the
  `s`-suite (`sFramework`/`sGunplay`/`sVisual`) on some server lists. It's
  unrelated to those - it's CFTools Cloud's own reporting/anti-cheat plugin,
  requires _your own_ CFTools Cloud account + Server ID/API key in a
  `gamelabs.cfg` you'd have to hand-write, and **can shut the server down on
  start** if it can't verify those credentials. Only add it if you actually
  want CFTools Cloud integration.

### The reference server's own custom pack

BARBA RIJA HARDCORE also runs its own bundle, **"BARBA RIJA HARDCORE SERVER
PACK"** (3085139498) - a wrapper around 10 smaller, mostly independent mods.
Five made it into `mods.txt`, all self-contained (no extra setup needed):

- **`A-Hunters-Ritual`** - skinning an animal drops a blood item you can
  purify with Hemoclear tablets or drink raw at your own risk. Reinforces
  "hunt, don't just scavenge" (see the loot-economy section below).
- **`Zens-Zippo-Lighter`** - a refillable Zippo (topped up with gasoline,
  ~30 min per full tank) plus a reworked vanilla petrol lighter (~15 min,
  non-refillable). Both are real light sources, not just fire-starters.
  Ships a reference `types.xml` that `ensureModTypesMerged()`
  ([`src/modTypes.ts`](src/modTypes.ts)) merges in automatically, same as
  the other mods in that list, so the item actually spawns in the loot
  economy.
- **`Burning-Mutant`** / **`Freezing-Mutant`** - two special infected that
  radiate damaging heat/cold in a radius around themselves (with matching
  wound/frostbite chances and gear-based protection), on top of
  `InediaInfectedAI`/`CreepyZombies`/`AI-Bandits` above. Each self-generates
  its own tuning JSON in the profile on first load, the same pattern as
  `AI-Bandits`.
- **`Buddys-BoltZ`** - craftable explosive/smoke/chemgas crossbow bolts,
  combining `HuntingBolts` with existing grenades/explosives. Speculatively
  added to `ensureModTypesMerged()`'s source list in case it ships a
  types.xml too (harmless no-op if it doesn't - see the comment there).

Five were left out, for concrete reasons rather than just "already have it":

- The pack itself and its **`dzr_hardcore_tweaks`** piece (2678427280) are
  both since **removed from the Workshop entirely** ("removed... violates
  Steam Community & Content Guidelines" / "incompatible with DayZ") -
  unavailable regardless of interest. `dzr_hardcore_tweaks` wasn't a skill
  system either, for what it's worth - just crafting-friction tweaks (cook
  without a knife, longer firestarting/digging, rag crafting without
  tools).
- **Attachable Gas Mask** (3233855767) is the same author's (Bloodshot_vp)
  own earlier, smaller mod that **`Gas-Mask-Overhaul`** (already in
  Weapons/equipment above) directly supersedes - identical belt-holster/
  canteen-slot attachment mechanic, just fewer masks/filters. Running both
  would duplicate/conflict over the same vanilla slots.
- **Namalsk Tourist Map** (2315833790) is a lootable paper-map item
  illustrating Namalsk's geography specifically. Our mission is Chernarus
  (`dayzOffline.chernarusplus`), so it'd just be a broken/pointless item
  showing the wrong island here.
- **Old Food** (3237950572) was already in `mods.txt`, under Food/survival
  mechanics.
- **SimpleMatch** (2848676009) reworks the vanilla `PetrolLighter` class the
  same way `Zens-Zippo-Lighter` does, and **running both crashes the server
  during config compile every time** - confirmed by bisecting `mods.txt`
  down to just this pair, in both load orders. It's a genuine mutual
  incompatibility between the two mods, not something fixable from this
  project's side. `Zens-Zippo-Lighter` was kept since it's the mod
  explicitly named in the reference pack's own list; drop it and add
  `2848676009  @SimpleMatch` back instead if you'd rather have matchbox
  rationing than a refillable Zippo.

### ⚠️ Before you run `deno task mods`/`up` with this list

- **`Terje-Core`'s own Steam page warns**: removing it later "will corrupt
  the server database and require a complete server wipe", and it recommends
  deleting `<mission>/storage_1/players.db` on install "to avoid errors when
  loading existing characters". Translation: adding it is close to a
  one-way door, and your **currently-playing characters may need to be
  reset** the first time it loads. Back up `mpmissions/<mission>/storage_1/`
  before starting the server with this list if you care about existing
  characters/bases.
- A handful of mods explicitly forbid being bundled into a "server pack" /
  "mod pack" (`JunkYardDog`, `Vehicle3PP`, `Code-Lock`) - that's about not
  _re-hosting their files under a new name_, not about referencing their
  workshop ID in `mods.txt` like every other mod here, so it doesn't affect
  us, but don't fold their actual `.pbo`s into some other redistributable.

## This project's own custom content ([`serverpack/`](serverpack/), [`serverpack-serveronly/`](serverpack-serveronly/))

`3789404408  @DZSurvivalServerPack` in `mods.txt` (Loot mechanics section)
is **our own** mod, not a third-party one - a single Workshop item bundling
every from-scratch addon this project writes itself that has ANY
client-visible/client-required behavior (UI, self-actions, board
interactions, input overrides), built/signed on Linux with armake2 (no
Windows/DayZ Tools needed - see `serverpack/README.md` and
`src/modBuild.ts`/`src/modPublish.ts`). Adding a new addon to it is just a
new `serverpack/addons/<Name>/` folder plus `deno task publish-serverpack`

- it updates the same Workshop item, so there's only ever one entry to
  maintain in `mods.txt`.

A second, separate pack lives at `serverpack-serveronly/` and is
**deliberately never published to Steam Workshop at all** - it's built and
signed locally, then staged directly into the running server's own mod
folder (and loaded via `-servermod=`) on every single start, so nobody -
not even this server itself - ever downloads it (see
`src/localServerPacks.ts`'s `ensureLocalServerPack()`, called from
`src/server.ts`'s `doStart()`). It may only ever hold addons confirmed to
have **zero** client-visible behavior _and_ zero Community-Online-Tools
module/permission integration - COT requires the client's and server's
permission trees to match structurally, so a permission registered only
server-side silently corrupts every connecting client's copy of the tree
(breaking COT's own admin UI/keybinds, while server-side-only checks like
chat command gating keep working - a very confusing bug to diagnose from
symptoms alone; this happened for real on this project, see
`src/paths.ts`'s comment on `SERVERPACK_SERVERONLY`). **Currently empty** -
`src/server.ts`'s `doStart()` skips staging/loading it entirely whenever it
has no addons, so that's a safe no-op, not a broken state. `deno task
build-serverpack-serveronly`/`verify-serverpack-serveronly` exist for
manually building/testing it once something qualifies again; there is
intentionally no `publish-serverpack-serveronly` task.

Currently `serverpack/` ships:

- **`DZSurvivalFindStone`** - a hold-to-search action that lets players
  reliably find a `Stone` while standing on gravel/dirt/rail-ballast
  surfaces (train tracks, dirt trails) - the intended route to crafting
  materials for a butchering tool, since no knife/blade is handed out at
  spawn (see `src/loot.ts`'s `tuneStartingKit()`).

  **Status: confirmed working end-to-end**, including live multi-session
  testing (see `serverpack/README.md` for the full story).

- **`DZSurvivalMapGate`** - requires a player to have **both** an `ItemMap`
  and a GPS device (`GPSReceiver`) in inventory before the M-key map-toggle
  shortcut opens the map (vanilla/Expansion only support requiring either
  one alone). Overrides vanilla's own `MissionGameplay`; needs
  `src/mapAccess.ts`'s `tuneMapAccess()` (see below) to also be applied.
  See `serverpack/README.md` for the full trace of how this was found.

- **`DZSurvivalTraderRestock`** - real-time scheduled restocking for the
  custom trader city, plus a physical in-game board (`ActionCheckTraderBoard`)
  players can look at to see live stock/next-restock status, and admin-only
  Community-Online-Tools commands (`/restock now`, `/restock reset`). See
  `serverpack/README.md`'s "Current addons" section for the full design.

- **`DZSurvivalBaseDecay`** - force-unlocks (and thus frees up) any
  `Code-Lock`-secured base that's gone 30 days without any real
  owner/guest activity (opening, entering a code, claiming/changing a
  passcode). Its actual decay logic is entirely server-side (guarded via
  `GetGame().IsServer()`), but it also adds a Community-Online-Tools
  admin command (`/basedecay status`/`/basedecay now`), and COT's
  permission-tree design requires that to be registered identically on
  both client and server - which is why this addon lives here in the
  shared client+server pack rather than `serverpack-serveronly/` (it used
  to live there; moved after that mismatch broke COT's own admin UI/
  keybinds server-wide - see `src/paths.ts`'s comment on
  `SERVERPACK_SERVERONLY` for the full incident writeup).

See `serverpack/README.md` for full build/publish details and lessons
learned.

## Setup needed beyond load order

Most of the pack is genuinely plug-and-play (subscribe, load, done). These
are the ones that need something more, gathered from each mod's own Steam
page description via a single bulk `GetPublishedFileDetails` API call (see
`deno task resolve` for the same technique) - no manual browsing needed:

### First-ever start automatically primes itself

Every merge/tuning step below (AI patrols, spatial AI, dynamic missions,
types.xml merges, loot/difficulty/money tuning) works by editing config
files that the mods themselves generate - and most mods only write those
files out once their mission has actually loaded for the first time. On a
**brand-new install**, none of them exist yet.

`up`/`start` ([`src/prime.ts`](src/prime.ts)) handles this automatically: if
any of those files are missing, it launches the server headless in the
background first, polls until every mod has generated its config (or gives
up after 15 minutes, logging a warning either way), then stops it and runs
the full ensure/tune pipeline before the real, foreground start. You'll see
an extra "priming" pass with its own log lines the very first time you run
`up`/`start` - that's expected, and it only ever happens once per install
(every later start finds the configs already there and skips straight to
the real start). The priming server's own console output is saved to
`profiles/bootstrap-prime.log` if you want to see what it did.

If the priming server itself crashes partway through, the polling loop
notices the child has already exited and stops immediately with a clear
"exited early" warning instead of silently polling for files that will
never appear for the rest of the full 15 minutes (which used to look
exactly like "still slowly loading" from the outside - a real, observed
bug, since fixed). Whatever configs did get generated before it died are
kept, so re-running `up`/`start` again only ever needs to wait on
whatever's still missing - it's always safe to just try again. This can
take a genuinely long time on a heavily-modded first boot - in particular
`@JunkYardDog` walks every vehicle wreck on the whole map one at a time
registering salvage/fuel points, which alone can take several minutes.

**Ctrl+C during priming is handled properly, not just discouraged.** The
first version of this just relayed the terminal's raw SIGINT straight to
the background priming child (since it shared the same foreground process
group), killing it at an arbitrary mid-write moment with no chance to shut
down cleanly (confirmed live: a truncated mid-line RPT log after a user's
own Ctrl+C, mistaken for a hang after ~7 minutes of "still waiting" when
the server was actually still loading). Fixed properly instead of just
documenting around it:

- The priming child is spawned via `setsid` so it's detached into its own
  session/process group - a terminal Ctrl+C no longer reaches it directly
  at all, only this CLI process does (via `Deno.addSignalListener`). The
  exact same fix was applied to the real (non-priming) server launch in
  `src/server.ts`'s `runServerWithWatchdog()`, which had the identical
  underlying issue.
- That means this process is now the only thing that ever signals the
  child, so a Ctrl+C during priming triggers the same graceful
  SIGINT-then-wait-then-SIGKILL-on-a-second-Ctrl+C sequence already used
  when priming finishes normally, instead of an uncontrolled kill.
- The child's stdout/stderr are also run through `stdbuf -oL -eL` so
  `bootstrap-prime.log` is line-buffered instead of glibc's default
  fully-buffered mode for a non-tty pipe (which could otherwise sit
  completely silent for minutes at a time even while the server was
  actively working - part of what made the mistaken-hang case above look
  stuck).
- Each "...still waiting" progress line (every 30s) also reports how much
  `bootstrap-prime.log` grew since the last one, e.g. "log grew +340KB in
  the last 30s - still alive and working", or a "hasn't grown" warning if
  it's gone quiet - a direct, honest liveness signal instead of a fixed
  timeout you have to just trust.

With this, Ctrl+C during priming is completely safe any time: it stops the
priming server cleanly, reports that it's safe to re-run `up`/`start`
(which resumes from whatever configs already exist), and exits - no manual
care needed.

**Ship their own `types.xml` to merge in - automated**
([`src/modTypes.ts`](src/modTypes.ts), runs on every `up`/`start`)

- `Windstride-Clothing` - `Types.xml` in the mod folder root
- `DayZ-Dog` - example `types.xml` entries in the mod folder ("not a full
  file replacer")
- `BoomLays-Things` - example `types.xml` in the mod's `00_Info` folder
- `Crowwolfie-Recipes` - a few industrial-zone items (Glue, Carbon Fiber
  Roll) in its own `types.xml`
- `Dart-Board-Game` - `Types.xml` in the mod folder (everything prefixed
  `DARTS_`)
- `CJ187-MoreMoney` / `CJ187-Money-Euros-Only` / `Buddys-BoltZ` - included
  speculatively (see below)
- `Old-Food` - page explicitly mentions a "Types template for Chernarus"
  shipped in the mod folder
- `Quiver` / `Nail-Gun` / `Gas-Mask-Overhaul` - each page mentions an
  "example types file" for their items
- `MBM-ApocalypseTruck` / `MBM-ApocalypticPAZ` - each page states the mod
  ships a `types.xml` in its mod folder (world spawn points now handled by
  `src/vehicleSpawns.ts` - see below)
- `UAZ-31514` - ships a types file too (confirmed on a live install); same
  world-spawn handling as the MBM trucks above (both shipped
  `<nominal>0</nominal>`, admin/event-spawn-only, until `vehicleSpawns.ts`)
- `DayZ-Horse` - ships a real root `types.xml` (Saddle/Bridle/HorseBags/
  HorseSteakMeat/HorsePelt/Stable_dayz(_kit)) - confirmed on a live install.
  Its wildlife/territory setup (world spawn, `Animal_Horse_*` creature
  types) is handled separately by `src/wildlifeTerritories.ts` - see below.

`ensureModTypesMerged()` recursively scans each of these mods' installed
folder under `server/@ModName` for any file literally named `types.xml`
(case-insensitive - the exact path differs per mod, see above), and appends
any `<type name="...">` block whose name isn't already present in the
mission's `db/types.xml` - the same additive, name-deduped merge
`src/ai.ts`/`src/dynamicMissions.ts` use for JSON, just for XML `<type>`
blocks instead. It never touches or duplicates an entry that's already
there (vanilla, another mod, or your own hand-editing), and it's a no-op
until each mod is actually downloaded, so it's safe to run on every start.

**`NCPR-*` (all 5 modules) is the one exception to local scanning** - its
types are published separately on the
[NCPR GitHub](https://github.com/N3msi/NCPR) rather than shipped as a file
in the workshop download itself, so there's nothing local for
`ensureModTypesMerged()` to find. [`src/ncpr.ts`](src/ncpr.ts) handles this
separately instead: if any `@NCPR-*` module is in `mods.txt`, it fetches
the mod's own `NM_TYPES.xml` and `NM_CFGSPAWNABLETYPES.xml` directly from
that repo and merges them the same additive, name-deduped way as any local
types.xml. Every fetched file is cached under `ai/cache/` (gitignored), so
it keeps working offline after the first successful fetch; any network
failure (offline, GitHub down/rate-limited) just skips the step with a
warning instead of blocking `up`/`start`.

**Need a one-time _in-game_ admin action (not a file edit)**

- `P2P-Trading-Board` - the trading board is a physical object
  (`BTB_TradeBoardNoticeBoard`) that has to be placed somewhere on the map
  with the Editor or an admin object-spawner (Community Online Tools, in
  our case) before players can use it. Config lives at
  `profiles/Beetle/tradeboard/config/tradeboard_config.json` (confirmed on a
  live install) - it's balance/numeric-price based (`MinPrice`/`MaxPrice`,
  no currency-item concept), ships 2 placeholder-SteamID lot-limit entries
  that should be replaced with real players, and includes an already-enabled
  `VehicleTrade` sub-config worth reviewing.

**Self-generate a config on first server start, sane defaults, safe to
leave alone**

`CJ187-RandomMineFields` (ships with one real default minefield already,
confirmed on a live install), `Zens-Repairable-Wells`, `Fuel-System`
(`profiles/iTzMods/FuelSystem/stations.xml` ships fully pre-populated with
136+ real Chernarus gas station coordinates - confirmed on a live install;
only per-vehicle fuel-type entries for our custom vehicles are still
unverified), `AirRaid` (siren/bombers/submarine/
MiG-21/UFO events, tunable per-event - confirmed all non-bomber event types
default to disabled).

`Vehicle3PP` also self-generates a config
(`profiles/3PPVehicleWhitelist.json`), but is no longer left alone - see
"Ensures our custom vehicles/wildlife actually work" below.

**Auto-tuned by the CLI on every start (see `src/difficulty.ts`/`src/loot.ts`)**

- `InediaInfectedAI` - self-generates `profiles/Inedia/InediaInfectedAIConfig.json`.
  Its own defaults are already documented as tuned for hardcore play, so the
  CLI only raises a floor on player-damage/stun/headshot-multiplier if a
  host's copy has been edited below it - it won't fight the mod's own
  aggressive defaults.
- `AI-Bandits` - self-generates `profiles/AI_Bandits/{Dynamic,Static}AIB.json`.
  The CLI raises the floor on every patrol/sniper/guard entry's 0-100
  `accuracy` field. There's no separate damage multiplier to tune - AI-Bandits
  fire real ammunition through normal engine ballistics, so "no bullet
  sponges" is automatic in both directions. Per-map example configs still
  live in `@AI Bandits/Doc` if you want to hand-place patrol routes/waypoints
  instead of the auto-generated default. [`src/aiBanditsDensity.ts`](src/aiBanditsDensity.ts)
  (`ensureAIBanditsDensity()`) additively merges the mod's own
  Chernarus-specific example patrol set (6 real routes: NWAF x2, Tisy x2,
  Petrovka, Severograd - copied into [`ai/AIBanditsDynamic.json`](ai/AIBanditsDynamic.json))
  into that self-generated default, since it otherwise ships with just one
  generic example patrol.
- `Terje-Start-Screen` - self-generates
  `profiles/TerjeSettings/StartScreen/{Loadouts,Respawns}.xml` from the mod's
  template. The CLI removes the "multiselect" demo loadout (trades all
  starting points for a shotgun with zero scavenging), the "hunter" loadout
  (a skill-gated starting-kit choice - we don't want a skill-gated character
  class pick on spawn at all), and the matching skill-gated "hunting"
  respawn zone, plus the "sleepingbag" and "deathpoint" respawn options
  (too safe/convenient for hardcore play - death should cost you your
  position). The default "survivor" loadout, the regional map respawns, and
  the SteamGUID-gated "admin" loadout/base are left as-is.
- `CJ187-Money-Euros-Only` / `CJ187-MoreMoney` - once their types.xml (if any)
  is merged in by `ensureModTypesMerged()`, the CLI caps natural spawn
  rates for any item whose name matches a currency keyword (ruble, dollar,
  euro, deutschemark, goldbar, goldcoin, bitcoin), the same way
  `tuneFoodScarcity()` handles food. This is a best-effort keyword match,
  not a confirmed classname list - it's a no-op until the mods are actually
  downloaded and the match can be checked against their real item names.

**Needs manual zone placement to do anything**

- `Terje-Radiation` - ships with exactly one example zone
  (`TerjeRadioactiveScriptableArea` in
  `profiles/TerjeSettings/ScriptableAreas/ScriptableAreasSpawner.xml`,
  confirmed on a live install) but it's disabled (`Active=0`) - flip it on
  or author real zones (statically in that file, or dynamically via the
  mission's normal `events.xml`). Until then it's installed but inert.

**Ensures our custom vehicles/wildlife actually work**
(automated, runs on every `up`/`start`)

- [`src/vehicle3pp.ts`](src/vehicle3pp.ts) (`ensureVehicle3PPWhitelist()`) -
  additively merges confirmed real classnames (pulled from each mod's own
  shipped classname reference file, never guessed) for `UAZ-31514` and both
  `MBM-Apocalypse*` trucks into `profiles/3PPVehicleWhitelist.json`, so 3rd
  person view actually extends to them. `MoreCars` is deliberately excluded -
  it ships no classname reference file, and the mod's own docs warn an
  invalid classname here can crash the server.
- [`src/moreCars.ts`](src/moreCars.ts) (`ensureMoreCarsTypesMerged()`) -
  `MoreCars` ships no types.xml/classname file at all (only a compiled
  `.pbo`), so this hardcodes and additively merges 165 confirmed `<type>`
  blocks (author-provided classnames from the mod's pinned Steam
  Discussions thread, id `1931069341` - see `TODO.md`) into `db/types.xml`:
  every non-Livonia reskin body across Ada 4x4/Gunter2/Sarka 120 plus their
  door/hood/trunk spare parts, using vanilla's own
  `OffroadHatchback`/`Hatchback_02`/`Sedan_02` type templates verbatim.
  Olga 24 is excluded (author-confirmed broken/WIP). All ship with
  `<nominal>0</nominal>`, same as `UAZ-31514`/MBM trucks - typed and
  trader/admin-spawnable; real in-world population is handled next by
  `vehicleSpawns.ts`.
- [`src/vehicleSpawns.ts`](src/vehicleSpawns.ts)
  (`ensureCustomVehicleSpawns()`) - actually places `UAZ-31514`, both MBM
  trucks, and every `MoreCars` body variant (25 total; spare parts don't
  need this, they're loot items) into the live world. Rather than
  hand-picking ~165 brand new Chernarus coordinates blind, each vehicle is
  added as an extra `<child>` of the closest matching _existing_ vanilla
  vehicle event in `db/events.xml` (`UAZ-31514` and the Ada 4x4 reskins
  under `VehicleOffroadHatchback`, Gunter2 under `VehicleHatchback02`,
  Sarka 120 under `VehicleSedan02`, both MBM trucks under
  `VehicleTruck01`) - reusing that event's own already-shipped,
  already-safe, already-on-road `<pos>` list in `cfgeventspawns.xml`
  completely untouched, the same "closest vanilla counterpart" mapping
  `fuelSystem.ts` already uses. Each event's own `nominal`/`min`/`max` gets
  a modest one-time bump (not 1:1 per new variant) so the added variety
  doesn't just cannibalize the existing vanilla population's spawn budget -
  kept deliberately small per this project's hardcore-scarcity design. See
  `TESTS.md` for the live spawn-rate sanity check this still needs.
- [`src/fuelSystem.ts`](src/fuelSystem.ts) (`ensureFuelSystemVehicles()`) -
  `Fuel-System` self-generates `profiles/iTzMods/FuelSystem/vehicles.xml`
  with only vanilla base-class fuel/consumption entries. The mod's own docs
  confirm `type` "can be a base class" (inheritance-chain matching), so our
  custom vehicles likely already inherit sane fuel behavior from
  `OffroadHatchback`/`Truck_01_Base`/etc. - but a live user report on the
  mod's Steam page describes base-class DIESEL matching not applying
  reliably, so this additively merges explicit exact-classname entries for
  `UAZ-31514`, both MBM trucks, and every `MoreCars` reskin (43 total),
  reusing the exact fuel type/consumption already shipped for each one's
  closest vanilla counterpart - a safety net that bypasses any
  inheritance-matching bug entirely.
- **TP-Apoc-SUV / TP-Apoc-M1025 / TP-Apoc-Pickup / AnimatedDynamicHelicopters**
  - each of the three TP-Apoc vehicles ships its own root `types.xml`
    (auto-merged by `modTypes.ts`), so unlike `MoreCars` these needed no
    hand-typed classname list. Fueled (diesel, matching the mod's own shipped
    `Offroad_02` spare-part reference) via `fuelSystem.ts`, 3rd-person-
    whitelisted via `vehicle3pp.ts`, and SUV+Pickup (not the armed M1025 -
    kept trader-only/Legendary by design) added as extra `VehicleOffroad02`
    `<child>`ren via `vehicleSpawns.ts`, same "closest vanilla counterpart"
    pattern as the other custom vehicles above. `AnimatedDynamicHelicopters`
    ships no new vehicle at all - confirmed its own `adh_types.xml` only
    contains smoke-grenade/flare ammo types - it just adds crash/flight
    scripting to DayZ-Expansion's existing helicopters, so it needs no
    further wiring anywhere.
- [`src/optics.ts`](src/optics.ts) (`ensureOpticsWired()`) - `@Optics` adds
  scope/sight attachments with no shipped `<types>` root economy file
  (its `cfgspawnabletypes.xml` root is `<spawnabletypes>`, not `<types>`, so
  `modTypes.ts`'s generic merger correctly skips it) - every classname is
  authored from scratch here as a `nominal=0` trader-only stub (never
  spawns in the world, only reachable via the trader's stock/restock
  system), priced/tiered via `src/data/marketGapFill.json`.
- [`src/tgkWeaponPack.ts`](src/tgkWeaponPack.ts)
  (`ensureTgkWeaponPackWired()`) - `@TGK-WeaponPack` (~280
  Russian-special-forces-themed weapons/attachments/melee items, aka
  "SOBR"/"SM_") follows the exact same nominal=0 trader-only-stub pattern
  as `@Optics` above rather than hand-tuning ~280 individual spawn rates -
  "mostly but not all high-end weapons wanted" is achieved entirely via
  `marketGapFill.json`'s tier assignment (Rare for standard rifles/SMGs/
  shotguns/pistols, Legendary for heavy machine guns/dedicated sniper
  rifles/the 40mm grenade launcher), the same "hard to get, not physically
  absent" lever used everywhere else in this project.
- [`src/necromutant.ts`](src/necromutant.ts) (`ensureNecromutantWired()`) /
  [`src/bmmChemicalZombie.ts`](src/bmmChemicalZombie.ts)
  (`ensureBmmChemicalZombieWired()`) / [`src/customZombiesTchc.ts`](src/customZombiesTchc.ts)
  (`ensureCustomZombiesTchcWired()`) - three more single-creature/item
  content mods, each folded into their own dedicated, independently-tunable
  event (`NecromutantBook`, `InfectedBMMChemical`,
  `InfectedTCHCCustom`/`TCHCZombieBear`) rather than an existing zombie/loot
  event, same reasoning as `yuretskiy.ts`. Necromutant's only economy entry
  is the trigger book itself (`JVDS_Book_darkness`) - the mutant and its
  reward are `CreateObject()`'d directly by the mod's own script, never
  CE-registered, so they're deliberately left untyped. Custom-Zombies-TCHC
  splits its 4 classnames across two events since one
  (`TCHC_ZombieBear`) is actually `Animal_UrsusArctos`-derived, not
  `ZombieBase`-derived like the other three - kept out of vanilla's own
  `AnimalBear` event (which has a real bear-habitat `<pos>` list) for the
  same "don't touch a real population budget for a novelty reskin" reason.
  Has two unresolved live bug reports on its own Workshop Comments tab
  (astronaut invincibility, a PBO-signing complaint) - added anyway per the
  project owner's own request; see TESTS.md.
- [`src/foreverBurningCampfire.ts`](src/foreverBurningCampfire.ts)
  (`ensureForeverBurningCampfireWired()`) - `@Forever_Burning_Campfire`
  (replaces the removed `@NeonMurder-Lights`) splits its content in two,
  each needing a different auto-wiring approach (see that file's own header
  comment for the full story): plain decorative static props
  (`FBF_FireBarrel`/`FBF_Torch`/`FBF_AreaLight_Warm`) are declared via
  DayZ-Expansion-Core's own generic placed-object file format
  (`EXPANSION_OBJECTS_DIR`, previously unused by this project), while
  `FBF_Fireplace` itself - a genuine persistent entity the mod's own docs
  warn will "multiply" if placed via Editor/init - is spawned + permanently
  ignited exactly once by a dedicated EnforceScript addon,
  `serverpack/addons/DZSurvivalTraderFireplace`, guarded by a persistent
  marker file (same pattern as `DZSurvivalTraderRestock`). Placement
  positions are still a placeholder pending live visual confirmation - see
  TESTS.md.
- [`src/lighting.ts`](src/lighting.ts) (`tuneLightingConfig()`) -
  `Lads-Lighting-Overhaul` does nothing at all until `lightingConfig` is set
  to one of its preset values; this force-sets `WorldsData.lightingConfig`
  in the mission's `cfggameplay.json` to `2222` (Darker Overcast Nights) on
  every start, and `genConfig()` in `server.ts` writes the matching
  `lightingConfig` line into the generated `serverDZ.cfg`. Change
  `LIGHTING_PRESET` in `lighting.ts` to retune.
- [`src/mapAccess.ts`](src/mapAccess.ts) (`tuneMapAccess()`) - force-sets
  `MapData.ignoreMapOwnership = true` in the mission's `cfggameplay.json` on
  every start, which is required for vanilla's own M-key map-toggle
  shortcut to be reachable at all. Paired with the `DZSurvivalMapGate`
  serverpack addon, which then requires the player to have both an
  `ItemMap` and a GPS device before that shortcut actually opens the map.
- [`src/weather.ts`](src/weather.ts) (`tuneWeather()`) - the mission's own
  `cfgweather.xml` ships with `enable="0"`, meaning none of its values do
  anything at all (the engine falls back to its own baked-in default
  pattern instead) - confirmed on a live install. Turns it on and re-tunes
  it for a colder/damper baseline: overcast floor raised (skies are never
  fully clear), fog thickened and made far more frequent, the overcast
  threshold needed to trigger rain lowered (so it actually rains more given
  the raised overcast baseline), and a wind-magnitude floor added (air is
  never fully still, so there's always some wind chill). Snowfall stays
  forced to 0 and wind direction/storm density are untouched - no map
  asset or texture is touched, this only changes weather-pattern frequency/
  intensity. Re-applied on every start via a marker comment (same pattern
  as `economy.ts`), since this file ships with the mission and can be
  silently reset back to vanilla by `deno task install`'s steamcmd
  validation.
- [`src/hazards.ts`](src/hazards.ts) (`tuneHazardZones()`) -
  `Terje-Radiation` self-generates its `ScriptableAreasSpawner.xml` with
  exactly one example `TerjeRadioactiveScriptableArea` zone, shipped with
  `Active="0"` (confirmed on a live install - it does nothing at all until
  enabled). Flips it to `Active="1"` on every start, trusting the mod
  author's own position/radius/power rather than guessing new Chernarus
  coordinates blind. `CJ187-RandomMineFields`'s `RandomMineFields.json` has
  no separate on/off switch in its schema - its two shipped minefield/
  claymore-field entries are already live by default, so nothing to wire up
  there.
- [`src/noBuildZones.ts`](src/noBuildZones.ts) (`tuneNoBuildZones()`) -
  `No-Build-Zones` self-generates an empty `profiles/NoBuildZone.json`.
  Additively seeds one curated zone by name (currently just `NWAF`, 300m
  radius) reusing the exact coordinate already used for its roaming-patrol
  waypoint, never touching an admin's own hand-added zones. More zones can
  be added the same way once other military bases' coordinates are
  confirmed - see TODO.md item 10/11.
- [`src/namalskClothing.ts`](src/namalskClothing.ts)
  (`ensureNamalskClothingMerged()`) - `Namalsk-Survival` ships two complete
  alternate mission economies (its own map, not ours), so rather than merge
  either wholesale, this diffs every `<category name="clothes"/>` `<type>`
  in its hardcore variant's `db/types.xml` against our own and cherry-picks
  only the genuinely new ones. Confirmed (2026) that the
  Gorka/Ghillie/ManSuit/WomanSuit/TrackSuit sets people usually associate
  with Namalsk are already vanilla DayZ items on Chernarus (added in a past
  game update) - only 12 items were actually new: `BDUpants`,
  `GorkaHelmet_Black`, `Headtorch_Black`/`Grey`, `HipPack_Black`/`Green`/
  `Medical`/`Party`, `NVGHeadstrap`, `NylonKnifeSheath`, `OMKJacket_Navy`,
  `OMKPants_Navy`. Namalsk's own file ships all 12 with an empty, name-less
  `<usage/>` (no location group at all, so they'd never spawn via normal
  loot economy) - each is merged in with real `<usage>` tags derived from
  that same item's own `<tag>` hints instead. Additive/name-deduped, same
  pattern as `modTypes.ts`/`wildlifeTerritories.ts`.
- [`src/wildlifeTerritories.ts`](src/wildlifeTerritories.ts)
  (`ensureWildlifeTerritories()`) - `DayZ-Raven`, `DayZ-Rat`, `DayZ-Horse`,
  and `DayZ-Dog` each ship a ready-to-use Chernarus territory file. Raven/Rat
  ship a readme describing a small, mechanical four-step patch (copy the
  territory file into the mission's `env/`, register it + a `<territory>`
  block in `cfgenvironment.xml`, add an `<event>` to `db/events.xml`, add a
  few `<type>` blocks to `db/types.xml`). Horse and Dog ship no readme, but
  their reference files (Horse: paired `<!-- HORSE MOD -->` comments inside
  otherwise-vanilla-shaped files; Dog: standalone `cfgenvironment.xml`/
  `events.xml`/`cfgeventspawns.xml` snippets under
  `dog_territories/`) mark/contain the same additions, plus one extra
  step: "Herd"-type territories like Horse and Dog also need a
  self-closing `<event name="..." />` stub in `cfgeventspawns.xml`
  (confirmed by comparison against the vanilla Wolf/Deer/WildBoar entries
  already there - "Ambient"-type territories like Raven/Rat don't need
  this). This automates every step for all four mods, additively and
  idempotently, verified on a live server (no CE "type not found" errors,
  no duplicate entries on re-run). Horse's and Dog's own root `types.xml`
  files (Saddle/Bridle/HorseBags/etc.; dog collars/vests/gasmask/sheds) are
  merged separately via `modTypes.ts`; the `Animal_Horse_*`/`Doggo_Wild*`
  creature types neither mod ships are added here using the same
  boilerplate every other vanilla `Animal_*` creature type uses (Dog uses
  the wolf's shape specifically, since it shares `DZWolfGroupBeh`).
- [`src/yuretskiy.ts`](src/yuretskiy.ts) (`ensureYuretskiyWired()`) -
  `Yuretskiy-Creatures` ships 7 tougher zombie classnames
  (`YRTSK_ZMB_SWAT`/`Male`/`TShirt`/`Fitness_F`/`Fitness_F_2`/`Fat`/
  `PartFoot`, confirmed via the mod's own `extras/classname.txt`) that are
  real, already-compiled `CfgVehicles` entries in its PBO - the mod's
  `extras/config.cpp` only forward-declares them as base classes for an
  _optional_ HP-tweak workflow, which only works if they already exist for
  real. So spawning them at their shipped default stats needed nothing but
  the same additive `<type>`/`<event>` wiring as every other creature mod
  here - added as one dedicated `InfectedYuretskiy` event (rather than
  folded into an existing vanilla infected event) so its rarity is
  independently tunable. Confirmed live: the CE actually spawns them
  (`InfectedYuretskiy :: ... YRTSK_ZMB_PartFoot :: 9, ...` in the server
  log), no "type does not exist" errors. Customizing their HP still isn't
  automated - see `TODO.md` - that genuinely requires hand-editing
  `extras/config.cpp` and re-packing your own PBO.

**Partial feature loss without a mod we didn't add**

(none currently - `Terje-Skills` is included in this pack, so
`Terje-Medicine`'s Immunity/Medicine skill bonuses and the rest of the
progression system - butchering, firecraft, hunting, etc. - work as the mod
intends.)

**Confirmed non-issues (checked so you don't have to)**

- `Namalsk Survival` is the mechanics pack (frostbite, cold resistance,
  events), explicitly built to work on non-Namalsk terrain - not the
  Namalsk map.
- `DayZ Horse`'s only listed incompatibility is `DayZ-Expansion-Animations`,
  which isn't in this list (the Expansion set here intentionally excludes
  it, same as it was excluded from the old Bundle).
- `Survivor Animations` can't coexist with _any other_ animation-modifying
  mod (an Enfusion engine limitation) - nothing else in this pack modifies
  animations, so we're clear.
- `HeliWreckNoLoot` only adds inert Editor-placeable models (no-loot heli
  wrecks, a wagon, some tools) - it doesn't touch the vanilla heli-crash
  system our Dynamic AI Missions "Downed Helicopter" mission uses.
- `DayZ-Expansion-Market` works fully out of the box on this mission -
  confirmed on a live install: category/price files self-populate under
  `profiles/ExpansionMod/Market/`, matching trader definitions under
  `profiles/ExpansionMod/Traders/`, and 6 real trader zones already exist
  under `server/mpmissions/dayzOffline.chernarusplus/expansion/traderzones/`
  (Svetloyarsk, BalotaAircrafts, KamenkaBoats, GreenMountain, Kamenka,
  Krasnostav). Still worth reviewing prices/stock for our hardcore economy,
  but nothing needs fixing to make it work at all.
- `Terje-Medicine`'s "Advanced knockout system" (coma instead of outright
  death) is already enabled by default - confirmed via
  `profiles/TerjeSettings/Medicine.cfg` on a live install
  (`EnableMedicalComa`/`EnableKnockoutToComa` both `true`).

See `mods.txt` for the full, dependency-ordered list and load order.

## Roaming AI

Roaming bandit patrols come from [`@DayZ-Expansion-AI`](https://steamcommunity.com/sharedfiles/filedetails/?id=2792982069),
already included in `mods.txt`. No extra mod install is needed.

Expansion reads its patrol config from the mission itself
(`server/mpmissions/dayzOffline.chernarusplus/expansion/settings/AIPatrolSettings.json`,
not the server profile), and generates that file itself - with a solid set of
default town patrols plus genuine `ROAMING`/`ROAMING_LOCAL` bandits - the
first time the mission loads. Since that file lives inside the (gitignored)
mission directory, it isn't something a fresh host has until the server has
run once, so it can't just be committed to the repo.

To keep this reproducible across hosts without manual intervention, `deno run up`
/ `deno run dayz start` call `ensureAIPatrols()` ([`src/ai.ts`](src/ai.ts)) on every
start. It:

- Does nothing until Expansion has generated `AIPatrolSettings.json` on first boot
  (so a brand new host always gets Expansion's own good defaults first).
- Once that file exists, merges in extra curated roaming bandit patrols from
  [`ai/AIPatrolSettings.json`](ai/AIPatrolSettings.json) by name, skipping any
  patrol that's already present.
- Also merges in any `LoadBalancingCategories` entries from that same template
  (see below) that aren't already defined, without touching existing ones.

It never overwrites the file wholesale, so any in-game customization (via the
admin AI menu) or manual edits are preserved.

### Map-wide coverage

The template defines 14 `ROAMING`-behaviour bandit patrols spread across most
of Chernarus's coastline and central/northern hotspots (Chernogorsk, Balota,
Elektrozavodsk, Solnechny, Berezino, Svetlojarsk, Novodmitrovsk, NW Airfield,
Stary Sobor, Tisy, Zelenogorsk, Kamenka, Vybor, Green Mountain) instead of
just a couple of towns.

A few mechanics make this add up to "encounterable almost anywhere" rather
than just a dozen fixed camps:

- Each patrol only _spawns_ once a player is within its `MaxDistRadius`
  (2500m here) - it doesn't exist in the world outside that range. With 12
  hotspots at ~2500m radius, most well-travelled parts of the map (towns,
  coastline, main roads) fall inside at least one.
- `Behaviour: ROAMING` means that once a patrol spawns, it isn't leashed back
  to its anchor point - Expansion has the AI pick its own destinations and
  wander off, so encounters don't feel like static town camps.
- `Chance: 0.75` on each patrol adds a bit of unpredictability - not every
  hotspot is guaranteed to have bandits active every time you pass through.

Coordinates are approximate town centers, sourced from general Chernarus map
knowledge rather than verified in-engine. If any patrol looks off in-game
(e.g. spawning in water or on a cliff), nudge its `Waypoints` entry - the
admin AI menu described below is the easiest way to get an exact, verified
position. `Vybor` and `Green Mountain` are the two newest additions and
haven't been checked in-game yet at all - see `TESTS.md`.

### Military-area coverage floor

Five of the fourteen patrols (`NWAF`, `Balota`, `Tisy`, `Vybor`, and
`Green Mountain`) are tagged with a dedicated `MilitaryPatrols`
`LoadBalancingCategory` instead of the shared `RoamingBandits` one the nine
town patrols compete for. This guarantees a floor of 6 concurrent military
patrols even at 0-10 players (scaling up to 9 at 51+) - so looting a
military base is never risk-free just because the server is quiet,
addressing TODO.md item 11. `RoamingBandits` was raised the same pass (7 at
0-10 players, up to 14 at 51+, from an original 5/8/10/12) for a more
generally "alive" world at low population. More bases (Devil's Castle,
etc.) can be added the same way once their coordinates are confirmed.
`src/ai.ts` reconciles this `LoadBalancingCategory` field on every start
even for a patrol that was already merged into a live mission under the
old category in an earlier run - including raising a category's
`MaxPatrols` thresholds if a later project update bumps them (never
lowering a value an admin may have hand-tuned higher).

### Military garrisons (Yuretskiy monsters)

On top of the roaming patrols above, [`src/militaryMonsters.ts`](src/militaryMonsters.ts)
(`ensureMilitaryMonsterGarrisons()`) adds a fixed `InfectedYuretskiyMilitary`
event to `db/events.xml`/`cfgeventspawns.xml` (gated on `@Yuretskiy-Creatures`
being installed) that stations the mod's 7 tougher zombie variants
(`YRTSK_ZMB_SWAT`/`Male`/`TShirt`/`Fitness_F`/`Fitness_F_2`/`Fat`/`PartFoot` -
already typed by `src/yuretskiy.ts`) at the same 5 confirmed military
coordinates as the `MilitaryPatrols` above, rather than inventing new
locations. It's `position=fixed`/`limit=mixed` (nominal 15, min 5, max 20,
lifetime 1800), with radius/lifetime values reused from vanilla's own
`StaticMilitaryConvoy`/`StaticPoliceSituation` events - the closest vanilla
precedent for "a dangerous fixed encounter at a real military-flavoured
coordinate". This is on top of, not instead of, Yuretskiy's own ambient
`InfectedYuretskiy` event (`position=player`, spawns anywhere as players
roam) - the military event adds extra, tougher, location-biased infected on
top of that ambient baseline. Purely additive: skipped entirely if the
event name already exists in either file.

`Burning-Mutant`/`Freezing-Mutant` were considered too, but excluded: their
self-generated config (once it exists - confirmed absent from a fresh
`profiles/` install) only documents damage/wound/protection tuning per
their own Steam pages, nothing about spawn location/frequency, so there's
no confirmed way to bias them toward military bases specifically without
guessing an undocumented schema.

### Keeping performance in check as coverage grows

More possible patrol locations means more _potential_ concurrent AI, which
can hurt server FPS if left uncapped (see [AI Performance
Tuning](https://github.com/salutesh/DayZ-Expansion-Scripts/wiki/AI-Performance-Tuning) -
past ~30 concurrent Expansion AI you'll start seeing AI update delta-time
climb). The template assigns all of these patrols to a `RoamingBandits`
[load balancing category](https://github.com/salutesh/DayZ-Expansion-Scripts/wiki/%5BServer-Hosting%5D-AI-Load-Balancing),
which caps how many can be active at once based on current player count:

| Online players | Max active `RoamingBandits` patrols |
| -------------- | ----------------------------------- |
| 0-10           | 5                                   |
| 11-25          | 8                                   |
| 26-50          | 10                                  |
| 51+            | 12                                  |

This only limits our custom category - it doesn't affect Expansion's own
default-generated town patrols, which fall under their own default category.
Tune the numbers in `ai/AIPatrolSettings.json`'s `LoadBalancingCategories` to
taste (they're only merged into the mission's real settings file if that
category name doesn't already exist there).

## Ambient spawns anywhere (DayZ-Dynamic-AI-Addon / "Spatial AI")

[`@DayZ-Dynamic-AI-Addon`](https://steamcommunity.com/sharedfiles/filedetails/?id=2874589934)
(in `mods.txt`, marked `server`) is a genuinely location-free complement to
the waypoint-based patrols above. Its `Group` entries spawn purely based on
proximity to _any_ player - governed by the file's global `MinDistance`/
`MaxDistance`/`Spatial_MinTimer`/`Spatial_MaxTimer` settings - with no anchor
point at all. This is what gets you AI encounters that are _actually_
possible anywhere on the map, not just near a curated list of hotspots.

Like Expansion, it generates its own default config the first time it loads,
but in the **server profile** rather than the mission:
`profiles/ExpansionMod/AI/Spatial/SpatialSettings.json`. `ensureSpatialAI()`
([`src/spatial.ts`](src/spatial.ts)) runs on every `up`/`start` and, once that
file exists, merges in two extra bandit groups from
[`ai/SpatialSettings.json`](ai/SpatialSettings.json) by name (skipping any
that already exist) - same non-destructive pattern as the patrol merge above.

Both added groups use `BanditLoadout.json` (the same Expansion default
loadout our patrol template above already relies on) and the `Raiders`
faction:

- `Spatial_RoamingBandits` - 1-3 AI, common (`Spatial_Chance: 0.5`).
- `Spatial_RoamingBanditSquad` - 2-4 AI, tougher accuracy, rarer (`Spatial_Chance: 0.25`).

`ensureSpatialAI()` also merges in one curated `Audio` zone, `Audio_NWAF` -
a real, positioned noise-trigger zone at the NWAF hotspot (same trigger
coordinates as `Roaming_Bandits_NWAF`/`NWAF_Weapons_Cache` above), replacing
the addon's own placeholder `Audio1`/`Audio2` zones (which sit at
`[0, 1, 0]` and can never fire). Its `Spatial_SpawnPosition` is spread
across 4 points roughly 200m out from the trigger center (not the trigger
point itself), so AI approach from a distance instead of spawning right on
top of whoever tripped the zone. The addon's own `Audio_Enabled` flag
defaults to `0` out of the box - since a real `Audio` zone is useless while
that's off, the merge flips it to `1` the same run it adds `Audio_NWAF`.
`Points_Enabled`/`Locations_Enabled` are left alone (still `0`) since we
haven't authored real `Point`/`Location` zones yet.

Live-tested (2026-08-25): fired repeatedly inside `Audio_NWAF`'s 300m
trigger radius - bandits spawned and engaged, no crash, no AI/`Audio`
script errors in the RPT. See `TESTS.md`'s `Spatial_MaxAccuracy` item for
the full test note.

The addon's own global settings (`MinDistance`/`MaxDistance`, spawn timers,
`MaxAI` cap) aren't touched by the merge - they govern our added groups too,
so tune them directly in the generated `SpatialSettings.json` if you want
spawns closer/farther from players, more frequent checks, or a higher/lower
total AI cap (default `MaxAI: 20`).

## Dynamic AI missions (Epoch-style crash sites)

Two more server-only mods add classic Arma 2 Epoch-style random missions -
loot-stuffed crash/ambush sites guarded by AI that despawn once looted or
cleared:

- [`@Dynamic-AI-Missions`](https://steamcommunity.com/sharedfiles/filedetails/?id=3277130230) -
  requires `DayZ-Expansion-AI` (already installed).
- [`@Dynamic-AI-Missions-Extended`](https://steamcommunity.com/workshop/filedetails/?id=3773597150) -
  optional add-on for the above; lets you force a specific loot reward and/or
  AI faction per mission instead of random rolls.

Both are marked `server` in `mods.txt` (see below). Like the two AI systems
above, `Dynamic-AI-Missions` self-regenerates its own `MainConfig.json` (with
a default mission set) the first time it loads - confirmed by the mod's
author in a [Steam comment](https://steamcommunity.com/sharedfiles/filedetails/?id=3277130230)
("I deleted the mainconfig and let it regenerate another"). Its schema was
verified against a real, complete example config from a public repo
([Banditas231/Dynamic-AI-Missions-for-DayZ-Expansion-AI-Extra-Cargo-Ship-and-Raid-Base](https://github.com/Banditas231/Dynamic-AI-Missions-for-DayZ-Expansion-AI-Extra-Cargo-Ship-and-Raid-Base)) -
only its JSON structure was reused, not its actual mission content.

The mod generates its `MainConfig.json` at `profiles/AIMissions/MainConfig.json`
(confirmed on a live server run) - `ensureDynamicMissions()`
([`src/dynamicMissions.ts`](src/dynamicMissions.ts)) merges into that file
once it exists, same non-destructive pattern as the other two AI systems
above.

It merges in 3 curated example missions from
[`ai/DynamicAIMissions.json`](ai/DynamicAIMissions.json) by name (skipping any
that already exist) - `NWAF_Weapons_Cache`, `Tisy_Armory_Raid`, and
`Balota_Airfield_Standoff`, reusing the same coordinates as the roaming
patrol hotspots above so missions periodically raise the stakes at places
players (and roaming bandits) already contest. Each mission needs a
`Bots_Loadout_ID` pointing at a _sub-group_ inside the file's `Loadouts[0]`
(shared by that group's `Weapons`/`Armour`/`Headgear` entries via a repeated
`Loadout_ID` field, not a separate top-level array item) - to avoid
colliding with whatever IDs the admin's file already has, the merge mints a
new, unused `Loadout_ID` for the template's own gear (FAL/SVD kit) and points
the new missions at it. `Settings`, `RewardObjects`, and `Loot` are never
touched, so reward tuning and existing missions are fully preserved.

Mission `Position` coordinates are a starting point, not verified in-engine -
if AI or static objects look off (floating, clipped into terrain), open the
file and adjust, same as with the patrol waypoints above.

If you install `Dynamic-AI-Missions-Extended`, each curated mission in the
template already sets `Faction: "Raiders"` (matching the same faction used by
the roaming-bandit patrols and spatial-AI groups above, so mission defenders
read as part of the same bandit presence). The other two extra fields
(`Forced_Reward_ClassName`, `Skip_Random_Loot` per its Steam page) are left
unset - we couldn't find a real example config using them to confirm their
exact structure, so add them by hand to specific missions in `MainConfig.json`
if you want to force a particular reward; leaving them out is safe ("100%
safe defaults" per the mod's own description).

## Hardcore rebalance (loot + AI difficulty)

Out of the box, these AI mods are generous by default — an Expansion airdrop
crate rolls 50 items, and Dynamic AI Missions can hand out several
weapons/pieces of armour per reward. That clashes with this project's "earned
power" and "hardcore, but respects your time" design goals, so three modules
retune the generated configs from these mods every start. Unlike every other
`ensureX()` above (which only ever _adds_ curated content and never touches
existing values), these deliberately _overwrite_/remove a handful of scalar
fields or entries — an explicit, opinionated tuning pass, not a merge. If you
want different numbers, edit the constants in the relevant `.ts` file and
re-run `deno run up`/`start`, rather than hand-editing the generated
JSON/XML (which would just get reverted on the next start).

### Loot scarcity ([`src/loot.ts`](src/loot.ts))

- `tuneAirdropLoot()` caps every `ItemCount` in
  `profiles/ExpansionMod/Settings/AirdropSettings.json` (the top-level value
  and all 4 loot containers) at **2** items per crate, down from the mod's
  default of 50/30/25.
- `tuneMissionRewards()` caps the `Reward_Loot_*_Maximum` fields in
  `profiles/AIMissions/MainConfig.json`'s `Settings[0]` block: **1** weapon,
  **1** armour piece, **2** misc items per completed mission (down from
  2/2/4).
- `tuneStartingLoadouts()` removes the "multiselect" demo loadout (a free
  shotgun for all of your starting points) and the "hunter" loadout (a
  skill-gated starting-kit choice) from Terje-Start-Screen's
  `profiles/TerjeSettings/StartScreen/Loadouts.xml`, each independently and
  verbatim-matched the first time it's seen. The default "survivor" loadout
  and the SteamGUID-gated "admin" loadout are left as-is.
- `tuneRespawnPoints()` removes the matching skill-gated "hunting" respawn
  zone, plus the "sleepingbag" (respawn at a placed sleeping bag) and
  "deathpoint" (respawn at your own corpse) respawn options from
  `profiles/TerjeSettings/StartScreen/Respawns.xml` - all three are too
  safe/convenient for hardcore play. The regional map respawns and the
  SteamGUID-gated "admin" base are left as-is.
- `tuneStartScreenSettings()` disables `StartScreen.SkillsPageEnabled` in
  `profiles/TerjeSettings/StartScreen.cfg` - the page that lets a fresh
  spawn pre-allocate skill/perk levels from a pool of points before ever
  playing. That's the opposite of "earned power": skills should only grow
  from actually butchering, making fires, etc. via `Terje-Skills`' own
  progression system (`profiles/TerjeSettings/Skills.cfg`), which is
  unaffected by this setting and keeps working normally.

### AI difficulty ([`src/difficulty.ts`](src/difficulty.ts))

Rewards being scarce only feels fair if the fights for them are a real
threat, not a pushover, so this module raises AI lethality/awareness across
all three AI systems above — while explicitly keeping how much damage AI
_takes_ at normal (`1x`) so encounters stay fast and don't turn into bullet
sponges:

- `tuneAIDifficulty()` rewrites `profiles/ExpansionMod/Settings/AISettings.json`.
  This is DayZ-Expansion-AI's global fallback config - every patrol in
  `AIPatrolSettings.json` uses `-1` for its own accuracy/damage/threat fields
  (confirmed across all 46 generated entries), meaning "inherit this file's
  values". So this one file is the single lever that governs difficulty for
  _every_ Expansion AI patrol on the map: accuracy floor raised to `0.45`,
  threat/noise-investigation distances extended, flanking enabled even
  outside active combat, and damage dealt increased to `1.15x`.
- `tuneSpatialAIDifficulty()` raises the accuracy and trigger-chance floors on
  every `Group`/`Point`/`Location`/`Audio` entry in the Dynamic-AI-Addon's
  `SpatialSettings.json`, since (unlike Expansion) each entry carries its own
  values rather than inheriting from one global setting. It also re-asserts
  three _global_ settings that govern `Group`-type spawns (proximity-based to
  any player anywhere on the map, including the wilderness - see
  TODO.md item 9): `HuntMode=1` ("hunt player aggressively", the mod's own
  default, re-applied in case a future update resets it), a `MinDistance`
  floor of 140m (never an unfair point-blank spawn), and - the one real gap
  found versus the shipped defaults - a `CleanupTimer` floor of 20 minutes
  (up from 6), long enough for a hunting group to actually close the
  distance on the player before despawning.
- `tuneMissionDifficulty()` raises `Bots_Accuracy` (floor `0.65`) and
  `Bots_Damage_Done_Multiplier` (`1.15x`) on every mission in
  `profiles/AIMissions/MainConfig.json`, while pinning
  `Bots_Damage_Taken_Multiplier` back to `1x`.
- `tuneInediaInfectedAIDifficulty()` raises floors (never overwrites) in
  `profiles/Inedia/InediaInfectedAIConfig.json` - unlike the mods above,
  InediaInfectedAI's own wiki documents its defaults as already tuned for
  hardcore play (e.g. `DamageToPlayerHealthMultiplier` already `1.2-1.4x`),
  so this only steps in if a host's copy has been edited below the floor.
- `tuneAIBanditsDifficulty()` raises the `accuracy` floor (0-100 scale, `55`)
  on every patrol/sniper/guard entry in `profiles/AI_Bandits/DynamicAIB.json`
  and `StaticAIB.json`. AI-Bandits has no separate damage multiplier to
  tune - it fires real ammunition through normal engine ballistics, so "no
  bullet sponges" holds automatically in both directions.

### Loot economy: hunt, don't just scavenge ([`src/economy.ts`](src/economy.ts))

Unlike the mod-generated configs above, `db/types.xml` and `db/events.xml`
ship as part of the mission itself, straight from the vanilla DayZ economy -
and by default they make ready-to-eat food nearly as common as ammo, with no
real incentive to hunt. Three functions retune these vanilla files to push
players toward hunting instead:

- `tuneFoodScarcity()` finds every `category name="food"` item in
  `db/types.xml` that actually spawns (`nominal > 0`, i.e. skipping opened
  cans/cooked meat variants that only ever come from other items), and
  halves both `nominal` and `min` (rounded, floor of 1), while raising
  `restock` to at least 3600s (1 hour) so a picked-clean location can't
  refill quickly. Farming seed packs (any type name containing "Seed") are
  left untouched, since farming is a separate progression path we don't want
  to nerf alongside scavenged food.
- `tuneAnimalSpawns()` raises the map-wide population target (`nominal`) of
  every `Animal*` event in `db/events.xml` (cows, deer, goats, pigs, roe
  deer, sheep, wild boar, wolves) by 1.75x, leaving cluster-size (`min`/
  `max`) and every other field untouched. `AnimalBear` (nominal `0` by
  default, vanilla's own way of making it a rare/special-case spawn) is
  correctly left alone by this multiplier, since `0 × 1.75` is still `0`.
- `tuneMoneyScarcity()` matches `db/types.xml` items by name keyword (ruble,
  dollar, euro, deutschemark, goldbar, goldcoin, bitcoin - covering the
  CJ187 money mods once their reference types.xml is merged in) and cuts
  both `nominal` and `min` to 40%, with the same 3600s `restock` floor as
  food. "Not everything can be bought" only holds if cash itself is scarce.

Both files are large (tens of thousands of lines) and hand-authored by
Bohemia's own tooling, so rather than parse/reserialize the whole file
(which would reformat everything into an unreviewable diff), all three
functions use scoped regex substitution that only touches the specific
`<nominal>`/`<min>`/`<restock>` tag text inside a matched block - everything
else stays byte-identical.

Because these files are part of the Steam depot, `deno task install` can
silently reset them back to vanilla on an update. All three functions stamp
a marker comment (`<!-- dayz-survival:food-scarcity-tuned -->` /
`<!-- dayz-survival:animal-spawns-tuned -->` /
`<!-- dayz-survival:money-scarcity-tuned -->`) once they've tuned a file, so
running them again is a no-op on an already-tuned file, but they
transparently re-apply if a Steam update wipes the file (and its marker)
back to vanilla - verified directly against a real generated `types.xml`/
`events.xml` (34 food items, 8 animal species; diffed to confirm only the
intended tags changed, and re-running is idempotent).

### Trader stock: not everything can be bought ([`src/market.ts`](src/market.ts))

`DayZ-Expansion-Market` ships one flat default for every single category
regardless of what it sells - confirmed live in every generated
`profiles/ExpansionMod/Market/*.json`: `InitStockPercent: 75.0` and
`MaxStockThreshold: 100` per item (500 for `Ammo`, 250 for `Ammo_Boxes` -
still just as generous), meaning a trader can start already stocked with
dozens of assault rifles. `tuneExpansionMarket()` deliberately tightens only
the categories that represent "earned power" - full weapons capped to 5
max stock, ammo/magazines/optics/attachments/vehicle parts to 15, whole
vehicles (already naturally rarer, 3-10 shipped) to 2 - and drops
`InitStockPercent` to 10% across those categories so a trader starts nearly
empty rather than half-stocked. Survival essentials (food, medical, tools,
clothing, backpacks, etc.) are deliberately left at Expansion's generous
defaults - matches "hardcore, but respects your time": we want power to be
hard to buy, not everyday survival gear to be scarce from traders too.

Unlike economy.ts's marker-comment approach, this is idempotent via an
absolute cap (`min(existing, cap)`) rather than a relative multiplier or
marker - re-running never shrinks an already-capped value further.
Confirmed live: 20 category files changed on first run (e.g. assault rifles
100 -> 5, ammo 500 -> 15, helicopters 10 -> 2), a second run is a total
no-op, and the server's own `ExpansionMarketSettings::LoadCategories` log
lines confirm every category still loads cleanly afterward.

### Closing market gaps ([`src/marketGapFill.ts`](src/marketGapFill.ts))

`DayZ-Expansion-Market`'s per-category files under
`profiles/ExpansionMod/Market/` are generated once, on first mission load -
a snapshot, never re-scanned against the mod list afterward. A classname
that wasn't present at that moment (a mod added/updated later, or a
color/skin reskin the snapshot simply never included) never gets
backfilled, no matter how many times `tuneExpansionMarket()`'s merge
re-runs. `ensureMarketGapFill()` fixes this from a hand-reviewed manifest
(`src/data/marketGapFill.json`) that either clones an existing sibling
item's exact price/tier (`template`) or clones the first item in a
destination `category` at a given `tier` for a whole new item family with no
real sibling. Additive/idempotent only - never touches a classname once
present, so it never resets a category a player's already traded in. Must
run after `tuneExpansionMarket()`.

`deno task audit-market` (`src/main.ts`'s `audit-market` command) is the
tool that originally found (and keeps re-checking for) these gaps: it
cross-references every `<type>` in the mission's merged `db/types.xml`
against every classname currently sellable across all
`profiles/ExpansionMod/Market/*.json` files, and reports three buckets to
`profiles/market-audit-report.txt` - Bucket A (a real `<category>` tag but
not sellable anywhere - high-confidence real gaps), Bucket B (no
`<category>` tag - usually creatures, vehicle wrecks, or non-purchasable
base-form classnames, needs manual review before trusting it), and Bucket C
(price/stock anomalies on already-sellable items, e.g. a stale tier cap).
Run it any time a new mod is added to sanity-check nothing fell through.

One real bug this caught (2026-09): `marketGapFill.ts` keeps its own copy
of `market.ts`'s `TIER_MAX_STOCK` (Common/Uncommon/Rare/Legendary -> max
stock), and it had drifted out of sync after `market.ts`'s own tiers were
tightened in an earlier pass (25/10/4/1 -> 20/8/3/1) - silently freezing
every already-added gap-fill item at the old, looser cap forever (this
module only ever adds a missing item, never revisits one already present).
Fixed by updating the constant and adding a one-time reconciliation pass in
`ensureMarketGapFill()` that remaps any item still sitting at an old tier
cap to its new equivalent. If `market.ts`'s tiers are ever retuned again,
remember this second copy needs updating too.

### Custom trader city ([`src/traders.ts`](src/traders.ts))

`DayZ-Expansion-Market` self-generates 6 stock trader zones for Chernarus
into `server/mpmissions/dayzOffline.chernarusplus/expansion/traderzones/`
on first world load (Svetloyarsk, BalotaAircrafts, KamenkaBoats,
GreenMountain, Kamenka, Krasnostav) - `ensureCustomTrader()` removes all 6
in favor of one custom-designed trader city, per this project's own
design rather than the stock locations.

It also authors the replacement: one trader-zone JSON (safe buy/sell
radius) plus one `.map` file under `expansion/traders/` (Expansion's plain-
text NPC placement format - one line per NPC:
`<TraderEntityClassName>.<TraderFileName>|<Position>|<Orientation>|<Gear>`).
The starting roster is deliberately small: one "Everything" general-store
NPC (food, medical, tools/base-building, clothing/gear, and weapons/ammo -
all in one) and one "Vehicle" dealer NPC (cars, boats, helicopters, parts).
Neither is one of DayZ-Expansion-Market's 17 default trader identities
(Weapons, Clothing, Consumables, etc.) - those ship untouched under
`profiles/ExpansionMod/Traders/` for later use once more specific/themed
traders are wanted (just add more `.map` lines referencing them by name).
`ensureCustomTraderIdentities()` writes the two custom identity JSON files
(`Everything.json`, `Vehicle.json`) alongside the untouched defaults - same
schema/currency as the defaults, and their `Categories` still reference the
same `profiles/ExpansionMod/Market/*.json` category files individually
stock-capped by `src/market.ts`, so lumping everything onto one NPC doesn't
bypass the "not everything can be bought" tuning.

The one thing this deliberately does **not** guess is the actual world
position - `CUSTOM_POSITION` starts `null`, and until it's filled in with a
real scouted coordinate the function only removes the 6 defaults and warns
rather than writing NPCs to a possibly-underground guess. Get a real
position by walking/flying there as admin (`deno run admin`, then COT's
free cam - `INSERT` - and its position readout; see "Admin tools" below),
plug the `[x, y, z]` into `CUSTOM_POSITION` in `src/traders.ts`, and
re-run - every other NPC's position is just an offset from that one point,
so only one coordinate ever needs scouting per trader city.

### Building the trader town itself (props/structures, before the NPCs)

Placing NPCs (above) is only the _vendors_ - actually building out a town
around them (walls, market stalls, containers, tents, lighting, decorative
statics) needs real 3D object placement, which `@DayZ-Editor` is for.
Only its server-side companion, `@DayZ-Editor-Loader`, is in `mods.txt`
(marked `server`, sharing the `@CF`/`@Dabs_Framework` dependencies already
loaded for Community Online Tools) - `@DayZ-Editor` itself is deliberately
**not** in this project's mod list, since it's an offline-only editing tool
(see step 1) that plays no part in the live multiplayer server; adding it
there would just force every real player to download 151MB of a tool
they'd never be able to use. Subscribe to it directly via Steam instead,
for your own local editing session. Workflow:

1. **Build offline, not on the live server.** DayZ-Editor's own author
   restricts it to offline/singleplayer sessions - launch DayZ from Steam
   (works fine under Proton on Linux, same as any other DayZ Workshop mod;
   no separate Windows tool needed), subscribe to `@CF`/`@Dabs_Framework`/
   `@DayZ-Editor` (and ideally the rest of `mods.txt`, so you're placing
   objects against the same loot economy/mod content the real server
   runs) directly via the Steam Workshop, then choose "Play Offline" and
   load `dayzOffline.chernarusplus` locally with those mods enabled.
2. **Place your town.** DayZ-Editor gives you a full in-game 3D placement
   UI - any object in any loaded mod, drag/rotate/snap-to-surface, undo,
   etc. Build out the town shell (walls, stalls, containers, lighting,
   decoration) around wherever you're planning the trader zone.
3. **Export.** DayZ-Editor saves your build as a `.dze` file under your
   client's own `profiles/Editor/` folder.
4. **Deploy to the real server.** Copy that `.dze` file into the live
   mission's `EditorFiles/` folder
   (`server/mpmissions/dayzOffline.chernarusplus/EditorFiles/` - auto-
   created there once `@DayZ-Editor-Loader` has loaded at least once).
   It's loaded fresh on every mission start - a plain data file, not part
   of persistent world state (`storage_1`), so it survives `deno run wipe`
   without needing to be rebuilt.
5. **Then place the trader NPCs** (previous section) at the same spot once
   the town shell is in place and you can see exactly where the vendors
   should stand.

`@DayZ-Editor-Loader` is marked `server` in `mods.txt` (players never need
it - it only reads `.dze` files server-side, and never appears in-game
itself).

## Server-only mods (`-servermod=`)

`DayZ-Dynamic-AI-Addon`, `Dynamic-AI-Missions`, and `Dynamic-AI-Missions-Extended`
are all server-side-only per their own documentation - players don't need to
download or subscribe to them. In `mods.txt`, a mod line can end with the
literal word `server` to mark it as such; the CLI then loads it via
`-servermod=` instead of `-mod=` when starting the server
([`src/mods.ts`](src/mods.ts), [`src/server.ts`](src/server.ts)). They're
still downloaded and installed into the server directory like any other mod -
only the launch parameter (and therefore the client's requirement to have
them) differs.

## Admin tools (testing AI quickly)

[`@Community-Online-Tools`](https://steamcommunity.com/sharedfiles/filedetails/?id=1564026768)
(`@CF`'s admin GUI, already in `mods.txt`) adds a full admin toolbar: teleport,
free camera, spawn vehicles/items, set player health/weather, and more - handy
for jumping straight to a patrol/mission hotspot instead of walking there.
Keybinds once you're an admin in-game:

| Key      | Action                           |
| -------- | -------------------------------- |
| `Y`      | Open the admin toolbar menu      |
| `INSERT` | Toggle free camera               |
| `H`      | Teleport to where you're looking |
| `END`    | Toggle COT keybindings on/off    |

DayZ-Expansion-AI also has its own, separate admin menu (`T` key) for
spawning companion AI, setting waypoints, and exporting a patrol block ready
to paste into `AIPatrolSettings.json` - see the
[DayZ-Expansion-AI wiki](https://github.com/salutesh/DayZ-Expansion-Scripts/wiki/%5BServer-Hosting%5D-How-to-create-AI-Patrols)
for the full field reference.

Both are gated by per-player allowlists that only exist once you've connected
at least once (with `-adminlog`, on by default via `EXTRA_PARAMS`):

- **Expansion's `T` menu** needs your [SteamID64](https://www.steamidfinder.com/)
  added to `Admins` in `profiles/ExpansionMod/Settings/AISettings.json`.
- **COT's `Y` menu** needs a `{"Roles": ["everyone", "admin"]}` file named
  after your internal identity id (a base64 hash, _not_ your SteamID64) under
  `profiles/PermissionsFramework/Players/`.

Doing this by hand means reading your `.ADM` admin log to find that id (see
the [Expansion Admin Permissions wiki](https://github.com/salutesh/DayZ-Expansion-Scripts/wiki/%5BServer-Hosting%5D-Admin-Permissions-and-Tools)
page for the manual steps) - `deno run dayz admin` ([`src/admin.ts`](src/admin.ts))
automates it instead:

```bash
deno run dayz admin
```

It scans every `.ADM` log under `profiles/` for player connect lines
(`Player "Name" (id=...)`), groups them by player name, and lets you pick one
to grant admin to. On a live server we found the `id=` field isn't always the
same shape - some connections logged the raw SteamID64 directly, others
logged COT's identity hash - so the command picks up whichever your logs
actually contain for each mod, grants COT admin immediately, and only
prompts for a SteamID64 if it wasn't already seen in the logs. It's
idempotent, so re-running it is always safe.

## Resetting / wiping the server

`deno task wipe` ([`src/wipe.ts`](src/wipe.ts)) resets state without you
having to hand-delete anything:

```bash
deno task wipe
```

It refuses to run while a `DayZServer` process is detected, then offers:

1. **World only** _(recommended for a fresh season)_ - deletes
   `mpmissions/<mission>/storage_1` (characters, bases, vehicles, the
   dynamic economy state). The installed server and every mod stay in
   place, so the next `up` just starts a clean world immediately.
2. **Everything** - also removes the installed server, mods, and profile
   (logs, AI/loot config, admin grants), so the next `up` reinstalls from
   scratch. `steamcmd/`'s cached Steam login is deliberately left alone,
   so you won't need `deno task login` again afterwards.

Both paths ask for confirmation (default "no") before deleting anything.

## Operational reliability

A handful of small, always-on pieces of housekeeping and self-healing that
run automatically on every `deno task up`/`start` - none of these need any
setup or manual intervention, and none of them are visible unless something
actually goes wrong (or you go looking at the logs listed below).

### Crash-recovery watchdog ([`src/server.ts`](src/server.ts))

Previously, the server launch was a single one-shot process: any exit at
all - a genuine crash, an OOM kill, or even a clean admin `#shutdown` - took
the whole CLI down with it, so an unattended crash (e.g. overnight, or while
you're away) just left the server down until someone noticed and reran the
CLI by hand.

`doStart()`'s final launch now runs the server in a supervised loop instead:

- On an unexpected exit, it logs the exit code and runtime to
  `profiles/crashes.log`, waits 15s, and restarts automatically.
- If 5 restarts in a row each run for less than 60s, it gives up rather than
  crash-looping forever - check `profiles/crashes.log` and the latest
  `profiles/DayZServer_*.RPT` for the real error before restarting manually.
- A normal Ctrl-C/SIGTERM to the CLI (or a clean in-game `#shutdown`) is
  detected as an intentional stop and does **not** trigger a restart. A
  second Ctrl-C force-kills immediately if the server is slow to exit.

### Log rotation ([`src/maintenance.ts`](src/maintenance.ts))

Every server start writes a fresh, uniquely-timestamped RPT/ADM (+
occasional script/error logs from mod crash reports) into `profiles/` with
no cleanup of its own - left alone, this grows forever (confirmed live: 194
RPT + 144 ADM files, 673MB, before this existed). `pruneOldLogs()` runs at
the start of every `doStart()` and keeps only the newest 20 files per log
type, deleting the rest. Best-effort - a read/delete error here is logged
and skipped rather than blocking startup.

The same function also prunes a handful of mods' own per-run log
directories under `profiles/` the same way (`ExpansionMod/Logs`,
`CommunityOnlineTools/Logs`, `CodeLock/Logs`, `CustomKeycards/0_Logs`,
`EventManagerLog`, `WebApiLog`, `sUDE/logs`, `Beetle/tradeboard/logs`,
`CJ_RandomMineFields/Logs`) - each individually much smaller than the main
RPT/ADM problem, but every one of them was found growing unbounded too
(100-185 files apiece after only ~10 days, confirmed live).

### World-state backups ([`src/maintenance.ts`](src/maintenance.ts))

`backupWorldState()` also runs at the start of every `doStart()`, and takes
a `tar.gz` snapshot of `mpmissions/<mission>/storage_1` (characters, bases,
vehicles, persistent trader stock) into `backups/` (gitignored) _before_
anything touches it that run. The newest 10 backups are kept, older ones
pruned automatically. This is the only recovery path for a bad `wipe`, disk
corruption, or a mod bug trashing the save - restore by stopping the
server, extracting the desired `backups/storage_1-<timestamp>.tar.gz` back
into `mpmissions/<mission>/`, and starting up again.

### Mod-update visibility ([`src/install.ts`](src/install.ts))

`ensureMods()`/`doMods()` already silently re-validate any mod Steam has
updated since we last checked, every time the CLI runs (by design - no
manual intervention needed). That process previously left no record of what
changed or when. Every detected update now appends a line to
`profiles/mod-updates.log` (mod name, id, and the old/new content ids)
before re-downloading it, so you can always answer "did a mod update
recently, and which one" after the fact.

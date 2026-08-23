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
- A few pairs look redundant but aren't: `Code-Lock` (door codes) vs.
  `Custom-Keycards` (keycard readers) are different access mechanics, and
  `CJ187-Money-Euros-Only` (currency reskin) vs. `CJ187-MoreMoney` (loot
  amount tuning) are a matched set, not competing systems.
- The zombie/bandit mods (`InediaInfectedAI`, `CreepyZombies`, `AI-Bandits`)
  are complementary to, not replacements for, the roaming human patrols from
  `DayZ-Expansion-AI` described below - they add infected behavior and extra
  standalone bandit spawns on top.
- **`GameLabs` was deliberately left out**, even though it sits next to the
  `s`-suite (`sFramework`/`sGunplay`/`sVisual`) on some server lists. It's
  unrelated to those - it's CFTools Cloud's own reporting/anti-cheat plugin,
  requires _your own_ CFTools Cloud account + Server ID/API key in a
  `gamelabs.cfg` you'd have to hand-write, and **can shut the server down on
  start** if it can't verify those credentials. Only add it if you actually
  want CFTools Cloud integration.

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

**Ship their own `types.xml` to merge in - automated**
([`src/modTypes.ts`](src/modTypes.ts), runs on every `up`/`start`)

- `Windstride-Clothing` - `Types.xml` in the mod folder root
- `DayZ-Dog` - example `types.xml` entries in the mod folder ("not a full
  file replacer")
- `Custom-Keycards` - `.INFO/types.xml` in the mod folder
- `BoomLays-Things` - example `types.xml` in the mod's `00_Info` folder
- `Crowwolfie-Recipes` - a few industrial-zone items (Glue, Carbon Fiber
  Roll) in its own `types.xml`
- `Dart-Board-Game` - `Types.xml` in the mod folder (everything prefixed
  `DARTS_`)

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
  our case) before players can use it.
- `Custom-Keycards` - keycard doors **must** be added via the mod's own
  config files (`CustomKeycards/Locations/` in the profile folder after
  first start) - placing them with the Editor/COT silently turns them back
  into regular doors.

**Self-generate a config on first server start, sane defaults, safe to
leave alone**

`CJ187-RandomMineFields`, `Zens-Repairable-Wells`, `Vehicle3PP`,
`Fuel-System`, `Keep-It-Dead-ProjectBR`, `AirRaid` (siren/bombers/
submarine/MiG-21/UFO events, tunable per-event), `Custom-Keycards` (aside
from door placement above).

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
  instead of the auto-generated default.
- `Terje-Start-Screen` - self-generates
  `profiles/TerjeSettings/StartScreen/Loadouts.xml` from the mod's template.
  Most of the shipped template is already fine (the default "survivor"
  loadout is clothes/chemlight/fruit/bandage - no weapon; "hunter" is gated
  behind a skill level TerjeSkills would grant, which isn't in this pack;
  "admin" is gated to specific SteamGUIDs). The CLI removes just the one
  "multiselect" demo loadout, which otherwise lets a fresh spawn trade all
  their starting points for a shotgun with zero scavenging.
- `CJ187-Money-Euros-Only` / `CJ187-MoreMoney` - once their types.xml (if any)
  is merged in by `ensureModTypesMerged()`, the CLI caps natural spawn
  rates for any item whose name matches a currency keyword (ruble, dollar,
  euro, deutschemark, goldbar, goldcoin, bitcoin), the same way
  `tuneFoodScarcity()` handles food. This is a best-effort keyword match,
  not a confirmed classname list - it's a no-op until the mods are actually
  downloaded and the match can be checked against their real item names.

**Needs manual zone placement to do anything**

- `Terje-Radiation` - ships no radiation zones by default. You place them
  yourself, either statically in
  `TerjeSettings/ScriptableAreas/ScriptableAreasSpawner.xml`, or
  dynamically via the mission's normal `events.xml`. Until then it's
  installed but inert.

**Partial feature loss without a mod we didn't add**

- `Terje-Medicine`'s Immunity/Medicine _skill_ bonuses specifically need
  `Terje-Skills` (not in this pack) - the core disease/treatment system
  works fine without it, you just don't get the skill-based bonuses.

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

The template defines 12 `ROAMING`-behaviour bandit patrols spread across most
of Chernarus's coastline and central/northern hotspots (Chernogorsk, Balota,
Elektrozavodsk, Solnechny, Berezino, Svetlojarsk, Novodmitrovsk, NW Airfield,
Stary Sobor, Tisy, Zelenogorsk, Kamenka) instead of just a couple of towns.

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
position.

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

If you install `Dynamic-AI-Missions-Extended`, its 3 extra per-mission fields
(`Forced_Reward_ClassName`, `Faction`, `Skip_Random_Loot` per its Steam page)
aren't included in the template - we couldn't find a real example config
using them to confirm their exact structure, so add them by hand to specific
missions in `MainConfig.json` if you want to use that mod's features; leaving
them out is safe ("100% safe defaults" per the mod's own description).

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
- `tuneStartingLoadouts()` removes the one weapon-granting demo loadout
  ("multiselect", a shotgun for all of your starting points) from
  Terje-Start-Screen's `profiles/TerjeSettings/StartScreen/Loadouts.xml`,
  the first time it's seen verbatim. The mod's other shipped loadouts
  (default "survivor", skill-gated "hunter", SteamGUID-gated "admin") are
  left as-is.

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
  values rather than inheriting from one global setting.
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

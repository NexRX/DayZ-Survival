# Missions, Quests & Events

A complete reference of every scripted encounter currently possible on this
server, across every AI-related mod (see [`MODS.md`](MODS.md) for how each
system is installed/configured). Useful as a checklist when testing AI after
a fresh install, or when deciding what to re-tune next.

Quick legend:

- **Curated** = added by this project's own templates in [`ai/`](ai).
- **Mod default** = ships with the mod itself, unmodified content-wise (loot
  amounts and bot accuracy/damage _are_ retuned server-wide - see
  [`src/loot.ts`](src/loot.ts) / [`src/difficulty.ts`](src/difficulty.ts)).

## 1. Curated raid missions (`@Dynamic-AI-Missions`)

Named, one-shot AI sieges: clear every bot to unlock a loot crate (and
sometimes a vehicle/helicopter). Only **1 runs at a time**, roughly every
**45 minutes** (`Mission_Time_Between`), after an initial 10-minute delay on
server boot. Config: `profiles/AIMissions/MainConfig.json`.

| Mission                     | Source        | Location             | Bots | Accuracy | Crate | Vehicle | Heli |
| ---------------------------- | ------------- | --------------------- | ---- | -------- | ----- | ------- | ---- |
| `NWAF Runway`                | Mod default   | NW Airfield runway     | 5-8  | 0.65     | Yes   | Yes     | Yes  |
| `Downed Helicopter`          | Mod default   | Near Kabanino (crash)  | 3-5  | 0.65     | Yes   | No      | Yes  |
| `NWAF_Weapons_Cache`         | Curated       | NW Airfield hangars     | 5-8  | 0.65     | Yes   | Yes     | -    |
| `Tisy_Armory_Raid`           | Curated       | Tisy military base      | 6-10 | 0.65     | Yes   | No      | -    |
| `Balota_Airfield_Standoff`   | Curated       | Balota airfield         | 4-6  | 0.65     | Yes   | Yes     | -    |

Reward crates are capped at **1 weapon / 1 armour piece / 2 misc items**
(down from the mod's default of up to 2/2/4 - see `Reward_Loot_*` in
`MainConfig.json`). Bot accuracy floor and damage-dealt multiplier are raised
project-wide (`Bots_Accuracy: 0.65`, `Bots_Damage_Done_Multiplier: 1.15`)
while `Bots_Damage_Taken_Multiplier` stays at `1x` - lethal, not spongy.

Add more by naming a new entry in [`ai/DynamicAIMissions.json`](ai/DynamicAIMissions.json);
`ensureDynamicMissions()` merges it in by name on next start.

## 2. Airdrop missions (`@DayZ-Expansion-AI`)

A cargo plane drops a lootable, infected-guarded crate at a random enabled
location. One is picked by weighted random roughly every few minutes (engine
default cadence; not one of our tuned settings). All 13 are **enabled** out
of the box. Config: `profiles/ExpansionMod/Settings/AirdropSettings.json`
(global) + one file per location under
`server/mpmissions/dayzOffline.chernarusplus/expansion/missions/`.

| Location         | Weight (higher = picked more often) | Time limit |
| ----------------- | ------------------------------------ | ---------- |
| Stary Sobor        | 1014                                  | 20 min     |
| Novy Sobor         | 934                                   | 20 min     |
| Sosnovka           | 854                                   | 20 min     |
| Skalisty Island    | 774                                   | 20 min     |
| Elektrozavodsk     | 694                                   | 20 min     |
| Chernogorsk        | 614                                   | 20 min     |
| Novodmitrovsk      | 534                                   | 20 min     |
| Myshkino           | 454                                   | 20 min     |
| Zelenogorsk        | 374                                   | 20 min     |
| Balota             | 294                                   | 20 min     |
| Berezino           | 214                                   | 20 min     |
| NEAF               | 134                                   | 20 min     |
| NWAF               | 54                                    | 20 min     |

Every crate is capped at **2 items** (down from the mod's default of 50, via
`tuneAirdropLoot()` in [`src/loot.ts`](src/loot.ts)) and guarded by ~25
infected rather than armed AI. NWAF being the rarest despite being the best
loot hotspot is intentional (mod default) - it's the highest-value airfield.

## 3. Contaminated area missions (`@DayZ-Expansion-AI`) - disabled by default

A gas/chemical zone (NBC gear required) settles over a settlement for a
limited time, no loot reward attached - it's an environmental hazard/event,
not a raid. **All 13 ship disabled** (`"Enabled": 0`); enable individual ones
by flipping that flag in their file under
`server/mpmissions/dayzOffline.chernarusplus/expansion/missions/`.

| Mission file                                   | Settlement       |
| ------------------------------------------------ | ---------------- |
| `ContaminatedArea_Settlement_Bogatyrka.json`      | Bogatyrka         |
| `ContaminatedArea_Settlement_Drozhino.json`       | Drozhino          |
| `ContaminatedArea_Settlement_Elektrozavodsk.json` | Elektrozavodsk    |
| `ContaminatedArea_Settlement_Gorka.json`          | Gorka             |
| `ContaminatedArea_Settlement_Kalinovka.json`      | Kalinovka         |
| `ContaminatedArea_Settlement_Kamyshovo.json`      | Kamyshovo         |
| `ContaminatedArea_Settlement_Krasnostav.json`     | Krasnostav        |
| `ContaminatedArea_Settlement_Myshkino.json`       | Myshkino          |
| `ContaminatedArea_Settlement_Nadezhdino.json`     | Nadezhdino        |
| `ContaminatedArea_Settlement_NovySobor.json`      | Novy Sobor        |
| `ContaminatedArea_Settlement_Prigorodki.json`     | Prigorodki        |
| `ContaminatedArea_Settlement_Tulga.json`          | Tulga             |
| `ContaminatedArea_Settlement_VyshnayaDubrovka.json` | Vyshnaya Dubrovka |

## 4. Roaming bandit patrols - curated hotspots (`@DayZ-Expansion-AI`)

Persistent, wandering (not leashed) bandit squads anchored near 12 major
towns, merged in by `ensureAIPatrols()` from
[`ai/AIPatrolSettings.json`](ai/AIPatrolSettings.json). Each only exists in
the world once a player is within `MaxDistRadius` (2500m), then wanders
freely (`Behaviour: ROAMING`) rather than sitting in one spot. `Chance: 0.75`
means roughly 3 in 4 approaches will actually find bandits active.

| Patrol name                        | Anchor town   | AI count (randomized) |
| ------------------------------------ | -------------- | ----------------------- |
| `Roaming_Bandits_Chernogorsk`         | Chernogorsk     | 1-4                      |
| `Roaming_Bandits_NWAF`                | NW Airfield     | 1-4                      |
| `Roaming_Bandits_Berezino`            | Berezino        | 1-4                      |
| `Roaming_Bandits_Elektrozavodsk`      | Elektrozavodsk  | 1-4                      |
| `Roaming_Bandits_Solnechny`           | Solnechny       | 1-4                      |
| `Roaming_Bandits_Svetlojarsk`         | Svetlojarsk     | 1-4                      |
| `Roaming_Bandits_Novodmitrovsk`       | Novodmitrovsk   | 1-4                      |
| `Roaming_Bandits_Kamenka`             | Kamenka         | 1-4                      |
| `Roaming_Bandits_Zelenogorsk`         | Zelenogorsk     | 1-4                      |
| `Roaming_Bandits_StarySobor`          | Stary Sobor     | 1-4                      |
| `Roaming_Bandits_Tisy`                | Tisy            | 1-4                      |
| `Roaming_Bandits_Balota`              | Balota          | 1-4                      |

Capped map-wide via the `RoamingBandits` load-balancing category (5/8/10/12
concurrent, scaling with online player count - see `MODS.md`).

## 5. Expansion's own built-in AI encounters (auto-generated, map-wide)

The first time the mission loads, `@DayZ-Expansion-AI` generates
`AIPatrolSettings.json` with its own default patrol set, layered across the
_entire_ map independent of our curated additions above. We never overwrite
these. Confirmed from the live generated file (46 total default patrols):

| Category           | Count | What it is                                                             |
| -------------------- | ----- | ------------------------------------------------------------------------ |
| `Survivor`            | 17    | Roaming neutral/random-faction civilian NPCs, scattered map-wide          |
| `RoamingBandits`      | 12    | Our curated hotspots above (merged into this same category)               |
| `MilitaryStatic`      | 7     | Stationary guards at watchtowers/guard boxes on military objects          |
| `MilitaryRoaming`     | 4     | Patrols that roam around barracks/tents at military bases                 |
| `HelicopterWreck`     | 2     | Guards at the two default heli crash wreck types (`UH1Y`, `Mi8_Crashed`)  |
| `ContaminatedArea`    | 2     | Guards at static/dynamic contaminated-zone objects                        |
| _(uncategorized)_     | 2     | Police guards at police stations (city + village variants)                |

All of these inherit their accuracy/damage from the project-wide
`AISettings.json` rebalance (`tuneAIDifficulty()` in
[`src/difficulty.ts`](src/difficulty.ts)) same as our curated patrols.

## 6. Ambient "Spatial AI" encounters (`@DayZ-Dynamic-AI-Addon`)

Unlike everything above, these have **no map position at all** - they spawn
based purely on proximity to *any* player (governed by the file's global
`MinDistance`/`MaxDistance`/timers), which is what makes AI genuinely
"encounterable anywhere". Config:
`profiles/ExpansionMod/AI/Spatial/SpatialSettings.json`.

| Type       | Name                         | Source  | AI count | Chance |
| ---------- | ---------------------------- | ------- | -------- | ------ |
| `Group`    | `Guard`                       | Mod default | 2       | 0.5    |
| `Group`    | `Shaman`                      | Mod default | 1-3     | 0.5    |
| `Group`    | `Passive`                     | Mod default | 2-3     | 0.5    |
| `Group`    | `Spatial_RoamingBandits`      | Curated | 1-3     | 0.5    |
| `Group`    | `Spatial_RoamingBanditSquad`  | Curated | 2-4     | 0.25   |
| `Point`    | `East`                        | Mod default (template position) | 0-4 | 0.5 |
| `Point`    | `West`                        | Mod default (template position) | 0-5 | 0.5 |
| `Point`    | `Civilian`                    | Mod default, safe zone (no AI)  | 0   | 0.5 |
| `Location` | `Location1` / `Location2`     | Mod default (template position) | 0-4 | 0.5 |
| `Audio`    | `Audio1` / `Audio2`           | Mod default (template position) | 0-4 | 0.5 |

`Group` entries are the ones that actually deliver "anywhere" encounters (no
fixed position needed). `Point`/`Location`/`Audio` entries still use the
mod's placeholder `[0, 1, 0]` coordinates - they won't do anything useful
until repositioned to real map coordinates in `SpatialSettings.json`.

Accuracy and trigger-chance floors are raised project-wide
(`tuneSpatialAIDifficulty()`) on all four lists above.

## 7. Expansion Quest system - enabled, unconfigured

`profiles/ExpansionMod/Settings/QuestSettings.json` has `EnableQuests: 1` and
the in-game quest log/NPC markers are on, but **no quests, NPCs, or
objectives are defined yet** (`profiles/ExpansionMod/Quests/Quests/` and
`.../NPCs/` are both empty). This is a real, separate system from the AI
missions above - NPC-given objectives (fetch/kill/deliver) with their own
rewards and daily/weekly cooldowns - just not populated on this server. See
the [Expansion Quests wiki](https://github.com/salutesh/DayZ-Expansion-Scripts/wiki)
if you want to author some; nothing in this repo automates that yet.

## How to go test all of this quickly

1. `deno run dayz admin` to grant yourself COT + Expansion AI-menu admin (see
   `MODS.md`).
2. Use COT's free camera (`INSERT`) to fly to a location, then `H` to
   teleport there instead of walking/driving.
3. Curated raid missions (section 1) and airdrops (section 2) show a 2D/3D
   map marker once active - watch the map after server start, or just wait
   out `Mission_Start_Delay` (10 min) then `Mission_Time_Between` (45 min)
   cycles.
4. Roaming patrols/Spatial AI (sections 4-6) require no marker - just travel
   to (or near) the listed towns and wait a few seconds; `Spatial_MinTimer`/
   `Spatial_MaxTimer` (20-40s) governs how often the proximity check re-rolls.

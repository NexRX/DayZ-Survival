# Server Missions (Workshop Mods)

This document covers mission-type events added by workshop mods. Quest NPCs from `@DayZ-Expansion-Quests` are excluded.

---

## 1. Dynamic AI Mission / Crash Site Raids

**Mod:** [@Dynamic-AI-Missions](https://steamcommunity.com/sharedfiles/filedetails/?id=3277130230) + [@Dynamic-AI-Missions-Extended](https://steamcommunity.com/sharedfiles/filedetails/?id=3773597150)
**Type:** Server-side, randomly spawns at predefined Chernarus POIs

Epoch-style raid/crash site missions that auto-generate on each server start. AI enemies guard loot crates and optional vehicles at random locations. Complete by eliminating all hostiles to claim the reward.

### Custom Missions (Added by This Server)

| Mission Name | Location | Enemy Count | Faction | Rewards |
|---|---|---|---|---|
| **NWAF_Weapons_Cache** | NWAF [4501, 300, 10231] | 5–8 bots | Raiders | Crate + Vehicle |
| **Tisy_Armory_Raid** | Tisy [1900, 100, 14100] | 6–10 bots | Raiders | Crate only |
| **Balota_Airfield_Standoff** | Balota Airfield [4800, 2, 2400] | 4–6 bots | Raiders | Crate + Vehicle |

### Default Missions (From the Mod)

The mod self-generates its own mission list on first server load at `Profiles/AIMissions/MainConfig.json`. These default locations ship with the mod and are not stored in this project's repo. To see them, check that file on your server after the first start.

### Bot Loadout (Curated by This Server)

| Category | Item(s) |
|---|---|
| **Weapons** | FAL + ACOG Optic / SVD + PSO1 Optic |
| **Armour** | Plate Carrier Vest |
| **Headgear** | Mich2001 Helmet + NVGs |

### Reward Loot (Tuned by This Server)

Each mission's reward crate is capped to:

| Category | Max Items |
|---|---|
| Weapons | 1 |
| Armour | 1 |
| Misc | 2 |

The Extended mod adds per-mission control over: forced reward classname, AI faction selection (14 factions available), and the ability to skip random loot stuffing entirely.

---

## 2. Airdrop Missions

**Mod:** [DayZ-Expansion-AI](https://steamcommunity.com/sharedfiles/filedetails/?id=2792982069)
**Type:** Server-side, randomly drops crates from the sky

Random airdrops land at unpredictable map locations during gameplay. Players who reach the crate first get priority on its contents.

### Loot Per Crate

| Items per crate | Source pool |
|---|---|
| Max **2** items (tuned by this server) | DayZ Expansion AI airdrop table |

---

## 3. Nuclear / Toxic Zone Events (OFG Barrels)

**Mod:** [@OFG-Nuclear-Zone](https://steamcommunity.com/sharedfiles/filedetails/?id=3608781425)
**Type:** Reactive event — spawns when the vanilla ContaminatedArea_Dynamic toxic gas cloud appears

Not a traditional mission, but functions as an optional reward event. When a toxic zone appears near **Stary Sobor** or **Skalisty Island**, 3 OFG barrels spawn around its perimeter containing survival-tier loot.

### Barrel Loot Table (Tuned by This Server)

| Item | Spawn Chance | Notes |
|---|---|---|
| Gas Mask + Filter | 45% | Best find — paired together |
| Ammo\_762x54 (x20) | 35% | Alternatives: .308 Win, 5.45x39, 5.56x45 |
| Morphine | 35% | Alternatives: Epinephrine, Tetracycline Antibiotics |
| Canteen | 35% | Alternatives: Water Bottle |
| Battery 9V (x2) | 35% | Alternatives: Weapon Cleaning Kit |
| Gorka E Jacket (PautRev/Summer/Camo) | 25% | Packaged with matching pants |
| High Capacity Vest (Olive/Black) | 15% | Plate Carrier excluded — too rare map-wide |
| Assault Bag Green | 25% | Alternatives: Assault Bag Black |
| Alice Bag Green | 10% | — |
| Smersh Bag | 8% | — |

### Constraints

- **0 weapons** per barrel by design (the zones already sit on top of Stary Sobor's crate rewards and Skalisty's military base loot)
- **Max 12 items** per barrel, max **2 stacks** per type

---

## Summary

| Mission Type | Mod | How to Find It | Best Loot Tier |
|---|---|---|---|
| Dynamic AI Raids | Dynamic-AI-Missions + Extended | Look for red mission icons on map when spawned | High (curated weapon loadouts + crate) |
| Airdrops | DayZ-Expansion-AI | Listen for aircraft / watch the sky | Medium (random, 2 items per crate) |
| Nuclear Barrels | OFG-Nuclear-Zone | Toxic gas cloud near Stary Sobor or Skalisty Island | Medium-High (survival gear, gas masks, bags) |

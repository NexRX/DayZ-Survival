# TODO

Everything from the previous "mod research" pass (content mods, vehicles, AI
event mods, TGK-WeaponPack, Hunter Bow) has been added to `mods.txt` and
fully wired where code wiring was needed - see [`MODS.md`](MODS.md) for the
full rundown. Any behavior that can't be verified by the CLI alone (spawn
rates, in-game feel, overlap between AI mods, etc.) is tracked in
[`TESTS.md`](TESTS.md) instead of here.

## Outstanding work

1. **Custom Tourist Map** - now that the trader city and its landmarks
   (traders, restock board, safe zone) are actually built, this is
   buildable: a new serverpack addon (alongside
   `DZSurvivalFindStone`/`DZSurvivalTraderRestock`/`DZSurvivalMapGate`)
   adding a lootable/purchasable "Tourist Map" item. This is real new
   scripting work, not a config merge - likely needs to hook into
   Expansion's map UI (same place `DZSurvivalMapGate` already hooks the
   M-key) to draw custom POI markers. Budget this as a standalone
   development task, not a quick add.

2. ~~Base decay/raiding~~ - **done.** Implemented as a new serverpack
   addon, `DZSurvivalBaseDecay` (hand-rolled EnforceScript decay, option
   (c) from this item's original tradeoff analysis) - a locked base
   decays (force-unlocked and dropped) after **30 real days** with no
   recorded owner/guest activity, per the project owner's explicit
   instruction. Hooks `Code-Lock`'s `CodeLock` item (this server's actual
   base-locking mechanism, confirmed via unpacking - not DayZ-Expansion's
   separate Territory Flag system, which stays unused) rather than
   switching base-building models. Full design writeup, the two
   false-positive pitfalls found and avoided (missing the most common
   "owner opens a known gate" activity signal, and false activity from
   `Fence.AfterStoreLoad()` replaying `OpenFence()` on every restart), and
   the two new `/basedecay status`/`/basedecay now` COT commands are all
   documented in [`serverpack/README.md`](serverpack/README.md)'s
   "Current addons" section. Confirmed a clean compile via
   `deno task verify-serverpack`; a real 30-day live decay obviously can't
   be confirmed in one sitting - see [`TESTS.md`](TESTS.md) for a faster
   smoke-test option.

## Lower priority / ongoing

- **Anti-cheat/anti-dupe review** - not a Workshop link, a standing task.
  BattlEye is already confirmed wired up (`src/server.ts`'s `doStart()`
  passes `-BEpath=` on every launch), so that part's covered. Still worth
  looking into known DayZ dupe vectors (vehicle key duplication,
  storage/relog dupes) if/when this server opens to other players. Low
  urgency while it's solo/admin-only.

  **Workshop research pass (this session)** - searched the Workshop
  directly for anti-cheat/anti-dupe/anti-exploit content mods. Findings:
  - The "anti cheat" search term itself is mostly noise - dozens of
    low-quality, unrecognizable, single-download-looking items (e.g.
    `REDACTED_AntiCheat`, `RDL_AntiCheat`, `Bohemia AntiCheat Shade Labs` -
    that last one is NOT official Bohemia Interactive content despite the
    name, just a misleading title). None of these have any visible
    reputation signal worth trusting blind - **do not install anything
    found under a generic "anti cheat" search without personally checking
    the author's other published work and any comments first.**
  - **Best concrete lead: `Zens Anti-Combat Logout Mod`** (author
    Zenarchist) - the same "Zens" author already behind 6 other mods
    already trusted and running on this server (`Zens-ExpansionAI-Audio`,
    `Zens-Repairable-Wells`, `Zens-Zippo-Lighter`, `Zens-COT-Plus-Fix`,
    `Zens-Fire-Sticks`, `Zens-Shooting-Stars`) - this is the strongest
    trust signal found in this pass, since this project already has a
    proven track record with this author's work. Addresses combat-logging
    (disconnecting mid-fight to escape death) - a real dupe/exploit-
    adjacent vector, though one that only matters once real PvP players are
    on the server.
  - Other named leads found, unverified beyond their existence/name (no
    subscriber counts or changelogs could be pulled through this pass -
    search Steam Workshop by these exact names to review before deciding):
    `SIX-DupePrevention`/`SIX-DupeDetection` (author "SIX", a long-standing
    DayZ community name), `AntiFenceStacking`/`AntiContainerStacking`/
    `Anti Stack Barrels` (all target the classic "stack objects to reach
    somewhere unintended" raid-exploit vector - directly relevant now that
    `DZSurvivalBaseDecay` makes bases a real, persistent thing worth
    raiding), `DZR Combat Log Detection`/`CombatLogDetection` (alternates to
    the Zens one above).
  - **Recommendation unchanged from before this pass**: still low urgency
    while solo/admin-only. When this server does open to other players,
    start with the Zens combat-log mod (lowest-risk given the existing
    trust relationship), personally review `SIX-DupePrevention`/
    `SIX-DupeDetection` next, and only add anti-stacking protection once
    raiding via `DZSurvivalBaseDecay`-enabled bases is actually a thing
    happening on the server (no urgency before then).

## Decided against (not being pursued)

- **Psyerns Sound System** (3623510671) - checked its Workshop page
  directly: needs a separate @CF (Community Framework) dependency and
  hand-authored JSON config (trigger zones, admin permissions, etc.) to do
  anything at all - no useful default/built-in content ships. Fails the
  "zero configuration" bar the project owner set for this one.
- **SLP Realistic Survival v2.0** - overlaps/conflicts with the existing
  carefully-tuned Terje-Medicine + Inedia metabolism/injury stack.
- **BXD_Zombie** - tone clash (novelty/horror-movie skins) with this
  server's grim hardcore-survival atmosphere.
- **Mutant/Zombie Spawn System** - redundant with the project's own
  additive, data-driven custom-infected pattern (`militaryMonsters.ts` style).

## Added despite known risk (playtest anyway, per owner's request)

- **Custom Zombies - Astronaut/Butcher/Bear** (`@Custom-Zombies`,
  `src/customZombiesTchc.ts`) - has live unresolved bug reports (invincible
  astronauts, PBO-signing failures) but the owner asked to add it and
  playtest regardless. Wired with its own rare event for the zombie trio
  (`InfectedTCHCCustom`) plus the bear reactivating vanilla's own dormant
  `Bear`/`AnimalBear` territory+event pair (see `customZombiesTchc.ts`'s
  header comment for why - a plain custom event name/territory doesn't
  work for this one); see [`TESTS.md`](TESTS.md) for what to check live.

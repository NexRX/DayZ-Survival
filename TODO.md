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

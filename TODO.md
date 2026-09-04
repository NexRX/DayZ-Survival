# TODO

Everything from the previous "mod research" pass (content mods, vehicles, AI
event mods, TGK-WeaponPack, Hunter Bow) has been added to `mods.txt` and
fully wired where code wiring was needed - see [`MODS.md`](MODS.md) for the
full rundown. Any behavior that can't be verified by the CLI alone (spawn
rates, in-game feel, overlap between AI mods, etc.) is tracked in
[`TESTS.md`](TESTS.md) instead of here. Full history of everything already
done (base decay/raiding, the `KeyCard-Rooms-Better` experiment that was
later fully removed, etc.) lives in
[`serverpack/README.md`](serverpack/README.md)'s session log.

## Outstanding work

1. **Custom Tourist Map** - now that the trader city and its landmarks
   (traders, restock board, safe zone) are actually built, this is
   buildable: a new serverpack addon (alongside
   `DZSurvivalFindStone`/`DZSurvivalTraderRestock`/`DZSurvivalMapGate`)
   adding a lootable/purchasable "Tourist Map" item. This is real new
   scripting work, not a config merge - likely needs to hook into
   Expansion's map UI (same place `DZSurvivalMapGate` already hooks the
   M-key) to draw custom POI markers. Budget this as a standalone
   development task, not a quick add. Deliberately deferred by the project
   owner ("ill do that someother time") - not urgent.

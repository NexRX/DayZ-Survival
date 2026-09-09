# Keycard Room Locations

Tracks which `@Custom-Keycards` keycard tiers have a real, in-game-verified
secured room/building wired up (`src/customKeycards.ts`'s `SECURED_BUILDINGS`),
and which ones still need one scouted. Ordered common -> rarest, matching the
hand-agreed rarity ladder in `src/customKeycards.ts`.

**Never guess/fabricate a location.** Every entry that ends up wired in code
comes from real coordinates captured in-game, the same way `Tisy Brick
Building 1` below was.

## How to scout a new one

1. Find a building in-game you want to retrofit with a Keycard Door (an
   office, checkpoint, hangar, barracks, etc. - anywhere a locked room makes
   sense thematically for that keycard's tier).
2. Pick up `EVG_CustomKeycardsHelper` (spawn it in via admin tools if needed).
3. Walk up to the building itself and use the helper - its exact `ClassName`
   and `Position` get copied to your clipboard.
4. Walk up to the specific door you want gated and use the helper again -
   its `DoorId` gets shown/copied.
5. Paste both back here (or straight in chat) along with which keycard(s)
   should open it, and it'll get wired into `src/customKeycards.ts`'s
   `SECURED_BUILDINGS` + a real `Position`/`Orientation` for its loot crate.

## Status

| #   | Keycard               | Rarity         | Status  | Location                                                                                                                                                       | Notes                                                                                               |
| --- | --------------------- | -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | `evg_keycards_White`  | Common         | ✅ Done | Berezino Warehouse (`Land_House_2B02`, 12272.59, 25.02, 9474.11, DoorId 0+3) + Solnichniy House (`Land_House_1W09_Yellow`, 3272.27, 194.38, 3880.18, DoorId 0) | Two rooms for this tier.                                                                            |
| 2   | `evg_keycards_Yellow` | Common         | ✅ Done | Water Station (`Land_Water_Station`, 5004.95, 320.60, 5588.04, DoorId 0)                                                                                       |                                                                                                     |
| 3   | `evg_keycards_Green`  | Common         | ✅ Done | House 1W04 (`Land_House_1W04`, 10482.63, 8.87, 2017.89, DoorId 0) + Shed W5 (`Land_Shed_W5`, 6625.40, 8.63, 2323.24, DoorId 0)                                 | Two rooms for this tier.                                                                            |
| 4   | `evg_keycards_Blue`   | Uncommon       | ✅ Done | Shed W6 (`Land_Shed_W6`, 9354.80, 78.13, 13614.95, DoorId 0) + Shed W5 (`Land_Shed_W5`, 3106.67, 208.81, 12573.76, DoorId 0)                                   | Two rooms for this tier.                                                                            |
| 5   | `evg_keycards_Tisy01` | Uncommon       | ✅ Done | Tisy Brick Building 1 (`Land_Garage_Office`, 1566.44, 456.36, 14037.64, DoorId 0)                                                                              | No longer shares its door with `evg_keycards_Red` - Red now has its own dedicated room (see below). |
| 6   | `evg_keycards_NWAF01` | Uncommon       | ✅ Done | NWAF Barracks 2 (`Land_Mil_Barracks2`, 4020.43, 377.10, 11786.43, DoorId 0)                                                                                    |                                                                                                     |
| 7   | `evg_keycards_Violet` | Rare           | ✅ Done | Shipping Container (`Land_Container_1Moh`, 11956.20, 141.21, 12479.78, DoorId 0)                                                                               |                                                                                                     |
| 8   | `evg_keycards_Red`    | Rare           | ✅ Done | Small Garage (`Land_Garage_Small`, 9524.47, 304.01, 8801.37, DoorId 0)                                                                                         | Freed from sharing Tisy01's door - now its own room.                                                |
| 9   | `evg_keycards_NWAF02` | Rare           | ✅ Done | NWAF Aircraft Shelter (`Land_Mil_AircraftShelter`, 4866.02, 339, 10207.99, DoorId 2)                                                                           |                                                                                                     |
| 10  | `evg_keycards_Tisy02` | Very Rare      | ✅ Done | Tisy Repair Center (`Land_Repair_Center`, 1521.46, 455.31, 14060.77, DoorId 1 [main, has loot crate] + DoorId 0 [side])                                        |                                                                                                     |
| 11  | `evg_keycards_NWAF03` | Very Rare      | ✅ Done | NWAF Barracks 3 (`Land_Mil_Barracks3`, 4553.77, 341.40, 9540.15, DoorId 0)                                                                                     |                                                                                                     |
| 12  | `evg_keycards_Tisy03` | Very Rare      | ✅ Done | Tisy Garages Bunker (`Land_Tisy_Garages`, 1539.54, 455.61, 14175.92, DoorId 0 [main, has loot crate] + DoorId 1 [side])                                        |                                                                                                     |
| 13  | `evg_keycards_Tisy04` | Extremely Rare | ✅ Done | Tisy Military Container (`Land_Container_1Mo`, 1550.61, 453.76, 14128.91, DoorId 0 [main, has loot crate] + DoorId 1 [side])                                   |                                                                                                     |
| 14  | `evg_keycards_Tisy05` | Rarest         | ✅ Done | Tisy Barracks 5 (`Land_Mil_Barracks5`, 1693.41, 457.40, 14179.17, DoorId 0)                                                                                    |                                                                                                     |

All doors use `DamageToItem: 50` - since keycards have 100 HP, this gives every
keycard **exactly 2 uses** before it's ruined.

**Still needed:** none - every keycard tier now has at least one real,
in-game-verified room wired up.

`evg_keycards_All` (the master key) is intentionally excluded from this list -
it's an inert, nominal=0, admin-only stub, not a ground-loot find, and isn't
meant to be tied to any one location.

## Suggested scouting order

Every tier now has at least one real, in-game-verified room wired up. Extra
rooms for any tier can still be added the same way (see "How to scout a new
one" above) whenever convenient.

// Custom-Keycards (@Custom-Keycards, id 2810212624): keycard-gated doors/
// gates + loot crates. Previously removed from this project after a real
// boot test hung the server indefinitely at mission/script compile (see
// mods.txt's history) - retested clean (twice) after the mod's own 8 Apr
// update, so it's back.
//
// Two things this file owns:
//
// 1. Item types: the mod ships its keycards/holders as real placeable
//    items but (like @Optics/@TGK-WeaponPack) doesn't bake economy spawn
//    data into its .pbo - it expects an admin to merge its own reference
//    types.xml by hand. Both ground-loot spawn chance AND trader stock/
//    price are now scaled to a hand-agreed rarity ladder (common ->
//    rarest): White < Yellow < Green < Blue < Tisy01 < NWAF01 < Violet <
//    Red < NWAF02 < Tisy02 < NWAF03 < Tisy03 < Tisy04 < Tisy05. The two
//    NWAF/Tisy-numbered families additionally use vanilla usage="Military"
//    (+ value Tier3/Tier4 for the rarer ones) so they're geographically
//    restricted toward military spawn tables, same mechanism as
//    decoyGrenades.ts's TRQ_DecoyGrenade. evg_keycards_All (the master key)
//    is deliberately excluded from the ladder entirely - kept as an inert
//    nominal=0 admin-only stub, never a ground-loot find or trader item.
//    Trader prices for every classname here live in marketGapFill.ts's
//    KEYCARD_PRICE_FIXES + src/data/marketGapFill.json's manifest entries.
//
// 2. Loot tables: the mod's own LootTables/ folder is create-only (it
//    self-generates a working 0_DefaultLootTable.json example the first
//    time the folder is empty, and never touches user-added files after
//    that). This adds a couple of extra curated tiers alongside that
//    default, ready to reference by name from a Keycard Door/Building's
//    "LootTableNames" - purely item lists, no world coordinates involved,
//    so there's nothing here that needs in-game verification.
//
// Deliberately NOT owned here: Locations (loose Keycard Doors/Gates placed
// standalone). Those need an exact in-game-verified Position/Orientation the
// same way Static_Locations does - ask for that (via EVG_CustomKeycardsHelper
// or the door's own placement action) before wiring one up.

import {
  CUSTOM_KEYCARDS_LOOT_TABLES_DIR,
  CUSTOM_KEYCARDS_STATIC_LOCATIONS_DIR,
  ECONOMY_TYPES_FILE,
} from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";
import { CUSTOM_KEYCARDS_ITEM_TYPES } from "./modTypes.ts";

const MOD_NAME = "@Custom-Keycards";

interface KeycardEconomy {
  nominal: number;
  min: number;
  category: "tools" | "clothes";
  /** Vanilla generic spawn-location tag (e.g. "shelves") - mutually exclusive with usage/value. */
  tag?: string;
  /** Vanilla usage restriction (e.g. "Military") - geographically limits which spawn tables roll this item. */
  usage?: string;
  /** Vanilla tier restriction(s) (e.g. "Tier3"/"Tier4") - only meaningful alongside usage. */
  value?: string[];
}

// Rarity ladder (common -> rarest), hand-agreed with the admin:
//   White < Yellow < Green < Blue < Tisy01 < NWAF01 < Violet < Red <
//   NWAF02 < Tisy02 < NWAF03 < Tisy03 < Tisy04 < Tisy05
// Color-named cards are treated as general-access badges (vanilla
// tag="shelves" - the mod's own default spawn location, offices/shelving
// found all over town) with nominal/min falling as they climb the ladder.
// NWAF/Tisy-numbered cards are lore-appropriate military installation
// passes, so they use vanilla usage="Military" instead (restricting them to
// military spawn tables), stacking on value="Tier3"/"Tier4" for the rarer
// half to push them toward the very hottest military spawns only - same
// mechanism as decoyGrenades.ts's TRQ_DecoyGrenade. evg_keycards_All (master
// key) stays an inert nominal=0 admin-only stub, excluded from the ladder.
const KEYCARD_ECONOMY: Record<string, KeycardEconomy> = {
  evg_keycard_holder_camo: { nominal: 10, min: 4, category: "clothes", tag: "shelves" },
  evg_keycard_holder_leather: { nominal: 10, min: 4, category: "clothes", tag: "shelves" },
  evg_keycards_All: { nominal: 0, min: 0, category: "tools" },
  evg_keycards_White: { nominal: 8, min: 3, category: "tools", tag: "shelves" },
  evg_keycards_Yellow: { nominal: 8, min: 3, category: "tools", tag: "shelves" },
  evg_keycards_Green: { nominal: 8, min: 3, category: "tools", tag: "shelves" },
  evg_keycards_Blue: { nominal: 4, min: 1, category: "tools", tag: "shelves" },
  evg_keycards_Tisy01: { nominal: 4, min: 1, category: "tools", usage: "Military" },
  evg_keycards_NWAF01: { nominal: 4, min: 1, category: "tools", usage: "Military" },
  evg_keycards_Violet: { nominal: 4, min: 1, category: "tools", tag: "shelves" },
  evg_keycards_Red: { nominal: 2, min: 0, category: "tools", tag: "shelves" },
  evg_keycards_NWAF02: {
    nominal: 2,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier3"],
  },
  evg_keycards_Tisy02: {
    nominal: 2,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier3"],
  },
  evg_keycards_NWAF03: {
    nominal: 2,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier3", "Tier4"],
  },
  evg_keycards_Tisy03: {
    nominal: 1,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier3", "Tier4"],
  },
  evg_keycards_Tisy04: {
    nominal: 1,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier4"],
  },
  evg_keycards_Tisy05: {
    nominal: 1,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier4"],
  },
};

function typeBlock(classname: string): string {
  const cfg = KEYCARD_ECONOMY[classname];
  const lines = [
    `    <type name="${classname}">`,
    `        <nominal>${cfg.nominal}</nominal>`,
    `        <lifetime>14400</lifetime>`,
    `        <restock>0</restock>`,
    `        <min>${cfg.min}</min>`,
    `        <quantmin>-1</quantmin>`,
    `        <quantmax>-1</quantmax>`,
    `        <cost>100</cost>`,
    `        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>`,
    `        <category name="${cfg.category}"/>`,
  ];
  if (cfg.usage) lines.push(`        <usage name="${cfg.usage}"/>`);
  for (const v of cfg.value ?? []) lines.push(`        <value name="${v}"/>`);
  if (!cfg.usage && cfg.tag) lines.push(`        <tag name="${cfg.tag}"/>`);
  lines.push(`    </type>`);
  return lines.join("\n");
}

export async function ensureCustomKeycardsTypesWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(`${ECONOMY_TYPES_FILE} not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);

  // Sync (not just additive) for these specific, fully-generated classnames:
  // an already-wired stub (e.g. an old nominal=0 trader-only entry from
  // before rarity-scaled loot spawns existed) gets rewritten in place to the
  // current KEYCARD_ECONOMY value every run. Safe because every byte of
  // these blocks is generated here - never hand-edited by an admin the way
  // a real economy.ts source <type> might be.
  let added = 0;
  let updated = 0;
  for (const classname of CUSTOM_KEYCARDS_ITEM_TYPES) {
    const desired = typeBlock(classname);
    const re = new RegExp(`[ \\t]*<type name="${classname}">[\\s\\S]*?<\\/type>`);
    const match = typesText.match(re);
    if (match) {
      if (match[0].trim() !== desired.trim()) {
        typesText = typesText.replace(re, desired);
        updated++;
      }
      continue;
    }
    typesText = typesText.replace("</types>", `${desired}\n</types>`);
    added++;
  }

  if (added === 0 && updated === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  if (added > 0) ok(`Wired up ${MOD_NAME} (${added} new classname(s))`);
  if (updated > 0) {
    ok(
      `Updated ${updated} ${MOD_NAME} classname(s) in ${ECONOMY_TYPES_FILE} to reflect rarity-scaled loot spawns`,
    );
  }
}

interface LootItem {
  SpawnChance: number;
  VariantsClassNames: string[];
  MinAmount: number;
  MaxAmount: number;
  MinQuantity: number;
  MaxQuantity: number;
  MinHealth: number;
  MaxHealth: number;
  Attachments: LootItem[];
  Cargo: LootItem[];
}

function item(partial: Partial<LootItem> & { VariantsClassNames: string[] }): LootItem {
  return {
    SpawnChance: 100,
    MinAmount: 1,
    MaxAmount: 1,
    MinQuantity: -1,
    MaxQuantity: -1,
    MinHealth: 70,
    MaxHealth: 100,
    Attachments: [],
    Cargo: [],
    ...partial,
  };
}

// Two curated tiers, additional to the mod's own self-generated
// 0_DefaultLootTable.json (left untouched). All vanilla DayZ classnames -
// no modded items, so these work standalone even before any other loot mod
// in mods.txt is wired up.
//
// Deliberately excludes common/mundane consumables (Ammo_762x39,
// TetracyclineAntibiotics, VitaminBottle, Bandage, DisinfectantAlcohol) that
// also litter regular ground loot everywhere - these tables back a real
// Custom-Keycards crate (roomCrate() below) where "LootTableNames" picks
// ONE of the two tables at random per spawn and then rolls each item in it
// independently by its own SpawnChance, so diluting the pool with
// high-SpawnChance mundane items (Bandage was 80%, VitaminBottle 60% -
// higher than any of the genuinely valuable meds) meant a Medical-table
// roll could easily come back as just bandages. Keeping every entry here
// genuinely worth the risk fixes that for both the crate and
// starySoborRadiationZone.ts's reward event below.
const LOOT_TABLES: Record<string, LootItem[]> = {
  DZSurvival_Military: [
    item({
      SpawnChance: 60,
      VariantsClassNames: ["AKM"],
      MinHealth: 60,
      Attachments: [
        item({
          SpawnChance: 90,
          VariantsClassNames: ["Mag_AKM_30Rnd"],
          MinQuantity: 10,
          MaxQuantity: 30,
        }),
      ],
    }),
    item({
      SpawnChance: 40,
      VariantsClassNames: ["Mosin9130"],
      MinQuantity: 0,
      MaxQuantity: 1,
    }),
    item({ SpawnChance: 35, VariantsClassNames: ["PlateCarrierVest"], MinHealth: 80 }),
    item({ SpawnChance: 50, VariantsClassNames: ["TaloonBackpack_Green", "TaloonBackpack_Black"] }),
    item({
      SpawnChance: 15,
      VariantsClassNames: ["NVGoggles"],
      Attachments: [item({ SpawnChance: 100, VariantsClassNames: ["Battery9V"], MinQuantity: 80 })],
    }),
    item({ SpawnChance: 20, VariantsClassNames: ["Rangefinder"] }),
  ],
  DZSurvival_Medical: [
    item({ SpawnChance: 40, VariantsClassNames: ["SalineBagIV"] }),
    item({ SpawnChance: 30, VariantsClassNames: ["BloodBagIV"] }),
    item({ SpawnChance: 50, VariantsClassNames: ["MorphineAutoinjector"] }),
    item({ SpawnChance: 25, VariantsClassNames: ["Epinephrine"] }),
  ],
};

// Flat classname list (top-level items only - no nested attachments/cargo)
// from the two tables above. Exported for reuse by
// starySoborRadiationZone.ts, whose radiation-zone loot reward is meant to
// be "as good as the best keycard rooms" - this keeps that promise honest
// without hand-duplicating the item list.
export const RED_VIOLET_TIER_CLASSNAMES: string[] = [
  ...LOOT_TABLES.DZSurvival_Military,
  ...LOOT_TABLES.DZSurvival_Medical,
].flatMap((i) => i.VariantsClassNames);

export async function ensureCustomKeycardsLootTables(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  // Create-only, same rule as the mod's own default: never overwrite a file
  // that's already there (an admin may have hand-edited it since).
  await Deno.mkdir(CUSTOM_KEYCARDS_LOOT_TABLES_DIR, { recursive: true });

  let createdAny = false;
  for (const [name, table] of Object.entries(LOOT_TABLES)) {
    const path = `${CUSTOM_KEYCARDS_LOOT_TABLES_DIR}/${name}.json`;
    if (await exists(path)) continue;
    await Deno.writeTextFile(path, JSON.stringify({ LootTable: table }, null, 4));
    createdAny = true;
  }

  if (createdAny) {
    ok(
      `Added curated Custom-Keycards loot table(s) to ${CUSTOM_KEYCARDS_LOOT_TABLES_DIR} ` +
        `(${Object.keys(LOOT_TABLES).join(", ")})`,
    );
  }
}

// --- Keycard Buildings: existing, real vanilla buildings retrofitted with
// a Keycard Door - the RIGHT way to do this, unlike an earlier version of
// this file that tried spawning a whole new building via the generic
// Expansion object placer (removed; see git history). Each entry below is
// sourced from real in-game data captured with the mod's own
// EVG_CustomKeycardsHelper item (walk up to a building holding it -> its
// exact ClassName+Position is copied to your clipboard; walk up to a door
// -> its DoorId is shown), never guessed/fabricated. Add more by getting an
// admin to capture a building the same way and appending another entry
// here.
interface KeycardLootCrate {
  ClassName: string;
  Position: [number, number, number];
  Orientation: [number, number, number];
  SpawnChance: number;
  SpawnType: number;
  UnlockTime: number;
  ItemsToOpen: string[];
  DamageToItem: number;
  LootTableNames: string[];
}

interface KeycardBuildingDoor {
  DoorId: number;
  AutoCloseTime: number;
  ItemsToOpen: string[];
  DamageToItem: number;
  OpenSound: number;
  ErrorSound: number;
  CloseSound: number;
  AlarmSound: number;
  AlarmSoundSetName: string;
  AlarmPositions: [number, number, number][];
  Notification: number;
  NotificationLocationName: string;
  NotificationText: string;
  NotificationTime: number;
  LootCrates: KeycardLootCrate[];
}

interface KeycardBuilding {
  BuildingClassName: string;
  BuildingPosition: [number, number, number];
  BuildingDoors: KeycardBuildingDoor[];
}

interface StaticLocation {
  LocationName: string;
  KeycardBuildings: KeycardBuilding[];
}

// Captured in-game by the admin (EVG_CustomKeycardsHelper) at buildings
// across the map - see keycard-rooms/*.jsonc for the raw captures (one file
// per keycard tier/family) and keycard-rooms/LOCATIONS.md for the rarity
// ladder they're tracked against. Never guessed/fabricated - every
// BuildingClassName/BuildingPosition/DoorId below came from a real capture.
//
// A few shared conventions across every room:
//
// - DamageToItem: 50.0 on every door - the keycard item itself
//   (evg_keycards_base, see Data/Keycards/config.bin) has hitpoints=100 and
//   damage isn't a percentage (per the mod's wiki), so 50 damage/use means
//   every keycard survives exactly 2 uses before ruining on the 2nd.
// - Crates deliberately use UnlockTime: 0 + ItemsToOpen: [] - per the mod's
//   own wiki (https://github.com/EvgenyN-Lowner/Custom-Keycards/wiki/%5B3%5D-
//   Adding-Building-to-Keycard-System), "If the value is 0, the Loot Crate
//   will be Unlocked" - no second item requirement (e.g. a Lockpick); the
//   keycard-gated door is the only barrier.
// - Crate Position defaults to the building's own captured position (the
//   helper doesn't capture an interior spot - see the older note in git
//   history for Tisy Brick Building 1). Once an admin reports it landing
//   wrong in-game (e.g. floating), pass a hand-verified crateOffset to
//   simpleRoom/twoDoorRoom to nudge it - see DZSurvival_Tisy03_Garages below
//   for a real example (crate floated, dropped 2.5m). Never a guessed
//   offset - always something actually observed and reported after testing.
// - When a room has two doors into the same space (e.g. a "main" + "side"
//   door), only one of them gets a LootCrates entry - giving both doors a
//   crate at the same Position would spawn two overlapping crates.
function roomDoor(
  doorId: number,
  itemsToOpen: string[],
  notificationLocationName: string,
  lootCrates: KeycardLootCrate[],
): KeycardBuildingDoor {
  return {
    DoorId: doorId,
    AutoCloseTime: 60.0,
    ItemsToOpen: itemsToOpen,
    DamageToItem: 50.0,
    OpenSound: 1,
    ErrorSound: 1,
    CloseSound: 1,
    AlarmSound: 0,
    AlarmSoundSetName: "CK_KeycardAlarm_SoundSet",
    AlarmPositions: [[0.0, 0.0, 0.0]],
    Notification: 0,
    NotificationLocationName: notificationLocationName,
    NotificationText: "Keycard Room was unlocked at %1",
    NotificationTime: 15,
    LootCrates: lootCrates,
  };
}

function roomCrate(position: [number, number, number]): KeycardLootCrate {
  return {
    ClassName: "evg_MediumCrate_01",
    Position: position,
    Orientation: [0.0, 0.0, 0.0],
    SpawnChance: 100.0,
    SpawnType: 0,
    UnlockTime: 0,
    ItemsToOpen: [],
    DamageToItem: 0,
    LootTableNames: ["DZSurvival_Military", "DZSurvival_Medical"],
  };
}

// Nudges a captured building position by a small hand-verified offset (e.g.
// [0, -2.5, 0] to drop a crate 2.5m down after an admin reports it floating
// in-game) - never a guessed value, always something the admin actually
// saw and reported after testing.
function offsetPosition(
  position: [number, number, number],
  offset: [number, number, number],
): [number, number, number] {
  return [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]];
}

// Single-door, single-keycard room - the common case.
function simpleRoom(
  locationName: string,
  buildingClassName: string,
  buildingPosition: [number, number, number],
  doorId: number,
  keycard: string,
  crateOffset: [number, number, number] = [0, 0, 0],
): StaticLocation {
  return {
    LocationName: locationName,
    KeycardBuildings: [
      {
        BuildingClassName: buildingClassName,
        BuildingPosition: buildingPosition,
        BuildingDoors: [
          roomDoor(doorId, [keycard], locationName, [
            roomCrate(offsetPosition(buildingPosition, crateOffset)),
          ]),
        ],
      },
    ],
  };
}

// Two-door, single-keycard room (main/side or twin entrances into the same
// space) - only the first listed door gets a loot crate, to avoid spawning
// two overlapping crates at the same Position.
function twoDoorRoom(
  locationName: string,
  buildingClassName: string,
  buildingPosition: [number, number, number],
  primaryDoorId: number,
  secondaryDoorId: number,
  keycard: string,
  crateOffset: [number, number, number] = [0, 0, 0],
): StaticLocation {
  return {
    LocationName: locationName,
    KeycardBuildings: [
      {
        BuildingClassName: buildingClassName,
        BuildingPosition: buildingPosition,
        BuildingDoors: [
          roomDoor(primaryDoorId, [keycard], locationName, [
            roomCrate(offsetPosition(buildingPosition, crateOffset)),
          ]),
          roomDoor(secondaryDoorId, [keycard], locationName, []),
        ],
      },
    ],
  };
}

const SECURED_BUILDINGS: Record<string, StaticLocation> = {
  // Tisy01 - originally shared its door with evg_keycards_Red as a one-off
  // test (see keycard-rooms/LOCATIONS.md history); now that Red has its own
  // dedicated room (DZSurvival_Red_Garage below), this goes back to being
  // Tisy01-only.
  DZSurvival_Tisy_BrickBuilding1: simpleRoom(
    "Tisy Brick Building 1",
    "Land_Garage_Office",
    [1566.444580078125, 456.3643493652344, 14037.64453125],
    0,
    "evg_keycards_Tisy01",
  ),

  // --- White (keycard-rooms/white.jsonc) ---
  DZSurvival_White_Berezino: twoDoorRoom(
    "Berezino Warehouse (White)",
    "Land_House_2B02",
    [12272.5927734375, 25.024688720703126, 9474.1142578125],
    0,
    3,
    "evg_keycards_White",
  ),
  DZSurvival_White_House2: simpleRoom(
    "Solnichniy House (White)",
    "Land_House_1W09_Yellow",
    [3272.26953125, 194.380126953125, 3880.176513671875],
    0,
    "evg_keycards_White",
  ),

  // --- Yellow (keycard-rooms/yellow.jsonc) ---
  DZSurvival_Yellow_WaterStation: simpleRoom(
    "Water Station (Yellow)",
    "Land_Water_Station",
    [5004.95263671875, 320.59844970703127, 5588.03515625],
    0,
    "evg_keycards_Yellow",
  ),

  // --- Blue (keycard-rooms/blue.jsonc) ---
  DZSurvival_Blue_ShedW6: simpleRoom(
    "Shed W6 (Blue)",
    "Land_Shed_W6",
    [9354.8037109375, 78.13162231445313, 13614.94921875],
    0,
    "evg_keycards_Blue",
  ),
  DZSurvival_Blue_ShedW5: simpleRoom(
    "Shed W5 (Blue)",
    "Land_Shed_W5",
    [3106.67138671875, 208.8104705810547, 12573.7587890625],
    0,
    "evg_keycards_Blue",
  ),

  // --- Violet (keycard-rooms/violet.jsonc) ---
  DZSurvival_Violet_Container: simpleRoom(
    "Shipping Container (Violet)",
    "Land_Container_1Moh",
    [11956.197265625, 141.20924377441407, 12479.7822265625],
    0,
    "evg_keycards_Violet",
  ),

  // --- Red (keycard-rooms/red.jsonc) - Red's own dedicated room ---
  DZSurvival_Red_Garage: simpleRoom(
    "Small Garage (Red)",
    "Land_Garage_Small",
    [9524.4658203125, 304.0064392089844, 8801.3701171875],
    0,
    "evg_keycards_Red",
  ),

  // --- NWAF (keycard-rooms/nwaf.jsonc) ---
  DZSurvival_NWAF01_Barracks2: simpleRoom(
    "NWAF Barracks 2 (NWAF01)",
    "Land_Mil_Barracks2",
    [4020.429443359375, 377.09674072265627, 11786.4287109375],
    0,
    "evg_keycards_NWAF01",
  ),
  // Comment in nwaf.jsonc says "door id 2" for this building - the door id
  // was left at the template's placeholder value (0) in the raw capture,
  // corrected here to the real value (2).
  DZSurvival_NWAF02_AircraftShelter: simpleRoom(
    "NWAF Aircraft Shelter (NWAF02)",
    "Land_Mil_AircraftShelter",
    [4866.02392578125, 339.0, 10207.9931640625],
    2,
    "evg_keycards_NWAF02",
  ),
  DZSurvival_NWAF03_Barracks3: simpleRoom(
    "NWAF Barracks 3 (NWAF03)",
    "Land_Mil_Barracks3",
    [4553.765625, 341.40399169921877, 9540.15234375],
    0,
    "evg_keycards_NWAF03",
  ),

  // --- Tisy 02-05 (keycard-rooms/tisy.jsonc; Tisy01 stays the original
  // brick building above) ---
  DZSurvival_Tisy02_RepairCenter: twoDoorRoom(
    "Tisy Repair Center (Tisy02)",
    "Land_Repair_Center",
    [1521.462646484375, 455.3061828613281, 14060.7705078125],
    1, // "Main door ID 1" per keycard-rooms/tisy.jsonc's comment
    0, // "has another side door ID 0"
    "evg_keycards_Tisy02",
  ),
  DZSurvival_Tisy03_Garages: twoDoorRoom(
    "Tisy Garages Bunker (Tisy03)",
    "Land_Tisy_Garages",
    [1539.5443115234376, 455.61492919921877, 14175.9208984375],
    0,
    1,
    "evg_keycards_Tisy03",
    [0, -2.5, 0], // crate spawned floating - admin-verified, dropped 2.5m
  ),
  DZSurvival_Tisy04_Container: twoDoorRoom(
    "Tisy Military Container (Tisy04)",
    "Land_Container_1Mo",
    [1550.60693359375, 453.7609558105469, 14128.9111328125],
    0,
    1,
    "evg_keycards_Tisy04",
  ),
  DZSurvival_Tisy05_Barracks5: simpleRoom(
    "Tisy Barracks 5 (Tisy05)",
    "Land_Mil_Barracks5",
    [1693.4127197265626, 457.40460205078127, 14179.1728515625],
    0,
    "evg_keycards_Tisy05",
  ),

  // --- Green (keycard-rooms/green.jsonc) ---
  DZSurvival_Green_House1W04: simpleRoom(
    "House 1W04 (Green)",
    "Land_House_1W04",
    [10482.6318359375, 8.866191864013672, 2017.8851318359376],
    0,
    "evg_keycards_Green",
  ),
  DZSurvival_Green_ShedW5: simpleRoom(
    "Shed W5 (Green)",
    "Land_Shed_W5",
    [6625.39794921875, 8.630229949951172, 2323.2421875],
    0,
    "evg_keycards_Green",
  ),
};

export async function ensureCustomKeycardsSecuredBuildings(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  await Deno.mkdir(CUSTOM_KEYCARDS_STATIC_LOCATIONS_DIR, { recursive: true });

  let createdAny = false;
  for (const [fileName, location] of Object.entries(SECURED_BUILDINGS)) {
    const path = `${CUSTOM_KEYCARDS_STATIC_LOCATIONS_DIR}/${fileName}.json`;
    // Create-only: an admin may nudge these values by hand after seeing the
    // real result in-game - never overwrite that.
    if (await exists(path)) continue;
    await Deno.writeTextFile(path, JSON.stringify(location, null, 4));
    createdAny = true;
  }

  if (createdAny) {
    ok(
      `Registered ${Object.keys(SECURED_BUILDINGS).length} verified Keycard Building(s) in ` +
        CUSTOM_KEYCARDS_STATIC_LOCATIONS_DIR,
    );
  }
}

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
//    types.xml by hand. Rather than have keycards spawn naturally in the
//    wild economy (which would undercut "keycard = earned access"), this
//    wires them as nominal=0 trader-only stubs, same pattern as
//    optics.ts/tgkWeaponPack.ts - available to buy/stock, never a random
//    ground-loot find. Wire your trader stock (see traders.ts/
//    marketGapFill.ts) separately if you want them purchasable in-game.
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

const HOLDER_CLASSNAMES = new Set([
  "evg_keycard_holder_camo",
  "evg_keycard_holder_leather",
]);

function typeBlock(classname: string): string {
  const category = HOLDER_CLASSNAMES.has(classname) ? "clothes" : "tools";
  return `    <type name="${classname}">
        <nominal>0</nominal>
        <lifetime>14400</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="${category}"/>
    </type>`;
}

const TYPE_NAME = /<type name="([^"]+)">/g;

export async function ensureCustomKeycardsTypesWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(`${ECONOMY_TYPES_FILE} not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));

  let added = 0;
  for (const classname of CUSTOM_KEYCARDS_ITEM_TYPES) {
    if (existingTypes.has(classname)) continue;
    typesText = typesText.replace("</types>", `${typeBlock(classname)}\n</types>`);
    existingTypes.add(classname);
    added++;
  }

  if (added === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  ok(`Wired up ${MOD_NAME} (${added} classname(s))`);
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
    item({ SpawnChance: 70, VariantsClassNames: ["Ammo_762x39"], MinAmount: 1, MaxAmount: 3 }),
  ],
  DZSurvival_Medical: [
    item({ SpawnChance: 40, VariantsClassNames: ["SalineBagIV"] }),
    item({ SpawnChance: 30, VariantsClassNames: ["BloodBagIV"] }),
    item({ SpawnChance: 50, VariantsClassNames: ["MorphineAutoinjector"] }),
    item({
      SpawnChance: 40,
      VariantsClassNames: ["TetracyclineAntibiotics"],
      MinAmount: 1,
      MaxAmount: 3,
    }),
    item({ SpawnChance: 25, VariantsClassNames: ["Epinephrine"] }),
    item({
      SpawnChance: 60,
      VariantsClassNames: ["VitaminBottle"],
      MinQuantity: 5,
      MaxQuantity: 20,
    }),
    item({ SpawnChance: 80, VariantsClassNames: ["Bandage"], MinAmount: 2, MaxAmount: 5 }),
    item({ SpawnChance: 50, VariantsClassNames: ["DisinfectantAlcohol"] }),
  ],
};

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

// Captured in-game by the admin (EVG_CustomKeycardsHelper) on a real
// building at Tisy military base. The LootCrate's own Position isn't part
// of what the helper captures (it only gives building/door data) - rather
// than invent an interior coordinate, it's set to the same, already-real
// door position (see ensureCustomKeycardsSecuredBuildings's header comment
// for why). Nudge it by hand once you've seen where it actually lands.
const SECURED_BUILDINGS: Record<string, StaticLocation> = {
  DZSurvival_Tisy_BrickBuilding1: {
    LocationName: "Tisy Brick Building 1",
    KeycardBuildings: [
      {
        BuildingClassName: "Land_Garage_Office",
        BuildingPosition: [1566.444580078125, 456.3643493652344, 14037.64453125],
        BuildingDoors: [
          {
            DoorId: 0,
            AutoCloseTime: 60.0,
            ItemsToOpen: ["evg_keycards_Tisy01", "evg_keycards_Red"],
            DamageToItem: 30.0,
            OpenSound: 1,
            ErrorSound: 1,
            CloseSound: 1,
            AlarmSound: 0,
            AlarmSoundSetName: "CK_KeycardAlarm_SoundSet",
            AlarmPositions: [[0.0, 0.0, 0.0]],
            Notification: 0,
            NotificationLocationName: "Tisy Brick Building 1",
            NotificationText: "Keycard Room was unlocked at %1",
            NotificationTime: 15,
            LootCrates: [
              {
                ClassName: "evg_MediumCrate_01",
                Position: [1566.444580078125, 456.3643493652344, 14037.64453125],
                Orientation: [0.0, 0.0, 0.0],
                SpawnChance: 100.0,
                SpawnType: 0,
                UnlockTime: 5,
                ItemsToOpen: ["Lockpick"],
                DamageToItem: 25.0,
                LootTableNames: ["DZSurvival_Military", "DZSurvival_Medical"],
              },
            ],
          },
        ],
      },
    ],
  },
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

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

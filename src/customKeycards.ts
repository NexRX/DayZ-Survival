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

// One curated table PER RARITY TIER (see keycard-rooms/LOCATIONS.md's
// ladder + KEYCARD_ECONOMY above), additional to the mod's own
// self-generated 0_DefaultLootTable.json (left untouched). Every
// VariantsClassNames entry below is verified against this server's own
// generated mission types.xml (not assumed vanilla - this server's
// types.xml is topped up by several other loot mods too) - the same class
// of bug that previously broke this table silently ("TaloonBackpack_*"/
// "MorphineAutoinjector", EFT/Tarkov names, not DayZ's - confirmed via the
// server's own RPT log: "Unable to create child ... as the type does not
// exist").
//
// Previously every room in the game (a common White-card shed and the
// rarest Tisy05 barracks alike) rolled from the exact same two tables
// (DZSurvival_Military/DZSurvival_Medical, removed) - no reward scaling
// with risk at all. Each tier below is its own single combined table (one
// LootTableNames entry per crate, not a pick-one-of-two split) so every
// item in a room's pool gets an independent roll instead of gambling on
// which of two tables got picked - deliberately excludes common/mundane
// consumables (Ammo_762x39, TetracyclineAntibiotics, VitaminBottle,
// Bandage, DisinfectantAlcohol) that already litter regular ground loot.
//
// - Common/Uncommon/Rare/VeryRare/ExtremelyRare map 1:1 to the keycard
//   tiers of the same name in KEYCARD_ECONOMY/LOCATIONS.md.
// - Rarest is Tisy05's own standout table - the single hardest room to
//   reach on the map should visibly outclass every other tier.
// - RadZone is shared by every gear-gated Stary Sobor/Skalisty Island room
//   (see gearGatedRoom below) - no keycard rarity applies there, but full
//   NBC gear + wading into an active radiation zone should pay off at
//   roughly Rare/VeryRare weapon value, plus a TerjeDosimetr upgrade
//   that's otherwise genuinely hard to find (see loot.ts's starting-kit
//   comment: the better Mkc01A/Cdv700 dosimeters are deliberately kept
//   rare, not handed out at spawn).
const LOOT_TABLES: Record<string, LootItem[]> = {
  DZSurvival_Loot_Common: [
    item({
      SpawnChance: 45,
      VariantsClassNames: ["CZ75"],
      MinHealth: 55,
      Attachments: [
        item({
          SpawnChance: 70,
          VariantsClassNames: ["Mag_CZ75_15Rnd"],
          MinQuantity: 10,
          MaxQuantity: 15,
        }),
      ],
    }),
    item({
      SpawnChance: 35,
      VariantsClassNames: ["FNX45"],
      MinHealth: 55,
      Attachments: [
        item({
          SpawnChance: 70,
          VariantsClassNames: ["Mag_FNX45_15Rnd"],
          MinQuantity: 10,
          MaxQuantity: 15,
        }),
      ],
    }),
    item({ SpawnChance: 45, VariantsClassNames: ["TaloonBag_Green", "TaloonBag_Orange"] }),
    item({ SpawnChance: 30, VariantsClassNames: ["SalineBagIV"] }),
    item({ SpawnChance: 20, VariantsClassNames: ["Epinephrine"] }),
  ],
  DZSurvival_Loot_Uncommon: [
    item({
      SpawnChance: 45,
      VariantsClassNames: ["AK101"],
      MinHealth: 60,
      Attachments: [
        item({
          SpawnChance: 80,
          VariantsClassNames: ["Mag_AK101_30Rnd"],
          MinQuantity: 15,
          MaxQuantity: 30,
        }),
      ],
    }),
    item({
      SpawnChance: 30,
      VariantsClassNames: ["Deagle"],
      MinHealth: 60,
      Attachments: [
        item({
          SpawnChance: 70,
          VariantsClassNames: ["Mag_Deagle_9rnd"],
          MinQuantity: 5,
          MaxQuantity: 9,
        }),
      ],
    }),
    item({ SpawnChance: 30, VariantsClassNames: ["PlateCarrierVest"], MinHealth: 75 }),
    item({ SpawnChance: 40, VariantsClassNames: ["CoyoteBag_Brown"] }),
    item({
      SpawnChance: 15,
      VariantsClassNames: ["NVGoggles"],
      Attachments: [
        item({
          SpawnChance: 90,
          VariantsClassNames: ["Battery9V"],
          MinQuantity: 70,
          MaxQuantity: 100,
        }),
      ],
    }),
    item({ SpawnChance: 30, VariantsClassNames: ["SalineBagIV"] }),
    item({ SpawnChance: 25, VariantsClassNames: ["BloodBagIV"] }),
  ],
  DZSurvival_Loot_Rare: [
    item({
      SpawnChance: 50,
      VariantsClassNames: ["AKM"],
      MinHealth: 65,
      Attachments: [
        item({
          SpawnChance: 90,
          VariantsClassNames: ["Mag_AKM_30Rnd"],
          MinQuantity: 15,
          MaxQuantity: 30,
        }),
        item({ SpawnChance: 25, VariantsClassNames: ["AK_Suppressor"] }),
      ],
    }),
    item({
      SpawnChance: 35,
      VariantsClassNames: ["M4A1"],
      MinHealth: 65,
      Attachments: [
        item({
          SpawnChance: 85,
          VariantsClassNames: ["Mag_STANAG_30Rnd"],
          MinQuantity: 15,
          MaxQuantity: 30,
        }),
      ],
    }),
    item({ SpawnChance: 30, VariantsClassNames: ["HighCapacityVest_Black"], MinHealth: 80 }),
    item({ SpawnChance: 40, VariantsClassNames: ["MountainBag_Green", "MountainBag_Orange"] }),
    item({ SpawnChance: 20, VariantsClassNames: ["ACOGOptic"] }),
    item({ SpawnChance: 20, VariantsClassNames: ["Rangefinder"] }),
    item({ SpawnChance: 30, VariantsClassNames: ["Epinephrine"] }),
    item({ SpawnChance: 20, VariantsClassNames: ["BloodTestKit"] }),
  ],
  DZSurvival_Loot_VeryRare: [
    item({
      SpawnChance: 35,
      VariantsClassNames: ["SVD"],
      MinHealth: 70,
      Attachments: [
        item({
          SpawnChance: 90,
          VariantsClassNames: ["Mag_SVD_10Rnd"],
          MinQuantity: 5,
          MaxQuantity: 10,
        }),
        item({ SpawnChance: 40, VariantsClassNames: ["PUScopeOptic"] }),
      ],
    }),
    item({
      SpawnChance: 30,
      VariantsClassNames: ["FAMAS"],
      MinHealth: 70,
      Attachments: [
        item({
          SpawnChance: 80,
          VariantsClassNames: ["Mag_FAMAS_25Rnd"],
          MinQuantity: 12,
          MaxQuantity: 25,
        }),
      ],
    }),
    item({ SpawnChance: 25, VariantsClassNames: ["M4_Suppressor"] }),
    item({ SpawnChance: 20, VariantsClassNames: ["GhillieSuit_Woodland", "GhillieSuit_Tan"] }),
    item({
      SpawnChance: 25,
      VariantsClassNames: ["NVGoggles"],
      Attachments: [
        item({
          SpawnChance: 100,
          VariantsClassNames: ["Battery9V"],
          MinQuantity: 80,
          MaxQuantity: 100,
        }),
      ],
    }),
    item({ SpawnChance: 35, VariantsClassNames: ["SalineBagIV"] }),
    item({ SpawnChance: 30, VariantsClassNames: ["BloodBagIV"] }),
    item({ SpawnChance: 25, VariantsClassNames: ["AntiChemInjector"] }),
  ],
  DZSurvival_Loot_ExtremelyRare: [
    item({
      SpawnChance: 40,
      VariantsClassNames: ["SCARH"],
      MinHealth: 75,
      Attachments: [
        item({
          SpawnChance: 85,
          VariantsClassNames: ["Mag_SCARH_20Rnd"],
          MinQuantity: 10,
          MaxQuantity: 20,
        }),
        // Not PSO1Optic - that's a Soviet-pattern rail scope (SVD/VSS), not
        // compatible with the SCAR-H's NATO rail. Was silently failing to
        // spawn every boot ("Failed to spawn LootCrate Attachment").
        item({ SpawnChance: 30, VariantsClassNames: ["ACOGOptic"] }),
      ],
    }),
    item({
      SpawnChance: 30,
      VariantsClassNames: ["M14"],
      MinHealth: 75,
      Attachments: [
        item({
          SpawnChance: 80,
          VariantsClassNames: ["Mag_M14_20Rnd"],
          MinQuantity: 10,
          MaxQuantity: 20,
        }),
      ],
    }),
    item({ SpawnChance: 25, VariantsClassNames: ["GhillieSuit_Woodland"] }),
    item({
      SpawnChance: 30,
      VariantsClassNames: ["NVGoggles"],
      Attachments: [
        item({
          SpawnChance: 100,
          VariantsClassNames: ["Battery9V"],
          MinQuantity: 80,
          MaxQuantity: 100,
        }),
      ],
    }),
    item({ SpawnChance: 40, VariantsClassNames: ["BloodBagIV"] }),
    item({ SpawnChance: 35, VariantsClassNames: ["Epinephrine"] }),
    item({ SpawnChance: 30, VariantsClassNames: ["BloodTestKit"] }),
  ],
  // Tisy05's own standout table - the rarest keycard on the map should
  // yield the single best guaranteed-feeling roll in the game.
  DZSurvival_Loot_Rarest: [
    item({
      SpawnChance: 55,
      VariantsClassNames: ["VSS"],
      MinHealth: 80,
      Attachments: [
        item({
          SpawnChance: 90,
          VariantsClassNames: ["Mag_VSS_10Rnd"],
          MinQuantity: 5,
          MaxQuantity: 10,
        }),
        item({ SpawnChance: 40, VariantsClassNames: ["PSO1Optic"] }),
      ],
    }),
    item({
      SpawnChance: 35,
      VariantsClassNames: ["Aug"],
      MinHealth: 80,
      Attachments: [
        item({
          SpawnChance: 85,
          VariantsClassNames: ["Mag_Aug_30Rnd"],
          MinQuantity: 15,
          MaxQuantity: 30,
        }),
      ],
    }),
    item({ SpawnChance: 35, VariantsClassNames: ["GhillieSuit_Tan", "GhillieSuit_Winter"] }),
    item({
      SpawnChance: 45,
      VariantsClassNames: ["NVGoggles"],
      Attachments: [
        item({
          SpawnChance: 100,
          VariantsClassNames: ["Battery9V"],
          MinQuantity: 90,
          MaxQuantity: 100,
        }),
      ],
    }),
    item({ SpawnChance: 45, VariantsClassNames: ["SalineBagIV"] }),
    item({ SpawnChance: 40, VariantsClassNames: ["BloodBagIV"] }),
    item({ SpawnChance: 35, VariantsClassNames: ["Epinephrine"] }),
  ],
  // Shared by every gearGatedRoom() below (Stary Sobor + Skalisty Island) -
  // no keycard rarity applies, but full NBC gear + an active radiation zone
  // should pay off. TerjeDosimetrMkc01A/Cdv700 are the same two dosimeters
  // loot.ts's starting-kit comment deliberately keeps out of the guaranteed
  // starting kit - finding one here is the whole point of coming back.
  DZSurvival_Loot_RadZone: [
    item({ SpawnChance: 35, VariantsClassNames: ["TerjeDosimetrMkc01A", "TerjeDosimetrCdv700"] }),
    item({ SpawnChance: 40, VariantsClassNames: ["AntiChemInjector"] }),
    item({
      SpawnChance: 40,
      VariantsClassNames: ["AKM"],
      MinHealth: 65,
      Attachments: [
        item({
          SpawnChance: 85,
          VariantsClassNames: ["Mag_AKM_30Rnd"],
          MinQuantity: 15,
          MaxQuantity: 30,
        }),
        item({ SpawnChance: 30, VariantsClassNames: ["AK_Suppressor"] }),
      ],
    }),
    item({
      SpawnChance: 30,
      VariantsClassNames: ["M4A1"],
      MinHealth: 65,
      Attachments: [
        item({
          SpawnChance: 80,
          VariantsClassNames: ["Mag_STANAG_30Rnd"],
          MinQuantity: 15,
          MaxQuantity: 30,
        }),
      ],
    }),
    item({ SpawnChance: 20, VariantsClassNames: ["GhillieSuit_Woodland"] }),
    item({
      SpawnChance: 25,
      VariantsClassNames: ["NVGoggles"],
      Attachments: [
        item({
          SpawnChance: 100,
          VariantsClassNames: ["Battery9V"],
          MinQuantity: 80,
          MaxQuantity: 100,
        }),
      ],
    }),
    item({ SpawnChance: 35, VariantsClassNames: ["SalineBagIV"] }),
    item({ SpawnChance: 30, VariantsClassNames: ["BloodBagIV"] }),
    item({ SpawnChance: 25, VariantsClassNames: ["BloodTestKit"] }),
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

function roomCrate(
  position: [number, number, number],
  lootTableNames: string[],
): KeycardLootCrate {
  return {
    ClassName: "evg_MediumCrate_01",
    Position: position,
    Orientation: [0.0, 0.0, 0.0],
    SpawnChance: 100.0,
    SpawnType: 0,
    UnlockTime: 0,
    ItemsToOpen: [],
    DamageToItem: 0,
    LootTableNames: lootTableNames,
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
  lootTableNames: string[],
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
            roomCrate(offsetPosition(buildingPosition, crateOffset), lootTableNames),
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
  lootTableNames: string[],
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
            roomCrate(offsetPosition(buildingPosition, crateOffset), lootTableNames),
          ]),
          roomDoor(secondaryDoorId, [keycard], locationName, []),
        ],
      },
    ],
  };
}

// Single-door room gated by SURVIVAL GEAR instead of a keycard - for
// keycard-rooms/zone-stary.jsonc and keycard-rooms/zone-skality.jsonc's
// radiation-zone entries, whose top comment explicitly says these
// "shouldnt be keycard protected because they are in a dangerous zone,
// gate by gear needed to survive".
//
// An earlier version of this passed ItemsToOpen: [] on the DOOR itself,
// reasoning (wrongly) from the mod's wiki that "If the value is 0, the
// Loot Crate will be Unlocked" applied here too - that quote is only ever
// made about a LootCrate's UnlockTime (see roomCrate() above), never about
// a Door's ItemsToOpen, and every wiki example for a Door lists at least
// one real item (framed as required - "even a can of beans"). In practice
// an empty ItemsToOpen on a door left it permanently locked with no valid
// key, confirmed in-game - the opposite of the intent. Fixed by actually
// requiring the survival gear the design always intended: a gas mask (the
// single most essential piece of protection for a toxic/radiation zone -
// see ofgNuclearZone.ts's own loot-table comment making the same call).
const RAD_ZONE_GEAR_ITEMS = ["GasMask", "GP5GasMask"];

// All 7 rad-zone rooms share the same DZSurvival_Loot_RadZone table (see
// LOOT_TABLES above) - no keycard rarity applies here, so there's nothing
// to parameterize per-call the way simpleRoom/twoDoorRoom's keycard tier
// does.
const RAD_ZONE_LOOT_TABLES = ["DZSurvival_Loot_RadZone"];

function gearGatedRoom(
  locationName: string,
  buildingClassName: string,
  buildingPosition: [number, number, number],
  doorId: number,
  crateOffset: [number, number, number] = [0, 0, 0],
): StaticLocation {
  return {
    LocationName: locationName,
    KeycardBuildings: [
      {
        BuildingClassName: buildingClassName,
        BuildingPosition: buildingPosition,
        BuildingDoors: [
          roomDoor(doorId, RAD_ZONE_GEAR_ITEMS, locationName, [
            roomCrate(offsetPosition(buildingPosition, crateOffset), RAD_ZONE_LOOT_TABLES),
          ]),
        ],
      },
    ],
  };
}

// One constant per rarity tier in KEYCARD_ECONOMY/keycard-rooms/LOCATIONS.md,
// passed as simpleRoom/twoDoorRoom's lootTableNames argument below - keeps
// every room of the same tier pointed at the same LOOT_TABLES entry above
// without repeating the literal array at each call site.
const TIER_COMMON = ["DZSurvival_Loot_Common"];
const TIER_UNCOMMON = ["DZSurvival_Loot_Uncommon"];
const TIER_RARE = ["DZSurvival_Loot_Rare"];
const TIER_VERY_RARE = ["DZSurvival_Loot_VeryRare"];
const TIER_EXTREMELY_RARE = ["DZSurvival_Loot_ExtremelyRare"];
const TIER_RAREST = ["DZSurvival_Loot_Rarest"];

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
    TIER_UNCOMMON,
  ),

  // --- White (keycard-rooms/white.jsonc) ---
  DZSurvival_White_Berezino: twoDoorRoom(
    "Berezino Warehouse (White)",
    "Land_House_2B02",
    [12272.5927734375, 25.024688720703126, 9474.1142578125],
    0,
    3,
    "evg_keycards_White",
    TIER_COMMON,
  ),
  DZSurvival_White_House2: simpleRoom(
    "Solnichniy House (White)",
    "Land_House_1W09_Yellow",
    [3272.26953125, 194.380126953125, 3880.176513671875],
    0,
    "evg_keycards_White",
    TIER_COMMON,
  ),

  // --- Yellow (keycard-rooms/yellow.jsonc) ---
  DZSurvival_Yellow_WaterStation: simpleRoom(
    "Water Station (Yellow)",
    "Land_Water_Station",
    [5004.95263671875, 320.59844970703127, 5588.03515625],
    0,
    "evg_keycards_Yellow",
    TIER_COMMON,
  ),

  // --- Blue (keycard-rooms/blue.jsonc) ---
  DZSurvival_Blue_ShedW6: simpleRoom(
    "Shed W6 (Blue)",
    "Land_Shed_W6",
    [9354.8037109375, 78.13162231445313, 13614.94921875],
    0,
    "evg_keycards_Blue",
    TIER_UNCOMMON,
  ),
  DZSurvival_Blue_ShedW5: simpleRoom(
    "Shed W5 (Blue)",
    "Land_Shed_W5",
    [3106.67138671875, 208.8104705810547, 12573.7587890625],
    0,
    "evg_keycards_Blue",
    TIER_UNCOMMON,
  ),

  // --- Violet (keycard-rooms/violet.jsonc) ---
  DZSurvival_Violet_Container: simpleRoom(
    "Shipping Container (Violet)",
    "Land_Container_1Moh",
    [11956.197265625, 141.20924377441407, 12479.7822265625],
    0,
    "evg_keycards_Violet",
    TIER_RARE,
  ),

  // --- Red (keycard-rooms/red.jsonc) - Red's own dedicated room ---
  DZSurvival_Red_Garage: simpleRoom(
    "Small Garage (Red)",
    "Land_Garage_Small",
    [9524.4658203125, 304.0064392089844, 8801.3701171875],
    0,
    "evg_keycards_Red",
    TIER_RARE,
  ),

  // --- NWAF (keycard-rooms/nwaf.jsonc) ---
  DZSurvival_NWAF01_Barracks2: simpleRoom(
    "NWAF Barracks 2 (NWAF01)",
    "Land_Mil_Barracks2",
    [4020.429443359375, 377.09674072265627, 11786.4287109375],
    0,
    "evg_keycards_NWAF01",
    TIER_UNCOMMON,
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
    TIER_RARE,
  ),
  DZSurvival_NWAF03_Barracks3: simpleRoom(
    "NWAF Barracks 3 (NWAF03)",
    "Land_Mil_Barracks3",
    [4553.765625, 341.40399169921877, 9540.15234375],
    0,
    "evg_keycards_NWAF03",
    TIER_VERY_RARE,
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
    TIER_VERY_RARE,
  ),
  DZSurvival_Tisy03_Garages: twoDoorRoom(
    "Tisy Garages Bunker (Tisy03)",
    "Land_Tisy_Garages",
    [1539.5443115234376, 455.61492919921877, 14175.9208984375],
    0,
    1,
    "evg_keycards_Tisy03",
    TIER_VERY_RARE,
    [0, -2.5, 0], // crate spawned floating - admin-verified, dropped 2.5m
  ),
  DZSurvival_Tisy04_Container: twoDoorRoom(
    "Tisy Military Container (Tisy04)",
    "Land_Container_1Mo",
    [1550.60693359375, 453.7609558105469, 14128.9111328125],
    0,
    1,
    "evg_keycards_Tisy04",
    TIER_EXTREMELY_RARE,
  ),
  DZSurvival_Tisy05_Barracks5: simpleRoom(
    "Tisy Barracks 5 (Tisy05)",
    "Land_Mil_Barracks5",
    [1693.4127197265626, 457.40460205078127, 14179.1728515625],
    0,
    "evg_keycards_Tisy05",
    TIER_RAREST,
  ),

  // --- Green (keycard-rooms/green.jsonc) ---
  DZSurvival_Green_House1W04: simpleRoom(
    "House 1W04 (Green)",
    "Land_House_1W04",
    [10482.6318359375, 8.866191864013672, 2017.8851318359376],
    0,
    "evg_keycards_Green",
    TIER_COMMON,
  ),
  DZSurvival_Green_ShedW5: simpleRoom(
    "Shed W5 (Green)",
    "Land_Shed_W5",
    [6625.39794921875, 8.630229949951172, 2323.2421875],
    0,
    "evg_keycards_Green",
    TIER_COMMON,
  ),

  // --- Stary Sobor radiation zone (keycard-rooms/zone-stary.jsonc) - no
  // keycard requirement, gear-gated instead (see gearGatedRoom's own
  // comment): a gas mask is required to open the door, in keeping with the
  // radiation/toxic hazard itself (hazards.ts/starySoborToxicZone.ts), not
  // a keycard drop. All three scouted around this project's own new zone
  // epicenter (hazards.ts's STARY_SOBOR_POSITION). Crate offset defaults
  // to [0,0,0] like most other rooms above; nudge here once an admin
  // reports one floating in-game.
  DZSurvival_StaryZone_Container1: gearGatedRoom(
    "Stary Sobor Container 1 (Zone)",
    "Land_Container_1Mo",
    [6324.47802734375, 306.3370056152344, 7783.30126953125],
    0,
  ),
  DZSurvival_StaryZone_Container2: gearGatedRoom(
    "Stary Sobor Container 2 (Zone)",
    "Land_Container_1Mo",
    [6282.7978515625, 306.04827880859377, 7807.03564453125],
    0,
  ),
  DZSurvival_StaryZone_House: gearGatedRoom(
    "Stary Sobor House (Zone)",
    "Land_House_2W04",
    [6110.66162109375, 307.0413513183594, 7686.9853515625],
    0,
  ),

  // --- Skalisty Island military base radiation zone
  // (keycard-rooms/zone-skality.jsonc) - same reasoning as the Stary Sobor
  // zone above: no keycard requirement, gear-gated by a gas mask instead
  // (hazards.ts's ensureSkalistyMilitaryRadiationZone/
  // skalistyMilitaryToxicZone.ts) rather than a keycard drop. All four
  // scouted inside @Mapping_Skalisty_Military's own base buildings.
  DZSurvival_SkalistyZone_Barracks: gearGatedRoom(
    "Skalisty Round Barracks (Zone)",
    "Land_Mil_Barracks_Round",
    [13961.8466796875, 24.46680450439453, 2859.828369140625],
    0,
  ),
  DZSurvival_SkalistyZone_House: gearGatedRoom(
    "Skalisty House (Zone)",
    "Land_House_1W09_Yellow",
    [13865.6103515625, 35.88956451416016, 2919.49609375],
    0,
  ),
  // Crate offset needed - the building's own capture position sits inside
  // solid geometry ("WEIRD BUILDING", per zone-skality.jsonc's own
  // comment); the crate itself was separately verified in-game at
  // <13680.3, 30.0542, 2815.76>, hence the offset below rather than [0,0,0].
  DZSurvival_SkalistyZone_CementWorks: gearGatedRoom(
    "Skalisty Cement Works (Zone)",
    "Land_CementWorks_ExpeditionA",
    [13696.4345703125, 35.12250137329102, 2812.2587890625],
    0,
    [-16.1345703125, -5.068301373291016, 3.5012109375],
  ),
  DZSurvival_SkalistyZone_Barracks3: gearGatedRoom(
    "Skalisty Barracks 3 (Zone)",
    "Land_Mil_Barracks3",
    [13644.5966796875, 46.70256805419922, 2937.896240234375],
    0,
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

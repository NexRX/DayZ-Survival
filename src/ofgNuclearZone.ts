// OFG Nuclear Zone (@OFG-Nuclear-Zone) hooks into vanilla's own
// ContaminatedArea_Dynamic (the toxic gas cloud object) and drops a few
// lootable "OFG barrels" around each cloud once it appears, with zombies and
// self-cleaning despawn when the zone ends. It creates zero new spawn
// points of its own - it rides whatever ContaminatedArea_Dynamic instances
// already exist.
//
// On this server, that's two places: vanilla's own
// "StaticContaminatedArea" event ships with <nominal>0</nominal> (so it
// never spawns anywhere map-wide - see starySoborToxicZone.ts's own header
// comment), and the only other sources are Stary Sobor's and Skalisty
// Island's own scouted positions, added to that same event by
// starySoborToxicZone.ts and skalistyMilitaryToxicZone.ts respectively.
// IMPORTANT caveat (see those files' header comments for the full story):
// nominal is a genuinely shared, MAP-WIDE budget of 6 concurrent instances
// across ~83 vanilla positions plus these two - there's no way to pin a
// guaranteed, permanent cloud to either position specifically. So every
// OFG barrel this mod ever spawns will appear at one of these two spots
// whenever a cloud instance does roll in there, stacking on top of an
// already-rich hazard at each: TerjeRadioactiveScriptableArea (hazards.ts),
// a Yuretskiy-Creatures monster garrison (starySoborRadiationZone.ts /
// skalistyMilitaryRadiationZone.ts), and an AI guard patrol
// ("Radiation_Guards_StarySobor" / "Radiation_Guards_Skalisty" in
// ai/AIPatrolSettings.json). Stary Sobor additionally has 3 unlocked,
// no-keycard loot crates (customKeycards.ts's "DZSurvival_StaryZone_*"
// SECURED_BUILDINGS entries, red/violet-tier - see that file's
// RED_VIOLET_TIER_CLASSNAMES) as its own dedicated reward; Skalisty relies
// on @Mapping_Skalisty_Military's own shipped building loot instead (a
// standalone central-economy reward event isn't achievable on this server
// at all - see starySoborRadiationZone.ts's header comment for why).
//
// Because of that overlap, this mod's own out-of-the-box loot table is
// deliberately NOT used as-is - it would double up on the map's single
// rarest items right at spots that already have their own dedicated
// rewards/hazards:
//   - M4A1 and SVD are both fully-kitted-with-optics weapons the mod spawns
//     at 8-12% per barrel; M4A1 has <nominal>1</nominal> map-wide (SVD only
//     4) - this server's own best-tier reward tables (customKeycards.ts)
//     cap out at AKM/Mosin9130, deliberately never handing out kitted M4/SVD.
//   - PlateCarrierVest also has <nominal>1</nominal> map-wide and is ALREADY
//     one of Stary Sobor's own unlocked-crate reward items at that exact
//     location - a second independent source of it here would push the
//     map's single rarest vest well past what "nominal 1" is meant to mean.
//   - BandageDressing is the same "common/mundane consumable that litters
//     regular ground loot everywhere" customKeycards.ts already deliberately
//     excludes from its own curated tables, for the same dilution reason.
//
// What's kept/tuned below instead is a smaller, purely complementary
// "survival gearing" pool (ammo for the Mosin Stary Sobor's own crates
// already hand out, medical, a gas mask + filter, backpacks/vests/clothing
// distinct from what those crates already grant) - real bonus loot worth
// wading into the gas for, without doubling the map's scarcest items at
// either spot. Spawn chances are trimmed down from the mod's own defaults
// for the same reason. barrelCount is left at the mod's own default of 3
// per cloud - per-barrel loot odds/table are curated tightly enough above
// that a few more barrels scattered around either zone (visual/thematic
// presence) doesn't meaningfully raise the volume of rare loot.
//
// zombiesEnabled (NBC-suit infected around each barrel) and
// expansionAIEnabled (off by default) are left at the mod's own defaults:
// the NBC zombies fit the theme perfectly on top of the existing monster
// garrison/AI patrol, while turning on ANOTHER independent AI spawn source
// on a server that already runs AI-Bandits/Ai-Warzone/Airborne-AI/Dynamic-AI-
// Missions plus Stary Sobor's own Yuretskiy garrison would stack AI density
// past what's needed.

import {
  OFG_NUCLEAR_ZONE_DIR,
  OFG_NUCLEAR_ZONE_EXPANSION_AI_SETTINGS,
  OFG_NUCLEAR_ZONE_LOOT_SETTINGS,
  OFG_NUCLEAR_ZONE_MAIN_SETTINGS,
} from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@OFG-Nuclear-Zone";

interface OfgMainConfig {
  barrelCount?: number;
  notificationText?: string;
  [key: string]: unknown;
}

interface OfgLootEntry {
  ClassName: string;
  Magazine_ClassName: string;
  Spawn_Chance: number;
  Max_Spawnable: number;
  Quantity: number;
  Category: string;
  Attach: string[];
  Extra_Items: string[];
  Alternatives: string[];
}

interface OfgLootConfig {
  MaxItemsPerBarrel?: number;
  DefaultMaxStacksPerType?: number;
  MaxWeaponsPerBarrel?: number;
  MaxMedicalPerBarrel?: number;
  MaxAmmoPerBarrel?: number;
  MaxUtilityPerBarrel?: number;
  Loot?: OfgLootEntry[];
  [key: string]: unknown;
}

interface OfgExpansionAIConfig {
  expansionAIEnabled?: boolean;
  [key: string]: unknown;
}

function lootEntry(partial: Partial<OfgLootEntry> & { ClassName: string }): OfgLootEntry {
  return {
    Magazine_ClassName: "",
    Spawn_Chance: 100,
    Max_Spawnable: 1,
    Quantity: -1,
    Category: "utility",
    Attach: [],
    Extra_Items: [],
    Alternatives: [],
    ...partial,
  };
}

// Restored to the mod's own default (was trimmed to 2 in an earlier pass -
// see this file's header comment for why 3 is fine loot-volume-wise).
const BARREL_COUNT = 3;

// Stary Sobor is the only place these zones can ever appear on this server
// (see header comment) - flavor the popup to match instead of the mod's own
// generic default text.
const NOTIFICATION_TEXT = "Toxic gas is rolling in near Stary Sobor - suit up.";

const MAX_ITEMS_PER_BARREL = 12;
const DEFAULT_MAX_STACKS_PER_TYPE = 2;
const MAX_WEAPONS_PER_BARREL = 0; // no weapon-tier entries below - see header comment
const MAX_MEDICAL_PER_BARREL = 2;
const MAX_AMMO_PER_BARREL = 2;
const MAX_UTILITY_PER_BARREL = 4;

function desiredLoot(): OfgLootEntry[] {
  return [
    // Complements the Mosin9130 already handed out by
    // RadiationZoneLootStarySobor (customKeycards.ts's Military tier).
    lootEntry({
      ClassName: "Ammo_762x54",
      Spawn_Chance: 35,
      Max_Spawnable: 2,
      Quantity: 20,
      Category: "ammo",
      Alternatives: ["Ammo_308Win", "Ammo_545x39", "Ammo_556x45"],
    }),
    lootEntry({
      ClassName: "Morphine",
      Spawn_Chance: 35,
      Category: "medical",
      Alternatives: ["Epinephrine", "TetracyclineAntibiotics"],
    }),
    lootEntry({
      ClassName: "Canteen",
      Spawn_Chance: 35,
      Alternatives: ["WaterBottle"],
    }),
    lootEntry({
      ClassName: "Battery9V",
      Spawn_Chance: 35,
      Max_Spawnable: 2,
      Alternatives: ["WeaponCleaningKit"],
    }),
    lootEntry({
      ClassName: "AssaultBag_Green",
      Spawn_Chance: 25,
      Alternatives: ["AssaultBag_Black"],
    }),
    lootEntry({ ClassName: "AliceBag_Green", Spawn_Chance: 10 }),
    lootEntry({ ClassName: "SmershBag", Spawn_Chance: 8 }),
    // HighCapacityVest, not PlateCarrierVest - see header comment on why
    // PlateCarrierVest itself is deliberately excluded.
    lootEntry({
      ClassName: "HighCapacityVest_Olive",
      Spawn_Chance: 15,
      Alternatives: ["HighCapacityVest_Black"],
    }),
    lootEntry({
      ClassName: "GorkaEJacket_PautRev",
      Spawn_Chance: 25,
      Alternatives: ["GorkaEJacket_Summer", "TTsKOJacket_Camo"],
    }),
    lootEntry({
      ClassName: "GorkaPants_PautRev",
      Spawn_Chance: 25,
      Alternatives: ["GorkaPants_Summer", "TTSKOPants"],
    }),
    // Bumped up from the mod's own default (40 -> 45) and bundled with a
    // filter - thematically the single most useful item to find wading into
    // a toxic/radiation zone, and quests.ts's quest #1007 already sends
    // players here expecting them to "bring protection".
    lootEntry({
      ClassName: "GasMask",
      Spawn_Chance: 45,
      Alternatives: ["GP5GasMask"],
      Extra_Items: ["GasMask_Filter"],
    }),
  ];
}

export async function ensureOfgNuclearZoneWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(OFG_NUCLEAR_ZONE_DIR))) {
    log(
      `${OFG_NUCLEAR_ZONE_DIR} not generated yet - ${MOD_NAME} will create its ` +
        "default configs on first server start",
    );
    return;
  }

  const changes: string[] = [];

  if (await exists(OFG_NUCLEAR_ZONE_MAIN_SETTINGS)) {
    const main: OfgMainConfig = JSON.parse(
      await Deno.readTextFile(OFG_NUCLEAR_ZONE_MAIN_SETTINGS),
    );
    let changed = false;
    if (main.barrelCount !== BARREL_COUNT) {
      main.barrelCount = BARREL_COUNT;
      changed = true;
    }
    if (main.notificationText !== NOTIFICATION_TEXT) {
      main.notificationText = NOTIFICATION_TEXT;
      changed = true;
    }
    if (changed) {
      await Deno.writeTextFile(OFG_NUCLEAR_ZONE_MAIN_SETTINGS, JSON.stringify(main, null, 4));
      changes.push("main config (barrelCount, notificationText)");
    }
  }

  if (await exists(OFG_NUCLEAR_ZONE_LOOT_SETTINGS)) {
    const loot: OfgLootConfig = JSON.parse(
      await Deno.readTextFile(OFG_NUCLEAR_ZONE_LOOT_SETTINGS),
    );
    const desired = desiredLoot();
    const scalarsMatch = loot.MaxItemsPerBarrel === MAX_ITEMS_PER_BARREL &&
      loot.DefaultMaxStacksPerType === DEFAULT_MAX_STACKS_PER_TYPE &&
      loot.MaxWeaponsPerBarrel === MAX_WEAPONS_PER_BARREL &&
      loot.MaxMedicalPerBarrel === MAX_MEDICAL_PER_BARREL &&
      loot.MaxAmmoPerBarrel === MAX_AMMO_PER_BARREL &&
      loot.MaxUtilityPerBarrel === MAX_UTILITY_PER_BARREL;
    const lootMatches = JSON.stringify(loot.Loot) === JSON.stringify(desired);

    if (!scalarsMatch || !lootMatches) {
      loot.MaxItemsPerBarrel = MAX_ITEMS_PER_BARREL;
      loot.DefaultMaxStacksPerType = DEFAULT_MAX_STACKS_PER_TYPE;
      loot.MaxWeaponsPerBarrel = MAX_WEAPONS_PER_BARREL;
      loot.MaxMedicalPerBarrel = MAX_MEDICAL_PER_BARREL;
      loot.MaxAmmoPerBarrel = MAX_AMMO_PER_BARREL;
      loot.MaxUtilityPerBarrel = MAX_UTILITY_PER_BARREL;
      loot.Loot = desired;
      await Deno.writeTextFile(OFG_NUCLEAR_ZONE_LOOT_SETTINGS, JSON.stringify(loot, null, 4));
      changes.push(`loot table (${desired.length} curated entries)`);
    }
  }

  if (await exists(OFG_NUCLEAR_ZONE_EXPANSION_AI_SETTINGS)) {
    const ai: OfgExpansionAIConfig = JSON.parse(
      await Deno.readTextFile(OFG_NUCLEAR_ZONE_EXPANSION_AI_SETTINGS),
    );
    if (ai.expansionAIEnabled !== false) {
      ai.expansionAIEnabled = false;
      await Deno.writeTextFile(
        OFG_NUCLEAR_ZONE_EXPANSION_AI_SETTINGS,
        JSON.stringify(ai, null, 4),
      );
      changes.push("disabled Expansion AI spawns (avoids stacking on existing AI density)");
    }
  }

  if (changes.length > 0) ok(`${MOD_NAME}: ${changes.join(", ")}`);
}

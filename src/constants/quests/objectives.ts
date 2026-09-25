// anything marked note playtested needs marking with /** @deprecated untill playtested */

import type {
  ActionObjective,
  AIPatrolObjective,
  AISpawn,
  AIVipObjective,
  CollectionObjective,
  CraftingObjective,
  DeliveryObjective,
  ObjectiveBase,
  ObjectiveRef,
  TargetObjective,
  TravelObjective,
  TreasureHuntObjective,
  TreasureLootItem,
} from "../types/objective.d.ts";
import {
  EXPANSION_QUESTS_OBJECTIVES_ACTION_DIR,
  EXPANSION_QUESTS_OBJECTIVES_AICAMP_DIR,
  EXPANSION_QUESTS_OBJECTIVES_AIPATROL_DIR,
  EXPANSION_QUESTS_OBJECTIVES_AIVIP_DIR,
  EXPANSION_QUESTS_OBJECTIVES_COLLECTION_DIR,
  EXPANSION_QUESTS_OBJECTIVES_CRAFTING_DIR,
  EXPANSION_QUESTS_OBJECTIVES_DELIVERY_DIR,
  EXPANSION_QUESTS_OBJECTIVES_TARGET_DIR,
  EXPANSION_QUESTS_OBJECTIVES_TRAVEL_DIR,
  EXPANSION_QUESTS_OBJECTIVES_TREASUREHUNT_DIR,
} from "../paths.ts";
import {
  OBJECTIVE_CONFIG_VERSION,
  ROMASHKA_FARM,
  safetyChecks,
  SEVEROGRAD_CENTER,
} from "./common.ts";
import { AI_NPCS, ClassNameModded } from "../types/classNames.ts";
import { Faction } from "../types/quest.d.ts";
import { AISpeed, BoolNum, FALSE, ObjectiveType, TRUE, Vec3 } from "../types/common.ts";
import { LoadoutName } from "../types/npc.d.ts";

const OBJECTIVE_DEFAULTS = {
  ConfigVersion: OBJECTIVE_CONFIG_VERSION,
  Active: TRUE,
  TimeLimit: -1, // Important, causes accept>cancelled bug
};
const SHOW_DISTANCE_DEFAULT = FALSE;

function aiSpawn(
  Faction: Faction,
  Loadout: LoadoutName,
  Waypoints: Vec3[],
  NumberOfAI: number = 1,
  Name: string = Faction,
  CanBeLooted: BoolNum = TRUE,
): AISpawn {
  return {
    Name,
    Speed: AISpeed.WALK,
    Chance: 1,
    Waypoints,
    NumberOfAI,
    Faction,
    Loadout,
    Persist: FALSE,
    UnderThreatSpeed: AISpeed.SPRINT,
    CanBeLooted,
    UnlimitedReload: TRUE,
    ThreatDistanceLimit: 150.0,
    DamageMultiplier: 1.0,
    DamageReceivedMultiplier: 1.0,
    SniperProneDistanceThreshold: 300.0,
    RespawnTime: 1.0,
    DespawnTime: 1.0,
    DespawnRadius: 880.0,
  };
}

function treasure(Name: ClassNameModded): TreasureLootItem {
  return {
    Name,
    Attachments: [],
    Chance: 1,
    QuantityPercent: -1,
    Max: 1,
    Min: 1,
    Variants: [],
  };
}

// ---------------- ACT I ---------------- //

export const ACTI_TRAVEL_ROMASHKA_FARM: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 1,
  ObjectiveText: "Travel to Romashka Farm.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: ROMASHKA_FARM,
  MaxDistance: 50,
  MarkerName: "Romashka Farm",
  ShowDistance: TRUE,
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
} as const;

export const ACTI_ACTION_FARMING: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 2,
  ObjectiveText: "Tend to any garden via planting, watering, harvesting or fertilize any crops)",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionPlantSeed",
    "ActionRemovePlant",
    "ActionWaterGardenSlot",
    "ActionWaterPlant",
    "ActionDisinfectPlant",
    "ActionFertilizeSlot",
  ],
  AllowedClassNames: ["GardenPlot", "GardenPlotGreenhouse", "GardenPlotPolytunnel"],
  ExecutionAmount: 1,
} as const;

export const ACTI_COLLECT_BUILDING_MATERIALS: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 3,
  ObjectiveText: "Collect supplies for the farm's stockpile.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "Firewood", Amount: 3, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "Nail", Amount: 3, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
} as const;

export const ACTI_TRAVEL_SEVEROGRAD_RAIDERS: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 4,
  ObjectiveText: "Follow the Raider scouts towards Severograd.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: SEVEROGRAD_CENTER,
  ShowDistance: SHOW_DISTANCE_DEFAULT,
  MaxDistance: 100,
  MarkerName: "Severograd",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
} as const;

export const ACTI_AIPATROL_RAIDER_SEVEROGRAD: AIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 5,
  ObjectiveText:
    "Break the Raider scout party, there tracks lead to Severograd. (Other survivors don't concert us)",
  ObjectiveType: ObjectiveType.AIPATROL,
  MaxDistance: -1,
  MinDistance: -1,
  AISpawn: aiSpawn("Raiders", "BanditLoadout_Intel", [
    SEVEROGRAD_CENTER,
    [8033.27, 114.099, 12695.8],
    [8022.62, 114.451, 12690.9],
    [8039.49, 126.648, 12698.9],
  ], 3),
} as const;

export const ACTI_TRAVEL_RAIDER_CAMP: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 6,
  ObjectiveText:
    "Follow the scout notes to the Raiders' camp at Dwarf Castle, south of the farm on your map.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: [7430.5, 427.283, 9109.28],
  MaxDistance: 100,
  MarkerName: "Raider Forward Camp",
  ShowDistance: TRUE,
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
} as const;

export const ACTI_TREASUREHUNT_RAIDER_CACHE: TreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 7,
  ObjectiveText:
    "The Raiders seemingly abandoned the area, try find if the left anything behind that they couldn't take with them.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Positions: [
    [7381.57, 401.665, 9116.99],
    [7430.63, 412.053, 9104.52],
    [7439.57, 403.471, 9134.52],
    [7423.53, 402.58, 9141.39],
    [7415.75, 402.382, 9137.32],
    [7404, 401.964, 9132.81],
    [7395.16, 401.966, 9109.98],
    [7418.4, 406.318, 9095.67],
    [7418.09, 408.967, 9095.41],
    [7388.68, 406.194, 9110.76],
  ],
  Loot: [
    treasure("QPK_Quest_Envelope"),
    treasure("NailBox"),
    treasure("Hammer"),
    treasure("UKAssVest_Camo"),
    treasure("BoonieHat_Olive"),
    treasure("Ammo_9x19"),
    treasure("CannabisSeeds"),
    treasure("TunaCan"),
    treasure("Matchbox"),
  ],
  MaxDistance: 60,
  MarkerName: "Cache",
  ShowDistance: FALSE,
  DigInStash: FALSE,
  LootItemsAmount: 9,
  ContainerName: "ExpansionQuestSeaChest",
} as const;

export const ACTI_CRAFTING_WATCHTOWER: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 8,
  ObjectiveText: "Learn how to craft watchtower kits so Romashka can prepare for trouble.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["WatchTowerKit"],
  ExecutionAmount: 1,
} as const;

export const ACTI_DELIVERY_TOWER_KITS: DeliveryObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 9,
  ObjectiveText: "Deliver some base reinforcement kits to Daniels.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "WatchTowerKit", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  MaxDistance: 50,
  MarkerName: "Romashka Farm",
} as const;

/** @deprecated untill playtested */
export const ACTI_TARGET_RAIDER_GUARDS: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 10,
  ObjectiveText: "Kill Raiders 1KM around Bashnya (Northern NWAF).",
  ObjectiveType: ObjectiveType.TARGET,
  Position: [4041.62, 372.717, 11713.6],
  MaxDistance: 0,
  MinDistance: 1000,
  Amount: 4,
  ClassNames: AI_NPCS,
  CountSelfKill: TRUE,
  CountAIPlayers: TRUE,
  AllowedTargetFactions: ["Raiders"],
} as const;

/** @deprecated untill playtested */
export const ACTI_AIVIP_SIGNAL_OPERATOR: AIVipObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 11,
  ObjectiveText: "Track down the Raider running the radio that's calling this in.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: [4139.81, 417.742, 11759.3],
  MaxDistance: 250,
  MarkerName: "Raider Signal Post",
  CanLootAI: TRUE,
  NPCLoadoutFile: "BanditLoadout_Radio",
  NPCClassName: "eAI_SurvivorM_Rolf",
} as const;

const ACT_I_OBJECTIVES: ObjectiveBase[] = [
  ACTI_TRAVEL_ROMASHKA_FARM,
  ACTI_ACTION_FARMING,
  ACTI_COLLECT_BUILDING_MATERIALS,
  ACTI_TRAVEL_SEVEROGRAD_RAIDERS,
  ACTI_AIPATROL_RAIDER_SEVEROGRAD,
  ACTI_TRAVEL_RAIDER_CAMP,
  ACTI_TREASUREHUNT_RAIDER_CACHE,
  ACTI_CRAFTING_WATCHTOWER,
  ACTI_DELIVERY_TOWER_KITS,
  ACTI_AIVIP_SIGNAL_OPERATOR,
  ACTI_TARGET_RAIDER_GUARDS,
];

// ---------------- CONFIG GEN ---------------- //

const ALL_OBJECTIVES: ObjectiveBase[] = safetyChecks([
  ...ACT_I_OBJECTIVES,
  // ...ALL_SIDE, // keep to remind in future
], "Objectives");

const OBJECTIVE_FIXES: Record<ObjectiveType, [string, string]> = {
  [ObjectiveType.NONE]: [EXPANSION_QUESTS_OBJECTIVES_ACTION_DIR, ""],
  [ObjectiveType.TARGET]: [EXPANSION_QUESTS_OBJECTIVES_TARGET_DIR, "_TA"],
  [ObjectiveType.TRAVEL]: [EXPANSION_QUESTS_OBJECTIVES_TRAVEL_DIR, "_T"],
  [ObjectiveType.COLLECT]: [EXPANSION_QUESTS_OBJECTIVES_COLLECTION_DIR, "_C"],
  [ObjectiveType.DELIVERY]: [EXPANSION_QUESTS_OBJECTIVES_DELIVERY_DIR, "_D"],
  [ObjectiveType.TREASUREHUNT]: [EXPANSION_QUESTS_OBJECTIVES_TREASUREHUNT_DIR, "_TH"],
  [ObjectiveType.AIPATROL]: [EXPANSION_QUESTS_OBJECTIVES_AIPATROL_DIR, "_AIP"],
  [ObjectiveType.AICAMP]: [EXPANSION_QUESTS_OBJECTIVES_AICAMP_DIR, "_AIC"],
  [ObjectiveType.AIVIP]: [EXPANSION_QUESTS_OBJECTIVES_AIVIP_DIR, "_AIESCORT"],
  [ObjectiveType.ACTION]: [EXPANSION_QUESTS_OBJECTIVES_ACTION_DIR, "_A"],
  [ObjectiveType.CRAFTING]: [EXPANSION_QUESTS_OBJECTIVES_CRAFTING_DIR, "_CR"],
};

export const ALL_OBJECTIVE_CONFIGS = ALL_OBJECTIVES.reduce(
  (configs, objective) => {
    const [directory, prefix] = OBJECTIVE_FIXES[objective.ObjectiveType];
    configs[`${directory}/Objective${prefix}_${objective.ID}.json`] = objective;
    return configs;
  },
  {} as Record<string, ObjectiveBase>,
);

export function ref<T extends ObjectiveBase>(objective: T): ObjectiveRef {
  return {
    ObjectiveType: objective.ObjectiveType,
    ID: objective.ID,
    ConfigVersion: objective.ConfigVersion ?? OBJECTIVE_CONFIG_VERSION,
  };
}

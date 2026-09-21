import { FALSE, TRUE } from "../types/common.ts";
import {
  ActionObjective,
  AICampObjective,
  AIPatrolObjective,
  AIVipObjective,
  CollectionObjective,
  CraftingObjective,
  DeliveryObjective,
  ObjectiveBase,
  ObjectiveRef,
  ObjectiveType,
  TargetObjective,
  TravelObjective,
  TreasureHuntObjective,
} from "../types/objective.ts";
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
import { OBJECTIVE_CONFIG_VERSION } from "./common.ts";
import { LOCATION } from "./locations.ts";
import {
  QuestAICampObjective,
  QuestAIObjectiveSpawn,
  QuestAIPatrolObjective,
  QuestAIVipObjective,
  QuestObjective,
  QuestTargetObjective,
  QuestTreasureHuntObjective,
  QuestTreasureLoot,
} from "../types/quest.ts";
import { AI_NPCS } from "../types/classNamesMod.ts";

export function ref<T extends ObjectiveBase>(objective: T): ObjectiveRef {
  return {
    ObjectiveType: objective.ObjectiveType,
    ID: objective.ID,
    ConfigVersion: objective.ConfigVersion ?? OBJECTIVE_CONFIG_VERSION,
  };
}

export const OBJECTIVE_DEFAULTS = {
  Active: TRUE,
  TimeLimit: -1, // Important, causes accept>cancelled bug
};

// ─── Travel Objectives ───────────────────────────────────────────────────────

export const TRAVEL_ROMASHKA_FARM: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 1,
  ObjectiveText: "Travel to Romashka Farm.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.romashka,
  MaxDistance: 50,
  MarkerName: "Romashka Farm",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

/** @deprecated untill playtested */
export const TRAVEL_ROMASHKA_PERIMETER: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 2,
  ObjectiveText: "Scout the town and report if you see any raiders.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.severograd_raiders,
  MaxDistance: 5,
  MarkerName: "Romashka Farm Perimeter",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

/** @deprecated untill playtested */
export const TRAVEL_COASTAL_ROAD: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 3,
  ObjectiveText: "Follow the coastal road - don't stop, don't look back.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.coast_road,
  MaxDistance: 10,
  MarkerName: "Coastal Road",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

/** @deprecated untill playtested */
export const TRAVEL_INTEL_BUILDING: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 4,
  ObjectiveText: "Checkout the building were the entire supposedly is located.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.intel_building,
  MaxDistance: 10,
  MarkerName: "Intel Building",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

const ALL_OTRAVEL: TravelObjective[] = [
  TRAVEL_ROMASHKA_FARM,
  TRAVEL_ROMASHKA_PERIMETER,
  TRAVEL_COASTAL_ROAD,
] as const;

// ─── Target Objectives ───────────────────────────────────────────────────────

/** @deprecated untill playtested */
export const TARGET_RAIDER_SCOUTS_PERIMETER: QuestTargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 5,
  ObjectiveText: "Eliminate Raiders scouts near the farm perimeter.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.severograd_raiders,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 5,
  ClassNames: [
    "BanditAI_Keiko",
    "BanditAI_Linda",
    "BanditAI_Rolf",
    "BanditAI_Denis",
    "BanditAI_Adam",
  ],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: TRUE,
  AllowedTargetFactions: ["Raiders"],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const TARGET_CHECKPOINT_SNIPER: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 6,
  ObjectiveText: "Clear the checkpoint - no survivors.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.solnichniy_checkpoint,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: AI_NPCS,
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const TARGET_ROOFTOP_SNIPER: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 7,
  ObjectiveText: "Take out the sniper on the rooftop.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.cherno_rooftop,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: AI_NPCS,
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

const ALL_OTARGET: TargetObjective[] = [
  TARGET_RAIDER_SCOUTS_PERIMETER,
  TARGET_CHECKPOINT_SNIPER,
  TARGET_ROOFTOP_SNIPER,
] as const;

// ─── Delivery Objectives ─────────────────────────────────────────────────────

/** @deprecated untill playtested */
export const DELIVERY_NOTE_TO_SCOUT_JAMES: DeliveryObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 8,
  ObjectiveText: "Deliver the note to scout James.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "QPK_Note_1", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  MaxDistance: 150,
  MarkerName: "Scout James",
};

/** @deprecated untill playtested */
export const DELIVERY_MEDICAL_TO_ROMASHKA: DeliveryObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 9,
  ObjectiveText: "Deliver the supplies Daniels asked for.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "BandageDressing", Amount: 3, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  MaxDistance: 150,
  MarkerName: "Supply Drop",
};

/** @deprecated untill playtested */
export const DELIVERY_AMMO_CACHE: DeliveryObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 10,
  ObjectiveText: "Drop off the ammo at the rendezvous point.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    {
      ClassName: "AmmoBox_762x54Tracer_20Rnd",
      Amount: 4,
      QuantityPercent: -1,
      MinQuantityPercent: 0,
    },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  MaxDistance: 150,
  MarkerName: "Weapons Cache Drop",
};

const ALL_ODELIVERY: DeliveryObjective[] = [
  DELIVERY_MEDICAL_TO_ROMASHKA,
  DELIVERY_AMMO_CACHE,
] as const;

// ─── Collection Objectives ───────────────────────────────────────────────────

/** @deprecated untill playtested */
export const COLLECT_CLOTH_DISINFECTANT: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 11,
  ObjectiveText: "Gather cloth and disinfectant before infection finishes what the bite started.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "Rag", Amount: 5, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "DisinfectantSpray", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

export const COLLECT_BUILDING_MATERIALS: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 12,
  ObjectiveText: "Collect supplies for the farm's stockpile.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "WoodenPlank", Amount: 10, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "Nail", Amount: 3, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

/** @deprecated untill playtested */
export const COLLECT_MEDICINAL_EPINEPHRINE: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 13,
  ObjectiveText: "Gather Epinephrine for the medic's stash.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "Epinephrine", Amount: 5, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

const ALL_OCOLLECT: CollectionObjective[] = [
  COLLECT_CLOTH_DISINFECTANT,
  COLLECT_BUILDING_MATERIALS,
  COLLECT_MEDICINAL_EPINEPHRINE,
] as const;

// ─── Action Objectives ───────────────────────────────────────────────────────

/** @deprecated untill playtested */
export const ACTION_INSPECT_VEHICLE: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 14,
  ObjectiveText: "Inspect an abandoned vehicle for useful parts.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenFence", "ActionOpenDoors"],
  ExecutionAmount: 2,
  AllowedClassNames: ["CarDoor"],
};

/** @deprecated untill playtested */
export const ACTION_SEARCH_BUILDING: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 15,
  ObjectiveText: "Search the building for intel.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  ExecutionAmount: 1,
  AllowedClassNames: ["BaseBuildingBase"],
};

/** @deprecated untill playtested */
export const ACTION_FARMING: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 16,
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
};

/** @deprecated untill playtested */
export const ACTION_START_VEHICLE: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 17,
  ObjectiveText: "Start a vehicle to get moving.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionStartCarCB", "ActionStartEngineBoatCB"],
  ExecutionAmount: 1,
  AllowedClassNames: ["Car", "Boat", "Helicopter"],
};

/** @deprecated untill playtested */
export const ACTION_MINE_TREE: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 18,
  ObjectiveText: "Harvest wood by cutting down a tree.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionMineTree"],
  AllowedClassNames: ["TreeHard"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_MINE_ROCK: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 19,
  ObjectiveText: "Mine rock for stone and resources.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionMineRock"],
  AllowedClassNames: ["RockBase", "Stone"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_SKINNING: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 20,
  ObjectiveText: "Skin the carcass for meat and materials.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionSkinning"],
  AllowedClassNames: ["AnimalBase"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_EAT_DRINK: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 21,
  ObjectiveText: "Eat or drink to restore stamina.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionEat", "ActionDrink"],
  AllowedClassNames: ["Bottle_Base", "WaterBottle"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_FIRST_AID: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 22,
  ObjectiveText: "Provide first aid to a wounded ally.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionBandageBase",
    "ActionSewSelfCB",
    "ActionSewTargetCB",
    "ActionSewTargetCB",
    "ActionSplintTarget",
    "ActionDisinfectTarget",
  ],
  AllowedClassNames: ["SurvivorBase"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_INJECT_MEDS: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 23,
  ObjectiveText: "Administer medication to stabilize someone.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionInjectEpinephrineTarget",
    "ActionInjectMorphineTarget",
    "ActionInjectTarget",
  ],
  AllowedClassNames: ["SurvivorBase"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_CPR_DEFIBRILLATE: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 24,
  ObjectiveText: "Perform emergency resuscitation on a fallen ally.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionCPR",
    "ActionDefibrilateTarget",
  ],
  AllowedClassNames: ["SurvivorBase"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_GIVE_BLOOD_TEST: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 25,
  ObjectiveText: "Run a blood test on a subject.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionTestBloodTarget",
    "ActionGiveBloodTarget",
  ],
  AllowedClassNames: ["SurvivorBase"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_FEED_TABLETS: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 26,
  ObjectiveText: "Feed medication tablets to a person.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionFeedCharcoalTablets",
    "ActionFeedPainkillerTablets",
    "ActionFeedTetracyclineAntibiotics",
    "ActionFeedVitaminBottle",
  ],
  AllowedClassNames: ["SurvivorBase"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_GIVE_SALINE: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 27,
  ObjectiveText: "Administer saline to dehydrated allies.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionGiveSalineTarget",
  ],
  ExecutionAmount: 1,
  AllowedClassNames: ["SurvivorBase"],
};

/** @deprecated untill playtested */
export const ACTION_WEAPONS: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 29,
  ObjectiveText: "Handle weapons — switch fire mode, load, or clear.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["FirearmActionBase"],
  AllowedClassNames: ["Weapon"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_MAP: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 30,
  ObjectiveText: "Consult the map for navigation.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionFoldMap",
    "ActionUnfoldMapCB",
  ],
  AllowedClassNames: ["ChernarusMap"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_OPEN_CONTAINER: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 31,
  ObjectiveText: "Open a container, fence, or barrel to scavenge.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionOpen",
    "ActionOpenFence",
    "ActionOpenBarrel",
  ],
  AllowedClassNames: ["Container"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_PACK_TENT: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 33,
  ObjectiveText: "Pack up a tent for transport.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionPackTentCB",
    "ActionPackTent",
  ],
  AllowedClassNames: ["TentBase"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_FIREARM_ATTACH_MAG: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 34,
  ObjectiveText: "Attach a magazine to a firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionAttachMagazine",
    "FirearmActionAttachMagazineQuick",
  ],
  AllowedClassNames: ["Weapon"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_FIREARM_DETACH_MAG: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 35,
  ObjectiveText: "Detach a magazine from a firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionDetachMagazine",
    "FirearmActionDetachMagazine_Old",
  ],
  AllowedClassNames: ["Weapon"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_FIREARM_LOAD_BULLET: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 36,
  ObjectiveText: "Load bullets into a firearm chamber.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionLoadBullet",
    "FirearmActionLoadMultiBullet",
    "FirearmActionLoadMultiBulletQuick",
    "FirearmActionLoadMultiBulletRadial",
  ],
  AllowedClassNames: ["Weapon"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_FIREARM_MECHANIC: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 37,
  ObjectiveText: "Perform firearm manipulation or repair.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionMechanicManipulate",
  ],
  AllowedClassNames: ["Weapon"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const ACTION_FIREARM_UNJAM: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 38,
  ObjectiveText: "Unjam a malfunctioning firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionUnjam",
  ],
  AllowedClassNames: ["Weapon"],
  ExecutionAmount: 1,
};

const ALL_OACTION: ActionObjective[] = [
  ACTION_INSPECT_VEHICLE,
  ACTION_SEARCH_BUILDING,
  ACTION_FARMING,
  ACTION_START_VEHICLE,
  ACTION_MINE_TREE,
  ACTION_MINE_ROCK,
  ACTION_SKINNING,
  ACTION_EAT_DRINK,
  ACTION_FIRST_AID,
  ACTION_INJECT_MEDS,
  ACTION_CPR_DEFIBRILLATE,
  ACTION_GIVE_BLOOD_TEST,
  ACTION_FEED_TABLETS,
  ACTION_GIVE_SALINE,
  ACTION_WEAPONS,
  ACTION_MAP,
  ACTION_OPEN_CONTAINER,
  ACTION_PACK_TENT,
  ACTION_FIREARM_ATTACH_MAG,
  ACTION_FIREARM_DETACH_MAG,
  ACTION_FIREARM_LOAD_BULLET,
  ACTION_FIREARM_MECHANIC,
  ACTION_FIREARM_UNJAM,
] as const;

// ─── Crafting Objectives ─────────────────────────────────────────────────────

/** @deprecated untill playtested */
export const CRAFT_SCRAP_WEAPON: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 39,
  ObjectiveText: "Craft a basic weapon from scrap.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["MakeshiftMeleeWeapon"],
  ExecutionAmount: 1,
};

/** @deprecated untill playtested */
export const CRAFT_BEAR_TRAP: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 40,
  ObjectiveText: "Build a trap to catch raiders.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["BearTrap"],
  ExecutionAmount: 3,
};

const ALL_OCRAFT: CraftingObjective[] = [
  CRAFT_SCRAP_WEAPON,
  CRAFT_BEAR_TRAP,
] as const;

// ─── AI Camp Objectives ──────────────────────────────────────────────────────

/** @deprecated untill playtested */
export const AICAMP_TISY_TRANSMITTER: QuestAICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 41,
  ObjectiveText:
    "Reach the Tisy gate and destroy the transmitter before the final broadcast completes.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.tisy_gate,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 15,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: ["Raiders"],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AICAMP_SHEPHERD_COMMAND: QuestAICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 42,
  ObjectiveText: "Destroy the Shepherd command post and stop the manual purge.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.shepherd_command_post,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 12,
  ClassNames: ["BanditAI_Keiko", "BanditAI_Linda", "BanditAI_Rolf", "BanditAI_Denis"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: TRUE,
  AllowedTargetFactions: ["Raiders"],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AICAMP_STARY_RAD_ZONE: QuestAICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 43,
  ObjectiveText: "Enter the Stary Sobor red zone and silence the AI guarding the keycard rooms.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.stary_sobor_edge,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 12,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: ["Raiders"],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AICAMP_REAPER_CHECKPOINT: AICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 44,
  ObjectiveText: "Clear the checkpoint - no survivors.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.solnichniy_checkpoint,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AICAMP_REAPER_STRONGHOLD: AICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 45,
  ObjectiveText: "End the Reaper stronghold inside the warzone town.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.cherno_block,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 8,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AICAMP_TISY_GATE: AICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 46,
  ObjectiveText: "Clear the gate at Tisy - ten hostiles, best gear, fortified.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.tisy_gate,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

const ALL_OAICAMP: AICampObjective[] = [
  AICAMP_TISY_TRANSMITTER,
  AICAMP_SHEPHERD_COMMAND,
  AICAMP_STARY_RAD_ZONE,
  AICAMP_REAPER_CHECKPOINT,
  AICAMP_REAPER_STRONGHOLD,
  AICAMP_TISY_GATE,
] as const;

// ─── AI VIP Objectives ───────────────────────────────────────────────────────

/** @deprecated untill playtested */
export const AIVIP_CORDON_DEFECTOR: AIVipObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 47,
  ObjectiveText: "Bring in the Cordon defector alive.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: LOCATION.nwaf_outskirts,
  MaxDistance: 150,
  MarkerName: "Cordon Defector",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Rolf",
  NPCLoadoutFile: "GorkaLoadout",
};

/** @deprecated untill playtested */
export const AIVIP_EXTRACT_SCIENTIST: QuestAIVipObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 48,
  ObjectiveText: "Bring the Cordon scientist out of NWAF alive.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: LOCATION.nwaf_perimeter,
  MaxDistance: 150,
  MarkerName: "NWAF Scientist",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Oliver",
  NPCLoadoutFile: "NBCLoadout_1",
};

const ALL_OAIVIP: AIVipObjective[] = [
  AIVIP_CORDON_DEFECTOR,
  AIVIP_EXTRACT_SCIENTIST,
] as const;

// ─── AI Patrol Objectives ────────────────────────────────────────────────────

/** @deprecated untill playtested */
export const AIPATROL_RAIDER_PERIMETER: QuestAIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 49,
  ObjectiveText: "Break the Raider patrol watching the Green Mountain approach to Romashka.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.severograd_raiders,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: [
    "BanditAI_Keiko",
    "BanditAI_Denis",
    "BanditAI_Adam",
  ],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: ["Raiders"],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AIPATROL_SHEPHERD_EXECUTIONER: QuestAIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 50,
  ObjectiveText: "Silence the Shepherd executioner before he calls reinforcements.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.shepherd_command_post,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 1,
  ClassNames: ["BanditAI_Keiko", "BanditAI_Linda", "BanditAI_Rolf", "BanditAI_Denis"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: TRUE,
  AllowedTargetFactions: ["Raiders"],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AIPATROL_CHECKPOINT_CLEAR: AIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 51,
  ObjectiveText: "Break the Reaper supply patrol into the warzone.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.solnichniy_checkpoint,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 5,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AIPATROL_CORDON_LOOP: AIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 52,
  ObjectiveText: "Break the Cordon patrol loop around NWAF.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.nwaf_patrol,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 6,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

const ALL_OAIPATROL: AIPatrolObjective[] = [
  AIPATROL_RAIDER_PERIMETER,
  AIPATROL_SHEPHERD_EXECUTIONER,
  AIPATROL_CHECKPOINT_CLEAR,
  AIPATROL_CORDON_LOOP,
] as const;

// ─── Treasure Hunt Objectives ────────────────────────────────────────────────

function guaranteedTreasureLoot(Name: string): QuestTreasureLoot {
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

/** @deprecated untill playtested */
export const TREASUREHUNT_STARY_EVIDENCE: QuestTreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 53,
  ObjectiveText: "Recover the research case buried beneath the Stary Sobor red zone.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.stary_sobor_edge,
  MaxDistance: 10,
  MarkerName: "Stary Research Case",
  Loot: [guaranteedTreasureLoot("Paper"), guaranteedTreasureLoot("ItemRadio")],
  LootItemsAmount: 2,
};

/** @deprecated untill playtested */
export const TREASUREHUNT_BURIED_SUPPLIES: TreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 54,
  ObjectiveText: "Find what someone buried near the Kamenka coastline.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.kamenka_coast_stash,
  MaxDistance: 10,
  MarkerName: "Buried Supplies",
};

/** @deprecated untill playtested */
export const TREASUREHUNT_SKALISTY_CACHE: QuestTreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 55,
  ObjectiveText: "Find what the dead Cordon sentry was protecting on Skalisty Island.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.skalisty_stash,
  MaxDistance: 10,
  MarkerName: "Skalisty Cache",
  Loot: [guaranteedTreasureLoot("Paper"), guaranteedTreasureLoot("NBCGlovesGray")],
  LootItemsAmount: 2,
};

const ALL_OTREASUREHUNT: TreasureHuntObjective[] = [
  TREASUREHUNT_STARY_EVIDENCE,
  TREASUREHUNT_BURIED_SUPPLIES,
  TREASUREHUNT_SKALISTY_CACHE,
] as const;

// ─── Side Objectives ─────────────────────────────────────────────────────────

// ── Travel ──

/** @deprecated untill playtested */
export const TRAVEL_ESCAPE_ZONE: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 56,
  ObjectiveText: "Get out of the killzone before the compound locks down.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.escape_zone,
  MaxDistance: 10,
  MarkerName: "Extraction Point",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

/** @deprecated untill playtested */
export const TRAVEL_RALLY_POINT: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 57,
  ObjectiveText: "Move to the rally point — stay low, stay moving.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.rally_point,
  MaxDistance: 10,
  MarkerName: "Rally Point",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

/** @deprecated untill playtested */
export const TRAVEL_LOOKOUT: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 58,
  ObjectiveText: "Reach the high ground and get eyes on the area.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.lookout,
  MaxDistance: 10,
  MarkerName: "Overlook",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

/** @deprecated untill playtested */
export const TRAVEL_BURST_SPEED: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 59,
  ObjectiveText: "Burst speed — cover ground fast before they realize you're gone.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.burst_speed,
  MaxDistance: 10,
  MarkerName: "Burst Speed",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

/** @deprecated untill playtested */
export const TRAVEL_SAFEROUTE: TravelObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 60,
  ObjectiveText: "Take the saferoute through the treeline to avoid open ground.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.safe_route,
  MaxDistance: 10,
  MarkerName: "Safe Route",
  TriggerOnEnter: 1,
  TriggerOnExit: 0,
};

// ── Target ──

/** @deprecated untill playtested */
export const TARGET_CLEAR_BUILDING: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 61,
  ObjectiveText: "Clear the building — check every room, trust no shadows.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.clear_building,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 8,
  ClassNames: ["ZombieFast"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const TARGET_HOSPITAL_SWEEP: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 62,
  ObjectiveText: "Sweep the hospital — these things never stopped wandering the halls.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.hospital,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: [
    "ZmbF_DoctorSkinny_Base",
    "ZmbM_ParamedicNormal_Base",
  ],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const TARGET_HVIP_MARKSMAN: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 63,
  ObjectiveText: "Put down the marksman — he's calling in the horde.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.hvip_marksman,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 1,
  ClassNames: ["ZombieFast"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const TARGET_WAREHOUSE_CLEAR: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 64,
  ObjectiveText: "Clear the warehouse. Lock the doors behind you.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.warehouse,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 12,
  ClassNames: ["ZmbM_HeavyIndustryWorker_Base", "ZmbM_ConstrWorkerNormal_Base"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const TARGET_ROOFTOP_CLEAR: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 65,
  ObjectiveText: "Clear the rooftops — they'll rain down on you if you leave them.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.rooftop_clear,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 6,
  ClassNames: ["ZombieFast"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const TARGET_NIGHTHUNT: TargetObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 66,
  ObjectiveText: "Hunt them down in the dark — they move slower when the lights go out.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.nighthunt,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieSlow"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

// ── Collection ──

/** @deprecated untill playtested */
export const COLLECT_FUEL_CAN: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 67,
  ObjectiveText: "Grab fuel cans — everything needs gas now.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "CanisterGasoline", Amount: 3, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

/** @deprecated untill playtested */
export const COLLECT_AMMO_RIG: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 68,
  ObjectiveText: "Rig your ammo — sort by caliber and stack what you can use.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    {
      ClassName: "AmmoBox_762x39Tracer_20Rnd",
      Amount: 2,
      QuantityPercent: -1,
      MinQuantityPercent: 0,
    },
    { ClassName: "AmmoBox_762x39_20Rnd", Amount: 2, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

/** @deprecated untill playtested */
export const COLLECT_WEAPON_PARTS: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 69,
  ObjectiveText: "Salvage what you can from the armory — every part counts.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "Weapon", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "ItemOptics", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

/** @deprecated untill playtested */
export const COLLECT_FOOD_SURPLUS: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 70,
  ObjectiveText: "Scavenge what's left in the pantry before it spoils.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "PorkCan", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "PeachesCan", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "DogFoodCan", Amount: 2, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

/** @deprecated untill playtested */
export const COLLECT_RADIO_PARTS: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 71,
  ObjectiveText: "Pull electronics off the dead — radios, batteries",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "ItemRadio", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "Battery9V", Amount: 3, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

/** @deprecated untill playtested */
export const COLLECT_BODY_GEAR: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 72,
  ObjectiveText: "Suit up — grab body armor and helmets from the cache.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "PlateCarrierVest", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "GorkaHelmet", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

/** @deprecated untill playtested */
export const COLLECT_WATER_PURE: CollectionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 73,
  ObjectiveText: "Stock up on clean water — the old stuff is gone.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "WaterBottle", Amount: 5, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  NeedAnyCollection: FALSE,
};

// ── Delivery ──

/** @deprecated untill playtested */
export const DELIVERY_INTEL_PACKAGE: DeliveryObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 74,
  ObjectiveText: "Deliver the intel package before it burns a target on your back.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "Paper", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  MaxDistance: 150,
  MarkerName: "Drop Zone Alpha",
};

/** @deprecated untill playtested */
export const DELIVERY_BATTERY_DROP: DeliveryObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 75,
  ObjectiveText: "Drop off the battery pack — their generator's dead.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "Battery9V", Amount: 5, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  MaxDistance: 150,
  MarkerName: "Battery Drop",
};

/** @deprecated untill playtested */
export const DELIVERY_GUNSMITH_KIT: DeliveryObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 76,
  ObjectiveText: "The gunsmith wants his tools back. Bring the whole kit.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "M4_CQB_Handguard", Amount: 2, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "AK74_Buttstock_Wood", Amount: 2, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "Mosin_Bayonet", Amount: 2, QuantityPercent: -1, MinQuantityPercent: 0 },
    { ClassName: "AmmoBox", Amount: 1, QuantityPercent: -1, MinQuantityPercent: 0 },
  ],
  ShowDistance: TRUE,
  AddItemsToNearbyMarketZone: FALSE,
  MaxDistance: 150,
  MarkerName: "Gunsmith's Table",
};

// ── Crafting ──

/** @deprecated untill playtested */
export const CRAFT_TRIPWIRE_ALARM: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 79,
  ObjectiveText: "Wire a tripwire alarm — let them tell you when they come.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Tripod"],
  ExecutionAmount: 3,
};

export const CRAFT_IMPROVISED_SHIELDS: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 80,
  ObjectiveText: "Improvised shields from scrap — better than nothing.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["MakeshiftShield"],
  ExecutionAmount: 2,
};

/** @deprecated untill playtested */
export const CRAFT_MORPHINE_SYR: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 81,
  ObjectiveText: "Distill morphine from poppy — ration it carefully.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Morphine"],
  ExecutionAmount: 5,
};

/** @deprecated untill playtested */
export const CRAFT_FLARE_BATON: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 82,
  ObjectiveText: "Build flare batons for signaling — they glow through the smoke.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["FlareBaton"],
  ExecutionAmount: 4,
};

/** @deprecated untill playtested */
export const CRAFT_ROPE_BOOTS: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 83,
  ObjectiveText: "Rope and boots — climb anything if you dare.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["ClimbingRope"],
  ExecutionAmount: 2,
};

/** @deprecated untill playtested */
export const CRAFT_PIPE_BOMB: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 84,
  ObjectiveText: "Pipe bombs from scrap — ugly, loud, effective.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["PipeBomb"],
  ExecutionAmount: 3,
};

/** @deprecated untill playtested */
export const CRAFT_HUNTING_TRAP: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 85,
  ObjectiveText: "Set hunting traps — bait them and watch what walks in.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["BearTrap"],
  ExecutionAmount: 5,
};

/** @deprecated untill playtested */
export const CRAFT_DUST_MASK: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 86,
  ObjectiveText: "Sew dust masks — the air won't kill you, but choking on it will.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["DustMask"],
  ExecutionAmount: 6,
};

// ── Action ──

/** @deprecated untill playtested */
export const ACTION_OPEN_VEHICLE_HOOD: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 88,
  ObjectiveText: "Pop the hood and check under the metal.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  ExecutionAmount: 1,
  AllowedClassNames: ["CarDoor"],
};

/** @deprecated untill playtested */
export const ACTION_OPEN_BACK_DOOR: ActionObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 89,
  ObjectiveText: "Open the rear doors and search the back.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  ExecutionAmount: 1,
  AllowedClassNames: ["CarDoor"],
};

// ── Crafting (continued - more) ──

/** @deprecated untill playtested */
export const CRAFT_AMMO_PACK: CraftingObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 92,
  ObjectiveText: "Handload ammo — every round you make is one less you have to scavenge.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Bullet_762x39"],
  ExecutionAmount: 20,
};

// ── AICamp ──

/** @deprecated untill playtested */
export const AICAMP_ROADBLOCK: AICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 93,
  ObjectiveText: "Smash the roadblock. Ten hostiles, no backup, easy target.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.roadblock,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieFast"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AICAMP_OUTPOST_RAID: AICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 94,
  ObjectiveText: "Raid the outpost before they reinforce. Hit fast, leave fast.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.outpost,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 12,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AICAMP_Bunker_SWEEP: AICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 95,
  ObjectiveText: "Sweep the bunker — sealed, dark, and full of company.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.bunker,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 15,
  ClassNames: ["ZombieSlow", "ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AICAMP_FACTORY_CLEAR: AICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 96,
  ObjectiveText: "Clear the factory floor. These things were workers once.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.factory,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 20,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AICAMP_TANK_GRAVEYARD: AICampObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 97,
  ObjectiveText: "The tank graveyard — the dead don't stay buried in metal.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.tank_graveyard,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieFast"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

// ── AIVIP ──

/** @deprecated untill playtested */
export const AIVIP_INFORMANT: AIVipObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 98,
  ObjectiveText: "Extract the informant — he knows where the supply drop landed.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: LOCATION.informant,
  MaxDistance: 150,
  MarkerName: "Informant",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Peter",
  NPCLoadoutFile: "Quest_Survivor_noWeapon",
};

/** @deprecated untill playtested */
export const AIVIP_WOUNDED_DOC: AIVipObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 99,
  ObjectiveText: "Get the wounded doc to safety — he's the only one who knows triage.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: LOCATION.wounded_doctor,
  MaxDistance: 150,
  MarkerName: "Wounded Doctor",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Cyril",
  NPCLoadoutFile: "SanitarLoadout",
};

/** @deprecated untill playtested */
export const AIVIP_SCIENTIST_EXFIL: AIVipObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 100,
  ObjectiveText: "Pull the scientist out. Whatever she was studying, it's not staying.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: LOCATION.scientist_exfil,
  MaxDistance: 150,
  MarkerName: "Evac Scientist",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorF_Naomi",
  NPCLoadoutFile: "NBCLoadout",
};

/** @deprecated untill playtested */
export const AIVIP_SHEPHERD_CAPTIVE: QuestAIVipObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 101,
  ObjectiveText: "Extract the Shepherd captive alive.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: LOCATION.shepherd_captive,
  MaxDistance: 150,
  MarkerName: "Shepherd Captive",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Denis",
  NPCLoadoutFile: "TanLoadout",
};

// ── AIPatrol ──

/** @deprecated untill playtested */
export const AIPATROL_ROAMING_GROUP: AIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 102,
  ObjectiveText: "Break up the roaming group — they're moving toward civilization.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.roaming_group,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 4,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AIPATROL_HUNTER_PATROL: AIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 103,
  ObjectiveText: "Take out the hunter patrol — they track everything.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.hunter_patrol,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: ["ZombieFast"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AIPATROL_CONVOY_ESCORT: AIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 104,
  ObjectiveText: "Interrupt the convoy escort — the supply truck is the real target.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.nwaf_patrol,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 8,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: ["Raiders"],
  AllowedDamageZones: [],
};

/** @deprecated untill playtested */
export const AIPATROL_NIGHT_STALKERS: AIPatrolObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 105,
  ObjectiveText: "Three night stalkers — move between shadows, strike between heartbeats.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.night_stalkers,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: ["ZombieSlow"],
  CountSelfKill: FALSE,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: FALSE,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

// ── Treasure Hunt ──

/** @deprecated untill playtested */
export const TREASUREHUNT_DROWNED_CRATE: TreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 106,
  ObjectiveText: "Someone drowned a crate in the river — dig it up before the current takes it.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.drowned_crate,
  MaxDistance: 10,
  MarkerName: "Drowned Crate",
};

/** @deprecated untill playtested */
export const TREASUREHUNT_ABANDONED_POSTBOX: TreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 107,
  ObjectiveText: "The old postbox has a false bottom — someone hid something in a hurry.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.abandoned_postbox,
  MaxDistance: 10,
  MarkerName: "Old Postbox",
};

/** @deprecated untill playtested */
export const TREASUREHUNT_BUSH_UNDER_THE_OAK: TreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 108,
  ObjectiveText: "Dig beneath the dead oak — the soil smells different here.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.oak_cache,
  MaxDistance: 10,
  MarkerName: "Under the Oak",
};

/** @deprecated untill playtested */
export const TREASUREHUNT_ROOFTOP_VENT: QuestTreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 109,
  ObjectiveText: "There's a cache behind the ventilation shaft — climb and look.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.rooftop_vent,
  MaxDistance: 10,
  MarkerName: "Rooftop Vent",
  Loot: [guaranteedTreasureLoot("Paper"), guaranteedTreasureLoot("GunPartWeaponParts")],
  LootItemsAmount: 2,
};

/** @deprecated untill playtested */
export const TREASUREHUNT_UNDER_BRIDGE: QuestTreasureHuntObjective = {
  ...OBJECTIVE_DEFAULTS,
  ID: 110,
  ObjectiveText: "Under the bridge, in the muck — what was tossed away.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.under_bridge,
  MaxDistance: 10,
  MarkerName: "Under Bridge",
  Loot: [guaranteedTreasureLoot("Paper"), guaranteedTreasureLoot("ItemRadio")],
  LootItemsAmount: 2,
};

const ALL_SIDE = [
  // Travel
  TRAVEL_ESCAPE_ZONE,
  TRAVEL_RALLY_POINT,
  TRAVEL_LOOKOUT,
  TRAVEL_BURST_SPEED,
  TRAVEL_SAFEROUTE,
  // Target
  TARGET_CLEAR_BUILDING,
  TARGET_HOSPITAL_SWEEP,
  TARGET_HVIP_MARKSMAN,
  TARGET_WAREHOUSE_CLEAR,
  TARGET_ROOFTOP_CLEAR,
  TARGET_NIGHTHUNT,
  // Collection
  COLLECT_FUEL_CAN,
  COLLECT_AMMO_RIG,
  COLLECT_WEAPON_PARTS,
  COLLECT_FOOD_SURPLUS,
  COLLECT_RADIO_PARTS,
  COLLECT_BODY_GEAR,
  COLLECT_WATER_PURE,
  // Delivery
  DELIVERY_INTEL_PACKAGE,
  DELIVERY_BATTERY_DROP,
  DELIVERY_GUNSMITH_KIT,
  // Crafting
  CRAFT_TRIPWIRE_ALARM,
  CRAFT_IMPROVISED_SHIELDS,
  CRAFT_MORPHINE_SYR,
  CRAFT_FLARE_BATON,
  CRAFT_ROPE_BOOTS,
  CRAFT_PIPE_BOMB,
  CRAFT_HUNTING_TRAP,
  CRAFT_DUST_MASK,
  CRAFT_AMMO_PACK,
  // Action
  ACTION_OPEN_VEHICLE_HOOD,
  ACTION_OPEN_BACK_DOOR,
  // AICamp
  AICAMP_ROADBLOCK,
  AICAMP_OUTPOST_RAID,
  AICAMP_Bunker_SWEEP,
  AICAMP_FACTORY_CLEAR,
  AICAMP_TANK_GRAVEYARD,
  // AIVIP
  AIVIP_INFORMANT,
  AIVIP_WOUNDED_DOC,
  AIVIP_SCIENTIST_EXFIL,
  AIVIP_SHEPHERD_CAPTIVE,
  // AIPatrol
  AIPATROL_ROAMING_GROUP,
  AIPATROL_HUNTER_PATROL,
  AIPATROL_CONVOY_ESCORT,
  AIPATROL_NIGHT_STALKERS,
  // Treasure Hunt
  TREASUREHUNT_DROWNED_CRATE,
  TREASUREHUNT_ABANDONED_POSTBOX,
  TREASUREHUNT_BUSH_UNDER_THE_OAK,
  TREASUREHUNT_ROOFTOP_VENT,
  TREASUREHUNT_UNDER_BRIDGE,
] as const;

const ALL_OBJECTIVES: QuestObjective[] = [
  ...ALL_OACTION,
  ...ALL_OAICAMP,
  ...ALL_OAIPATROL,
  ...ALL_OAIVIP,
  ...ALL_OCOLLECT,
  ...ALL_OCRAFT,
  ...ALL_ODELIVERY,
  ...ALL_OTARGET,
  ...ALL_OTRAVEL,
  ...ALL_OTREASUREHUNT,
  ...ALL_SIDE,
];

function createQuestAISpawn(
  objective: QuestAIPatrolObjective | QuestAICampObjective,
  numberOfAI: number,
): QuestAIObjectiveSpawn {
  return {
    NumberOfAI: numberOfAI,
    NPCName: "Quest Target",
    Waypoints: [objective.Position],
    Behaviour: "HALT",
    Formation: "RANDOM",
    Loadout: "BanditLoadout",
    Faction: "West",
    Speed: "JOG",
    ThreatSpeed: "SPRINT",
    MinAccuracy: 0,
    MaxAccuracy: 0,
    CanBeLooted: 1,
    UnlimitedReload: 1,
    ThreatDistanceLimit: 150,
    DamageMultiplier: 1,
    DamageReceivedMultiplier: 1,
    ClassNames: AI_NPCS,
    SniperProneDistanceThreshold: 300,
    RespawnTime: 1,
    DespawnTime: 1,
    MinDistanceRadius: 50,
    MaxDistanceRadius: 150,
    DespawnRadius: 880,
  };
}

function toExpansionObjectiveConfig(objective: QuestObjective): Record<string, unknown> {
  const base = {
    ConfigVersion: OBJECTIVE_CONFIG_VERSION,
    ...OBJECTIVE_DEFAULTS,
    ID: objective.ID,
    ObjectiveType: objective.ObjectiveType,
    ObjectiveText: objective.ObjectiveText,
    Active: 1 as const,
  };

  switch (objective.ObjectiveType) {
    case ObjectiveType.AIPATROL: {
      const patrol = objective as QuestAIPatrolObjective;
      return {
        ...base,
        AISpawn: patrol.AISpawn ?? createQuestAISpawn(patrol, patrol.Amount),
        MaxDistance: patrol.MaxDistance,
        MinDistance: patrol.MinDistance,
        AllowedWeapons: patrol.AllowedWeapons,
        AllowedDamageZones: patrol.AllowedDamageZones,
      };
    }
    case ObjectiveType.AICAMP: {
      const camp = objective as QuestAICampObjective;
      return {
        ...base,
        InfectedDeletionRadius: camp.InfectedDeletionRadius ?? 0,
        AISpawns: camp.AISpawns ??
          Array.from(
            { length: Math.max(1, camp.Amount) },
            () => createQuestAISpawn(camp, 1),
          ),
        MaxDistance: camp.MaxDistance,
        MinDistance: camp.MinDistance,
        AllowedWeapons: camp.AllowedWeapons,
        AllowedDamageZones: camp.AllowedDamageZones,
      };
    }
    case ObjectiveType.AIVIP: {
      const vip = objective as QuestAIVipObjective;
      return {
        ...base,
        Position: vip.Position,
        MaxDistance: vip.MaxDistance,
        MarkerName: vip.MarkerName,
        ShowDistance: vip.ShowDistance ?? 1,
        CanLootAI: vip.CanLootAI ?? 0,
        NPCLoadoutFile: vip.NPCLoadoutFile ?? "Quest_Survivor_noWeapon",
        NPCClassName: vip.NPCClassName ?? "",
        NPCName: vip.NPCName ?? "Quest VIP",
      };
    }
    case ObjectiveType.TREASUREHUNT: {
      const treasure = objective as QuestTreasureHuntObjective;
      return {
        ...base,
        ShowDistance: treasure.ShowDistance ?? 1,
        ContainerName: treasure.ContainerName ?? "ExpansionQuestSeaChest",
        DigInStash: treasure.DigInStash ?? 1,
        MarkerName: treasure.MarkerName,
        MarkerVisibility: treasure.MarkerVisibility ?? 6,
        Positions: treasure.Positions ?? [treasure.Position],
        Loot: treasure.Loot ?? [],
        LootItemsAmount: treasure.LootItemsAmount ?? 0,
        MaxDistance: treasure.MaxDistance,
      };
    }
    default:
      return {
        ...base,
        ...objective,
      };
  }
}

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
    configs[`${directory}/Objective${prefix}_${objective.ID}.json`] = toExpansionObjectiveConfig(
      objective,
    );
    return configs;
  },
  {} as Record<string, Record<string, unknown>>,
);

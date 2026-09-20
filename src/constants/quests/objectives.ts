// NPC IDs: 1 = Daniels (mission giver), 2-3 = guards, 4 = Sery (fence), 5+ = world NPCs
// Sery's filename kept as "DZSurvival_NPC_Fence.json" - internal artifact
// name; changing it would leave stale files on deployed servers.
//
// ALL_NPCS aggregates every NPC the quest system places, regardless of
// whether they give quests or are just ambient world characters. The
// ensureQuests() function iterates ALL_NPCS to write NPC files.

import { FALSE, Vec3 } from "../types/common.ts";
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
import type {
  QuestAICampObjective,
  QuestAIObjectiveSpawn,
  QuestAIPatrolObjective,
  QuestAIVipObjective,
  QuestObjective,
  QuestTargetObjective,
  QuestTreasureHuntObjective,
  QuestTreasureLoot,
} from "./objectiveAuthoring.ts";
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
import { OBJECTIVE_CONFIG_VERSION, PLACEHOLDER_POSITION } from "./common.ts";
import { LOCATION } from "./locations.ts";

export function ref<T extends ObjectiveBase>(objective: T): ObjectiveRef {
  return {
    ObjectiveType: objective.ObjectiveType,
    ID: objective.ID,
    ConfigVersion: objective.ConfigVersion ?? OBJECTIVE_CONFIG_VERSION,
  };
}

// ─── Travel Objectives ───────────────────────────────────────────────────────

export const TRAVEL_ROMASHKA_FARM: TravelObjective = {
  ID: 10000,
  ObjectiveText: "Travel to Romashka Farm.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: [7986, 221, 11308] as Vec3,
  MaxDistance: 5,
  MarkerName: "Romashka Farm",
};

export const TRAVEL_ROMASHKA_PERIMETER: TravelObjective = {
  ID: 10001,
  ObjectiveText: "Scout the perimeter - watch for movement near the treeline.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.farm_perimeter,
  MaxDistance: 5,
  MarkerName: "Romashka Farm Perimeter",
};

export const TRAVEL_COASTAL_ROAD: TravelObjective = {
  ID: 10002,
  ObjectiveText: "Follow the coastal road - don't stop, don't look back.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: LOCATION.coast_road,
  MaxDistance: 10,
  MarkerName: "Coastal Road",
};

export const TRAVEL_INTEL_BUILDING: TravelObjective = {
  ID: 10003,
  ObjectiveText: "Checkout the building were the entire supposedly is located.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Intel Building",
};

const ALL_OTRAVEL: TravelObjective[] = [
  TRAVEL_ROMASHKA_FARM,
  TRAVEL_ROMASHKA_PERIMETER,
  TRAVEL_COASTAL_ROAD,
] as const;

// ─── Target Objectives ───────────────────────────────────────────────────────

export const TARGET_RAIDER_SCOUTS_PERIMETER: QuestTargetObjective = {
  ID: 10010,
  ObjectiveText: "Eliminate Raiders scouts near the farm perimeter.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: LOCATION.farm_perimeter,
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
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: true,
  AllowedTargetFactions: ["Bandits"],
  AllowedDamageZones: [],
};

export const TARGET_CHECKPOINT_SNIPER: TargetObjective = {
  ID: 10011,
  ObjectiveText: "Clear the checkpoint - no survivors.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const TARGET_ROOFTOP_SNIPER: TargetObjective = {
  ID: 10012,
  ObjectiveText: "Take out the sniper on the rooftop.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: ["ZombieFast"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

const ALL_OTARGET: TargetObjective[] = [
  TARGET_RAIDER_SCOUTS_PERIMETER,
  TARGET_CHECKPOINT_SNIPER,
  TARGET_ROOFTOP_SNIPER,
] as const;

// ─── Delivery Objectives ─────────────────────────────────────────────────────

export const DELIVERY_NOTE_TO_SCOUT_JAMES: DeliveryObjective = {
  ID: 10021,
  ObjectiveText: "Deliver the note to scout James.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "QPK_Note_1", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  MaxDistance: 150,
  MarkerName: "Scout James",
};

export const DELIVERY_MEDICAL_TO_ROMASHKA: DeliveryObjective = {
  ID: 10022,
  ObjectiveText: "Deliver the supplies Daniels asked for.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "Bandage", Amount: 3, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  MaxDistance: 150,
  MarkerName: "Supply Drop",
};

export const DELIVERY_AMMO_CACHE: DeliveryObjective = {
  ID: 10023,
  ObjectiveText: "Drop off the weapons cache at the rendezvous point.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "AmmoAssault", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  MaxDistance: 150,
  MarkerName: "Weapons Cache Drop",
};

const ALL_ODELIVERY: DeliveryObjective[] = [
  DELIVERY_MEDICAL_TO_ROMASHKA,
  DELIVERY_AMMO_CACHE,
] as const;

// ─── Collection Objectives ───────────────────────────────────────────────────

export const COLLECT_CLOTH_DISINFECTANT: CollectionObjective = {
  ID: 10030,
  ObjectiveText: "Gather cloth and disinfectant before infection finishes what the bite started.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "Cloth", Amount: 5, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "Disinfectant", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

export const COLLECT_BUILDING_MATERIALS: CollectionObjective = {
  ID: 10031,
  ObjectiveText: "Collect supplies for the farm's stockpile.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "Plank", Amount: 10, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "Nails", Amount: 3, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

export const COLLECT_MEDICINAL_HERBS: CollectionObjective = {
  ID: 10032,
  ObjectiveText: "Gather herbs for the medic's stash.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "Herb", Amount: 5, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

const ALL_OCOLLECT: CollectionObjective[] = [
  COLLECT_CLOTH_DISINFECTANT,
  COLLECT_BUILDING_MATERIALS,
  COLLECT_MEDICINAL_HERBS,
] as const;

// ─── Action Objectives ───────────────────────────────────────────────────────

export const ACTION_INSPECT_VEHICLE: ActionObjective = {
  ID: 10040,
  ObjectiveText: "Inspect an abandoned vehicle for useful parts.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenDoor"],
  AllowedClassNames: ["CarDoor"],
};

export const ACTION_SEARCH_BUILDING: ActionObjective = {
  ID: 10041,
  ObjectiveText: "Search the building for intel.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenDoor"],
  AllowedClassNames: ["Fence"],
};

export const ACTION_FARMING: ActionObjective = {
  ID: 10070,
  ObjectiveText: "Tend to the garden — plant, water, and care for crops.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionPlantSeed",
    "ActionRemovePlant",
    "ActionWaterGardenSlot",
    "ActionWaterPlant",
    "ActionDisinfectPlant",
    "ActionFertilizeSlot",
  ],
  AllowedClassNames: ["GardenSlot", "GardenBed", "GroundSoilFarmed"],
};

export const ACTION_START_VEHICLE: ActionObjective = {
  ID: 10071,
  ObjectiveText: "Start a vehicle to get moving.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionStartEngine"],
  AllowedClassNames: ["Car", "Truck", "CarWagon", "Van", "UAZ"],
};

export const ACTION_MINE_TREE: ActionObjective = {
  ID: 10072,
  ObjectiveText: "Harvest wood by mining a tree.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionMineTree"],
  AllowedClassNames: ["Tree"],
};

export const ACTION_MINE_ROCK: ActionObjective = {
  ID: 10073,
  ObjectiveText: "Mine rock for stone and resources.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionMineRock"],
  AllowedClassNames: ["Rock", "Stone"],
};

export const ACTION_SKINNING: ActionObjective = {
  ID: 10074,
  ObjectiveText: "Skin the carcass for meat and materials.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionSkinning"],
};

export const ACTION_EAT_DRINK: ActionObjective = {
  ID: 10075,
  ObjectiveText: "Eat or drink to restore stamina.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionEat", "ActionDrink"],
};

export const ACTION_FIRST_AID: ActionObjective = {
  ID: 10076,
  ObjectiveText: "Provide first aid to a wounded ally.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionBandageTarget",
    "ActionSewTarget",
    "ActionSplintTarget",
    "ActionDisinfectTarget",
  ],
};

export const ACTION_INJECT_MEDS: ActionObjective = {
  ID: 10077,
  ObjectiveText: "Administer medication to stabilize someone.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionInjectEpinephrineTarget",
    "ActionInjectMorphineTarget",
    "ActionInjectTarget",
  ],
};

export const ACTION_CPR_DEFIBRILLATE: ActionObjective = {
  ID: 10078,
  ObjectiveText: "Perform emergency resuscitation on a fallen ally.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionCPR",
    "ActionDefibrilateTarget",
  ],
};

export const ACTION_GIVE_BLOOD_TEST: ActionObjective = {
  ID: 10079,
  ObjectiveText: "Run a blood test on a subject.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionTestBloodTarget",
    "ActionGiveBloodTarget",
  ],
};

export const ACTION_FEED_TABLETS: ActionObjective = {
  ID: 10080,
  ObjectiveText: "Feed medication tablets to a person.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionFeedCharcoalTablets",
    "ActionFeedPainkillerTablets",
    "ActionFeedTetracyclineAntibiotics",
    "ActionFeedVitaminBottle",
  ],
};

export const ACTION_GIVE_SALINE: ActionObjective = {
  ID: 10081,
  ObjectiveText: "Administer saline to dehydrated allies.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionGiveSalineTarget",
  ],
};

export const ACTION_TURN_ON_OFF_LIGHT: ActionObjective = {
  ID: 10083,
  ObjectiveText: "Toggle lights on a device or structure.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionTurnOnLight",
    "ActionTurnOffLight",
  ],
};

export const ACTION_WEAPONS: ActionObjective = {
  ID: 10084,
  ObjectiveText: "Handle weapons — switch fire mode, load, or clear.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionSwitchFiremode",
    "ActionCockWeapon",
    "ActionLoadMagazine",
    "ActionLoadMagazineQuick",
    "ActionEmptyMagazine",
    "ActionSortAmmoPile",
  ],
};

export const ACTION_MAP: ActionObjective = {
  ID: 10085,
  ObjectiveText: "Consult the map for navigation.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionFoldMap",
    "ActionUnfoldMap",
  ],
};

export const ACTION_OPEN_CONTAINER: ActionObjective = {
  ID: 10086,
  ObjectiveText: "Open a container, fence, or barrel to scavenge.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionOpen",
    "ActionOpenFence",
    "ActionOpenBarrel",
  ],
};

export const ACTION_TAKE_ITEM: ActionObjective = {
  ID: 10087,
  ObjectiveText: "Take an item from its location.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionTakeItem",
  ],
};

export const ACTION_PACK_TENT: ActionObjective = {
  ID: 10088,
  ObjectiveText: "Pack up a tent for transport.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionPackTent",
  ],
};

export const ACTION_FIREARM_ATTACH_MAG: ActionObjective = {
  ID: 10089,
  ObjectiveText: "Attach a magazine to a firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionAttachMagazine",
    "FirearmActionAttachMagazineQuick",
  ],
};

export const ACTION_FIREARM_DETACH_MAG: ActionObjective = {
  ID: 10090,
  ObjectiveText: "Detach a magazine from a firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionDetachMagazine",
    "FirearmActionDetachMagazine_Old",
  ],
};

export const ACTION_FIREARM_LOAD_BULLET: ActionObjective = {
  ID: 10091,
  ObjectiveText: "Load bullets into a firearm chamber.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionLoadBullet",
    "FirearmActionLoadBulletQuick",
    "FirearmActionLoadMultiBullet",
    "FirearmActionLoadMultiBulletQuick",
    "FirearmActionLoadMultiBulletRadial",
  ],
};

export const ACTION_FIREARM_MECHANIC: ActionObjective = {
  ID: 10092,
  ObjectiveText: "Perform firearm manipulation or repair.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionMechanicManipulate",
  ],
};

export const ACTION_FIREARM_UNJAM: ActionObjective = {
  ID: 10093,
  ObjectiveText: "Unjam a malfunctioning firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionUnjam",
  ],
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
  ACTION_TURN_ON_OFF_LIGHT,
  ACTION_WEAPONS,
  ACTION_MAP,
  ACTION_OPEN_CONTAINER,
  ACTION_TAKE_ITEM,
  ACTION_PACK_TENT,
  ACTION_FIREARM_ATTACH_MAG,
  ACTION_FIREARM_DETACH_MAG,
  ACTION_FIREARM_LOAD_BULLET,
  ACTION_FIREARM_MECHANIC,
  ACTION_FIREARM_UNJAM,
] as const;

// ─── Crafting Objectives ─────────────────────────────────────────────────────

export const CRAFT_SCRAP_WEAPON: CraftingObjective = {
  ID: 10050,
  ObjectiveText: "Craft a basic weapon from scrap.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["MakeshiftMeleeWeapon"],
  ExecutionAmount: 1,
};

export const CRAFT_BEAR_TRAP: CraftingObjective = {
  ID: 10051,
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

export const AICAMP_TISY_TRANSMITTER: QuestAICampObjective = {
  ID: 10102,
  ObjectiveText:
    "Reach the Tisy gate and destroy the transmitter before the final broadcast completes.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.tisy_gate,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 15,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: ["Bandits"],
  AllowedDamageZones: [],
};

export const AICAMP_SHEPHERD_COMMAND: QuestAICampObjective = {
  ID: 10105,
  ObjectiveText: "Destroy the Shepherd command post and stop the manual purge.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.shepherd_command_post,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 12,
  ClassNames: ["BanditAI_Keiko", "BanditAI_Linda", "BanditAI_Rolf", "BanditAI_Denis"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: true,
  AllowedTargetFactions: ["Bandits"],
  AllowedDamageZones: [],
};

export const AICAMP_STARY_RAD_ZONE: QuestAICampObjective = {
  ID: 10100,
  ObjectiveText: "Enter the Stary Sobor red zone and silence the AI guarding the keycard rooms.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: LOCATION.stary_sobor_edge,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 12,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: ["Bandits"],
  AllowedDamageZones: [],
};

export const AICAMP_REAPER_CHECKPOINT: AICampObjective = {
  ID: 10061,
  ObjectiveText: "Clear the checkpoint - no survivors.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AICAMP_REAPER_STRONGHOLD: AICampObjective = {
  ID: 10012,
  ObjectiveText: "End the Reaper stronghold inside the warzone town.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 8,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AICAMP_TISY_GATE: AICampObjective = {
  ID: 10062,
  ObjectiveText: "Clear the gate at Tisy - ten hostiles, best gear, fortified.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
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

export const AIVIP_CORDON_DEFECTOR: AIVipObjective = {
  ID: 10012,
  ObjectiveText: "Bring in the Cordon defector alive.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Cordon Defector",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Rolf",
  NPCLoadoutFile: "GorkaLoadout",
};

export const AIVIP_EXTRACT_SCIENTIST: QuestAIVipObjective = {
  ID: 10013,
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

export const AIPATROL_RAIDER_PERIMETER: QuestAIPatrolObjective = {
  ID: 10060,
  ObjectiveText: "Break the Raider patrol watching the Green Mountain approach to Romashka.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.farm_perimeter,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: ["Bandits"],
  AllowedDamageZones: [],
};

export const AIPATROL_SHEPHERD_EXECUTIONER: QuestAIPatrolObjective = {
  ID: 10104,
  ObjectiveText: "Silence the Shepherd executioner before he calls reinforcements.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.shepherd_command_post,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 1,
  ClassNames: ["BanditAI_Keiko", "BanditAI_Linda", "BanditAI_Rolf", "BanditAI_Denis"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: true,
  AllowedTargetFactions: ["Bandits"],
  AllowedDamageZones: [],
};

export const AIPATROL_CHECKPOINT_CLEAR: AIPatrolObjective = {
  ID: 10061,
  ObjectiveText: "Break the Reaper supply patrol into the warzone.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 5,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AIPATROL_CORDON_LOOP: AIPatrolObjective = {
  ID: 10062,
  ObjectiveText: "Break the Cordon patrol loop around NWAF.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 6,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
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

export const TREASUREHUNT_STARY_EVIDENCE: QuestTreasureHuntObjective = {
  ID: 10101,
  ObjectiveText: "Recover the research case buried beneath the Stary Sobor red zone.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: LOCATION.stary_sobor_edge,
  MaxDistance: 10,
  MarkerName: "Stary Research Case",
  Loot: [guaranteedTreasureLoot("Paper"), guaranteedTreasureLoot("ItemRadio")],
  LootItemsAmount: 2,
};

export const TREASUREHUNT_BURIED_SUPPLIES: TreasureHuntObjective = {
  ID: 10041,
  ObjectiveText: "Find what someone buried near the Kamenka coastline.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Buried Supplies",
};

export const TREASUREHUNT_SKALISTY_CACHE: QuestTreasureHuntObjective = {
  ID: 10042,
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

export const TRAVEL_ESCAPE_ZONE: TravelObjective = {
  ID: 20031,
  ObjectiveText: "Get out of the killzone before the compound locks down.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Extraction Point",
};

export const TRAVEL_RALLY_POINT: TravelObjective = {
  ID: 20032,
  ObjectiveText: "Move to the rally point — stay low, stay moving.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Rally Point",
};

export const TRAVEL_LOOKOUT: TravelObjective = {
  ID: 20033,
  ObjectiveText: "Reach the high ground and get eyes on the area.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Overlook",
};

export const TRAVEL_BURST_SPEED: TravelObjective = {
  ID: 20034,
  ObjectiveText: "Burst speed — cover ground fast before they realize you're gone.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Burst Speed",
};

export const TRAVEL_SAFEROUTE: TravelObjective = {
  ID: 20035,
  ObjectiveText: "Take the saferoute through the treeline to avoid open ground.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Safe Route",
};

// ── Target ──

export const TARGET_CLEAR_BUILDING: TargetObjective = {
  ID: 20021,
  ObjectiveText: "Clear the building — check every room, trust no shadows.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 8,
  ClassNames: ["ZombieFast"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const TARGET_HOSPITAL_SWEEP: TargetObjective = {
  ID: 20022,
  ObjectiveText: "Sweep the hospital — these things never stopped wandering the halls.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 15,
  ClassNames: [
    "ZmbM_DoctorFat_Base",
    "ZmbF_DoctorSkinny_Base",
    "ZmbF_NurseFat_Base",
    "ZmbM_ParamedicNormal_Base",
  ],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const TARGET_HVIP_MARKSMAN: TargetObjective = {
  ID: 20023,
  ObjectiveText: "Put down the marksman — he's calling in the horde.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 1,
  ClassNames: ["ZombieFast"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const TARGET_WAREHOUSE_CLEAR: TargetObjective = {
  ID: 20024,
  ObjectiveText: "Clear the warehouse. Lock the doors behind you.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 12,
  ClassNames: ["ZmbM_HeavyIndustryWorker_Base", "ZmbM_ConstrWorkerNormal_Base"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const TARGET_ROOFTOP_CLEAR: TargetObjective = {
  ID: 20025,
  ObjectiveText: "Clear the rooftops — they'll rain down on you if you leave them.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 6,
  ClassNames: ["ZmbM_Runner_Base", "ZmbF_Runner_Base"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const TARGET_NIGHTHUNT: TargetObjective = {
  ID: 20026,
  ObjectiveText: "Hunt them down in the dark — they move slower when the lights go out.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieSlow"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

// ── Collection ──

export const COLLECT_FUEL_CAN: CollectionObjective = {
  ID: 20001,
  ObjectiveText: "Grab fuel cans — everything needs gas now.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "Jerrycan", Amount: 3, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

export const COLLECT_AMMO_RIG: CollectionObjective = {
  ID: 20002,
  ObjectiveText: "Rig your ammo — sort by caliber and stack what you can use.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "AmmoBox_762x39_SPG2", Amount: 2, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "AmmoBox_762x39_BS", Amount: 2, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

export const COLLECT_WEAPON_PARTS: CollectionObjective = {
  ID: 20003,
  ObjectiveText: "Salvage what you can from the armory — every part counts.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "GunPartOpticHolo", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "GunPartOpticRedDot", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
    {
      ClassName: "GunPartAccessoryFlashlight",
      Amount: 2,
      QuantityPercent: 1,
      MinQuantityPercent: 0,
    },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

export const COLLECT_FOOD_SURPLUS: CollectionObjective = {
  ID: 20004,
  ObjectiveText: "Scavenge what's left in the pantry before it spoils.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "CannedPosch", Amount: 3, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "CannedPork", Amount: 3, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "CannedDogFood", Amount: 2, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

export const COLLECT_RADIO_PARTS: CollectionObjective = {
  ID: 20005,
  ObjectiveText: "Pull electronics off the dead — radios, batteries, wire.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "ItemRadio", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "ItemBattery9V", Amount: 3, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "Wire", Amount: 5, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

export const COLLECT_BODY_GEAR: CollectionObjective = {
  ID: 20006,
  ObjectiveText: "Suit up — grab body armor, helmets, and boots from the cache.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "PlateCarrierVest", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "helmetskull", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "BootsGrounded", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

export const COLLECT_WATER_PURE: CollectionObjective = {
  ID: 20007,
  ObjectiveText: "Stock up on clean water — the old stuff is gone.",
  ObjectiveType: ObjectiveType.COLLECT,
  Collections: [
    { ClassName: "WaterBottle", Amount: 5, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  NeedAnyCollection: false,
};

// ── Delivery ──

export const DELIVERY_INTEL_PACKAGE: DeliveryObjective = {
  ID: 20011,
  ObjectiveText: "Deliver the intel package before it burns a target on your back.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "Paper", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  MaxDistance: 150,
  MarkerName: "Drop Zone Alpha",
};

export const DELIVERY_BATTERY_DROP: DeliveryObjective = {
  ID: 20012,
  ObjectiveText: "Drop off the battery pack — their generator's dead.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "ItemBattery9V", Amount: 5, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  MaxDistance: 150,
  MarkerName: "Battery Drop",
};

export const DELIVERY_GUNSMITH_KIT: DeliveryObjective = {
  ID: 20013,
  ObjectiveText: "The gunsmith wants his tools back. Bring the whole kit.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "GunPartWeaponParts", Amount: 2, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "OilFilter", Amount: 1, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  MaxDistance: 150,
  MarkerName: "Gunsmith's Table",
};

export const DELIVERY_COLD_WEATHER_GEAR: DeliveryObjective = {
  ID: 20014,
  ObjectiveText: "Send the cold gear pack before the temperature drops again.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "WinterCoat_Black", Amount: 2, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "WinterGloves", Amount: 2, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  MaxDistance: 150,
  MarkerName: "Cold Pack Drop",
};

export const DELIVERY_RATIONS_CACHE: DeliveryObjective = {
  ID: 20015,
  ObjectiveText: "Stash the rations where the patrol can find them on rotation.",
  ObjectiveType: ObjectiveType.DELIVERY,
  Collections: [
    { ClassName: "CannedSardines", Amount: 5, QuantityPercent: 1, MinQuantityPercent: 0 },
    { ClassName: "CannedDogFood", Amount: 5, QuantityPercent: 1, MinQuantityPercent: 0 },
  ],
  ShowDistance: true,
  AddItemsToNearbyMarketZone: false,
  MaxDistance: 150,
  MarkerName: "Rations Cache",
};

// ── Crafting ──

export const CRAFT_TRIPWIRE_ALARM: CraftingObjective = {
  ID: 20050,
  ObjectiveText: "Wire a tripwire alarm — let them tell you when they come.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Tripod"],
  ExecutionAmount: 3,
};

export const CRAFT_IMPROvised_SHIELDS: CraftingObjective = {
  ID: 20051,
  ObjectiveText: "Improvised shields from scrap — better than nothing.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["MakeshiftShield"],
  ExecutionAmount: 2,
};

export const CRAFT_MORPHINE_SYR: CraftingObjective = {
  ID: 20052,
  ObjectiveText: "Distill morphine from poppy — ration it carefully.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Morphine"],
  ExecutionAmount: 5,
};

export const CRAFT_FLARE_BATON: CraftingObjective = {
  ID: 20053,
  ObjectiveText: "Build flare batons for signaling — they glow through the smoke.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["FlareBaton"],
  ExecutionAmount: 4,
};

export const CRAFT_ROPE_BOOTS: CraftingObjective = {
  ID: 20054,
  ObjectiveText: "Rope and boots — climb anything if you dare.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["ClimbingRope"],
  ExecutionAmount: 2,
};

export const CRAFT_PIPE_BOMB: CraftingObjective = {
  ID: 20055,
  ObjectiveText: "Pipe bombs from scrap — ugly, loud, effective.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["PipeBomb"],
  ExecutionAmount: 3,
};

export const CRAFT_HUNTING_TRAP: CraftingObjective = {
  ID: 20056,
  ObjectiveText: "Set hunting traps — bait them and watch what walks in.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["BearTrap"],
  ExecutionAmount: 5,
};

export const CRAFT_DUST_MASK: CraftingObjective = {
  ID: 20057,
  ObjectiveText: "Sew dust masks — the air won't kill you, but choking on it will.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["DustMask"],
  ExecutionAmount: 6,
};

// ── Action ──

export const ACTION_OPEN_VEHICLE_DOOR: ActionObjective = {
  ID: 10094,
  ObjectiveText: "Pry open a vehicle door — hope the lock didn't freeze.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenDoor"],
  AllowedClassNames: ["CarDoor"],
};

export const ACTION_OPEN_VEHICLE_HOOD: ActionObjective = {
  ID: 10095,
  ObjectiveText: "Pop the hood and check under the metal.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  AllowedClassNames: ["CarHood", "CarDoor"],
};

export const ACTION_OPEN_BACK_DOOR: ActionObjective = {
  ID: 10096,
  ObjectiveText: "Open the rear doors and search the back.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenDoor"],
  AllowedClassNames: ["VanBackDoor", "CarDoor"],
};

export const ACTION_SEARCH_BACKPACK: ActionObjective = {
  ID: 10097,
  ObjectiveText: "Rummage through the backpack — grab anything useful.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  AllowedClassNames: ["Backpack"],
};

export const ACTION_OPEN_GARAGE: ActionObjective = {
  ID: 10098,
  ObjectiveText: "Roll up the garage door — what's parked inside is yours now.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  AllowedClassNames: ["Garage"],
};

// ── Crafting (continued - more) ──

export const CRAFT_AMMO_PACK: CraftingObjective = {
  ID: 20058,
  ObjectiveText: "Handload ammo — every round you make is one less you have to scavenge.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Bullet_762x39"],
  ExecutionAmount: 20,
};

// ── AICamp ──

export const AICAMP_ROADBLOCK: AICampObjective = {
  ID: 20060,
  ObjectiveText: "Smash the roadblock. Ten hostiles, no backup, easy target.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieFast"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AICAMP_OUTPOST_RAID: AICampObjective = {
  ID: 20061,
  ObjectiveText: "Raid the outpost before they reinforce. Hit fast, leave fast.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 12,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AICAMP_Bunker_SWEEP: AICampObjective = {
  ID: 20062,
  ObjectiveText: "Sweep the bunker — sealed, dark, and full of company.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 15,
  ClassNames: ["ZombieSlow", "ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AICAMP_FACTORY_CLEAR: AICampObjective = {
  ID: 20063,
  ObjectiveText: "Clear the factory floor. These things were workers once.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 20,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AICAMP_TANK_GRAVEYARD: AICampObjective = {
  ID: 20064,
  ObjectiveText: "The tank graveyard — the dead don't stay buried in metal.",
  ObjectiveType: ObjectiveType.AICAMP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 10,
  ClassNames: ["ZombieFast"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

// ── AIVIP ──

export const AIVIP_INFORMANT: AIVipObjective = {
  ID: 20014,
  ObjectiveText: "Extract the informant — he knows where the supply drop landed.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Informant",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Peter",
  NPCLoadoutFile: "Quest_Survivor_noWeapon",
};

export const AIVIP_WOUNDED_DOC: AIVipObjective = {
  ID: 20015,
  ObjectiveText: "Get the wounded doc to safety — he's the only one who knows triage.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Wounded Doctor",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Cyril",
  NPCLoadoutFile: "SanitarLoadout",
};

export const AIVIP_SCIENTIST_EXFIL: AIVipObjective = {
  ID: 20016,
  ObjectiveText: "Pull the scientist out. Whatever she was studying, it's not staying.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Evac Scientist",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorF_Naomi",
  NPCLoadoutFile: "NBCLoadout",
};

export const AIVIP_SHEPHERD_CAPTIVE: QuestAIVipObjective = {
  ID: 10103,
  ObjectiveText: "Extract the Shepherd captive alive.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Shepherd Captive",
  CanLootAI: FALSE,
  NPCClassName: "eAI_SurvivorM_Denis",
  NPCLoadoutFile: "TanLoadout",
};

// ── AIPatrol ──

export const AIPATROL_ROAMING_GROUP: AIPatrolObjective = {
  ID: 20060,
  ObjectiveText: "Break up the roaming group — they're moving toward civilization.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 4,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AIPATROL_HUNTER_PATROL: AIPatrolObjective = {
  ID: 20061,
  ObjectiveText: "Take out the hunter patrol — they track everything.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: ["ZombieFast"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const AIPATROL_CONVOY_ESCORT: AIPatrolObjective = {
  ID: 20062,
  ObjectiveText: "Interrupt the convoy escort — the supply truck is the real target.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: LOCATION.nwaf_patrol,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 8,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: ["Bandits"],
  AllowedDamageZones: [],
};

export const AIPATROL_NIGHT_STALKERS: AIPatrolObjective = {
  ID: 20063,
  ObjectiveText: "Three night stalkers — move between shadows, strike between heartbeats.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: ["ZombieSlow"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

// ── Treasure Hunt ──

export const TREASUREHUNT_DROWNED_CRATE: TreasureHuntObjective = {
  ID: 20040,
  ObjectiveText: "Someone drowned a crate in the river — dig it up before the current takes it.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Drowned Crate",
};

export const TREASUREHUNT_ABANDONED_POSTBOX: TreasureHuntObjective = {
  ID: 20041,
  ObjectiveText: "The old postbox has a false bottom — someone hid something in a hurry.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Old Postbox",
};

export const TREASUREHUNT_BUSH_UNDER_THE_OAK: TreasureHuntObjective = {
  ID: 20042,
  ObjectiveText: "Dig beneath the dead oak — the soil smells different here.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Under the Oak",
};

export const TREASUREHUNT_ROOFTOP_VENT: QuestTreasureHuntObjective = {
  ID: 20043,
  ObjectiveText: "There's a cache behind the ventilation shaft — climb and look.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Rooftop Vent",
  Loot: [guaranteedTreasureLoot("Paper"), guaranteedTreasureLoot("GunPartWeaponParts")],
  LootItemsAmount: 2,
};

export const TREASUREHUNT_UNDER_BRIDGE: QuestTreasureHuntObjective = {
  ID: 20044,
  ObjectiveText: "Under the bridge, in the muck — what was tossed away.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
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
  DELIVERY_COLD_WEATHER_GEAR,
  DELIVERY_RATIONS_CACHE,
  // Crafting
  CRAFT_TRIPWIRE_ALARM,
  CRAFT_IMPROvised_SHIELDS,
  CRAFT_MORPHINE_SYR,
  CRAFT_FLARE_BATON,
  CRAFT_ROPE_BOOTS,
  CRAFT_PIPE_BOMB,
  CRAFT_HUNTING_TRAP,
  CRAFT_DUST_MASK,
  CRAFT_AMMO_PACK,
  // Action
  ACTION_OPEN_VEHICLE_DOOR,
  ACTION_OPEN_VEHICLE_HOOD,
  ACTION_OPEN_BACK_DOOR,
  ACTION_SEARCH_BACKPACK,
  ACTION_OPEN_GARAGE,
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

const DEFAULT_QUEST_AI_CLASSES = [
  "eAI_SurvivorF_Keiko",
  "eAI_SurvivorF_Linda",
  "eAI_SurvivorM_Rolf",
  "eAI_SurvivorM_Denis",
  "eAI_SurvivorM_Boris",
];

function questAIClasses(classNames: string[]): string[] {
  const validClassNames = classNames.filter((className) => className.startsWith("eAI_"));
  return validClassNames.length > 0 ? validClassNames : DEFAULT_QUEST_AI_CLASSES;
}

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
    ClassNames: questAIClasses(objective.ClassNames),
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

const OBJECTIVE_DIRS: Record<ObjectiveType, string> = {
  [ObjectiveType.NONE]: EXPANSION_QUESTS_OBJECTIVES_ACTION_DIR,
  [ObjectiveType.TARGET]: EXPANSION_QUESTS_OBJECTIVES_TARGET_DIR,
  [ObjectiveType.TRAVEL]: EXPANSION_QUESTS_OBJECTIVES_TRAVEL_DIR,
  [ObjectiveType.COLLECT]: EXPANSION_QUESTS_OBJECTIVES_COLLECTION_DIR,
  [ObjectiveType.DELIVERY]: EXPANSION_QUESTS_OBJECTIVES_DELIVERY_DIR,
  [ObjectiveType.TREASUREHUNT]: EXPANSION_QUESTS_OBJECTIVES_TREASUREHUNT_DIR,
  [ObjectiveType.AIPATROL]: EXPANSION_QUESTS_OBJECTIVES_AIPATROL_DIR,
  [ObjectiveType.AICAMP]: EXPANSION_QUESTS_OBJECTIVES_AICAMP_DIR,
  [ObjectiveType.AIVIP]: EXPANSION_QUESTS_OBJECTIVES_AIVIP_DIR,
  [ObjectiveType.ACTION]: EXPANSION_QUESTS_OBJECTIVES_ACTION_DIR,
  [ObjectiveType.CRAFTING]: EXPANSION_QUESTS_OBJECTIVES_CRAFTING_DIR,
};

export const ALL_OBJECTIVE_CONFIGS = ALL_OBJECTIVES.reduce(
  (configs, objective) => {
    const directory = OBJECTIVE_DIRS[objective.ObjectiveType];
    configs[`${directory}/Objective_${objective.ID}.json`] = toExpansionObjectiveConfig(objective);
    return configs;
  },
  {} as Record<string, Record<string, unknown>>,
);

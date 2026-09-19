// NPC IDs: 1 = Daniels (mission giver), 2-3 = guards, 4 = Sery (fence), 5+ = world NPCs
// Sery's filename kept as "DZSurvival_NPC_Fence.json" - internal artifact
// name; changing it would leave stale files on deployed servers.
//
// ALL_NPCS aggregates every NPC the quest system places, regardless of
// whether they give quests or are just ambient world characters. The
// ensureQuests() function iterates ALL_NPCS to write NPC files.

import { Vec3 } from "../types/common.ts";
import {
  ActionObjective,
  AICampObjective,
  AIPatrolObjective,
  AIVipObjective,
  CollectionObjective,
  CraftingObjective,
  DeliveryObjective,
  OBJECTIVE_ACTION_DIR,
  ObjectiveBase,
  ObjectiveRef,
  ObjectiveType,
  TargetObjective,
  TravelObjective,
  TreasureHuntObjective,
} from "../types/objective.ts";
import { configToRecord, PLACEHOLDER_POSITION } from "./common.ts";

export function ref<T extends ObjectiveBase>(objective: T): ObjectiveRef {
  return {
    ObjectiveType: objective.ObjectiveType,
    ID: objective.ID,
    ConfigVersion: objective.ConfigVersion,
  };
}

// ─── Travel Objectives ───────────────────────────────────────────────────────

export const OTRAVEL_ROMASHKA_FARM: TravelObjective = {
  ID: 10000,
  ObjectiveText: "Travel to Romashka Farm.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: [7986, 221, 11308] as Vec3,
  MaxDistance: 5,
  MarkerName: "Romashka Farm",
};

export const OTRAVEL_ROMASHKA_PERIMETER: TravelObjective = {
  ID: 10001,
  ObjectiveText: "Scout the perimeter - watch for movement near the treeline.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 5,
  MarkerName: "Romashka Farm Perimeter",
};

export const OTRAVEL_COASTAL_ROAD: TravelObjective = {
  ID: 10002,
  ObjectiveText: "Follow the coastal road - don't stop, don't look back.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Coastal Road",
};

export const OTRAVEL_INTEL_BUILDING: TravelObjective = {
  ID: 10003,
  ObjectiveText: "Checkout the building were the entire supposedly is located.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Intel Building",
};

const ALL_OTRAVEL: TravelObjective[] = [
  OTRAVEL_ROMASHKA_FARM,
  OTRAVEL_ROMASHKA_PERIMETER,
  OTRAVEL_COASTAL_ROAD,
] as const;

// ─── Target Objectives ───────────────────────────────────────────────────────

export const OTARGET_REAPER_SCOUTS_PERIMETER: TargetObjective = {
  ID: 10010,
  ObjectiveText: "Eliminate Reaper scouts near the farm perimeter.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 5,
  ClassNames: ["ZombieMadman", "ZombieSlow"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const OTARGET_CHECKPOINT_SNIPER: TargetObjective = {
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

export const OTARGET_ROOFTOP_SNIPER: TargetObjective = {
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
  OTARGET_REAPER_SCOUTS_PERIMETER,
  OTARGET_CHECKPOINT_SNIPER,
  OTARGET_ROOFTOP_SNIPER,
] as const;

// ─── Delivery Objectives ─────────────────────────────────────────────────────

export const ODELIVERY_NOTE_TO_SCOUT_JAMES: DeliveryObjective = {
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

export const ODELIVERY_MEDICAL_TO_ROMASHKA: DeliveryObjective = {
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

export const ODELIVERY_AMMO_CACHE: DeliveryObjective = {
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
  ODELIVERY_MEDICAL_TO_ROMASHKA,
  ODELIVERY_AMMO_CACHE,
] as const;

// ─── Collection Objectives ───────────────────────────────────────────────────

export const OCOLLECT_CLOTH_DISINFECTANT: CollectionObjective = {
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

export const OCOLLECT_BUILDING_MATERIALS: CollectionObjective = {
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

export const OCOLLECT_MEDICINAL_HERBS: CollectionObjective = {
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
  OCOLLECT_CLOTH_DISINFECTANT,
  OCOLLECT_BUILDING_MATERIALS,
  OCOLLECT_MEDICINAL_HERBS,
] as const;

// ─── Action Objectives ───────────────────────────────────────────────────────

export const OACTION_INSPECT_VEHICLE: ActionObjective = {
  ID: 10040,
  ObjectiveText: "Inspect an abandoned vehicle for useful parts.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenDoor"],
  AllowedClassNames: ["CarDoor"],
};

export const OACTION_SEARCH_BUILDING: ActionObjective = {
  ID: 10041,
  ObjectiveText: "Search the building for intel.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenDoor"],
  AllowedClassNames: ["Fence"],
};

export const OACTION_FARMING: ActionObjective = {
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

export const OACTION_START_VEHICLE: ActionObjective = {
  ID: 10071,
  ObjectiveText: "Start a vehicle to get moving.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionStartEngine"],
  AllowedClassNames: ["Car", "Truck", "CarWagon", "Van", "UAZ"],
};

export const OACTION_MINE_TREE: ActionObjective = {
  ID: 10072,
  ObjectiveText: "Harvest wood by mining a tree.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionMineTree"],
  AllowedClassNames: ["Tree"],
};

export const OACTION_MINE_ROCK: ActionObjective = {
  ID: 10073,
  ObjectiveText: "Mine rock for stone and resources.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionMineRock"],
  AllowedClassNames: ["Rock", "Stone"],
};

export const OACTION_SKINNING: ActionObjective = {
  ID: 10074,
  ObjectiveText: "Skin the carcass for meat and materials.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionSkinning"],
};

export const OACTION_EAT_DRINK: ActionObjective = {
  ID: 10075,
  ObjectiveText: "Eat or drink to restore stamina.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionEat", "ActionDrink"],
};

export const OACTION_FIRST_AID: ActionObjective = {
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

export const OACTION_INJECT_MEDS: ActionObjective = {
  ID: 10077,
  ObjectiveText: "Administer medication to stabilize someone.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionInjectEpinephrineTarget",
    "ActionInjectMorphineTarget",
    "ActionInjectTarget",
  ],
};

export const OACTION_CPR_DEFIBRILLATE: ActionObjective = {
  ID: 10078,
  ObjectiveText: "Perform emergency resuscitation on a fallen ally.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionCPR",
    "ActionDefibrilateTarget",
  ],
};

export const OACTION_GIVE_BLOOD_TEST: ActionObjective = {
  ID: 10079,
  ObjectiveText: "Run a blood test on a subject.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionTestBloodTarget",
    "ActionGiveBloodTarget",
  ],
};

export const OACTION_FEED_TABLETS: ActionObjective = {
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

export const OACTION_GIVE_SALINE: ActionObjective = {
  ID: 10081,
  ObjectiveText: "Administer saline to dehydrated allies.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionGiveSalineTarget",
  ],
};

export const OACTION_TURN_ON_OFF_LIGHT: ActionObjective = {
  ID: 10083,
  ObjectiveText: "Toggle lights on a device or structure.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionTurnOnLight",
    "ActionTurnOffLight",
  ],
};

export const OACTION_WEAPONS: ActionObjective = {
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

export const OACTION_MAP: ActionObjective = {
  ID: 10085,
  ObjectiveText: "Consult the map for navigation.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionFoldMap",
    "ActionUnfoldMap",
  ],
};

export const OACTION_OPEN_CONTAINER: ActionObjective = {
  ID: 10086,
  ObjectiveText: "Open a container, fence, or barrel to scavenge.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionOpen",
    "ActionOpenFence",
    "ActionOpenBarrel",
  ],
};

export const OACTION_TAKE_ITEM: ActionObjective = {
  ID: 10087,
  ObjectiveText: "Take an item from its location.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionTakeItem",
  ],
};

export const OACTION_PACK_TENT: ActionObjective = {
  ID: 10088,
  ObjectiveText: "Pack up a tent for transport.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "ActionPackTent",
  ],
};

export const OACTION_FIREARM_ATTACH_MAG: ActionObjective = {
  ID: 10089,
  ObjectiveText: "Attach a magazine to a firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionAttachMagazine",
    "FirearmActionAttachMagazineQuick",
  ],
};

export const OACTION_FIREARM_DETACH_MAG: ActionObjective = {
  ID: 10090,
  ObjectiveText: "Detach a magazine from a firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionDetachMagazine",
    "FirearmActionDetachMagazine_Old",
  ],
};

export const OACTION_FIREARM_LOAD_BULLET: ActionObjective = {
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

export const OACTION_FIREARM_MECHANIC: ActionObjective = {
  ID: 10092,
  ObjectiveText: "Perform firearm manipulation or repair.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionMechanicManipulate",
  ],
};

export const OACTION_FIREARM_UNJAM: ActionObjective = {
  ID: 10093,
  ObjectiveText: "Unjam a malfunctioning firearm.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: [
    "FirearmActionUnjam",
  ],
};

const ALL_OACTION: ActionObjective[] = [
  OACTION_INSPECT_VEHICLE,
  OACTION_SEARCH_BUILDING,
  OACTION_FARMING,
  OACTION_START_VEHICLE,
  OACTION_MINE_TREE,
  OACTION_MINE_ROCK,
  OACTION_SKINNING,
  OACTION_EAT_DRINK,
  OACTION_FIRST_AID,
  OACTION_INJECT_MEDS,
  OACTION_CPR_DEFIBRILLATE,
  OACTION_GIVE_BLOOD_TEST,
  OACTION_FEED_TABLETS,
  OACTION_GIVE_SALINE,
  OACTION_TURN_ON_OFF_LIGHT,
  OACTION_WEAPONS,
  OACTION_MAP,
  OACTION_OPEN_CONTAINER,
  OACTION_TAKE_ITEM,
  OACTION_PACK_TENT,
  OACTION_FIREARM_ATTACH_MAG,
  OACTION_FIREARM_DETACH_MAG,
  OACTION_FIREARM_LOAD_BULLET,
  OACTION_FIREARM_MECHANIC,
  OACTION_FIREARM_UNJAM,
] as const;

// ─── Crafting Objectives ─────────────────────────────────────────────────────

export const OCRAFT_SCRAP_WEAPON: CraftingObjective = {
  ID: 10050,
  ObjectiveText: "Craft a basic weapon from scrap.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["MakeshiftMeleeWeapon"],
  ExecutionAmount: 1,
};

export const OCRAFT_BEAR_TRAP: CraftingObjective = {
  ID: 10051,
  ObjectiveText: "Build a trap to catch raiders.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["BearTrap"],
  ExecutionAmount: 3,
};

const ALL_OCRAFT: CraftingObjective[] = [
  OCRAFT_SCRAP_WEAPON,
  OCRAFT_BEAR_TRAP,
] as const;

// ─── AI Camp Objectives ──────────────────────────────────────────────────────

export const OAICAMP_REAPER_CHECKPOINT: AICampObjective = {
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

export const OAICAMP_REAPER_STRONGHOLD: AICampObjective = {
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

export const OAICAMP_TISY_GATE: AICampObjective = {
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
  OAICAMP_REAPER_CHECKPOINT,
  OAICAMP_REAPER_STRONGHOLD,
  OAICAMP_TISY_GATE,
] as const;

// ─── AI VIP Objectives ───────────────────────────────────────────────────────

export const OAIVIP_CORDON_DEFECTOR: AIVipObjective = {
  ID: 10012,
  ObjectiveText: "Bring in the Cordon defector alive.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Cordon Defector",
};

export const OAIVIP_EXTRACT_SCIENTIST: AIVipObjective = {
  ID: 10013,
  ObjectiveText: "Bring the Cordon scientist out of NWAF alive.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "NWAF Scientist",
};

const ALL_OAIVIP: AIVipObjective[] = [
  OAIVIP_CORDON_DEFECTOR,
  OAIVIP_EXTRACT_SCIENTIST,
] as const;

// ─── AI Patrol Objectives ────────────────────────────────────────────────────

export const OAIPATROL_REAPER_PERIMETER: AIPatrolObjective = {
  ID: 10060,
  ObjectiveText: "Break the Reaper patrol working the Kamenka–Romashka road.",
  ObjectiveType: ObjectiveType.AIPATROL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 3,
  ClassNames: ["ZombieMadman"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const OAIPATROL_CHECKPOINT_CLEAR: AIPatrolObjective = {
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

export const OAIPATROL_CORDON_LOOP: AIPatrolObjective = {
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
  OAIPATROL_REAPER_PERIMETER,
  OAIPATROL_CHECKPOINT_CLEAR,
  OAIPATROL_CORDON_LOOP,
] as const;

// ─── Treasure Hunt Objectives ────────────────────────────────────────────────

export const OTREASUREHUNT_BURIED_SUPPLIES: TreasureHuntObjective = {
  ID: 10041,
  ObjectiveText: "Find what someone buried near the Kamenka coastline.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Buried Supplies",
};

export const OTREASUREHUNT_SKALISTY_CACHE: TreasureHuntObjective = {
  ID: 10042,
  ObjectiveText: "Find what the dead Cordon sentry was protecting on Skalisty Island.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Skalisty Cache",
};

const ALL_OTREASUREHUNT: TreasureHuntObjective[] = [
  OTREASUREHUNT_BURIED_SUPPLIES,
  OTREASUREHUNT_SKALISTY_CACHE,
] as const;

// ─── Side Objectives ─────────────────────────────────────────────────────────

// ── Travel ──

export const OTRAVEL_ESCAPE_ZONE: TravelObjective = {
  ID: 20031,
  ObjectiveText: "Get out of the killzone before the compound locks down.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Extraction Point",
};

export const OTRAVEL_RALLY_POINT: TravelObjective = {
  ID: 20032,
  ObjectiveText: "Move to the rally point — stay low, stay moving.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Rally Point",
};

export const OTRAVEL_LOOKOUT: TravelObjective = {
  ID: 20033,
  ObjectiveText: "Reach the high ground and get eyes on the area.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Overlook",
};

export const OTRAVEL_BURST_SPEED: TravelObjective = {
  ID: 20034,
  ObjectiveText: "Burst speed — cover ground fast before they realize you're gone.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Burst Speed",
};

export const OTRAVEL_SAFEROUTE: TravelObjective = {
  ID: 20035,
  ObjectiveText: "Take the saferoute through the treeline to avoid open ground.",
  ObjectiveType: ObjectiveType.TRAVEL,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Safe Route",
};

// ── Target ──

export const OTARGET_CLEAR_BUILDING: TargetObjective = {
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

export const OTARGET_HOSPITAL_SWEEP: TargetObjective = {
  ID: 20022,
  ObjectiveText: "Sweep the hospital — these things never stopped wandering the halls.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 15,
  ClassNames: ["ZombieMadman", "ZombieSlow"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const OTARGET_HVIP_MARKSMAN: TargetObjective = {
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

export const OTARGET_WAREHOUSE_CLEAR: TargetObjective = {
  ID: 20024,
  ObjectiveText: "Clear the warehouse. Lock the doors behind you.",
  ObjectiveType: ObjectiveType.TARGET,
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

export const OTARGET_ROOFTOP_CLEAR: TargetObjective = {
  ID: 20025,
  ObjectiveText: "Clear the rooftops — they'll rain down on you if you leave them.",
  ObjectiveType: ObjectiveType.TARGET,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MinDistance: -1,
  Amount: 6,
  ClassNames: ["ZombieFast"],
  CountSelfKill: false,
  AllowedWeapons: [],
  ExcludedClassNames: [],
  CountAIPlayers: false,
  AllowedTargetFactions: [],
  AllowedDamageZones: [],
};

export const OTARGET_NIGHTHUNT: TargetObjective = {
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

export const OCOLLECT_FUEL_CAN: CollectionObjective = {
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

export const OCOLLECT_AMMO_RIG: CollectionObjective = {
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

export const OCOLLECT_WEAPON_PARTS: CollectionObjective = {
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

export const OCOLLECT_FOOD_SURPLUS: CollectionObjective = {
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

export const OCOLLECT_RADIO_PARTS: CollectionObjective = {
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

export const OCOLLECT_BODY_GEAR: CollectionObjective = {
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

export const OCOLLECT_WATER_PURE: CollectionObjective = {
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

export const ODELIVERY_INTEL_PACKAGE: DeliveryObjective = {
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

export const ODELIVERY_BATTERY_DROP: DeliveryObjective = {
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

export const ODELIVERY_GUNSMITH_KIT: DeliveryObjective = {
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

export const ODELIVERY_COLD_WEATHER_GEAR: DeliveryObjective = {
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

export const ODELIVERY_RATIONS_CACHE: DeliveryObjective = {
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

export const OCRAFT_TRIPWIRE_ALARM: CraftingObjective = {
  ID: 20050,
  ObjectiveText: "Wire a tripwire alarm — let them tell you when they come.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Tripod"],
  ExecutionAmount: 3,
};

export const OCRAFT_IMPROvised_SHIELDS: CraftingObjective = {
  ID: 20051,
  ObjectiveText: "Improvised shields from scrap — better than nothing.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["MakeshiftShield"],
  ExecutionAmount: 2,
};

export const OCRAFT_MORPHINE_SYR: CraftingObjective = {
  ID: 20052,
  ObjectiveText: "Distill morphine from poppy — ration it carefully.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Morphine"],
  ExecutionAmount: 5,
};

export const OCRAFT_FLARE_BATON: CraftingObjective = {
  ID: 20053,
  ObjectiveText: "Build flare batons for signaling — they glow through the smoke.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["FlareBaton"],
  ExecutionAmount: 4,
};

export const OCRAFT_ROPE_BOOTS: CraftingObjective = {
  ID: 20054,
  ObjectiveText: "Rope and boots — climb anything if you dare.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["ClimbingRope"],
  ExecutionAmount: 2,
};

export const OCRAFT_PIPE_BOMB: CraftingObjective = {
  ID: 20055,
  ObjectiveText: "Pipe bombs from scrap — ugly, loud, effective.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["PipeBomb"],
  ExecutionAmount: 3,
};

export const OCRAFT_HUNTING_TRAP: CraftingObjective = {
  ID: 20056,
  ObjectiveText: "Set hunting traps — bait them and watch what walks in.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["BearTrap"],
  ExecutionAmount: 5,
};

export const OCRAFT_DUST_MASK: CraftingObjective = {
  ID: 20057,
  ObjectiveText: "Sew dust masks — the air won't kill you, but choking on it will.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["DustMask"],
  ExecutionAmount: 6,
};

// ── Action ──

export const OACTION_OPEN_VEHICLE_DOOR: ActionObjective = {
  ID: 10094,
  ObjectiveText: "Pry open a vehicle door — hope the lock didn't freeze.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenDoor"],
  AllowedClassNames: ["CarDoor"],
};

export const OACTION_OPEN_VEHICLE_HOOD: ActionObjective = {
  ID: 10095,
  ObjectiveText: "Pop the hood and check under the metal.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  AllowedClassNames: ["CarHood", "CarDoor"],
};

export const OACTION_OPEN_BACK_DOOR: ActionObjective = {
  ID: 10096,
  ObjectiveText: "Open the rear doors and search the back.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpenDoor"],
  AllowedClassNames: ["VanBackDoor", "CarDoor"],
};

export const OACTION_SEARCH_BACKPACK: ActionObjective = {
  ID: 10097,
  ObjectiveText: "Rummage through the backpack — grab anything useful.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  AllowedClassNames: ["Backpack"],
};

export const OACTION_OPEN_GARAGE: ActionObjective = {
  ID: 10098,
  ObjectiveText: "Roll up the garage door — what's parked inside is yours now.",
  ObjectiveType: ObjectiveType.ACTION,
  ActionNames: ["ActionOpen"],
  AllowedClassNames: ["Garage"],
};

// ── Crafting (continued - more) ──

export const OCRAFT_AMMO_PACK: CraftingObjective = {
  ID: 20058,
  ObjectiveText: "Handload ammo — every round you make is one less you have to scavenge.",
  ObjectiveType: ObjectiveType.CRAFTING,
  ItemNames: ["Bullet_762x39"],
  ExecutionAmount: 20,
};

// ── AICamp ──

export const OAICAMP_ROADBLOCK: AICampObjective = {
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

export const OAICAMP_OUTPOST_RAID: AICampObjective = {
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

export const OAICAMP_Bunker_SWEEP: AICampObjective = {
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

export const OAICAMP_FACTORY_CLEAR: AICampObjective = {
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

export const OAICAMP_TANK_GRAVEYARD: AICampObjective = {
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

export const OAIVIP_INFORMANT: AIVipObjective = {
  ID: 20014,
  ObjectiveText: "Extract the informant — he knows where the supply drop landed.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Informant",
};

export const OAIVIP_WOUNDED_DOC: AIVipObjective = {
  ID: 20015,
  ObjectiveText: "Get the wounded doc to safety — he's the only one who knows triage.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Wounded Doctor",
};

export const OAIVIP_SCIENTIST_EXFIL: AIVipObjective = {
  ID: 20016,
  ObjectiveText: "Pull the scientist out. Whatever she was studying, it's not staying.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Evac Scientist",
};

export const OAIVIP_CHILDREN_RESCUE: AIVipObjective = {
  ID: 20017,
  ObjectiveText: "Find the kids. Move quiet — they're terrified.",
  ObjectiveType: ObjectiveType.AIVIP,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 150,
  MarkerName: "Hidden Children",
};

// ── AIPatrol ──

export const OAIPATROL_ROAMING_GROUP: AIPatrolObjective = {
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

export const OAIPATROL_HUNTER_PATROL: AIPatrolObjective = {
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

export const OAIPATROL_CONVOY_ESCORT: AIPatrolObjective = {
  ID: 20062,
  ObjectiveText: "Interrupt the convoy escort — the supply truck is the real target.",
  ObjectiveType: ObjectiveType.AIPATROL,
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

export const OAIPATROL_NIGHT_STALKERS: AIPatrolObjective = {
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

export const OTREASUREHUNT_DROWNED_CRATE: TreasureHuntObjective = {
  ID: 20040,
  ObjectiveText: "Someone drowned a crate in the river — dig it up before the current takes it.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Drowned Crate",
};

export const OTREASUREHUNT_ABANDONED_POSTBOX: TreasureHuntObjective = {
  ID: 20041,
  ObjectiveText: "The old postbox has a false bottom — someone hid something in a hurry.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Old Postbox",
};

export const OTREASUREHUNT_BUSH_UNDER_THE_OAK: TreasureHuntObjective = {
  ID: 20042,
  ObjectiveText: "Dig beneath the dead oak — the soil smells different here.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Under the Oak",
};

export const OTREASUREHUNT_ROOFTOP_VENT: TreasureHuntObjective = {
  ID: 20043,
  ObjectiveText: "There's a cache behind the ventilation shaft — climb and look.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Rooftop Vent",
};

export const OTREASUREHUNT_UNDER_BRIDGE: TreasureHuntObjective = {
  ID: 20044,
  ObjectiveText: "Under the bridge, in the muck — what was tossed away.",
  ObjectiveType: ObjectiveType.TREASUREHUNT,
  Position: PLACEHOLDER_POSITION,
  MaxDistance: 10,
  MarkerName: "Under Bridge",
};

const ALL_SIDE = [
  // Travel
  OTRAVEL_ESCAPE_ZONE,
  OTRAVEL_RALLY_POINT,
  OTRAVEL_LOOKOUT,
  OTRAVEL_BURST_SPEED,
  OTRAVEL_SAFEROUTE,
  // Target
  OTARGET_CLEAR_BUILDING,
  OTARGET_HOSPITAL_SWEEP,
  OTARGET_HVIP_MARKSMAN,
  OTARGET_WAREHOUSE_CLEAR,
  OTARGET_ROOFTOP_CLEAR,
  OTARGET_NIGHTHUNT,
  // Collection
  OCOLLECT_FUEL_CAN,
  OCOLLECT_AMMO_RIG,
  OCOLLECT_WEAPON_PARTS,
  OCOLLECT_FOOD_SURPLUS,
  OCOLLECT_RADIO_PARTS,
  OCOLLECT_BODY_GEAR,
  OCOLLECT_WATER_PURE,
  // Delivery
  ODELIVERY_INTEL_PACKAGE,
  ODELIVERY_BATTERY_DROP,
  ODELIVERY_GUNSMITH_KIT,
  ODELIVERY_COLD_WEATHER_GEAR,
  ODELIVERY_RATIONS_CACHE,
  // Crafting
  OCRAFT_TRIPWIRE_ALARM,
  OCRAFT_IMPROvised_SHIELDS,
  OCRAFT_MORPHINE_SYR,
  OCRAFT_FLARE_BATON,
  OCRAFT_ROPE_BOOTS,
  OCRAFT_PIPE_BOMB,
  OCRAFT_HUNTING_TRAP,
  OCRAFT_DUST_MASK,
  OCRAFT_AMMO_PACK,
  // Action
  OACTION_OPEN_VEHICLE_DOOR,
  OACTION_OPEN_VEHICLE_HOOD,
  OACTION_OPEN_BACK_DOOR,
  OACTION_SEARCH_BACKPACK,
  OACTION_OPEN_GARAGE,
  // AICamp
  OAICAMP_ROADBLOCK,
  OAICAMP_OUTPOST_RAID,
  OAICAMP_Bunker_SWEEP,
  OAICAMP_FACTORY_CLEAR,
  OAICAMP_TANK_GRAVEYARD,
  // AIVIP
  OAIVIP_INFORMANT,
  OAIVIP_WOUNDED_DOC,
  OAIVIP_SCIENTIST_EXFIL,
  OAIVIP_CHILDREN_RESCUE,
  // AIPatrol
  OAIPATROL_ROAMING_GROUP,
  OAIPATROL_HUNTER_PATROL,
  OAIPATROL_CONVOY_ESCORT,
  OAIPATROL_NIGHT_STALKERS,
  // Treasure Hunt
  OTREASUREHUNT_DROWNED_CRATE,
  OTREASUREHUNT_ABANDONED_POSTBOX,
  OTREASUREHUNT_BUSH_UNDER_THE_OAK,
  OTREASUREHUNT_ROOFTOP_VENT,
  OTREASUREHUNT_UNDER_BRIDGE,
] as const;

const ALL_OBJECTIVES: ObjectiveBase[] = [
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

export const ALL_OBJECTIVE_CONFIGS = configToRecord(
  ALL_OBJECTIVES,
  `${OBJECTIVE_ACTION_DIR}/Objective_`,
);

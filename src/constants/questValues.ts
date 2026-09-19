import { CUSTOM_POSITION } from "../config/traders.ts";

// ExpansionQuestObjectiveType enum values (ExpansionQuestObjectiveType.c) -
// only the ones actually used below.
export const OBJECTIVE_TYPE = {
  NONE: 1,
  TARGET: 2,
  TRAVEL: 3,
  COLLECT: 4,
  DELIVERY: 5,
  TREASUREHUNT: 6,
  AIPATROL: 7,
  AICAMP: 8,
  AIVIP: 9,
  ACTION: 10,
  CRAFTING: 11,
} as const;

// Current on-disk schema versions this mod expects (ExpansionQuestConfig.
// CONFIGVERSION / ExpansionQuestObjectiveConfig.CONFIGVERSION /
// ExpansionQuestNPCData.CONFIGVERSION) - writing anything lower would
// trigger the mod's own migration logic on load, which we want to avoid.
export const QUEST_CONFIG_VERSION = 22;
export const OBJECTIVE_CONFIG_VERSION = 28;
export const NPC_CONFIG_VERSION = 6;

export const CURRENCY_CLASSNAME = "expansionbanknotehryvnia";

// Global multiplier applied to all currency rewards in ROMASHKA quests.
// Tweak once to scale every cash reward up or down together.
export const CURRENCY_MULTIPLIER = 50;

type LocationsMap = Record<string, [number, number, number]>;

// ROMASHKA campaign world locations — real coordinates scouted in-game.
// PLACEHOLDER markers mean "fill these in before your first playtest".
export const ROMASHKA_LOCATIONS: LocationsMap = {
  // Romashka Farm — use the same CUSTOM_POSITION as the trader compound
  romashka: [7986, 221, 11308],
  // Romashka perimeter treeline where Reaper scouts are spotted
  farm_perimeter: [0, 0, 0] as [number, number, number], // PLACEHOLDER: near Romashka treeline
  // Kamenka–Romashka coastal road — Reaper patrol route midpoint
  coast_road: [4900.0, 10.0, 5600.0] as [number, number, number], // PLACEHOLDER: road between Kamenka and Romashka
  // Solnichniy outskirts — Reaper checkpoint / AI Camp location
  solnichniy_checkpoint: [5200.0, 10.0, 5400.0] as [number, number, number], // PLACEHOLDER: Solnichniy outskirts
  // NWAF outskirts where the Cordon defector is found
  nwaf_outskirts: [4700.0, 10.0, 10100.0] as [number, number, number], // PLACEHOLDER: NWAF approach road
  // Cherno high-ground vantage point for scouting
  cherno_rooftop: [4650.0, 15.0, 6100.0] as [number, number, number], // PLACEHOLDER: Cherno elevated position
  // Cherno/Electro police station block — Reaper stronghold (Act III climax)
  cherno_block: [4640.0, 5.0, 6080.0] as [number, number, number], // PLACEHOLDER: Cherno police station
  // Kamenka/Solnichniy dock area — Sery's black-market territory
  sery_docks: [4850.0, 5.0, 5750.0] as [number, number, number], // PLACEHOLDER: dock area near coast
  // Kamenka coastline — buried stash (Treasure Hunt)
  kamenka_coast_stash: [4820.0, 5.0, 5720.0] as [number, number, number], // PLACEHOLDER: coastline near Kamenka
  // Stary Sobor radiation zone edge — outer perimeter
  stary_sobor_edge: [6150.0, 0.0, 7700.0] as [number, number, number], // PLACEHOLDER: Sobor zone edge
  // Skalisty Island — buried core sample stash
  skalisty_stash: [3500.0, 5.0, 8500.0] as [number, number, number], // PLACEHOLDER: Skalisty Island coast
  // NWAF outer perimeter — Cordon scientist extraction point
  nwaf_perimeter: [4600.0, 10.0, 10050.0] as [number, number, number], // PLACEHOLDER: NWAF wire perimeter
  // NWAF outer patrol loop — Cordon convoy route
  nwaf_patrol: [4650.0, 10.0, 10150.0] as [number, number, number], // PLACEHOLDER: NWAF outer loop
  // Tisy main gate — Cordon's last defensive line (campaign climax)
  tisy_gate: [7500.0, 10.0, 7200.0] as [number, number, number], // PLACEHOLDER: Tisy main checkpoint
} as const;

// The mission giver's real, physical skin. Confirmed spawnable classname
// (from the mod's own ExpansionQuestNPC.c): "ExpansionQuestNPCMirek" -
// distinct from this project's two existing trader NPCs
// (ExpansionTraderDenis/Cyril, see traders.ts). His actual visible outfit
// comes from NPCLoadoutFile (TaskmasterLoadout, see traders.ts's
// TASKMASTER_GEAR) - a deliberately different look from the General
// Trader's TraderBlueLoadout so the two don't read as the same NPC.
export const MISSION_GIVER_ID = 1;
export const MISSION_GIVER_CLASSNAME = "ExpansionQuestNPCMirek";
// Offset in meters from CUSTOM_POSITION (traders.ts's own convention) -
// scouted spot near the General Store NPC (offset [0,0,0]), clear of the
// Vehicle Dealer NPC/vehicle spawn points (offset ~[34-77, ..., -34..6]).
export const MISSION_GIVER_OFFSET: [number, number, number] = [-7.35, 0, -9.7];
export const MISSION_GIVER_ORIENTATION: [number, number, number] = [45, 0, 0];

// Two static guards flanking Taskmaster Daniels - decorative only (never
// referenced by any quest's QuestGiverIDs/QuestTurnInIDs), same
// ExpansionQuestNPC mechanism, offsets from CUSTOM_POSITION as scouted.
export const GUARD_1_OFFSET: [number, number, number] = [18.58, 2.146, -3.9];
export const GUARD_1_ORIENTATION: [number, number, number] = [99.8114, 0, 0];
export const GUARD_2_OFFSET: [number, number, number] = [18.27, 2.557, -12.3];
export const GUARD_2_ORIENTATION: [number, number, number] = [75.2741, 0, 0];

// Sery "the Magpie" — black-market fence at the Kamenka/Solnichniy docks.
// He runs the keycard economy quests and is the only other quest giver
// besides Daniels in the ROMASHKA campaign. Not on the farm's neutral ground.
export const SERY_OFFSET: [number, number, number] = [-15.0, 5.0, 20.0]; // PLACEHOLDER: dock area near coast
export const SERY_ORIENTATION: [number, number, number] = [180, 0, 0];
export const SERY_CLASSNAME = "ExpansionQuestNPCMirek"; // same skin as Daniels, different face mod

// --- Objective definitions ------------------------------------------------

export interface TravelObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  /** Absolute world position - either CUSTOM_POSITION + offset, or a real, already-scouted coordinate. */
  position: [number, number, number];
  maxDistance: number;
  markerName: string;
}

export const TRAVEL_OBJECTIVES: TravelObjectiveDef[] = [
  {
    id: 1000,
    fileName: "DZSurvival_Travel_1000",
    objectiveText: "Make your way to Romashka Farm.",
    position: [
      CUSTOM_POSITION![0] + 0,
      CUSTOM_POSITION![1] + 0,
      CUSTOM_POSITION![2] + 0,
    ],
    maxDistance: 40,
    markerName: "Romashka Farm",
  },
  {
    id: 1001,
    fileName: "DZSurvival_Travel_1001",
    // Real, in-game-verified coordinate - see customKeycards.ts/
    // keycard-rooms/LOCATIONS.md ("Water Station", evg_keycards_Yellow).
    objectiveText: "Scout the old Water Station north of here.",
    position: [5004.95, 320.60, 5588.04],
    maxDistance: 25,
    markerName: "Water Station",
  },
  {
    id: 1002,
    fileName: "DZSurvival_Travel_1002",
    // Real, already-committed hazard zone center (see hazards.ts's
    // STARY_SOBOR_POSITION) - generous MaxDistance since this project's own
    // Terje-Radiation zone entry uses Y=0 rather than the village's real
    // elevation (Terje resolves height separately via HeightMin/HeightMax),
    // so the true 3D distance from this literal position could be larger
    // than a tight radius would tolerate.
    objectiveText: "Head to Stary Sobor and confirm the radiation reading with your own eyes.",
    position: [6220.72, 0, 7762.35],
    maxDistance: 350,
    markerName: "Stary Sobor",
  },
  {
    id: 1003,
    fileName: "DZSurvival_Travel_1003",
    // Real coordinate from ai/DynamicAIMissions.json's "NWAF_Weapons_Cache"
    // mission - @Dynamic-AI-Missions independently spawns 5-8 armed Raiders
    // here, so this objective doubles as "go pick a fight with that camp"
    // without needing any of the unverified AIPATROL/AICAMP quest schema.
    objectiveText: "Push into the raider camp at NWAF and hold your ground.",
    position: [4501.0, 300.0, 10231.0],
    maxDistance: 100,
    markerName: "NWAF Weapons Cache",
  },
];

export interface TargetObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  classNames: string[];
  amount: number;
}

export const TARGET_OBJECTIVES: TargetObjectiveDef[] = [
  {
    id: 2000,
    fileName: "DZSurvival_Target_2000",
    objectiveText: "Kill 15 Infected.",
    classNames: ["ZombieBase"],
    amount: 15,
  },
  {
    id: 2001,
    fileName: "DZSurvival_Target_2001",
    objectiveText: "Kill 5 wolves.",
    classNames: ["Animal_CanisLupus_Grey", "Animal_CanisLupus_White"],
    amount: 5,
  },
  {
    id: 2002,
    fileName: "DZSurvival_Target_2002",
    objectiveText: "Kill 3 wild boar.",
    classNames: ["Animal_SusScrofa"],
    amount: 3,
  },
  {
    id: 2003,
    fileName: "DZSurvival_Target_2003",
    objectiveText: "Kill 1 bear.",
    classNames: ["Animal_UrsusArctos"],
    amount: 1,
  },
  {
    id: 2004,
    fileName: "DZSurvival_Target_2004",
    objectiveText: "Kill 20 Infected.",
    classNames: ["ZombieBase"],
    amount: 20,
  },
  {
    id: 2005,
    fileName: "DZSurvival_Target_2005",
    objectiveText: "Kill 3 deer.",
    classNames: ["Animal_CervusElaphus", "Animal_CapreolusCapreolus"],
    amount: 3,
  },
  {
    id: 2006,
    fileName: "DZSurvival_Target_2006",
    // Rabbit/Squirrel classnames confirmed from @Ambient-Animals-Pack's own
    // territory readmes (see wildlifeTerritories.ts's TERRITORIES array).
    objectiveText: "Kill 10 rabbits or squirrels.",
    classNames: ["Animal_Rabbit_Grey", "Animal_Rabbit_Brown", "Animal_Squirrel"],
    amount: 10,
  },
  {
    id: 2007,
    fileName: "DZSurvival_Target_2007",
    objectiveText: "Kill 5 rabbits or squirrels.",
    classNames: ["Animal_Rabbit_Grey", "Animal_Rabbit_Brown", "Animal_Squirrel"],
    amount: 5,
  },
];

export interface DeliveryItem {
  amount: number;
  className: string;
}

export interface DeliveryObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  items: DeliveryItem[];
}

export const DELIVERY_OBJECTIVES: DeliveryObjectiveDef[] = [
  {
    id: 3000,
    fileName: "DZSurvival_Delivery_3000",
    objectiveText: "Deliver 5x Tuna Can and 5x Water Bottle to Taskmaster Daniels.",
    items: [{ amount: 5, className: "TunaCan" }, { amount: 5, className: "WaterBottle" }],
  },
  {
    id: 3001,
    fileName: "DZSurvival_Delivery_3001",
    objectiveText: "Deliver 10x Wooden Log to Taskmaster Daniels.",
    items: [{ amount: 10, className: "WoodenLog" }],
  },
  {
    id: 3002,
    fileName: "DZSurvival_Delivery_3002",
    // CarBattery is a real vanilla classname (see expansionLootGaps.ts's own
    // comment referencing it). SparkPlug is the other standard vanilla
    // vehicle-repair part.
    objectiveText: "Deliver 1x Car Battery and 2x Spark Plug to Taskmaster Daniels.",
    items: [{ amount: 1, className: "CarBattery" }, { amount: 2, className: "SparkPlug" }],
  },
  {
    id: 3003,
    fileName: "DZSurvival_Delivery_3003",
    objectiveText: "Deliver 1x Green Keycard to Taskmaster Daniels.",
    items: [{ amount: 1, className: "evg_keycards_Green" }],
  },
  {
    id: 3004,
    fileName: "DZSurvival_Delivery_3004",
    objectiveText: "Deliver 2x Canister Gasoline to Taskmaster Daniels.",
    items: [{ amount: 2, className: "CanisterGasoline" }],
  },
];

export interface CollectionObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  items: DeliveryItem[];
}

export const COLLECTION_OBJECTIVES: CollectionObjectiveDef[] = [
  {
    id: 4000,
    fileName: "DZSurvival_Collection_4000",
    objectiveText: "Gather 3x Apple, 3x Pear and 3x Plum.",
    items: [
      { amount: 3, className: "Apple" },
      { amount: 3, className: "Pear" },
      { amount: 3, className: "Plum" },
    ],
  },
  {
    id: 4001,
    fileName: "DZSurvival_Collection_4001",
    objectiveText: "Catch 2x Mackerel.",
    items: [{ amount: 2, className: "Mackerel" }],
  },
  {
    id: 4002,
    fileName: "DZSurvival_Collection_4002",
    objectiveText: "Gather 5x Water Bottle.",
    items: [{ amount: 5, className: "WaterBottle" }],
  },
  {
    id: 4003,
    fileName: "DZSurvival_Collection_4003",
    objectiveText: "Gather 10x Rag.",
    items: [{ amount: 10, className: "Rag" }],
  },
  {
    id: 4004,
    fileName: "DZSurvival_Collection_4004",
    objectiveText: "Gather 5x Metal Plate.",
    items: [{ amount: 5, className: "MetalPlate" }],
  },
];

export interface CraftingObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  itemNames: string[];
  executionAmount: number;
}

export const CRAFTING_OBJECTIVES: CraftingObjectiveDef[] = [
  {
    id: 6000,
    fileName: "DZSurvival_Crafting_6000",
    objectiveText: "Craft an Improvised Fishing Rod.",
    itemNames: ["ImprovisedFishingRod"],
    executionAmount: 1,
  },
];

export type BoolNum = 0 | 1;
export const FALSE = 0 as const;
export const TRUE = 1 as const;

// --- Quest definitions -----------------------------------------------------

export interface QuestReward {
  className: string;
  amount: number;
}

export interface QuestObjectiveRef {
  type: keyof typeof OBJECTIVE_TYPE;
  id: number;
}

export interface QuestDef {
  id: number;
  fileName: string;
  title: string;
  objectiveText: string;
  /** [accept, active, turn-in] flavor text - ExpansionQuestConfig.Descriptions. */
  descriptions: [string, string, string];
  questGiverIds: number[];
  questTurnInIds: number[];
  preQuestIds: number[];
  repeatable: BoolNum;
  isDailyQuest: BoolNum;
  objectives: QuestObjectiveRef[];
  rewards: QuestReward[];
}

export interface QuestNpcDef {
  id: number;
  fileName: string;
  className: string;
  offset: [number, number, number];
  orientation: [number, number, number];
  name: string;
  defaultText: string;
  loadoutFile: string;
}

// NPC IDs: 1 = Daniels, 2-3 = guards, 4 = Sery
// Sery's filename kept as "DZSurvival_NPC_Fence.json" — internal artifact
// name; changing it would leave stale files on deployed servers.
export const QUEST_NPCS: QuestNpcDef[] = [
  {
    id: MISSION_GIVER_ID,
    fileName: "DZSurvival_NPC_Quartermaster.json",
    className: MISSION_GIVER_CLASSNAME,
    offset: MISSION_GIVER_OFFSET,
    orientation: MISSION_GIVER_ORIENTATION,
    name: "Taskmaster Daniels",
    defaultText: "You need something? Talk to me if you're looking for work.",
    loadoutFile: "TaskmasterLoadout",
  },
  {
    id: 2,
    fileName: "DZSurvival_NPC_Guard1.json",
    className: "ExpansionQuestNPCBoris",
    offset: GUARD_1_OFFSET,
    orientation: GUARD_1_ORIENTATION,
    name: "Compound Guard",
    defaultText: "Move along. Taskmaster's business is his own.",
    loadoutFile: "GuardLoadout",
  },
  {
    id: 3,
    fileName: "DZSurvival_NPC_Guard2.json",
    className: "ExpansionQuestNPCKaito",
    offset: GUARD_2_OFFSET,
    orientation: GUARD_2_ORIENTATION,
    name: "Compound Guard",
    defaultText: "Eyes open. Wouldn't want trouble finding the Taskmaster.",
    loadoutFile: "GuardLoadout",
  },
  {
    id: 4,
    fileName: "DZSurvival_NPC_Fence.json",
    className: SERY_CLASSNAME,
    offset: SERY_OFFSET,
    orientation: SERY_ORIENTATION,
    name: "Sery",
    defaultText: "I don't do introductions. You got what I want, or you know where to get it.",
    loadoutFile: "TraderBlueLoadout",
  },
];

// DayZ-Expansion-Quests: a full quest line for this server, built entirely
// as hand-authored JSON (this project's normal "ensure" pattern), not as a
// custom mod/PBO. Schema/paths/enum values below were all pulled directly
// from the mod's own source (salutesh/DayZ-Expansion-Scripts, `experimental`
// branch) rather than guessed - see each interface's comment for the
// authoritative source file.
//
// One mission-giver NPC ("Taskmaster Daniels") at the custom trader city
// hands out a 14-quest main chain (gated in sequence via PreQuestIDs) plus 8
// standalone, repeatable side quests for gold. Two more static, non-quest
// "guard" NPCs (same ExpansionQuestNPC mechanism, just never referenced by
// any QuestGiverIDs/QuestTurnInIDs) flank him for atmosphere - see
// QUEST_NPCS below. The first main quest has no
// QuestGiverIDs, so it auto-starts for every player on connect (see
// ExpansionQuestModule::InitClientQuests_Stage2 - any quest with empty
// QuestGiverIDs/PreQuestIDs/not-a-group-quest is silently created for every
// player the first time they connect) - it only needs a turn-in, which is
// what introduces the player to the mission giver.
//
// Every position/classname below is either a real, already-scouted
// coordinate reused from elsewhere in this project (CUSTOM_POSITION offsets,
// the Water Station/Stary Sobor coordinates already committed in
// traders.ts/customKeycards.ts/hazards.ts) or a classname confirmed to
// actually exist in this project's own db/types.xml or in
// DayZ-Expansion-Quests' own shipped example quest data
// (ExpansionDefaultQuestData.c) - nothing here is guessed. Objective types
// intentionally used: TRAVEL, TARGET, DELIVERY, COLLECT, CRAFTING -
// TREASUREHUNT/ACTION/AIPATROL/AICAMP/AIESCORT were left out because their
// extra nested schemas (ExpansionLoot, real DayZ ActionBase classnames,
// ExpansionQuestAISpawn) couldn't be confirmed from source in the time
// available; safer to ship a smaller, fully-verified set than guess at those.

import {
  EXPANSION_QUEST_SETTINGS,
  EXPANSION_QUESTS_DIR,
  EXPANSION_QUESTS_NPCS_DIR,
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
  EXPANSION_QUESTS_QUESTS_DIR,
} from "../constants/paths.ts";
import { CUSTOM_POSITION } from "../config/traders.ts";
import { log, ok } from "../ui.ts";
import { exists } from "../steam.ts";

// ExpansionQuestObjectiveType enum values (ExpansionQuestObjectiveType.c) -
// only the ones actually used below.
const OBJECTIVE_TYPE = {
  TARGET: 2,
  TRAVEL: 3,
  COLLECT: 4,
  DELIVERY: 5,
  CRAFTING: 11,
} as const;

// Current on-disk schema versions this mod expects (ExpansionQuestConfig.
// CONFIGVERSION / ExpansionQuestObjectiveConfig.CONFIGVERSION /
// ExpansionQuestNPCData.CONFIGVERSION) - writing anything lower would
// trigger the mod's own migration logic on load, which we want to avoid.
const QUEST_CONFIG_VERSION = 22;
const OBJECTIVE_CONFIG_VERSION = 28;
const NPC_CONFIG_VERSION = 6;

const GOLD_CLASSNAME = "ExpansionGoldNugget";

// The mission giver's real, physical skin. Confirmed spawnable classname
// (from the mod's own ExpansionQuestNPC.c): "ExpansionQuestNPCMirek" -
// distinct from this project's two existing trader NPCs
// (ExpansionTraderDenis/Cyril, see traders.ts). His actual visible outfit
// comes from NPCLoadoutFile (TaskmasterLoadout, see traders.ts's
// TASKMASTER_GEAR) - a deliberately different look from the General
// Trader's TraderBlueLoadout so the two don't read as the same NPC.
const MISSION_GIVER_ID = 1;
const MISSION_GIVER_CLASSNAME = "ExpansionQuestNPCMirek";
// Offset in meters from CUSTOM_POSITION (traders.ts's own convention) -
// scouted spot near the General Store NPC (offset [0,0,0]), clear of the
// Vehicle Dealer NPC/vehicle spawn points (offset ~[34-77, ..., -34..6]).
const MISSION_GIVER_OFFSET: [number, number, number] = [-7.35, 0, -9.7];
const MISSION_GIVER_ORIENTATION: [number, number, number] = [45, 0, 0];

// Two static guards flanking Taskmaster Daniels - decorative only (never
// referenced by any quest's QuestGiverIDs/QuestTurnInIDs), same
// ExpansionQuestNPC mechanism, offsets from CUSTOM_POSITION as scouted.
const GUARD_1_OFFSET: [number, number, number] = [18.58, 2.146, -3.9];
const GUARD_1_ORIENTATION: [number, number, number] = [99.8114, 0, 0];
const GUARD_2_OFFSET: [number, number, number] = [18.27, 2.557, -12.3];
const GUARD_2_ORIENTATION: [number, number, number] = [75.2741, 0, 0];

// --- Objective definitions ------------------------------------------------

interface TravelObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  /** Absolute world position - either CUSTOM_POSITION + offset, or a real, already-scouted coordinate. */
  position: [number, number, number];
  maxDistance: number;
  markerName: string;
}

const TRAVEL_OBJECTIVES: TravelObjectiveDef[] = [
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

interface TargetObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  classNames: string[];
  amount: number;
}

const TARGET_OBJECTIVES: TargetObjectiveDef[] = [
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

interface DeliveryItem {
  amount: number;
  className: string;
}

interface DeliveryObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  items: DeliveryItem[];
}

const DELIVERY_OBJECTIVES: DeliveryObjectiveDef[] = [
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

interface CollectionObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  items: DeliveryItem[];
}

const COLLECTION_OBJECTIVES: CollectionObjectiveDef[] = [
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

interface CraftingObjectiveDef {
  id: number;
  fileName: string;
  objectiveText: string;
  itemNames: string[];
  executionAmount: number;
}

const CRAFTING_OBJECTIVES: CraftingObjectiveDef[] = [
  {
    id: 6000,
    fileName: "DZSurvival_Crafting_6000",
    objectiveText: "Craft an Improvised Fishing Rod.",
    itemNames: ["ImprovisedFishingRod"],
    executionAmount: 1,
  },
];

// --- Quest definitions -----------------------------------------------------

interface QuestReward {
  className: string;
  amount: number;
}

interface QuestObjectiveRef {
  type: keyof typeof OBJECTIVE_TYPE;
  id: number;
}

interface QuestDef {
  id: number;
  fileName: string;
  title: string;
  objectiveText: string;
  /** [accept, active, turn-in] flavor text - ExpansionQuestConfig.Descriptions. */
  descriptions: [string, string, string];
  questGiverIds: number[];
  questTurnInIds: number[];
  preQuestIds: number[];
  repeatable: boolean;
  isDailyQuest: boolean;
  objectives: QuestObjectiveRef[];
  rewards: QuestReward[];
}

// Main chain: 10 quests, gated in sequence via PreQuestIDs, all given out
// and turned in at the single mission-giver NPC. Quest #1 has no
// QuestGiverIDs at all, so it auto-starts for every player on first connect
// (see this file's header comment) - its only job is to get the player to
// walk over and meet Taskmaster Daniels.
const MAIN_QUESTS: QuestDef[] = [
  {
    id: 1000,
    fileName: "DZSurvival_Quest_1000",
    title: "Welcome to Romashka Farm",
    objectiveText: "Make your way to Romashka Farm and speak with Taskmaster Daniels.",
    descriptions: [
      "Word travels fast around here - a new face always does. There's a place called Romashka Farm nearby; go take a look and ask for Taskmaster Daniels.",
      "Romashka Farm is marked on your map. Go on, it's not far.",
      "So you made it. Good. I keep track of who comes and goes through here - and I've got work, if you're interested.",
    ],
    questGiverIds: [],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TRAVEL", id: 1000 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 250 }],
  },
  {
    id: 1001,
    fileName: "DZSurvival_Quest_1001",
    title: "Prove You Can Handle Yourself",
    objectiveText: "Kill 15 Infected.",
    descriptions: [
      "This place stays standing because the people in it can handle themselves. Clear out fifteen of those things and I'll know you're not dead weight.",
      "Fifteen Infected. Go on, they're not hard to find.",
      "Not bad. You didn't come back missing any fingers, either.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1000],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TARGET", id: 2000 }],
    rewards: [
      { className: GOLD_CLASSNAME, amount: 400 },
      { className: "TRQ_DecoyGrenade", amount: 1 },
    ],
  },
  {
    id: 1002,
    fileName: "DZSurvival_Quest_1002",
    title: "Thin the Pack",
    objectiveText: "Kill 5 wolves.",
    descriptions: [
      "Wolves have been getting bold near the edges of town. Thin the pack out - five of them ought to send a message.",
      "Five wolves. Watch your back out there, they don't hunt alone.",
      "Good. Quiet nights again, for a while at least.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1001],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TARGET", id: 2001 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 450 }],
  },
  {
    id: 1003,
    fileName: "DZSurvival_Quest_1003",
    title: "Boar Hunt",
    objectiveText: "Kill 3 wild boar.",
    descriptions: [
      "Boar meat keeps better than most and there's always someone asking for it. Bring me down three of them.",
      "Three wild boar. They're tougher than they look, mind the charge.",
      "That'll keep a few bellies full. Here, take this - you've earned it.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1002],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TARGET", id: 2002 }],
    rewards: [
      { className: GOLD_CLASSNAME, amount: 500 },
      { className: "TaloonBag_Green", amount: 1 },
    ],
  },
  {
    id: 1004,
    fileName: "DZSurvival_Quest_1004",
    title: "Supply Run",
    objectiveText: "Deliver 5x Tuna Can and 5x Water Bottle.",
    descriptions: [
      "We're running low on stock. Bring me five tins of tuna and five bottles of water and I'll make it worth your while.",
      "Five Tuna Cans, five Water Bottles. Scavenge them or trade for them, I don't care which.",
      "That'll do. This place doesn't run itself.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1003],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "DELIVERY", id: 3000 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 600 }],
  },
  {
    id: 1005,
    fileName: "DZSurvival_Quest_1005",
    title: "Fresh off the Vine",
    objectiveText: "Gather 3x Apple, 3x Pear and 3x Plum.",
    descriptions: [
      "Everyone's sick of canned everything. Bring me some real fruit - apples, pears, plums, three of each - and I'll pay well for it.",
      "Three apples, three pears, three plums. Orchards and gardens are your best bet.",
      "Now that's something. First fresh thing I've eaten in weeks.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1004],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "COLLECT", id: 4000 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 650 }],
  },
  {
    id: 1006,
    fileName: "DZSurvival_Quest_1006",
    title: "Scout the Waterworks",
    objectiveText: "Scout the old Water Station north of here.",
    descriptions: [
      "There's an old water station north of here I need eyes on. Go take a look around, make sure it's still standing.",
      "The Water Station is marked on your map. Just get eyes on it.",
      "Good, appreciated. Here - found this on a supplier a while back, figured you could use it.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1005],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TRAVEL", id: 1001 }],
    rewards: [
      { className: GOLD_CLASSNAME, amount: 700 },
      { className: "evg_keycards_Yellow", amount: 1 },
    ],
  },
  {
    id: 1007,
    fileName: "DZSurvival_Quest_1007",
    title: "Into the Hot Zone",
    objectiveText: "Head to Stary Sobor and confirm the radiation reading with your own eyes.",
    descriptions: [
      "Stary Sobor's gone hot - real hot. I need someone to confirm it with their own eyes, not just rumors. Bring protection if you value your bone marrow.",
      "Head for Stary Sobor. If your dosimeter starts climbing, you're close enough.",
      "Confirmed, then. Stay out of there unless you've got a good reason - or good gear.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1006],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TRAVEL", id: 1002 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 800 }],
  },
  {
    id: 1008,
    fileName: "DZSurvival_Quest_1008",
    title: "The Big Game",
    objectiveText: "Kill 1 bear.",
    descriptions: [
      "Bears are rare out here, and dangerous for it. Bring one down and you'll have proven you belong on this island.",
      "One bear. Don't underestimate it - they don't go down easy.",
      "Now that's a trophy. Not many can say they've done that.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1007],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TARGET", id: 2003 }],
    rewards: [
      { className: GOLD_CLASSNAME, amount: 1200 },
      { className: "evg_keycards_Blue", amount: 1 },
    ],
  },
  {
    id: 1009,
    fileName: "DZSurvival_Quest_1009",
    title: "Steady Hands",
    objectiveText: "Craft an Improvised Fishing Rod, then catch 2x Mackerel.",
    descriptions: [
      "You've proven you can fight and hunt. Now show me you can slow down and actually survive out here - craft a fishing rod and bring me back a couple of Mackerel.",
      "Craft an Improvised Fishing Rod first, then go catch two Mackerel with it.",
      "There it is. A steady hand catches dinner without wasting a single round. You'll do just fine out here.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1008],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "CRAFTING", id: 6000 }, { type: "COLLECT", id: 4001 }],
    rewards: [
      { className: GOLD_CLASSNAME, amount: 900 },
      { className: "ImprovisedFishingRod", amount: 1 },
    ],
  },
  {
    id: 1010,
    fileName: "DZSurvival_Quest_1010",
    title: "Wheels Up",
    objectiveText: "Deliver 1x Car Battery and 2x Spark Plug.",
    descriptions: [
      "Got a vehicle up on blocks that just needs parts. Bring me a battery and a couple of spark plugs and we'll get it running again.",
      "One Car Battery, two Spark Plugs. Garages and gas stations are your best bet.",
      "That'll do it. Give it a week and this thing'll be back on the road.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1009],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "DELIVERY", id: 3002 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 950 }],
  },
  {
    id: 1011,
    fileName: "DZSurvival_Quest_1011",
    title: "Key to the Vault",
    objectiveText: "Deliver 1x Green Keycard.",
    descriptions: [
      "I've got a contact who can cut you a better key, but he wants a common one to work from. Bring me a Green Keycard and I'll see what I can arrange.",
      "One Green Keycard. Plenty of those turn up if you know where to look.",
      "Good. Here - this one opens doors that green never could. Don't waste it.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1010],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "DELIVERY", id: 3003 }],
    rewards: [
      { className: GOLD_CLASSNAME, amount: 1000 },
      { className: "evg_keycards_Violet", amount: 1 },
    ],
  },
  {
    id: 1012,
    fileName: "DZSurvival_Quest_1012",
    title: "Beast of Burden",
    objectiveText: "Kill 10 rabbits or squirrels.",
    descriptions: [
      "Small game's easy pickings if you've got the patience for it. Bring me ten - rabbits, squirrels, don't matter which.",
      "Ten rabbits or squirrels, any mix. Treelines and hedgerows are thick with them.",
      "Not glamorous, but it's meat on the table. Appreciated.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1011],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TARGET", id: 2006 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 850 }],
  },
  {
    id: 1013,
    fileName: "DZSurvival_Quest_1013",
    title: "Camp Cleared",
    objectiveText: "Push into the raider camp at NWAF and hold your ground.",
    descriptions: [
      "There's a raider camp dug in near NWAF that's been picking off scavengers all week. I need someone to walk in there and settle it - permanently, if you can manage it.",
      "Head for NWAF. You'll know the camp when the shooting starts.",
      "Word already got back to me. That camp won't be bothering anyone again. You've more than earned your keep here.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1012],
    repeatable: false,
    isDailyQuest: false,
    objectives: [{ type: "TRAVEL", id: 1003 }],
    rewards: [
      { className: GOLD_CLASSNAME, amount: 1500 },
      { className: "evg_keycards_Red", amount: 1 },
    ],
  },
];

// Side quests: standalone, always available (no PreQuestIDs), repeatable
// currency grinds. A couple are capped once/day (IsDailyQuest); the rest
// have no cooldown at all when Repeatable is true without IsDailyQuest/
// IsWeeklyQuest (confirmed via ExpansionQuestModule::CompleteQuest - the
// cooldown-timestamp block only runs for daily/weekly quests), so those are
// free to grind back-to-back.
const SIDE_QUESTS: QuestDef[] = [
  {
    id: 1100,
    fileName: "DZSurvival_Quest_1100",
    title: "Vermin Control",
    objectiveText: "Kill 20 Infected.",
    descriptions: [
      "Always more of those things than there are of us. Clear out twenty and there's gold in it for you - once a day, mind.",
      "Twenty Infected. Come back tomorrow if you want to do this again.",
      "That's today's batch dealt with. Come back tomorrow.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: true,
    isDailyQuest: true,
    objectives: [{ type: "TARGET", id: 2004 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 300 }],
  },
  {
    id: 1101,
    fileName: "DZSurvival_Quest_1101",
    title: "Deer Season",
    objectiveText: "Kill 3 deer.",
    descriptions: [
      "There's always a buyer for venison. Bring me three deer, any time you've got them - no need to wait between trips.",
      "Three deer, red or roe, doesn't matter which.",
      "Good hunting. Come back whenever you've got more.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: true,
    isDailyQuest: false,
    objectives: [{ type: "TARGET", id: 2005 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 350 }],
  },
  {
    id: 1102,
    fileName: "DZSurvival_Quest_1102",
    title: "Bottled Sunshine",
    objectiveText: "Gather 5x Water Bottle.",
    descriptions: [
      "Clean water's always worth something. Bring me five bottles and I'll pay - once a day, no more.",
      "Five Water Bottles. Any well or pump will do.",
      "That'll keep us going a while longer. Come back tomorrow.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: true,
    isDailyQuest: true,
    objectives: [{ type: "COLLECT", id: 4002 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 200 }],
  },
  {
    id: 1103,
    fileName: "DZSurvival_Quest_1103",
    title: "Rags to Riches",
    objectiveText: "Gather 10x Rag.",
    descriptions: [
      "Cloth's always in short supply. Bring me ten rags whenever you've got them - no waiting between trips.",
      "Ten Rags. Torn shirts, whatever you can find.",
      "Every bit helps. Come back whenever you've got more.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: true,
    isDailyQuest: false,
    objectives: [{ type: "COLLECT", id: 4003 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 250 }],
  },
  {
    id: 1104,
    fileName: "DZSurvival_Quest_1104",
    title: "Firewood for the Fire",
    objectiveText: "Deliver 10x Wooden Log.",
    descriptions: [
      "Nights get cold and the fire doesn't feed itself. Bring me ten wooden logs and I'll pay for the trouble - once a day.",
      "Ten Wooden Logs. Any treeline will do.",
      "That'll keep the fire going a good while. Come back tomorrow.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: true,
    isDailyQuest: true,
    objectives: [{ type: "DELIVERY", id: 3001 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 300 }],
  },
  {
    id: 1105,
    fileName: "DZSurvival_Quest_1105",
    title: "Small Game",
    objectiveText: "Kill 5 rabbits or squirrels.",
    descriptions: [
      "Quick work if you've got a light touch. Five rabbits or squirrels, any mix, whenever you've got them.",
      "Five rabbits or squirrels. No need to wait between trips.",
      "Not much, but it adds up. Come back whenever.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: true,
    isDailyQuest: false,
    objectives: [{ type: "TARGET", id: 2007 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 200 }],
  },
  {
    id: 1106,
    fileName: "DZSurvival_Quest_1106",
    title: "Fuel Run",
    objectiveText: "Deliver 2x Canister Gasoline.",
    descriptions: [
      "Generators and vehicles both drink the stuff faster than we can find it. Bring me two canisters, whenever you've got them - once a day, mind.",
      "Two Canister Gasoline. Gas stations are your best bet.",
      "That'll keep the lights on a while longer. Come back tomorrow.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: true,
    isDailyQuest: true,
    objectives: [{ type: "DELIVERY", id: 3004 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 300 }],
  },
  {
    id: 1107,
    fileName: "DZSurvival_Quest_1107",
    title: "Scrap Drive",
    objectiveText: "Gather 5x Metal Plate.",
    descriptions: [
      "Always building something around here. Bring me five metal plates whenever you've got them - no waiting between trips.",
      "Five Metal Plates. Sheds and garages are worth checking.",
      "Every bit helps. Come back whenever you've got more.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: true,
    isDailyQuest: false,
    objectives: [{ type: "COLLECT", id: 4004 }],
    rewards: [{ className: GOLD_CLASSNAME, amount: 275 }],
  },
];

const ALL_QUESTS = [...MAIN_QUESTS, ...SIDE_QUESTS];

// --- JSON body builders ----------------------------------------------------

function travelObjectiveJson(def: TravelObjectiveDef): string {
  return JSON.stringify(
    {
      ConfigVersion: OBJECTIVE_CONFIG_VERSION,
      ID: def.id,
      ObjectiveType: OBJECTIVE_TYPE.TRAVEL,
      ObjectiveText: def.objectiveText,
      TimeLimit: -1,
      Active: true,
      Position: def.position,
      MaxDistance: def.maxDistance,
      MarkerName: def.markerName,
      ShowDistance: true,
      TriggerOnEnter: true,
      TriggerOnExit: false,
    },
    null,
    4,
  );
}

function targetObjectiveJson(def: TargetObjectiveDef): string {
  return JSON.stringify(
    {
      ConfigVersion: OBJECTIVE_CONFIG_VERSION,
      ID: def.id,
      ObjectiveType: OBJECTIVE_TYPE.TARGET,
      ObjectiveText: def.objectiveText,
      TimeLimit: -1,
      Active: true,
      Position: [0, 0, 0],
      MaxDistance: -1,
      MinDistance: -1,
      Amount: def.amount,
      ClassNames: def.classNames,
      CountSelfKill: false,
      AllowedWeapons: [],
      ExcludedClassNames: [],
      CountAIPlayers: false,
      AllowedTargetFactions: [],
      AllowedDamageZones: [],
    },
    null,
    4,
  );
}

function deliveryObjectiveJson(def: DeliveryObjectiveDef): string {
  return JSON.stringify(
    {
      ConfigVersion: OBJECTIVE_CONFIG_VERSION,
      ID: def.id,
      ObjectiveType: OBJECTIVE_TYPE.DELIVERY,
      ObjectiveText: def.objectiveText,
      TimeLimit: -1,
      Active: true,
      Collections: def.items.map((i) => ({
        Amount: i.amount,
        ClassName: i.className,
        QuantityPercent: -1,
        MinQuantityPercent: -1,
      })),
      ShowDistance: true,
      AddItemsToNearbyMarketZone: false,
      MaxDistance: 10.0,
      MarkerName: "Deliver Items",
    },
    null,
    4,
  );
}

function collectionObjectiveJson(def: CollectionObjectiveDef): string {
  return JSON.stringify(
    {
      ConfigVersion: OBJECTIVE_CONFIG_VERSION,
      ID: def.id,
      ObjectiveType: OBJECTIVE_TYPE.COLLECT,
      ObjectiveText: def.objectiveText,
      TimeLimit: -1,
      Active: true,
      Collections: def.items.map((i) => ({
        Amount: i.amount,
        ClassName: i.className,
        QuantityPercent: -1,
        MinQuantityPercent: -1,
      })),
      ShowDistance: true,
      AddItemsToNearbyMarketZone: false,
      NeedAnyCollection: false,
    },
    null,
    4,
  );
}

function craftingObjectiveJson(def: CraftingObjectiveDef): string {
  return JSON.stringify(
    {
      ConfigVersion: OBJECTIVE_CONFIG_VERSION,
      ID: def.id,
      ObjectiveType: OBJECTIVE_TYPE.CRAFTING,
      ObjectiveText: def.objectiveText,
      TimeLimit: -1,
      Active: true,
      ItemNames: def.itemNames,
      ExecutionAmount: def.executionAmount,
    },
    null,
    4,
  );
}

function questJson(def: QuestDef): string {
  return JSON.stringify(
    {
      ConfigVersion: QUEST_CONFIG_VERSION,
      ID: def.id,
      Type: 1, // ExpansionQuestType.NORMAL
      Title: def.title,
      Descriptions: def.descriptions,
      ObjectiveText: def.objectiveText,
      FollowUpQuest: -1,
      Repeatable: def.repeatable,
      IsDailyQuest: def.isDailyQuest,
      IsWeeklyQuest: false,
      CancelQuestOnPlayerDeath: false,
      Autocomplete: false,
      IsGroupQuest: false,
      ObjectSetFileName: "",
      QuestItems: [],
      Rewards: def.rewards.map((r) => ({
        ClassName: r.className,
        Amount: r.amount,
        Attachments: [],
        DamagePercent: 0,
        QuestID: -1,
        Chance: 1.0,
      })),
      NeedToSelectReward: false,
      RandomReward: false,
      RandomRewardAmount: -1,
      RewardsForGroupOwnerOnly: true,
      RewardBehavior: 0, // RANDOMIZED_ON_COMPLETION - irrelevant with a single fixed reward set
      QuestGiverIDs: def.questGiverIds,
      QuestTurnInIDs: def.questTurnInIds,
      IsAchievement: false,
      Objectives: def.objectives.map((o) => ({
        ConfigVersion: OBJECTIVE_CONFIG_VERSION,
        ID: o.id,
        ObjectiveType: OBJECTIVE_TYPE[o.type],
      })),
      QuestColor: 0,
      ReputationReward: 0,
      ReputationRequirement: -1,
      PreQuestIDs: def.preQuestIds,
      RequiredFaction: "",
      FactionReward: "",
      PlayerNeedQuestItems: true,
      DeleteQuestItems: true,
      SequentialObjectives: true,
      FactionReputationRequirements: {},
      FactionReputationRewards: {},
      SuppressQuestLogOnCompetion: false,
      Active: true,
    },
    null,
    4,
  );
}

interface QuestNpcDef {
  id: number;
  fileName: string;
  className: string;
  offset: [number, number, number];
  orientation: [number, number, number];
  name: string;
  defaultText: string;
  loadoutFile: string;
}

// Filename for the mission giver deliberately kept as
// "DZSurvival_NPC_Quartermaster.json" even after the rename to "Taskmaster
// Daniels" - it's just an internal artifact name, and changing it would
// leave the old file behind on an already-deployed server (writeIfChanged
// only ever adds/updates files by name, never deletes stale ones), risking
// two on-disk NPC files both claiming ID 1.
const QUEST_NPCS: QuestNpcDef[] = [
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
];

function npcJson(def: QuestNpcDef): string {
  return JSON.stringify(
    {
      ConfigVersion: NPC_CONFIG_VERSION,
      ID: def.id,
      ClassName: def.className,
      Position: [
        CUSTOM_POSITION![0] + def.offset[0],
        CUSTOM_POSITION![1] + def.offset[1],
        CUSTOM_POSITION![2] + def.offset[2],
      ],
      Orientation: def.orientation,
      NPCName: def.name,
      DefaultNPCText: def.defaultText,
      // Confirmed live: DayZ-Expansion-Quests' own ExpansionQuestNPCDataBase.
      // SpawnNPC() (Quests source, ExpansionQuestNpcData.c) unconditionally
      // calls ExpansionHumanLoadout.Apply(npc, GetLoadoutFile(), false) even
      // when this is blank - and ExpansionLoadout.Load("") always fails,
      // logging "Unknown loadout requested ('')" on every single server
      // start (harmless - Apply() just returns false and leaves the NPC's
      // ClassName-default gear untouched - but avoidable log noise). Every
      // QUEST_NPCS entry above points at a real, registered loadout file
      // (see traders.ts's CUSTOM_LOADOUTS) so this edge case never triggers.
      NPCLoadoutFile: def.loadoutFile,
      NPCInteractionEmoteID: 6, // EmoteConstants.ID_EMOTE_GREETING
      NPCQuestCancelEmoteID: 8, // ID_EMOTE_SHRUG
      NPCQuestStartEmoteID: 3, // ID_EMOTE_NOD
      NPCQuestCompleteEmoteID: 9, // ID_EMOTE_CLAP
      NPCType: 0, // ExpansionQuestNPCType.NORMAL
      Active: true,
    },
    null,
    4,
  );
}

// --- File writers -----------------------------------------------------------

async function writeIfChanged(path: string, body: string): Promise<boolean> {
  const existing = (await exists(path)) ? await Deno.readTextFile(path) : null;
  if (existing === body) return false;
  await Deno.writeTextFile(path, body);
  return true;
}

// DayZ-Expansion-Quests' own DefaultQuestData()/DefaultQuestNPCData()/
// Default<Type>ObjectivesData() (ExpansionQuestModule.c) write these exact
// filenames the first time each folder is created - safe to delete
// unconditionally since our own files are all named "DZSurvival_*" and never
// collide with them. Keeping the mod's own generic example quests around
// would otherwise clutter the quest board/log alongside ours.
const DEFAULT_QUEST_FILES = Array.from({ length: 24 }, (_, i) => `Quest_${i + 1}.json`);
const DEFAULT_NPC_FILES = Array.from({ length: 3 }, (_, i) => `QuestNPC_${i + 1}.json`);
const DEFAULT_TRAVEL_FILES = Array.from({ length: 7 }, (_, i) => `Objective_T_${i + 1}.json`);
const DEFAULT_TARGET_FILES = Array.from({ length: 4 }, (_, i) => `Objective_TA_${i + 1}.json`);
const DEFAULT_DELIVERY_FILES = Array.from({ length: 2 }, (_, i) => `Objective_D_${i + 1}.json`);
const DEFAULT_COLLECTION_FILES = Array.from({ length: 3 }, (_, i) => `Objective_C_${i + 1}.json`);
const DEFAULT_CRAFTING_FILES = ["Objective_CR_1.json"];
const DEFAULT_ACTION_FILES = Array.from({ length: 2 }, (_, i) => `Objective_A_${i + 1}.json`);
const DEFAULT_TREASUREHUNT_FILES = ["Objective_TH_1.json"];
const DEFAULT_AIPATROL_FILES = ["Objective_AIP_1.json"];
const DEFAULT_AICAMP_FILES = ["Objective_AIC_1.json"];
const DEFAULT_AIESCORT_FILES = ["Objective_AIESCORT_1.json"];

async function deleteDefaultExamples(dir: string, fileNames: string[]): Promise<number> {
  let removed = 0;
  for (const name of fileNames) {
    const path = `${dir}/${name}`;
    if (await exists(path)) {
      await Deno.remove(path);
      removed++;
    }
  }
  return removed;
}

async function cleanupDefaultQuestExamples(): Promise<void> {
  const removed = await Promise.all([
    deleteDefaultExamples(EXPANSION_QUESTS_QUESTS_DIR, DEFAULT_QUEST_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_NPCS_DIR, DEFAULT_NPC_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_TRAVEL_DIR, DEFAULT_TRAVEL_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_TARGET_DIR, DEFAULT_TARGET_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_DELIVERY_DIR, DEFAULT_DELIVERY_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_COLLECTION_DIR, DEFAULT_COLLECTION_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_CRAFTING_DIR, DEFAULT_CRAFTING_FILES),
    // None of these objective types are authored by this project (see this
    // file's header comment for why), but the mod still generates their
    // example files alongside everything else whenever DayZ-Expansion-AI is
    // active (AIPatrol/AICamp/AIVIP) - clean those up too so nothing's left
    // dangling.
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_ACTION_DIR, DEFAULT_ACTION_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_TREASUREHUNT_DIR, DEFAULT_TREASUREHUNT_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_AIPATROL_DIR, DEFAULT_AIPATROL_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_AICAMP_DIR, DEFAULT_AICAMP_FILES),
    deleteDefaultExamples(EXPANSION_QUESTS_OBJECTIVES_AIVIP_DIR, DEFAULT_AIESCORT_FILES),
  ]);
  const total = removed.reduce((a, b) => a + b, 0);
  if (total > 0) {
    ok(`Removed ${total} DayZ-Expansion-Quests example quest/NPC/objective file(s)`);
  }
}

/** Confirms/patches EnableQuests on - the mod already defaults this to true, so this is defensive only. */
async function ensureQuestsEnabled(): Promise<void> {
  if (!(await exists(EXPANSION_QUEST_SETTINGS))) return;
  const text = await Deno.readTextFile(EXPANSION_QUEST_SETTINGS);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return; // malformed/mid-write - don't guess, next start will retry
  }
  if (data.EnableQuests === true) return;
  data.EnableQuests = true;
  await Deno.writeTextFile(EXPANSION_QUEST_SETTINGS, JSON.stringify(data, null, 4));
  ok(`Enabled DayZ-Expansion-Quests in ${EXPANSION_QUEST_SETTINGS}`);
}

export async function ensureQuests(): Promise<void> {
  if (!CUSTOM_POSITION) return; // no scouted trader city yet - see traders.ts

  const haveTree = await Promise.all([
    exists(EXPANSION_QUESTS_QUESTS_DIR),
    exists(EXPANSION_QUESTS_NPCS_DIR),
    exists(EXPANSION_QUESTS_OBJECTIVES_TRAVEL_DIR),
    exists(EXPANSION_QUESTS_OBJECTIVES_TARGET_DIR),
    exists(EXPANSION_QUESTS_OBJECTIVES_DELIVERY_DIR),
    exists(EXPANSION_QUESTS_OBJECTIVES_COLLECTION_DIR),
    exists(EXPANSION_QUESTS_OBJECTIVES_CRAFTING_DIR),
  ]);
  if (haveTree.some((v) => !v)) {
    log(
      `${EXPANSION_QUESTS_QUESTS_DIR} (and siblings) not generated yet - ` +
        "DayZ-Expansion-Quests will create them on first server start",
    );
    return;
  }

  await cleanupDefaultQuestExamples();
  await ensureQuestsEnabled();

  let changed = 0;
  for (const def of QUEST_NPCS) {
    const path = `${EXPANSION_QUESTS_NPCS_DIR}/${def.fileName}`;
    if (await writeIfChanged(path, npcJson(def))) changed++;
  }

  for (const def of TRAVEL_OBJECTIVES) {
    const path = `${EXPANSION_QUESTS_OBJECTIVES_TRAVEL_DIR}/${def.fileName}.json`;
    if (await writeIfChanged(path, travelObjectiveJson(def))) changed++;
  }
  for (const def of TARGET_OBJECTIVES) {
    const path = `${EXPANSION_QUESTS_OBJECTIVES_TARGET_DIR}/${def.fileName}.json`;
    if (await writeIfChanged(path, targetObjectiveJson(def))) changed++;
  }
  for (const def of DELIVERY_OBJECTIVES) {
    const path = `${EXPANSION_QUESTS_OBJECTIVES_DELIVERY_DIR}/${def.fileName}.json`;
    if (await writeIfChanged(path, deliveryObjectiveJson(def))) changed++;
  }
  for (const def of COLLECTION_OBJECTIVES) {
    const path = `${EXPANSION_QUESTS_OBJECTIVES_COLLECTION_DIR}/${def.fileName}.json`;
    if (await writeIfChanged(path, collectionObjectiveJson(def))) changed++;
  }
  for (const def of CRAFTING_OBJECTIVES) {
    const path = `${EXPANSION_QUESTS_OBJECTIVES_CRAFTING_DIR}/${def.fileName}.json`;
    if (await writeIfChanged(path, craftingObjectiveJson(def))) changed++;
  }
  for (const def of ALL_QUESTS) {
    const path = `${EXPANSION_QUESTS_QUESTS_DIR}/${def.fileName}.json`;
    if (await writeIfChanged(path, questJson(def))) changed++;
  }

  if (changed > 0) {
    ok(
      `Wrote ${changed} quest system file(s) (${ALL_QUESTS.length} quests, ${QUEST_NPCS.length} NPCs) ` +
        `to ${EXPANSION_QUESTS_DIR}`,
    );
  }
}

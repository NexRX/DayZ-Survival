import {
  type BoolNum,
  COLLECTION_OBJECTIVES,
  type CollectionObjectiveDef,
  CRAFTING_OBJECTIVES,
  type CraftingObjectiveDef,
  CURRENCY_CLASSNAME,
  CURRENCY_MULTIPLIER,
  DELIVERY_OBJECTIVES,
  type DeliveryItem,
  type DeliveryObjectiveDef,
  FALSE,
  MISSION_GIVER_ID,
  OBJECTIVE_TYPE,
  type QuestDef,
  type QuestObjectiveRef,
  ROMASHKA_LOCATIONS,
  TARGET_OBJECTIVES,
  type TargetObjectiveDef,
  TRAVEL_OBJECTIVES,
  type TravelObjectiveDef,
  TRUE,
} from "./questValues.ts";

// --- ROMASHKA main quest objectives (unique, one per quest, IDs 10000+) ------

const ROMASHKA_TRAVEL: TravelObjectiveDef[] = [
  {
    id: 10000,
    fileName: "DZSurvival_Travel_10000",
    objectiveText: "Reach Romashka Farm before the coast finds you first.",
    position: [
      ROMASHKA_LOCATIONS.romashka[0] + 0,
      ROMASHKA_LOCATIONS.romashka[1] + 0,
      ROMASHKA_LOCATIONS.romashka[2] + 0,
    ],
    maxDistance: 120,
    markerName: "Romashka Farm",
  },
  {
    id: 10001,
    fileName: "DZSurvival_Travel_10001",
    objectiveText: "Eyes on Cherno — don't engage anything. Just look and come back.",
    position: [
      ROMASHKA_LOCATIONS.cherno_rooftop[0],
      ROMASHKA_LOCATIONS.cherno_rooftop[1],
      ROMASHKA_LOCATIONS.cherno_rooftop[2],
    ],
    maxDistance: 80,
    markerName: "Cherno — Lookout",
  },
  {
    id: 10002,
    fileName: "DZSurvival_Travel_10002",
    objectiveText:
      "Into the grey — get to the edge of Stary Sobor and confirm the defector isn't lying.",
    position: [
      ROMASHKA_LOCATIONS.stary_sobor_edge[0],
      ROMASHKA_LOCATIONS.stary_sobor_edge[1],
      ROMASHKA_LOCATIONS.stary_sobor_edge[2],
    ],
    maxDistance: 200,
    markerName: "Stary Sobor — Contaminated",
  },
];

const ROMASHKA_TARGET: TargetObjectiveDef[] = [
  {
    id: 11000,
    fileName: "DZSurvival_Target_11000",
    objectiveText: "Eliminate the Reaper scouts watching the farm.",
    classNames: ["ZombieBase"],
    amount: 3,
  },
  {
    id: 11001,
    fileName: "DZSurvival_Target_11001",
    objectiveText: "Find that Reaper runner before he finds out what you've got.",
    classNames: ["ZombieBase"],
    amount: 1,
  },
  {
    id: 11002,
    fileName: "DZSurvival_Target_11002",
    objectiveText: "Clear out the Cordon sentries posted at Stary Sobor's edge.",
    classNames: ["ZombieBase"],
    amount: 4,
  },
];

const ROMASHKA_DELIVERY: DeliveryObjectiveDef[] = [
  {
    id: 12000,
    fileName: "DZSurvival_Delivery_12000",
    objectiveText: "Deliver the logbook you found to Taskmaster Daniels.",
    items: [{ amount: 1, className: "Marek_Logbook" }],
  },
  {
    id: 12001,
    fileName: "DZSurvival_Delivery_12001",
    objectiveText: "Hand over the Reaper documents Sery wouldn't touch.",
    items: [{ amount: 1, className: "Reaper_Documents" }],
  },
];

const ROMASHKA_COLLECTION: CollectionObjectiveDef[] = [
  {
    id: 13000,
    fileName: "DZSurvival_Collection_13000",
    objectiveText: "Gather cloth and disinfectant before infection finishes what the bite started.",
    items: [
      { amount: 5, className: "Rag" },
      { amount: 2, className: "DisinfectantAlcoholTincture" },
    ],
  },
  {
    id: 13001,
    fileName: "DZSurvival_Collection_13001",
    objectiveText: "Everyone's got a price on what they're carrying — bring me keycards.",
    items: [
      { amount: 2, className: "evg_keycards_White" },
      { amount: 1, className: "evg_keycards_Green" },
    ],
  },
  {
    id: 13002,
    fileName: "DZSurvival_Collection_13002",
    objectiveText: "Collect NWAF clearance materials from across the airfield's zones.",
    items: [
      { amount: 2, className: "evg_keycards_Blue" },
    ],
  },
];

const ROMASHKA_ACTION: TravelObjectiveDef[] = [
  {
    id: 14000,
    fileName: "DZSurvival_Action_14000",
    objectiveText: "Plant three rows of seeds inside the fence — bullets don't grow food.",
    position: [
      ROMASHKA_LOCATIONS.romashka[0] + 15,
      ROMASHKA_LOCATIONS.romashka[1] + 0,
      ROMASHKA_LOCATIONS.romashka[2] + 20,
    ],
    maxDistance: 30,
    markerName: "Farm Fields",
  },
  {
    id: 14001,
    fileName: "DZSurvival_Action_14001",
    objectiveText:
      "Activate the transmitter at Daniels' desk. Whether anyone answers is never confirmed — that's the point.",
    position: [
      ROMASHKA_LOCATIONS.romashka[0] - 3,
      ROMASHKA_LOCATIONS.romashka[1] + 0,
      ROMASHKA_LOCATIONS.romashka[2] + 2,
    ],
    maxDistance: 10,
    markerName: "Daniels' Radio",
  },
];

const ROMASHKA_CRAFTING: CraftingObjectiveDef[] = [
  {
    id: 15000,
    fileName: "DZSurvival_Crafting_15000",
    objectiveText:
      "Build a proper filter assembly — the smell that isn't rot means you need better gear.",
    itemNames: ["GasMaskFilterAssembly"],
    executionAmount: 1,
  },
  {
    id: 15001,
    fileName: "DZSurvival_Crafting_15001",
    objectiveText:
      "Craft a hazmat-grade respirator — Daniels doesn't send people in blind anymore.",
    itemNames: ["HazmatRespirator"],
    executionAmount: 1,
  },
];

// --- ROMASHKA AI objectives (require Expansion-AI) --------------------------

const ROMASHKA_AI_TARGET: TargetObjectiveDef[] = [
  {
    id: 16000,
    fileName: "DZSurvival_Target_16000",
    objectiveText: "Break the Reaper supply patrol working the coast road.",
    classNames: ["ZombieBase"],
    amount: 5,
  },
  {
    id: 16001,
    fileName: "DZSurvival_Target_16001",
    objectiveText: "Clear the Reaper supply line into the warzone.",
    classNames: ["ZombieBase"],
    amount: 6,
  },
  {
    id: 16002,
    fileName: "DZSurvival_Target_16002",
    objectiveText: "Break the Cordon patrol loop around NWAF — they're hunting now.",
    classNames: ["ZombieBase"],
    amount: 6,
  },
];

// --- Quest helper types -----------------------------------------------------

type Q = Omit<QuestDef, "objectiveText"> & {
  /** Short quest title for display. */
  title: string;
  /** The objective text shown to the player — pulled from the objective or custom. */
  objectiveText?: string;
};

function currency(amount: number): { className: string; amount: number }[] {
  return [{ className: CURRENCY_CLASSNAME, amount: amount * CURRENCY_MULTIPLIER }];
}

// --- Main quests (25) -------------------------------------------------------

const MAIN_QUESTS: QuestDef[] = [
  // --- Act I — The Farm ---------------------------------------------------

  // Q1: "Get Up" — Travel
  {
    id: 1,
    fileName: "DZSurvival_Quest_1000",
    title: "Get Up",
    objectiveText: "Reach Romashka Farm before the coast finds you first.",
    descriptions: [
      "You wake up face-down in the sand, salt in your mouth, with nothing but a half-buried notebook in your pocket and no idea whose it was. The last entry is a direction: follow the tree line, avoid the coast road, and head for Romashka.",
      "The map inside is shaky — coordinates, names, a route someone was desperate to keep from being lost. The last destination is circled. Whatever's out there, the writer hoped someone would find it.",
      "The fence looks like it was built by people who had nothing but wanted something to protect. Welcome to the only place out here where people put their guns away.",
    ],
    questGiverIds: [],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TRAVEL", id: ROMASHKA_TRAVEL[0].id },
    ],
    rewards: [
      { className: "Rag", amount: 3 },
      { className: "Marek_Logbook", amount: 1 },
      ...currency(1),
    ],
  },

  // Q2: "What He Left Behind" — Delivery
  {
    id: 2,
    fileName: "DZSurvival_Quest_1001",
    title: "What He Left Behind",
    objectiveText: "Deliver the logbook you found to Taskmaster Daniels.",
    descriptions: [
      "Daniels takes the notebook from your pocket without asking. His expression changes — just for a second — like he recognizes the handwriting. 'This belonged to someone who knew this land before all of this.' He closes it slowly. 'I need you to bring it to me. Properly.'",
      "He doesn't explain why it matters yet. But there's something in the way he handles it that tells you this isn't just paper. It's the first real test of your stay here: prove you can do what you say you'll do.",
      "The logbook goes into a drawer. Daniels looks at you differently after that — not hostile, but measuring. You've passed the first test. Barely.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [1],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "DELIVERY", id: ROMASHKA_DELIVERY[0].id },
    ],
    rewards: [{ className: "Rag", amount: 5 }, ...currency(2)],
  },

  // Q3: "Hands That Work" — Collection
  {
    id: 3,
    fileName: "DZSurvival_Quest_1002",
    title: "Hands That Work",
    objectiveText: "Gather cloth and disinfectant before infection finishes what the bite started.",
    descriptions: [
      `"You want to eat here, you don\u2019t get to just stand around." Daniels isn\u2019t being cruel, he\u2019s being practical \u2014 the farm survives because everyone contributes, and he\u2019s the one stitching people up when the horde gets through.`,
      `He wants cloth and disinfectant, before infection finishes what the bite started on somebody. It\u2019s the kind of work that doesn\u2019t make a good story but keeps people alive.`,
      `Daniels nods when you drop the supplies. "You\u2019re learning. Not everyone does."`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [2],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "COLLECT", id: ROMASHKA_COLLECTION[0].id },
    ],
    rewards: [{ className: "Bandage", amount: 5 }, ...currency(2)],
  },

  // Q4: "Something Growing" — Action
  {
    id: 4,
    fileName: "DZSurvival_Quest_1003",
    title: "Something Growing",
    objectiveText: "Plant three rows of seeds inside the fence — bullets don't grow food.",
    descriptions: [
      `"Bullets don\u2019t grow food." Daniels hands you seeds \u2014 real ones, hoarded, precious \u2014 and walks you to a tilled row inside the fence. It\u2019s the most hopeful thing that\u2019s happened to you since you woke up on that beach.`,
      `He treats it like the most important job on the farm, because it is. Three rows. Don\u2019t mess it up.`,
      `You kneel in the dirt, press each seed into the earth like it matters \u2014 because it does. Daniels watches for a moment, then turns away like he\u2019s not going to be caught being proud.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [3],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "ACTION", id: ROMASHKA_ACTION[0].id },
    ],
    rewards: [{ className: "Potato", amount: 5 }, ...currency(3)],
  },

  // --- Act II — Roots -----------------------------------------------------

  // Q5: "Watchers at the Fence" — Target
  {
    id: 5,
    fileName: "DZSurvival_Quest_1004",
    title: "Watchers at the Fence",
    objectiveText: "Eliminate the Reaper scouts watching the farm.",
    descriptions: [
      `Daniels has been counting the same three silhouettes on the tree line for two nights running, whenever he can spare a minute from the infirmary to look. Not zombies — they don\u2019t stand still that long.`,
      `"Reapers scouting range before they decide if we\u2019re worth the trouble." He wants them gone before they report back with numbers.`,
      "The last one goes down quiet. No alarm, no panic. Just silence, and Daniels finally breathing easy for the first time in days.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [4],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TARGET", id: ROMASHKA_TARGET[0].id },
    ],
    rewards: [{ className: "AmmoPouch", amount: 1 }, ...currency(3)],
  },

  // Q6: "The Coast Road" — AI Patrol
  {
    id: 6,
    fileName: "DZSurvival_Quest_1005",
    title: "The Coast Road",
    objectiveText: "Break the Reaper patrol working the Kamenka–Romashka road.",
    descriptions: [
      "Scouts report back to someone. Daniels has traced their route between shifts patching bite wounds: a Reaper patrol working the road between Kamenka and the farm, shaking down anyone who uses it.",
      `"That road\u2019s how we bring people in. It stays ours." You take the job without asking questions. You\u2019re past that now.`,
      `The patrol doesn\u2019t see you coming. Three down before they know what hit them. The road is yours now.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [5],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AIPATROL", id: ROMASHKA_AI_TARGET[0].id },
    ],
    rewards: [{ className: "AmmoBox556x45", amount: 2 }, ...currency(4)],
  },

  // Q7: "Cut the Head Off" — AI Camp
  {
    id: 7,
    fileName: "DZSurvival_Quest_1006",
    title: "Cut the Head Off",
    objectiveText: "Clear the Reaper checkpoint outside Solnichniy.",
    descriptions: [
      `The patrol answers to a checkpoint dug into the ruins outside Solnichniy. Daniels is blunt about it: "Clear that, they stop bothering us for a while. Won\u2019t stop forever. Nothing does anymore."`,
      `This isn\u2019t a skirmish — it\u2019s a message. Six hostiles, fortified positions, the kind of fight that leaves you shaking afterward.`,
      `When it\u2019s over, the checkpoint is yours. Daniels won\u2019t admit it, but he\u2019s sleeping better already.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [6],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AICAMP", id: ROMASHKA_AI_TARGET[1].id },
    ],
    rewards: [{ className: "RifleOptic_Holospectrum", amount: 1 }, ...currency(5)],
  },

  // Q8: "The One Who Ran" — AI VIP
  {
    id: 8,
    fileName: "DZSurvival_Quest_1007",
    title: "The One Who Ran",
    objectiveText:
      "Bring in the Cordon defector alive — if he\u2019s lying, that\u2019s a problem for another day.",
    descriptions: [
      `A man in a torn Cordon uniform got caught in the wire outside Solnichniy, begging not to be sent back. Daniels doesn\u2019t trust him, but he doesn\u2019t turn away strays either — never has.`,
      `"Bring him in alive. If he\u2019s lying about what he knows, that\u2019s a problem for another day." You nod. You\u2019ve been lied to enough to know when someone\u2019s desperate.`,
      `The defector talks about a smell that isn\u2019t rot. Daniels has dealt with radiation sickness exactly once before, and he still has nightmares about it. This changes things.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [7],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AIVIP", id: ROMASHKA_AI_TARGET[2].id },
    ],
    rewards: [{ className: "evg_keycards_Green", amount: 1 }, ...currency(6)],
  },

  // Q9: "Breathe Easy" — Crafting
  {
    id: 9,
    fileName: "DZSurvival_Quest_1008",
    title: "Breathe Easy",
    objectiveText:
      "Build a proper filter assembly — you go filtered or you don't come back the same.",
    descriptions: [
      `The defector keeps talking about a smell that isn\u2019t rot. Daniels has seen enough field medicine to know what that means.`,
      `"You go anywhere near what he\u2019s talking about, you go filtered or you don\u2019t come back the same." He wants proof you can actually build the gear before he lets you near it.`,
      `The filter clicks together. It won\u2019t save you from everything, but it\u2019ll buy you time. That\u2019s all you can ask for out here.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [8],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "CRAFTING", id: ROMASHKA_CRAFTING[0].id },
    ],
    rewards: [{ className: "GasMask", amount: 1 }, ...currency(4)],
  },

  // Q10: "Beneath the Tide" — Treasure Hunt
  {
    id: 10,
    fileName: "DZSurvival_Quest_1009",
    title: "Beneath the Tide",
    objectiveText: "Find what someone buried near the Kamenka coastline.",
    descriptions: [
      `The logbook had more than names — a set of coordinates tucked into the margins, in handwriting Daniels doesn\u2019t recognize. "Someone was hiding something, or someone was hiding something from whoever wrote this. Only one way to find out which."`,
      `You follow the coordinates to a stretch of beach where the tide\u2019s already chewed away at whatever was buried there. The sand gives up its secrets slowly.`,
      `You dig. Your hands are dirty. The sea doesn\u2019t care. But you find it — and whatever was buried here, someone went to a lot of trouble to keep it hidden.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [9],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TREASUREHUNT", id: ROMASHKA_TARGET[2].id },
    ],
    rewards: [{ className: "evg_keycards_Green", amount: 1 }, ...currency(4)],
  },

  // Q11: "First Blood for the Farm" — Target (first repeat)
  {
    id: 11,
    fileName: "DZSurvival_Quest_1010",
    title: "First Blood for the Farm",
    objectiveText: "Find that Reaper runner before he finds out you already have what was buried.",
    descriptions: [
      `What you found on that beach, someone else wants it back. A Reaper runner\u2019s been spotted asking around Kamenka about buried supplies.`,
      `Daniels doesn\u2019t like loose ends. "Find him before he finds out you already have." The stakes just went up — this isn\u2019t about the farm anymore, it\u2019s about who controls what\u2019s out there.`,
      `One runner. He doesn\u2019t know what you\u2019re hunting him for. You do.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [10],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TARGET", id: ROMASHKA_TARGET[1].id },
    ],
    rewards: [{ className: "Mag_556x45_M4A1", amount: 1 }, ...currency(5)],
  },

  // --- Act III — Blood in the Streets ------------------------------------

  // Q12: "Eyes on the Coast" — Travel
  {
    id: 12,
    fileName: "DZSurvival_Quest_1011",
    title: "Eyes on the Coast",
    objectiveText: "Eyes on Cherno — don't engage anything. Just look and come back.",
    descriptions: [
      `Cherno\u2019s gone quiet, which is worse than loud. Daniels wants eyes on it before the Harvest risks any more trade runs through there.`,
      `"Don\u2019t engage anything. Just look. Tell me what you see." You climb to the rooftop and take it in. The warzone is either quiet or deadly — rarely in between.`,
      "You report back. Daniels listens, nods, and reaches for the radio. Something bigger is coming.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [11],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TRAVEL", id: ROMASHKA_TRAVEL[1].id },
    ],
    rewards: [{ className: "CanisterGasoline", amount: 2 }, ...currency(3)],
  },

  // Q13: "Supply Line" — AI Patrol
  {
    id: 13,
    fileName: "DZSurvival_Quest_1012",
    title: "Supply Line",
    objectiveText: "Break the Reaper supply patrol into the warzone.",
    descriptions: [
      `Reapers don\u2019t hold Cherno, they bleed it — running a supply patrol between the warzone and their checkpoints. Daniels wants that patrol broken so their grip loosens.`,
      `You hit them hard and fast. No negotiations. No prisoners. These aren\u2019t scouts — they\u2019re the lifeline the Reapers run on.`,
      "Cut the line, and the whole operation starts to starve. Daniels already has the next job planned.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [12],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AIPATROL", id: ROMASHKA_AI_TARGET[1].id },
    ],
    rewards: [{ className: "AmmoBox762x39", amount: 2 }, ...currency(5)],
  },

  // Q14: "Picking the Bones" — Collection
  {
    id: 14,
    fileName: "DZSurvival_Quest_1013",
    title: "Picking the Bones",
    objectiveText: "Everyone's got a price on what they're carrying — bring me keycards.",
    descriptions: [
      `This is your first contact with Sery — he doesn\u2019t do introductions. "Everyone\u2019s got a price on what they\u2019re carrying. You\u2019ve got keycards on you, or you know where to get them. I\u2019ve got reasons to want them."`,
      `He\u2019s not Harvest, and he\u2019s not pretending to be your friend. But he pays. And right now, that\u2019s enough.`,
      `Sery counts the cards, nods once, and slides a yellow keycard across the table. "Consider it a down payment. There\u2019s more where this came from."`,
    ],
    questGiverIds: [4],
    questTurnInIds: [4],
    preQuestIds: [13],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "COLLECT", id: ROMASHKA_COLLECTION[1].id },
    ],
    rewards: [{ className: "evg_keycards_Yellow", amount: 1 }, ...currency(6)],
  },

  // Q15: "Paper Trail" — Delivery
  {
    id: 15,
    fileName: "DZSurvival_Quest_1014",
    title: "Paper Trail",
    objectiveText: "Hand over the Reaper documents Sery wouldn't touch.",
    descriptions: [
      `Sery hands you something he won\u2019t touch himself — documents pulled off a Reaper courier, unopened. "Not my business what\u2019s in there. Might be yours." Daniels needs to see it.`,
      `He\u2019s the only one you actually trust to read it straight. You walk it back to the farm through territory you\u2019ve already bled for.`,
      "Daniels reads in silence. When he looks up, his face has changed. The Reapers are just the symptom. Something bigger is rotting from the inside.",
    ],
    questGiverIds: [4],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [14],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "DELIVERY", id: ROMASHKA_DELIVERY[1].id },
    ],
    rewards: [{ className: "Rag", amount: 5 }, ...currency(7)],
  },

  // Q16: "Take the Block" — AI Camp
  {
    id: 16,
    fileName: "DZSurvival_Quest_1015",
    title: "Take the Block",
    objectiveText: "End the Reaper stronghold inside the warzone town.",
    descriptions: [
      "The documents named a stronghold — a police station or apartment block the Reapers are using as their real base, not just a checkpoint. Daniels is done being reactive.",
      `"Volk doesn\u2019t get to keep raising the price on that road. End it." Eight hostiles, fortified, dug in. This is the fight that decides whether Romashka survives the season or becomes a grave.`,
      `When the last one falls, the block is yours. Daniels doesn\u2019t celebrate — he just marks the logbook. Another name crossed off. Another reason to keep fighting.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [15],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AICAMP", id: ROMASHKA_AI_TARGET[2].id },
    ],
    rewards: [{ className: "evg_keycards_Yellow", amount: 1 }, ...currency(8)],
  },

  // --- Act IV — The Sickness --------------------------------------------

  // Q17: "What Daniels Needs" — Crafting
  {
    id: 17,
    fileName: "DZSurvival_Quest_1016",
    title: "What Daniels Needs",
    objectiveText:
      "Craft a hazmat-grade respirator — Daniels doesn't send people in blind anymore.",
    descriptions: [
      "The defector finally says the word out loud: Stary Sobor. Daniels has dealt with radiation sickness exactly once before, and he still has nightmares about it.",
      `He wants you kitted properly — full filtration, not the improvised gear from that first filter. This time, he\u2019s not taking chances.`,
      `The hazmat respirator clicks into place. It won\u2019t save you from everything, but it\u2019ll buy you enough time to do what needs doing.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [16],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "CRAFTING", id: ROMASHKA_CRAFTING[1].id },
    ],
    rewards: [{ className: "HazmatSuit", amount: 1 }, ...currency(5)],
  },

  // Q18: "Into the Grey" — Travel
  {
    id: 18,
    fileName: "DZSurvival_Quest_1017",
    title: "Into the Grey",
    objectiveText: "Get to the edge of Stary Sobor and confirm the defector isn't lying.",
    descriptions: [
      `Daniels doesn\u2019t send you in blind — just far enough to confirm the defector isn\u2019t lying. "Don\u2019t stay long. Don\u2019t touch anything that isn\u2019t yours to touch. Just look, and come back."`,
      `The Geiger counter starts ticking before you even see the village. The air tastes wrong. The grey sky doesn\u2019t lift — it presses down.`,
      `You look. You see enough. And you come back with the weight of what\u2019s waiting inside, heavy enough to bend your shoulders.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [17],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TRAVEL", id: ROMASHKA_TRAVEL[2].id },
    ],
    rewards: [{ className: "AmmoBox545x39", amount: 2 }, ...currency(6)],
  },

  // Q19: "Things That Shouldn't Move Right" — Target
  {
    id: 19,
    fileName: "DZSurvival_Quest_1018",
    title: "Things That Shouldn't Move Right",
    objectiveText: "Clear out the Cordon sentries posted at Stary Sobor's edge.",
    descriptions: [
      "Whatever's in Stary Sobor isn't just zombies — there's a Cordon patrol posted there too, and they're not there to help anyone. Daniels is grim about it: 'If they're guarding it, it's not an accident anymore.'",
      `Four sentries. Military-grade. They weren\u2019t sent to watch — they were sent to keep something in. Or something out.`,
      "When the last one goes down, the silence is different. Heavier. Like the ground itself is holding its breath.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [18],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TARGET", id: ROMASHKA_TARGET[2].id },
    ],
    rewards: [{ className: "evg_keycards_Blue", amount: 1 }, ...currency(8)],
  },

  // Q20: "The Core Sample" — Treasure Hunt
  {
    id: 20,
    fileName: "DZSurvival_Quest_1019",
    title: "The Core Sample",
    objectiveText: "Find what the dead Cordon sentry was protecting on Skalisty Island.",
    descriptions: [
      `The dead Cordon sentry was carrying a manifest pointing to Skalisty Island — a sample cache, buried, logged, and apparently never retrieved. Daniels\u2019 voice changes when he reads it.`,
      `This is the first time he admits he\u2019s scared of what you\u2019re walking toward. Skalisty sits in the grey water like a tooth pulled from the world\u2019s jaw.`,
      "You dig. You find it. And the documents hint at something even bigger than Sobor — NWAF, Tisy, a pattern that stretches across the whole country.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [19],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TREASUREHUNT", id: ROMASHKA_TARGET[2].id },
    ],
    rewards: [{ className: "evg_keycards_Violet", amount: 1 }, ...currency(10)],
  },

  // --- Act V — The Wire -------------------------------------------------

  // Q21: "Get Him Out" — AI VIP
  {
    id: 21,
    fileName: "DZSurvival_Quest_1020",
    title: "Get Him Out",
    objectiveText:
      "Bring the Cordon scientist out of NWAF alive — nobody believes anyone made it out.",
    descriptions: [
      `The documents name a scientist still inside NWAF\u2019s wire, trying to get word out and failing. Daniels is reluctant — sending someone toward the Cordon\u2019s front door is a different kind of risk than anything before it.`,
      `"Send someone toward the wire. Get him out before the Cordon realizes he\u2019s trying to leave." You don\u2019t argue. You\u2019ve learned by now that arguing with Daniels about risk means he\u2019s already decided.`,
      `The scientist doesn\u2019t trust you at first. He should. But he sees the way you move, the way you don\u2019t ask questions, and he follows. Barely.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [20],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AIVIP", id: ROMASHKA_AI_TARGET[2].id },
    ],
    rewards: [{ className: "evg_keycards_Red", amount: 1 }, ...currency(12)],
  },

  // Q22: "The Convoy" — AI Patrol
  {
    id: 22,
    fileName: "DZSurvival_Quest_1021",
    title: "The Convoy",
    objectiveText: "Break the Cordon patrol loop around NWAF — they're hunting now.",
    descriptions: [
      `The scientist\u2019s escape didn\u2019t go unnoticed — Cordon\u2019s running a heavier patrol loop around NWAF now, actively hunting. Daniels wants it broken before it finds Romashka\u2019s location from questioning survivors.`,
      `Four to six heavily armed Cordon units. They\u2019re not just patrolling — they\u2019re sweeping. And they\u2019re getting closer to the farm.`,
      "You break the loop. The convoy scatters. Daniels makes a phone call — or what passes for a phone call out here — and the pieces start falling into place.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [21],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AIPATROL", id: ROMASHKA_AI_TARGET[2].id },
    ],
    rewards: [{ className: "evg_keycards_Blue", amount: 1 }, ...currency(10)],
  },

  // Q23: "Inside the Wire" — Collection
  {
    id: 23,
    fileName: "DZSurvival_Quest_1022",
    title: "Inside the Wire",
    objectiveText: "Collect NWAF clearance materials from across the airfield's zones.",
    descriptions: [
      `Proof isn\u2019t one document, Daniels says — it\u2019s a pattern. He wants NWAF-tier clearance materials collected from across the airfield\u2019s zones, enough that nobody can call it a coincidence.`,
      `Three blue keycards. Not easy to get. Not impossible. Just the kind of thing that takes time, patience, and the willingness to walk into places that don\u2019t want you.`,
      `When you drop them on the table, Daniels doesn\u2019t say anything. He closes the logbook, looks at you, and nods. "We\u2019re ready."`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [22],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "COLLECT", id: ROMASHKA_COLLECTION[2].id },
    ],
    rewards: [{ className: "AmmoBox762x54R", amount: 3 }, ...currency(12)],
  },

  // Q24: "The Gate at Tisy" — AI Camp
  {
    id: 24,
    fileName: "DZSurvival_Quest_1023",
    title: "The Gate at Tisy",
    objectiveText: "This is the one that doesn't come back easy. You don't have to go.",
    descriptions: [
      `Everything points to Tisy now. Khan\u2019s dug in there properly — this isn\u2019t a checkpoint, it\u2019s the last real defensive line the Cordon has. Daniels doesn\u2019t dress it up.`,
      `"This is the one that doesn\u2019t come back easy. You don\u2019t have to go." You do it anyway. Not because you have to, but because someone has to, and it might as well be you.`,
      "Ten hostiles. Best gear. Fortified gate. The kind of fight that decides whether the story gets told or dies with you. You go in swinging.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [23],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AICAMP", id: ROMASHKA_AI_TARGET[2].id },
    ],
    rewards: [{ className: "evg_keycards_White", amount: 5 }, ...currency(15)],
  },

  // Q25: "Signal" — Action
  {
    id: 25,
    fileName: "DZSurvival_Quest_1024",
    title: "Signal",
    objectiveText:
      "Activate the transmitter at Daniels' desk. Whether anyone answers is never confirmed.",
    descriptions: [
      `Everything comes back to the farm. Daniels\u2019 radio rig has been sitting mostly silent since the world ended — now it has something worth saying.`,
      `He doesn\u2019t pretend it fixes anything. "Doesn\u2019t undo what happened at Tisy. Doesn\u2019t bring anyone back. But maybe somebody out there\u2019s still listening, and maybe they should know what we know."`,
      `You flip the switch. The radio hums. Static crackles. And then — silence. Whether anyone heard it, whether it mattered, whether it changes anything at all — that\u2019s never confirmed. That\u2019s the point.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [24],
    repeatable: FALSE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "ACTION", id: ROMASHKA_ACTION[1].id },
    ],
    rewards: currency(20),
  },
];

// --- Repeatable side quests (6 types) --------------------------------------

const SIDE_QUESTS: QuestDef[] = [
  // 1. Collection (Daniels) — rotating medical supplies
  {
    id: 1000,
    fileName: "DZSurvival_Side_1000",
    title: "Medical Supply Run",
    objectiveText: "Daniels needs medical supplies — bandages, antibiotics, saline.",
    descriptions: [
      `"People get hurt. I keep them alive. But I can\u2019t do it without the stuff." Daniels doesn\u2019t sugarcoat it — the med supply is running low and he needs you to scavenge.`,
      `He doesn\u2019t ask where you got it. Just that you got it. The farm survives because people contribute, and medicine is the most expensive contribution of all.`,
      `Daniels stacks the supplies neatly. "Thanks. Next time it\u2019ll be something different. It always is."`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: TRUE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "COLLECT", id: COLLECTION_OBJECTIVES[0].id },
    ],
    rewards: currency(2),
  },

  // 2. Delivery (Daniels ↔ Sery) — courier runs
  {
    id: 1001,
    fileName: "DZSurvival_Side_1001",
    title: "Courier Run",
    objectiveText: "Sery needs something delivered to Romashka — or vice versa.",
    descriptions: [
      `"I don\u2019t go near that farm. Not my style." Sery hands you a package wrapped in oilcloth. "Get this to Daniels. He\u2019ll know what to do." Or the other way around — Daniels sends you out with the same instruction.`,
      `The coast road between Romashka and Sery\u2019s docks used to be safe. Now it\u2019s anyone\u2019s guess. But the pay is fair, and the work doesn\u2019t require more than showing up.`,
      `Sery counts his money before handing it over. "Fair trade. I don\u2019t do charity." Neither does Daniels. That\u2019s why this works.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [4],
    preQuestIds: [],
    repeatable: TRUE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "DELIVERY", id: DELIVERY_OBJECTIVES[0].id },
    ],
    rewards: currency(3),
  },

  // 3. Target (Daniels) — rotating bounty
  {
    id: 1002,
    fileName: "DZSurvival_Side_1002",
    title: "Bounty",
    objectiveText:
      "Daniels wants whichever faction patrol is currently most active near the farm eliminated.",
    descriptions: [
      `"They\u2019re testing the fence again." Daniels doesn\u2019t look up from what he\u2019s doing. "Take care of them before they decide to test it harder." Reaper or Cordon — it doesn\u2019t matter which flag they fly.`,
      `It\u2019s not personal. It\u2019s survival. And right now, survival means keeping the perimeter clear of anyone who isn\u2019t Harvest.`,
      `Daniels nods when you\u2019re done. "Good. We can sleep tonight." Simple as that.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: TRUE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TARGET", id: TARGET_OBJECTIVES[0].id },
    ],
    rewards: currency(2),
  },

  // 4. Travel (Daniels) — recon pings
  {
    id: 1003,
    fileName: "DZSurvival_Side_1003",
    title: "Recon Ping",
    objectiveText: "Daniels wants eyes on the current warzone status.",
    descriptions: [
      `"I need to know what\u2019s happening out there." Daniels points at the map on his wall — the one he\u2019s been marking up with a pencil that\u2019s more stub now.`,
      `"Go take a look. Don\u2019t engage. Just tell me what you see and I\u2019ll figure out the rest." The warzone shifts week to week — Cherno, Electro, whichever town the Reapers are bleeding that cycle.`,
      "You climb, you look, you report back. Daniels listens, makes a note, and sends you on your way. The farm survives on information as much as anything else.",
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: TRUE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "TRAVEL", id: TRAVEL_OBJECTIVES[0].id },
    ],
    rewards: currency(1),
  },

  // 5. AI Patrol (Daniels) — repeatable patrol clears
  {
    id: 1004,
    fileName: "DZSurvival_Side_1004",
    title: "Patrol Clear",
    objectiveText: "Clear the coast road patrol — again.",
    descriptions: [
      `"They always come back." Daniels\u2019 tone says he\u2019s not surprised. "Break them again and I\u2019ll pay you for the trouble." The coast road is a loop — hit it once and it\u2019s quiet for a day. Hit it every day and it stays yours.`,
      `The patrol doesn\u2019t care about your reputation. They just move their route and keep shaking down anyone who uses the road. Until you decide otherwise.`,
      `Daniels doesn\u2019t thank you. He just nods and slides the payment across the table. In his world, that\u2019s as close to gratitude as you\u2019re going to get.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: TRUE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "AIPATROL", id: TARGET_OBJECTIVES[0].id },
    ],
    rewards: currency(3),
  },

  // 6. Action (Daniels) — farm maintenance
  {
    id: 1005,
    fileName: "DZSurvival_Side_1005",
    title: "Farm Work",
    objectiveText:
      "Daniels needs farm maintenance done — fence repair, generator upkeep, the sort of work nobody writes songs about.",
    descriptions: [
      `"The fence needs patching." Daniels hands you tools — not because he thinks you\u2019ll need them, but because that\u2019s how this farm works: you take what\u2019s given and you do the work.`,
      `It\u2019s not glamorous. It\u2019s not heroic. But the fence holds because people like you show up and do the thing that needs doing. That\u2019s the whole philosophy right there.`,
      `Daniels inspects the work. "Looks good. Thanks." He doesn\u2019t exaggerate. In his world, "good" means it\u2019ll hold until tomorrow.`,
    ],
    questGiverIds: [MISSION_GIVER_ID],
    questTurnInIds: [MISSION_GIVER_ID],
    preQuestIds: [],
    repeatable: TRUE,
    isDailyQuest: FALSE,
    objectives: [
      { type: "ACTION", id: ROMASHKA_ACTION[0].id },
    ],
    rewards: currency(1),
  },
];

export const ALL_QUESTS = [...MAIN_QUESTS, ...SIDE_QUESTS];

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
import { ALL_QUESTS } from "../constants/questLines.ts";
import {
  COLLECTION_OBJECTIVES,
  CollectionObjectiveDef,
  CRAFTING_OBJECTIVES,
  CraftingObjectiveDef,
  DELIVERY_OBJECTIVES,
  DeliveryObjectiveDef,
  FALSE,
  NPC_CONFIG_VERSION,
  OBJECTIVE_CONFIG_VERSION,
  OBJECTIVE_TYPE,
  QUEST_CONFIG_VERSION,
  QUEST_NPCS,
  QuestDef,
  QuestNpcDef,
  TARGET_OBJECTIVES,
  TargetObjectiveDef,
  TRAVEL_OBJECTIVES,
  TravelObjectiveDef,
  TRUE,
} from "../constants/questValues.ts";
import { exists } from "../steam.ts";
import { log, ok } from "../ui.ts";
import { CUSTOM_POSITION } from "./traders.ts";

// Main chain: 10 quests, gated in sequence via PreQuestIDs, all given out
// and turned in at the single mission-giver NPC. Quest #1 has no
// QuestGiverIDs at all, so it auto-starts for every player on first connect
// (see this file's header comment) - its only job is to get the player to
// walk over and meet Taskmaster Daniels.

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
      IsWeeklyQuest: FALSE,
      CancelQuestOnPlayerDeath: FALSE,
      Autocomplete: FALSE,
      IsGroupQuest: FALSE,
      ObjectSetFileName: "",
      QuestItems: [],
      Rewards: def.rewards.flat().map((r) => ({
        ClassName: r.className,
        Amount: r.amount,
        Attachments: [],
        DamagePercent: 0,
        QuestID: -1,
        Chance: 1.0,
      })),
      NeedToSelectReward: FALSE,
      RandomReward: FALSE,
      RandomRewardAmount: -1,
      RewardsForGroupOwnerOnly: TRUE,
      RewardBehavior: 0, // RANDOMIZED_ON_COMPLETION - irrelevant with a single fixed reward set
      QuestGiverIDs: def.questGiverIds,
      QuestTurnInIDs: def.questTurnInIds,
      IsAchievement: FALSE,
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
      PlayerNeedQuestItems: TRUE,
      DeleteQuestItems: TRUE,
      SequentialObjectives: TRUE,
      FactionReputationRequirements: {},
      FactionReputationRewards: {},
      SuppressQuestLogOnCompetion: FALSE,
      Active: TRUE,
    },
    null,
    4,
  );
}

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

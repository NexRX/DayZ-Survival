// DayZ-Expansion-Quests: hand-authored JSON persistence via this project's
// "ensure" pattern. Schema/paths/enum values sourced from the mod's codebase.
// Objective types used: TRAVEL, TARGET, DELIVERY, COLLECT, CRAFTING.

import { exists } from "jsr:@std/fs@1.0.24";
import {
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
import { ok } from "../ui.ts";
import { ALL_QUEST_CONFIGS } from "../constants/quests/index.ts";

async function cleanupDefaultQuestExamples(): Promise<void> {
  const dirs = [
    [EXPANSION_QUESTS_QUESTS_DIR, Array.from({ length: 24 }, (_, i) => `Quest_${i + 1}.json`)],
    [EXPANSION_QUESTS_NPCS_DIR, Array.from({ length: 3 }, (_, i) => `QuestNPC_${i + 1}.json`)],
    [
      EXPANSION_QUESTS_OBJECTIVES_TRAVEL_DIR,
      Array.from({ length: 7 }, (_, i) => `Objective_T_${i + 1}.json`),
    ],
    [
      EXPANSION_QUESTS_OBJECTIVES_TARGET_DIR,
      Array.from({ length: 4 }, (_, i) => `Objective_TA_${i + 1}.json`),
    ],
    [
      EXPANSION_QUESTS_OBJECTIVES_DELIVERY_DIR,
      Array.from({ length: 2 }, (_, i) => `Objective_D_${i + 1}.json`),
    ],
    [
      EXPANSION_QUESTS_OBJECTIVES_COLLECTION_DIR,
      Array.from({ length: 3 }, (_, i) => `Objective_C_${i + 1}.json`),
    ],
    [EXPANSION_QUESTS_OBJECTIVES_CRAFTING_DIR, ["Objective_CR_1.json"]],
    [
      EXPANSION_QUESTS_OBJECTIVES_ACTION_DIR,
      Array.from({ length: 2 }, (_, i) => `Objective_A_${i + 1}.json`),
    ],
    [EXPANSION_QUESTS_OBJECTIVES_TREASUREHUNT_DIR, ["Objective_TH_1.json"]],
    [EXPANSION_QUESTS_OBJECTIVES_AIPATROL_DIR, ["Objective_AIP_1.json"]],
    [EXPANSION_QUESTS_OBJECTIVES_AICAMP_DIR, ["Objective_AIC_1.json"]],
    [EXPANSION_QUESTS_OBJECTIVES_AIVIP_DIR, ["Objective_AIESCORT_1.json"]],
  ];
  let total = 0;
  for (const [dir, files] of dirs) {
    for (const name of files) {
      if (await exists(`${dir}/${name}`)) {
        await Deno.remove(`${dir}/${name}`);
        total++;
      }
    }
  }
  if (total > 0) ok(`Removed ${total} DayZ-Expansion-Quests example quest/NPC/objective file(s)`);
}

async function ensureQuestConfigs() {
  for (const [path, config] of Object.entries(ALL_QUEST_CONFIGS)) {
    await Deno.writeTextFile(path, JSON.stringify(config));
  }
}

export async function ensureQuests(): Promise<void> {
  await cleanupDefaultQuestExamples();
  await ensureQuestConfigs();
}

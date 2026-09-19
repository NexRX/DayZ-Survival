import { TRUE } from "../types/common.ts";
import { QUEST_SETTINGS_CONFIG, QuestSettings } from "../types/quest.ts";
import { ALL_NPC_CONFIGS } from "./npc.ts";
import { ALL_OBJECTIVE_CONFIGS } from "./objectives.ts";
import { MAIN_QUESTS_CONFIGS } from "./questsMain.ts";
import { SIDE_QUESTS_CONFIGS } from "./questsSide.ts";

const QUEST_SETTINGS: Record<string, QuestSettings> = {
  [QUEST_SETTINGS_CONFIG]: {
    m_Version: 10,
    EnableQuests: TRUE,
  },
};

const ALL_QUESTS = [MAIN_QUESTS_CONFIGS, SIDE_QUESTS_CONFIGS] as const;

export const ALL_QUEST_CONFIGS = {
  ...QUEST_SETTINGS,
  ...ALL_OBJECTIVE_CONFIGS,
  ...ALL_QUESTS,
  ...ALL_NPC_CONFIGS,
} as const;

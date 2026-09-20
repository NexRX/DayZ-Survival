import { Quest, QUEST_CONFIG_DIR } from "../types/quest.ts";
import { configToRecord, fixQuests } from "./common.ts";

export const SIDE_QUESTS: Quest[] = fixQuests([]);

export const SIDE_QUESTS_CONFIGS = configToRecord(SIDE_QUESTS, `${QUEST_CONFIG_DIR}/Quest_Side_`);

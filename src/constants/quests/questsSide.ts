import { Quest } from "../types/quest.d.ts";
import { configToRecord, fixQuests, safetyChecks } from "./common.ts";
import { QUEST_CONFIG_DIR } from "../paths.ts";

export const SIDE_QUESTS: Quest[] = safetyChecks(fixQuests([]), "Quests (Side)");

export const SIDE_QUESTS_CONFIGS = configToRecord(SIDE_QUESTS, `${QUEST_CONFIG_DIR}/Quest_`);

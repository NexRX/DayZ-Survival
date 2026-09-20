import { BoolNum } from "./common.ts";

/**
 * Full QuestSettings JSON shape.
 * The mod reads this from ExpansionMod/Quests/QuestSettings.json.
 */
export interface QuestSettingsConfig {
  EnableQuests: BoolNum;
}

/** Export mapping. */
export const ALL_SETTINGS_TYPES = {} as const;

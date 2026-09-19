/**
 * Full QuestSettings JSON shape.
 * The mod reads this from ExpansionMod/Quests/QuestSettings.json.
 */
export interface QuestSettingsConfig {
  EnableQuests: boolean;
}

/** Export mapping. */
export const ALL_SETTINGS_TYPES = {} as const;

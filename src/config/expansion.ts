import { BOOK_SETTINGS } from "../constants/book.ts";
import * as p from "../constants/paths.ts";
import { ALL_QUEST_CONFIGS } from "../constants/quests/index.ts";
import { ensureConfig, ensureConfigs, ensureRemoved } from "./index.ts";

export async function ensureBook() {
  await ensureConfig(p.BOOK_CONFIG_PATH, BOOK_SETTINGS);
}

export async function ensureQuests(): Promise<void> {
  await ensureRemoved(
    p.EXPANSION_QUESTS_QUESTS_DIR,
    p.EXPANSION_QUESTS_NPCS_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_TRAVEL_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_TARGET_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_DELIVERY_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_COLLECTION_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_CRAFTING_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_ACTION_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_TREASUREHUNT_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_AIPATROL_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_AICAMP_DIR,
    p.EXPANSION_QUESTS_OBJECTIVES_AIVIP_DIR,
  );
  await ensureConfigs(ALL_QUEST_CONFIGS);
}

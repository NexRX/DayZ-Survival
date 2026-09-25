import { BOOK_SETTINGS } from "../constants/book.ts";
import {
  BOOK_CONFIG_PATH,
  EXPANSION_QUESTS_NPCS_DIR,
  EXPANSION_QUESTS_OBJECTIVES_DIR,
  EXPANSION_QUESTS_QUESTS_DIR,
} from "../constants/paths.ts";
import { ALL_QUEST_CONFIGS } from "../constants/quests/index.ts";
import { ensureConfig, ensureConfigs, ensureRemoved } from "./index.ts";

export async function ensureBook() {
  await ensureConfig(BOOK_CONFIG_PATH, BOOK_SETTINGS);
}

export async function ensureQuests(): Promise<void> {
  await ensureRemoved([
    EXPANSION_QUESTS_QUESTS_DIR,
    EXPANSION_QUESTS_OBJECTIVES_DIR,
    EXPANSION_QUESTS_NPCS_DIR,
  ]);
  await ensureConfigs(ALL_QUEST_CONFIGS);
}

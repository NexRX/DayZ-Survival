// Clears stale Expansion Quests cached data so the mod regenerates fresh
// quest definitions on next server start. Useful when quest IDs change
// (e.g. switching from the 10-quest chain to the 25-quest ROMASHKA campaign)
// - old entries in quests_data.json prevent the mod from matching new quests.

import { PROFILE_DIR } from "../constants/paths.ts";
import { log, ok } from "../ui.ts";
import { exists } from "jsr:@std/fs@1.0.24";

const QUESTS_DATA = `${PROFILE_DIR}/ExpansionQuests/quests_data.json`;

/** Delete the Expansion Quests cache so the mod rebuilds it from the on-disk JSON files. */
export async function clearQuestCache(): Promise<void> {
  if (!(await exists(QUESTS_DATA))) {
    log(`${QUESTS_DATA} not found - nothing to clear`);
    return;
  }

  await Deno.remove(QUESTS_DATA);
  ok(`Cleared ${QUESTS_DATA} - quests will be regenerated on next server start`);
}

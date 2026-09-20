import { EXPANSION_QUESTS_DIR } from "../constants/paths.ts";
import { confirm, die, ok } from "../ui.ts";

const PLAYER_DATA_DIR = `${EXPANSION_QUESTS_DIR}/PlayerData`;

function backupSuffix(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Reset one player's Expansion quest progress without touching their DayZ
 * character. Expansion stores this state in a binary file, so moving the file
 * aside is safer than attempting to edit it in place and gives the operator a
 * rollback copy.
 */
export async function resetPlayerQuestData(playerId: string): Promise<void> {
  if (!playerId || playerId === "." || playerId === ".." || /[\\/]/.test(playerId)) {
    die("Provide the player's COT identity id, not a path.");
  }

  const playerDataPath = `${PLAYER_DATA_DIR}/${playerId}.bin`;
  let stat: Deno.FileInfo;
  try {
    stat = await Deno.stat(playerDataPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      die(`No Expansion quest data found for player identity '${playerId}'.`);
    }
    throw error;
  }
  if (!stat.isFile) die(`Expansion quest data is not a file: ${playerDataPath}`);

  const backupPath = `${playerDataPath}.backup-${backupSuffix()}`;
  console.log(
    `This resets all Expansion quest progress for '${playerId}' (active, completed, and failed quests).\n` +
      "It does not reset the DayZ character, inventory, or world state.",
  );
  if (!(await confirm("Is the DayZ server stopped and should this player be reset?", "N"))) {
    die("Quest reset cancelled.");
  }

  await Deno.rename(playerDataPath, backupPath);
  ok(`Moved quest data to ${backupPath}`);
  ok("The player will receive a fresh Expansion quest state on next login.");
}

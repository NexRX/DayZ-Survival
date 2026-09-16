// Manages the coping of the dze files saved in DayZ-Editor to the servers overrides

import {
  DAYZ_EDITOR_SAVE_DIR,
  DAYZ_EDITOR_TRADER_FILENAME,
  EDITOR_FILES_DIR,
  EDITOR_OVERRIDE_DIR,
} from "../constants/paths.ts";
import { hint, ok, warn } from "../ui.ts";

export async function doSyncEditor(): Promise<void> {
  try {
    await Deno.mkdir(EDITOR_OVERRIDE_DIR, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
  }

  const save = `${DAYZ_EDITOR_SAVE_DIR}/${DAYZ_EDITOR_TRADER_FILENAME}`;
  const dest = `${EDITOR_OVERRIDE_DIR}/${DAYZ_EDITOR_TRADER_FILENAME}`;
  await Deno.copyFile(save, dest);
  ok(`Synced ${save} -> ${dest}`);
  hint("Commit the file to git, then restart the server to deploy it.");

  // Warn about other .dze files in EditorFiles/ - Editor-Loader loads every
  // .dze it finds there, not just the newest one, so stale saves could
  // conflict with the current build. These live in the mission folder and
  // should be cleaned up by hand (or removed by the startup deploy script).
  const stale: string[] = [];
  try {
    for await (const entry of Deno.readDir(EDITOR_FILES_DIR)) {
      if (
        entry.isFile && entry.name.toLowerCase().endsWith(".dze") &&
        entry.name !== DAYZ_EDITOR_TRADER_FILENAME
      ) {
        stale.push(entry.name);
      }
    }
  } catch {
    // EditorFiles/ may not exist yet on a fresh install
  }
  if (stale.length) {
    warn(
      `EditorFiles/ also still has: ${stale.join(", ")} - Editor-Loader loads ` +
        `every .dze it finds; remove old ones by hand if they shouldn't be there.`,
    );
  }
}

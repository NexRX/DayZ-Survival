// Copies the most recently saved DayZ-Editor .dze file from the client's
// Proton prefix (DAYZ_EDITOR_SAVE_DIR) into the mission's EditorFiles/
// folder (EDITOR_FILES_DIR), where @DayZ-Editor-Loader reads it from on
// server start. Lets you re-sync after every editing session with one
// command instead of hunting for the save file by hand.

import { DAYZ_EDITOR_SAVE_DIR, EDITOR_FILES_DIR } from "./paths.ts";
import { DayzError, hint, log, ok, warn } from "./ui.ts";

async function newestDze(dir: string): Promise<{ name: string; path: string; mtime: Date } | null> {
  let best: { name: string; path: string; mtime: Date } | null = null;
  for await (const entry of Deno.readDir(dir)) {
    if (!entry.isFile || !entry.name.toLowerCase().endsWith(".dze")) continue;
    const path = `${dir}/${entry.name}`;
    const info = await Deno.stat(path);
    const mtime = info.mtime ?? new Date(0);
    if (!best || mtime > best.mtime) best = { name: entry.name, path, mtime };
  }
  return best;
}

export async function doSyncEditor(): Promise<void> {
  log(`Looking for .dze saves in ${DAYZ_EDITOR_SAVE_DIR}`);

  let saves;
  try {
    saves = await newestDze(DAYZ_EDITOR_SAVE_DIR);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new DayzError(
        `DayZ-Editor save folder not found: ${DAYZ_EDITOR_SAVE_DIR}\n` +
          `     Open DayZ-Editor and save at least once first.`,
      );
    }
    throw e;
  }

  if (!saves) {
    throw new DayzError(
      `No .dze files found in ${DAYZ_EDITOR_SAVE_DIR}\n` +
        `     Open DayZ-Editor and save your build first.`,
    );
  }

  try {
    await Deno.mkdir(EDITOR_FILES_DIR, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
  }

  const dest = `${EDITOR_FILES_DIR}/${saves.name}`;
  await Deno.copyFile(saves.path, dest);
  ok(`Synced ${saves.name} (saved ${saves.mtime.toLocaleString()}) -> ${dest}`);
  hint("Restart the server for @DayZ-Editor-Loader to pick up the change.");

  // Warn about other .dze files in EditorFiles/ - Editor-Loader loads every
  // .dze it finds there, not just the newest one, so stale saves could
  // conflict with the current build.
  const stale: string[] = [];
  for await (const entry of Deno.readDir(EDITOR_FILES_DIR)) {
    if (entry.isFile && entry.name.toLowerCase().endsWith(".dze") && entry.name !== saves.name) {
      stale.push(entry.name);
    }
  }
  if (stale.length) {
    warn(
      `EditorFiles/ also still has: ${stale.join(", ")} - Editor-Loader loads ` +
        `every .dze it finds, so remove old ones if they shouldn't be there too.`,
    );
  }
}

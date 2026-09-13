// Copies the most recently saved DayZ-Editor .dze file from the client's
// Proton prefix (DAYZ_EDITOR_SAVE_DIR) into the repo's data/editor/ folder,
// where it gets committed to git. On server startup (see server.ts), that
// file is copied into the mission's EditorFiles/ folder where
// @DayZ-Editor-Loader reads it from.
//
// This two-step flow keeps the DZE checked into version control while still
// deploying it to the live server directory on each start.

import { DAYZ_EDITOR_SAVE_DIR, EDITOR_FILES_DIR, EDITOR_STORED_DIR } from "./paths.ts";
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
    await Deno.mkdir(EDITOR_STORED_DIR, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
  }

  const dest = `${EDITOR_STORED_DIR}/${saves.name}`;
  await Deno.copyFile(saves.path, dest);
  ok(`Synced ${saves.name} (saved ${saves.mtime.toLocaleString()}) -> ${dest}`);
  hint("Commit the file to git, then restart the server to deploy it.");

  // Warn about other .dze files in EditorFiles/ - Editor-Loader loads every
  // .dze it finds there, not just the newest one, so stale saves could
  // conflict with the current build. These live in the mission folder and
  // should be cleaned up by hand (or removed by the startup deploy script).
  const stale: string[] = [];
  try {
    for await (const entry of Deno.readDir(EDITOR_FILES_DIR)) {
      if (entry.isFile && entry.name.toLowerCase().endsWith(".dze") && entry.name !== saves.name) {
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

// Resetting server state on demand, from a "fresh season" world wipe up to a
// full nuke-and-reinstall. Nothing here touches anything git-tracked; it
// only removes generated, gitignored directories (server/, profiles/) or
// the mission's persistence database (mpmissions/<mission>/storage_1), all
// of which `deno task up` happily regenerates/reinstalls from scratch.

import { AREA_FLAGS_CACHE, MISSION_DIR, PROFILE_DIR, SERVER_DIR } from "./paths.ts";
import { ask, confirm, log, ok, warn } from "./ui.ts";
import { runCapture } from "./proc.ts";
import { exists } from "./steam.ts";

async function serverRunning(): Promise<boolean> {
  const { code } = await runCapture("pgrep", ["-f", "DayZServer"]);
  return code === 0;
}

async function removeIfExists(path: string): Promise<boolean> {
  if (!(await exists(path))) return false;
  await Deno.remove(path, { recursive: true });
  return true;
}

/** World-state wipe: fresh characters/bases/vehicles/dynamic economy, keeps the install. */
export async function wipeWorld(): Promise<void> {
  const storage = `${MISSION_DIR}/storage_1`;
  if (await removeIfExists(storage)) {
    ok(`Removed ${storage} - characters, bases, vehicles, and saved world state reset`);
  } else {
    log(`${storage} not found - nothing to wipe`);
  }

  // Stale relative to the mission's current type/spawn data otherwise, which
  // crashes Search For Loot's AFR_AreaFlagsService on the next mission load.
  if (await removeIfExists(AREA_FLAGS_CACHE)) {
    ok(`Removed ${AREA_FLAGS_CACHE} - Search For Loot will rebuild it fresh on next start`);
  }
}

/**
 * Full reset: removes the installed server (binaries + mods + mission) and
 * the server profile (logs, AI/loot config, admin grants). `steamcmd/`'s
 * cached Steam login is deliberately left alone, so the next `up` doesn't
 * need `deno task login` again.
 */
export async function wipeAll(): Promise<void> {
  for (const path of [SERVER_DIR, PROFILE_DIR]) {
    if (await removeIfExists(path)) {
      ok(`Removed ${path}`);
    } else {
      log(`${path} not found - nothing to remove`);
    }
  }
}

/** Interactive `deno task wipe`. */
export async function doWipe(): Promise<void> {
  if (await serverRunning()) {
    warn(
      "A DayZServer process appears to be running - stop it first (Ctrl-C in " +
        "its terminal, or kill it), then re-run this.",
    );
    return;
  }

  log("Wipe options:");
  console.log(
    "  1) World only  - reset characters/bases/vehicles/economy, keep the install " +
      "[recommended for a fresh season]",
  );
  console.log(
    "  2) Everything   - also remove the installed server, mods, and profile " +
      "(next 'up' reinstalls from scratch)",
  );
  console.log("  3) Cancel");
  const choice = await ask("Choice", "3");

  if (choice === "1") {
    if (
      !(await confirm(
        `This permanently deletes ${MISSION_DIR}/storage_1. Continue?`,
        "N",
      ))
    ) {
      log("Cancelled.");
      return;
    }
    await wipeWorld();
  } else if (choice === "2") {
    if (
      !(await confirm(
        "This permanently deletes the entire installed server, mods, and profile. Continue?",
        "N",
      ))
    ) {
      log("Cancelled.");
      return;
    }
    await wipeAll();
  } else {
    log("Cancelled.");
  }
}

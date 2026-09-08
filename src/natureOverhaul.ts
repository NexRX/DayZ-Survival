// Nature Overhaul Redux (@Nature-Overhaul-Redux) is not a normal script mod -
// per its own readme.txt and objectSpawnersArr.json, it ships as a set of
// vanilla-format "Static Object Spawner" JSON files that the *mission* has to
// load directly; the mod does nothing on its own once just added to the mod
// list. Two things have to happen:
//
//   1. Its `Xtras/NatureOverhaul_json_files/custom/*.json` files get copied
//      into the mission root's own `custom/` folder.
//   2. Their relative paths (`custom/<File>.json`) get merged into
//      cfggameplay.json's WorldsData.objectSpawnersArr array (ships empty).
//
// This project's own install pipeline lowercases every downloaded mod's
// files (LOWERCASE_MODS), but objectSpawnersArr.json's own entries are
// authored in mixed case (e.g. "custom/Tulga.json") - reusing the
// already-installed (lowercased) copy would desync the filenames Linux
// actually has on disk from what cfggameplay.json asks for. So this reads
// straight from the *raw*, pre-lowercase workshop download instead (via
// findWorkshopItem), which keeps the original authored casing.
//
// ~8,300 static objects across 25 files total - the mod's own readme
// recommends watching server FPS after enabling. If that ever becomes a
// real problem, trim the copied file list in MISSION_DIR/custom (and the
// matching cfggameplay.json entries) rather than disabling the whole mod.

import { CFG_GAMEPLAY_FILE, MISSION_DIR } from "./paths.ts";
import type { Mod } from "./mods.ts";
import { exists, findWorkshopItem } from "./steam.ts";
import { log, ok } from "./ui.ts";

const MOD_NAME = "@Nature-Overhaul-Redux";
const WORKSHOP_ID = "3795177246";
const RAW_JSON_SUBPATH = "Xtras/NatureOverhaul_json_files/custom";
const MISSION_CUSTOM_DIR = `${MISSION_DIR}/custom`;

interface CfgGameplay {
  WorldsData?: {
    objectSpawnersArr?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function ensureNatureOverhaulWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  const modRoot = await findWorkshopItem(WORKSHOP_ID);
  if (!modRoot) {
    log(`${MOD_NAME} not downloaded yet - skipping static-object wiring`);
    return;
  }
  const rawCustomDir = `${modRoot}/${RAW_JSON_SUBPATH}`;
  if (!(await exists(rawCustomDir))) {
    log(`${rawCustomDir} not found - skipping ${MOD_NAME} static-object wiring`);
    return;
  }

  await Deno.mkdir(MISSION_CUSTOM_DIR, { recursive: true });

  const fileNames: string[] = [];
  for await (const entry of Deno.readDir(rawCustomDir)) {
    if (entry.isFile && entry.name.toLowerCase().endsWith(".json")) fileNames.push(entry.name);
  }
  fileNames.sort();

  for (const name of fileNames) {
    await Deno.copyFile(`${rawCustomDir}/${name}`, `${MISSION_CUSTOM_DIR}/${name}`);
  }

  if (!(await exists(CFG_GAMEPLAY_FILE))) {
    log(`${CFG_GAMEPLAY_FILE} not found yet - skipping objectSpawnersArr merge`);
    return;
  }

  const cfg: CfgGameplay = JSON.parse(await Deno.readTextFile(CFG_GAMEPLAY_FILE));
  if (!cfg.WorldsData) cfg.WorldsData = {};
  const existing = cfg.WorldsData.objectSpawnersArr ?? [];
  const wanted = fileNames.map((name) => `custom/${name}`);
  const merged = [...new Set([...existing, ...wanted])];

  if (
    existing.length === merged.length &&
    existing.every((v, i) => v === merged[i])
  ) {
    ok(`Copied ${fileNames.length} ${MOD_NAME} static-object file(s) to ${MISSION_CUSTOM_DIR}`);
    return;
  }

  cfg.WorldsData.objectSpawnersArr = merged;
  await Deno.writeTextFile(CFG_GAMEPLAY_FILE, JSON.stringify(cfg, null, "\t"));
  ok(
    `Wired ${wanted.length} ${MOD_NAME} object-spawner file(s) into ` +
      `${CFG_GAMEPLAY_FILE} (WorldsData.objectSpawnersArr)`,
  );
}

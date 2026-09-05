// Merges reference types.xml files shipped *alongside* certain content mods
// (not baked into their .pbo, just sitting in the workshop download for an
// admin to copy by hand) into the mission's central db/types.xml, so their
// items actually spawn in the loot economy instead of only being reachable
// via admin tools/trader/crafting.
//
// Additive merge only, same rule as ai.ts/dynamicMissions.ts: a <type>
// already present in the mission's types.xml (by name) is never touched or
// duplicated. Safe to run on every start.
//
// Like economy.ts, this deliberately avoids a full XML parser/serializer:
// it only ever lifts whole <type name="...">...</type> blocks verbatim and
// appends them, leaving every other byte of the mission's file untouched.

import { ECONOMY_TYPES_FILE, SERVER_DIR } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

// Mods confirmed to ship a reference economy types file somewhere in their
// mod folder for admins to merge in by hand. Keyed by the @name used in
// mods.txt. NCPR is deliberately excluded - its types are published
// separately on GitHub rather than shipped in the workshop download, so
// there's no local file to discover here; see ncpr.ts instead, which
// fetches and merges them directly.
//
// Most of these mods do NOT literally name their file "types.xml" (e.g.
// Old-Food ships types_chernarus.xml, Nail-Gun ships
// types/bvp_nailgun_types.xml). findEconomyTypesFiles() below scans every
// *.xml file under the mod folder and only merges ones whose root element
// is literally <types> (not <spawnabletypes>, <events>, etc.), so any
// filename works and non-economy XML is never touched.
const MOD_TYPES_SOURCES = new Set([
  "@Windstride-Clothing",
  "@DayZ-Dog",
  "@BoomLays-Things",
  "@Crowwolfie-Recipes",
  "@Dart-Board-Game",
  "@CJ187-MoreMoney",
  "@CJ187-Money-Euros-Only",
  "@Zens-Zippo-Lighter",
  "@Buddys-BoltZ",
  "@Old-Food",
  "@Quiver",
  "@Nail-Gun",
  "@Gas-Mask-Overhaul",
  "@MBM-ApocalypseTruck",
  "@MBM-ApocalypticPAZ",
  "@Alevarics-Clothing-Overhaul",
  "@UAZ-31514",
  "@DayZ-Horse",
  "@BMM-Chemical-Zombie",
  "@Survival-Clothing",
  "@Survivor-Backpack",
  "@Paragon-Storage",
  "@Hunter-Bow",
  "@TP-Apoc-SUV",
  "@TP-Apoc-M1025",
  "@TP-Apoc-Pickup",
  "@AnimatedDynamicHelicopters",
]);

const TYPE_BLOCK = /<type name="([^"]+)">[\s\S]*?<\/type>/g;

// Matches an economy types file's root element (optionally preceded by an
// XML declaration and/or comments), e.g. `<?xml ...?>` then `<types>`.
// Deliberately anchored so a *.xml file whose root is <spawnabletypes>
// (a different schema some mods ship alongside their real types file) is
// never mistaken for one, even though both use <type name="..."> blocks.
const TYPES_ROOT = /^\uFEFF?\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<types[\s>]/;

/** Recursively find every *.xml file under `dir` whose root element is `<types>`. */
async function findEconomyTypesFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(d: string): Promise<void> {
    let entries: AsyncIterable<Deno.DirEntry>;
    try {
      entries = Deno.readDir(d);
    } catch {
      return;
    }
    for await (const entry of entries) {
      const p = `${d}/${entry.name}`;
      if (entry.isDirectory) {
        await walk(p);
      } else if (entry.name.toLowerCase().endsWith(".xml")) {
        const text = await Deno.readTextFile(p).catch(() => "");
        if (TYPES_ROOT.test(text)) found.push(p);
      }
    }
  }
  await walk(dir);
  return found;
}

export async function ensureModTypesMerged(mods: Mod[]): Promise<void> {
  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(
      `${ECONOMY_TYPES_FILE} not found yet - it ships with the mission and ` +
        "should exist once the server has been installed",
    );
    return;
  }

  let text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingNames = new Set(
    [...text.matchAll(TYPE_BLOCK)].map((m) => m[1]),
  );

  let addedTotal = 0;
  for (const mod of mods) {
    if (!MOD_TYPES_SOURCES.has(mod.name)) continue;

    const modDir = `${SERVER_DIR}/${mod.name}`;
    if (!(await exists(modDir))) continue; // not installed yet

    const files = await findEconomyTypesFiles(modDir);
    if (files.length === 0) {
      log(`${mod.name}: no economy types.xml found under ${modDir} - nothing to merge`);
      continue;
    }

    let addedForMod = 0;
    for (const file of files) {
      const src = await Deno.readTextFile(file);
      for (const m of src.matchAll(TYPE_BLOCK)) {
        const [block, name] = m;
        if (existingNames.has(name)) continue;
        existingNames.add(name);
        text = text.replace("</types>", `    ${block}\n</types>`);
        addedForMod++;
      }
    }
    if (addedForMod > 0) {
      addedTotal += addedForMod;
      ok(`Merged ${addedForMod} item type(s) from ${mod.name} into ${ECONOMY_TYPES_FILE}`);
    }
  }

  if (addedTotal === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, text);
}

// One-time cleanup for a mod that was REMOVED from this project entirely.
// @Custom-Keycards' own reference types.xml was merged in additively by
// ensureModTypesMerged() above on every server that ever had it installed -
// that merge never removes anything, so once the mod was dropped from
// mods.txt its <type> blocks would otherwise persist forever in
// db/types.xml as orphaned dead weight. A brand-new install never hits
// this - it only matters for an existing server that already ran the mod
// at least once. Safe to run on every start: a no-op once the entries are
// gone.
const REMOVED_CUSTOM_KEYCARDS_TYPES = [
  "evg_keycard_holder_camo",
  "evg_keycard_holder_leather",
  "evg_keycards_All",
  "evg_keycards_Blue",
  "evg_keycards_Green",
  "evg_keycards_NWAF01",
  "evg_keycards_NWAF02",
  "evg_keycards_NWAF03",
  "evg_keycards_Red",
  "evg_keycards_Tisy01",
  "evg_keycards_Tisy02",
  "evg_keycards_Tisy03",
  "evg_keycards_Tisy04",
  "evg_keycards_Tisy05",
  "evg_keycards_Violet",
  "evg_keycards_White",
  "evg_keycards_Yellow",
];

export async function ensureCustomKeycardsTypesRemoved(): Promise<void> {
  // ensureModTypesMerged() already logs the missing-file case.
  if (!(await exists(ECONOMY_TYPES_FILE))) return;

  let text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  let removedCount = 0;
  for (const name of REMOVED_CUSTOM_KEYCARDS_TYPES) {
    const re = new RegExp(`\\s*<type name="${name}">[\\s\\S]*?</type>`);
    if (re.test(text)) {
      text = text.replace(re, "");
      removedCount++;
    }
  }

  if (removedCount === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, text);
  ok(
    `Removed ${removedCount} orphaned Custom-Keycards item type(s) from ${ECONOMY_TYPES_FILE} (mod no longer installed)`,
  );
}

// @KeyCard-Rooms-Better was dropped entirely from this project - same
// orphaned-<type>-block cleanup as REMOVED_CUSTOM_KEYCARDS_TYPES above.
// Only _01/_02/_03 were ever additively merged into db/types.xml (by a
// now-removed helper) - _04 was deliberately never included there, so
// there's nothing to clean up for it.
const REMOVED_KEYCARD_ROOMS_TYPES = [
  "RedemptionKeyCard_01",
  "RedemptionKeyCard_02",
  "RedemptionKeyCard_03",
];

export async function ensureKeyCardRoomsTypesRemoved(): Promise<void> {
  // ensureModTypesMerged() already logs the missing-file case.
  if (!(await exists(ECONOMY_TYPES_FILE))) return;

  let text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  let removedCount = 0;
  for (const name of REMOVED_KEYCARD_ROOMS_TYPES) {
    const re = new RegExp(`\\s*<type name="${name}">[\\s\\S]*?</type>`);
    if (re.test(text)) {
      text = text.replace(re, "");
      removedCount++;
    }
  }

  if (removedCount === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, text);
  ok(
    `Removed ${removedCount} orphaned @KeyCard-Rooms-Better item type(s) from ${ECONOMY_TYPES_FILE} (mod no longer installed)`,
  );
}

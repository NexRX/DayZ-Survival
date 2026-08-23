// Merges reference types.xml files shipped *alongside* certain content mods
// (not baked into their .pbo, just sitting in the workshop download for an
// admin to copy by hand) into the mission's central db/types.xml, so their
// items actually spawn in the loot economy instead of only being reachable
// via admin tools/trader/crafting.
//
// Additive merge only, same rule as ai.ts/dynamicMissions.ts: a <type>
// already present in the mission's types.xml (by name) — whether it came
// from vanilla, another mod, or an admin's own tuning — is never touched or
// duplicated. Safe to run on every start.
//
// Like economy.ts, this deliberately avoids a full XML parser/serializer:
// it only ever lifts whole <type name="...">...</type> blocks verbatim and
// appends them, leaving every other byte of the mission's file untouched.

import { ECONOMY_TYPES_FILE, SERVER_DIR } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

// Mods confirmed (from their own Steam Workshop pages) to ship a reference
// types.xml file in their mod folder for admins to merge in by hand. Keyed
// by the @name used in mods.txt. NCPR is deliberately excluded — its types
// are published separately on GitHub (https://github.com/N3msi/NCPR)
// rather than shipped in the workshop download, so there's no local file to
// discover here; see ncpr.ts instead, which fetches and merges them directly.
//
// The two CJ187 money mods are included speculatively: their Steam pages
// mention bundled example server files but don't spell out a types.xml by
// name. Harmless either way - findTypesFiles() below only merges what it
// actually finds, so this is a no-op until the mods are downloaded and
// confirmed (or corrected) either way. Buddys-BoltZ is included on the same
// speculative basis (a community-made "types.xml example" thread on its
// Steam page implies its ammo variants need one, but it's unclear whether
// the mod ships it itself).
const MOD_TYPES_SOURCES = new Set([
  "@Windstride-Clothing",
  "@DayZ-Dog",
  "@Custom-Keycards",
  "@BoomLays-Things",
  "@Crowwolfie-Recipes",
  "@Dart-Board-Game",
  "@CJ187-MoreMoney",
  "@CJ187-Money-Euros-Only",
  "@Zens-Zippo-Lighter",
  "@Buddys-BoltZ",
]);

const TYPE_BLOCK = /<type name="([^"]+)">[\s\S]*?<\/type>/g;

/** Recursively find every file named exactly "types.xml" (case-insensitive) under `dir`. */
async function findTypesFiles(dir: string): Promise<string[]> {
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
      if (entry.isDirectory) await walk(p);
      else if (entry.name.toLowerCase() === "types.xml") found.push(p);
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

    const files = await findTypesFiles(modDir);
    if (files.length === 0) {
      log(`${mod.name}: no types.xml found under ${modDir} - nothing to merge`);
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

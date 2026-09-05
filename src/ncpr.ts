// NCPR publishes its types.xml/cfgspawnabletypes.xml balancing on its own
// GitHub repo (https://github.com/N3msi/NCPR) rather than bundling them in
// the workshop download, so we fetch and merge them the same way modTypes.ts
// merges local mod files. Network access is best-effort: fetched files are
// cached under ai/cache/ and any failure just skips this step with a warning.

import { ECONOMY_TYPES_FILE, MISSION_DIR, ROOT } from "./paths.ts";
import { log, ok, warn } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const NCPR_MOD_NAMES = new Set([
  "@NCPR-Core",
  "@NCPR-Armors",
  "@NCPR-Metalworking",
  "@NCPR-Sewing",
  "@NCPR-Signs-Canvas",
]);

const CACHE_DIR = `${ROOT}/ai/cache`;

interface NCPRSource {
  url: string;
  cacheFile: string;
  targetFile: string;
  closingTag: string;
}

// Both files are documented as "for all addons", so merge in full
// regardless of which NCPR module(s) are installed.
const SOURCES: NCPRSource[] = [
  {
    url: "https://raw.githubusercontent.com/N3msi/NCPR/main/NM_TYPES.xml",
    cacheFile: `${CACHE_DIR}/NM_TYPES.xml`,
    targetFile: ECONOMY_TYPES_FILE,
    closingTag: "</types>",
  },
  {
    url: "https://raw.githubusercontent.com/N3msi/NCPR/main/NM_CFGSPAWNABLETYPES.xml",
    cacheFile: `${CACHE_DIR}/NM_CFGSPAWNABLETYPES.xml`,
    targetFile: `${MISSION_DIR}/cfgspawnabletypes.xml`,
    closingTag: "</spawnabletypes>",
  },
];

const TYPE_BLOCK = /<type name="([^"]+)">[\s\S]*?<\/type>/g;

async function fetchOrCache(url: string, cacheFile: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    await Deno.mkdir(CACHE_DIR, { recursive: true });
    await Deno.writeTextFile(cacheFile, text);
    return text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (await exists(cacheFile)) {
      log(`NCPR: couldn't reach ${url} (${msg}) - using previously cached copy`);
      return await Deno.readTextFile(cacheFile);
    }
    warn(`NCPR: couldn't reach ${url} and no cached copy exists yet - skipping (${msg})`);
    return null;
  }
}

function mergeBlocks(
  target: string,
  source: string,
  closingTag: string,
): { merged: string; added: number } {
  const existingNames = new Set([...target.matchAll(TYPE_BLOCK)].map((m) => m[1]));
  let added = 0;
  let merged = target;
  for (const m of source.matchAll(TYPE_BLOCK)) {
    const [block, name] = m;
    if (existingNames.has(name)) continue;
    existingNames.add(name);
    merged = merged.replace(closingTag, `    ${block}\n${closingTag}`);
    added++;
  }
  return { merged, added };
}

export async function ensureNCPRTypesMerged(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => NCPR_MOD_NAMES.has(m.name))) return; // no NCPR module in mods.txt

  for (const src of SOURCES) {
    if (!(await exists(src.targetFile))) {
      log(`${src.targetFile} not found yet - skipping NCPR merge`);
      continue;
    }

    const fetched = await fetchOrCache(src.url, src.cacheFile);
    if (fetched === null) continue;

    const target = await Deno.readTextFile(src.targetFile);
    const { merged, added } = mergeBlocks(target, fetched, src.closingTag);
    if (added === 0) continue;

    await Deno.writeTextFile(src.targetFile, merged);
    ok(`Merged ${added} NCPR item type(s) from ${src.url.split("/").pop()} into ${src.targetFile}`);
  }
}

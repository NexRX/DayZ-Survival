// Nemsis Craftingpack Redux (NCPR) publishes its item balancing (types.xml
// and cfgspawnabletypes.xml) on its own GitHub repo instead of bundling
// them in the workshop download like every other content mod in mods.txt
// (see modTypes.ts's MOD_TYPES_SOURCES) - there's nothing local to scan
// for. Rather than leave this as a manual copy-paste chore, this fetches
// the mod's own reference files straight from that public repo
// (https://github.com/N3msi/NCPR) and merges them in the same additive,
// name-deduped way modTypes.ts merges local ones.
//
// Network access here is best-effort and never required: every fetched
// file is cached locally under ai/cache/ so a later run works fully
// offline, and any failure (offline, GitHub down/rate-limited, repo
// restructured) just skips this step with a warning instead of blocking
// install/start.

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

// The mod's own README describes both files as "for all addons" - i.e.
// meant to be merged in full regardless of which NCPR module(s) you run.
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

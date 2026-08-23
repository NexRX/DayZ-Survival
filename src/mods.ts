// mods.txt parsing + Steam Web API lookup.

import { DAYZ_CLIENT_APPID, MODS_FILE } from "./paths.ts";
import { die, log } from "./ui.ts";

export interface Mod {
  id: string;
  name: string;
  /** Server-only mod (per its own docs) — loaded via `-servermod=`, not `-mod=`. */
  serverOnly: boolean;
}

export async function loadMods(): Promise<Mod[]> {
  let text: string;
  try {
    text = await Deno.readTextFile(MODS_FILE);
  } catch {
    die(`mods.txt not found at ${MODS_FILE}`);
  }
  const mods: Mod[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [id, name, flag] = line.split(/\s+/);
    if (!name) die(`mods.txt: id ${id} has no @name`);
    mods.push({ id, name, serverOnly: flag === "server" });
  }
  if (mods.length === 0) die("mods.txt has no mods");
  return mods;
}

/** The `-mod=` load order string, e.g. "@CF;@Dabs_Framework". Excludes server-only mods. */
export function modParam(mods: Mod[]): string {
  return mods.filter((m) => !m.serverOnly).map((m) => m.name).join(";");
}

/** The `-servermod=` load order string for server-only mods (not needed by clients). */
export function serverModParam(mods: Mod[]): string {
  return mods.filter((m) => m.serverOnly).map((m) => m.name).join(";");
}

/** Print title + size for each mod via the public Steam Web API. */
export async function resolveMods(mods: Mod[]): Promise<void> {
  const api = "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/";
  const body = new URLSearchParams();
  body.set("itemcount", String(mods.length));
  mods.forEach((m, i) => body.set(`publishedfileids[${i}]`, m.id));

  log(`Querying Steam for ${mods.length} workshop item(s)…`);
  const res = await fetch(api, { method: "POST", body });
  if (!res.ok) die(`Steam API returned HTTP ${res.status}`);

  const data = (await res.json()) as {
    response?: {
      publishedfiledetails?: Array<
        { publishedfileid: string; title?: string; file_size?: string | number }
      >;
    };
  };
  const details = data.response?.publishedfiledetails ?? [];
  for (const d of details) {
    const mb = d.file_size ? (Number(d.file_size) / 1048576).toFixed(2) : "?";
    console.log(
      `  ${d.publishedfileid}\t${d.title ?? "<unavailable>"}\t${mb}MB`,
    );
  }
}

/**
 * Search the Steam Workshop for DayZ (app 221100) via the public
 * `IPublishedFileService/QueryFiles` Web API, ranked by text relevance.
 * Requires a Steam Web API key (`deno task config`, or https://steamcommunity.com/dev/apikey).
 */
export async function searchMods(query: string, apiKey: string, limit = 20): Promise<void> {
  if (!query.trim()) die("Usage: deno task search <keywords>");
  if (!apiKey) {
    die(
      "No Steam Web API key configured. Run 'deno task config' and set one " +
        "(https://steamcommunity.com/dev/apikey) to search the workshop.",
    );
  }

  const api = "https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/";
  const params = new URLSearchParams({
    key: apiKey,
    query_type: "12", // k_PublishedFileQueryType_RankedByTextSearch
    appid: DAYZ_CLIENT_APPID,
    search_text: query,
    numperpage: String(limit),
    page: "1",
    return_short_description: "true",
    format: "json",
  });

  log(`Searching the Steam Workshop for "${query}"\u2026`);
  const res = await fetch(`${api}?${params}`);
  if (!res.ok) die(`Steam API returned HTTP ${res.status}`);

  const data = (await res.json()) as {
    response?: {
      total?: number;
      publishedfiledetails?: Array<{
        publishedfileid: string;
        title?: string;
        short_description?: string;
        file_size?: string | number;
        subscriptions?: number;
      }>;
    };
  };

  const details = data.response?.publishedfiledetails ?? [];
  if (details.length === 0) {
    log("No results.");
    return;
  }
  log(`${data.response?.total ?? details.length} total match(es), showing top ${details.length}:`);
  for (const d of details) {
    const mb = d.file_size ? (Number(d.file_size) / 1048576).toFixed(1) : "?";
    const subs = d.subscriptions !== undefined ? `${d.subscriptions} subs` : "";
    console.log(`\n  ${d.publishedfileid}  ${d.title ?? "<untitled>"}`);
    console.log(`  ${mb}MB  ${subs}`);
    if (d.short_description) {
      console.log(`  ${d.short_description.slice(0, 200).replace(/\n/g, " ")}`);
    }
    console.log(`  https://steamcommunity.com/sharedfiles/filedetails/?id=${d.publishedfileid}`);
  }
}

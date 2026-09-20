// Downloading workshop mods (via DepotDownloader) and installing them + their
// signing keys into the server directory.

import {
  DAYZ_CLIENT_APPID,
  PROFILE_DIR,
  SERVER_DIR,
  SERVERPACK,
  WORKSHOP_SUBPATH,
} from "../constants/paths.ts";
import { die, log, ok, warn } from "../ui.ts";
import { requireTools, runCapture } from "../proc.ts";
import {
  ensureDepotLogin,
  ensureLogin,
  exists,
  findWorkshopItem,
  forceDepotRelogin,
  hasAddonPbo,
  localManifestId,
  runDepotCapture,
  runSteamWorkshopBatch,
  workshopBytes,
} from "../steam.ts";
import {
  fetchWorkshopDetails,
  loadMods,
  type Mod,
  modParam,
  type WorkshopDetails,
} from "./mods.ts";
import { Settings } from "../config/settings.ts";

function bytesH(n: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i ? 1 : 0)}${units[i]}`;
}

// Real DayZ clients keep Steam's original, byte-for-byte mod download
// forever - filenames included. The connect-time "Client is missing a mod
// which is on the server" / "Missing PBO" check matches an addon by its
// exact-case PBO filename (not just its internal CfgPatches class name), so
// if a mod ships a mixed-case addon (e.g. `Nature_Overhaul_Redux.pbo`) and
// our server-side copy gets lowercased to `nature_overhaul_redux.pbo`, the
// server ends up requiring an addon name no real client's original-case
// download can ever exactly match - a permanent, unfixable-by-the-player
// kick (confirmed live: @Necromutant/@DecoyGrenades/@Nature-Overhaul-Redux,
// the only 3 mods in mods.txt whose upstream .pbo/.bisign/.bikey filenames
// happen to contain uppercase - every other mod already ships all-lowercase
// so this never showed up before). Never rename those three extensions;
// still lowercase everything else (folder names like `Addons` -> `addons`,
// which the *engine* needs to find case-sensitively on Linux, plus any
// other loose files a mod ships with internally-mismatched-case references).
const NEVER_LOWERCASE = /\.(pbo|bisign|bikey)$/i;

/** Recursively lowercase every file/dir name under `dir` (deepest first), except signed addon files (see NEVER_LOWERCASE above). */
async function lowercaseTree(dir: string): Promise<void> {
  const paths: string[] = [];
  const walk = async (d: string) => {
    for await (const entry of Deno.readDir(d)) {
      const p = `${d}/${entry.name}`;
      if (entry.isDirectory) await walk(p);
      paths.push(p); // children pushed before their parent -> rename deepest first
    }
  };
  await walk(dir);
  for (const p of paths) {
    const slash = p.lastIndexOf("/");
    const base = p.slice(slash + 1);
    if (NEVER_LOWERCASE.test(base)) continue;
    const low = base.toLowerCase();
    if (base === low) continue;
    await Deno.rename(p, `${p.slice(0, slash)}/${low}`).catch(() => {});
  }
}

/** Find a mod's key directory, matching any casing of "key"/"keys" (mods are inconsistent: some use "Keys", others just "key"). */
async function findKeyDir(dir: string): Promise<string | null> {
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory && /^keys?$/i.test(entry.name)) return `${dir}/${entry.name}`;
    }
  } catch {
    // dir doesn't exist - not fatal, caller tries the next candidate
  }
  return null;
}

/**
 * Some mods ship a `meta.cpp` with the wrong `publishedid` baked in (an
 * authoring mistake, e.g. `@Necromutant`/`@DecoyGrenades` shipping
 * `publishedid = 0`). Third-party launchers (DZSA, etc.) read this id to
 * resolve/auto-subscribe each required mod against the Steam Workshop API -
 * with it left at 0 they can't recognize the mod at all and refuse to even
 * attempt a connection ("Server has invalid mods that are not recognized by
 * Steam"), which is strictly worse than the problem this was meant to dodge.
 *
 * This was previously removed on a theory that the in-game "Client is
 * missing a mod which is on the server" kick was caused by this same
 * server-only patch diverging from every client's own unpatched copy - but
 * that was never actually confirmed (DZSA's own pre-connect check started
 * blocking first, before any client could get far enough to test the
 * in-game kick with a matching id). Restored until that theory is verified
 * with real evidence; the in-game kick needs a different root cause.
 */
async function fixMetaCpp(dst: string, mod: Mod): Promise<void> {
  const path = `${dst}/meta.cpp`;
  const text = await Deno.readTextFile(path).catch(() => null);
  if (text === null) return;
  const match = /publishedid\s*=\s*(\d+)\s*;/.exec(text);
  if (!match || match[1] === mod.id) return;
  await Deno.writeTextFile(
    path,
    text.replace(/publishedid\s*=\s*\d+\s*;/, `publishedid = ${mod.id};`),
  );
  warn(
    `${mod.name}'s meta.cpp had the wrong publishedid (${match[1]}) - corrected to ${mod.id}`,
  );
}

/** Copy one downloaded mod into the server dir and collect its .bikey files. */
export async function installOneMod(
  mod: Mod,
  lowercase: boolean,
): Promise<void> {
  const src = await findWorkshopItem(mod.id);
  if (!src) die(`Downloaded content for ${mod.name} (${mod.id}) not found.`);
  const dst = `${SERVER_DIR}/${mod.name}`;
  await Deno.remove(dst, { recursive: true }).catch(() => {});

  // Our own server pack's .bisign/.bikey filenames encode the signing key's
  // authority name case-sensitively (see modBuild.ts) - lowercasing them
  // would desync the filename from the case embedded in the signature and
  // break verification, so skip the lowercase pass for our own pack only.
  const skipLowercase = mod.name === `@${SERVERPACK.name}`;
  if (lowercase) {
    await runCapture("cp", ["-a", src, dst]);
    if (!skipLowercase) await lowercaseTree(dst);
  } else {
    await Deno.symlink(src, dst);
  }

  await fixMetaCpp(dst, mod);

  const keydir = (await findKeyDir(dst)) ?? (await findKeyDir(src));
  if (keydir) {
    await Deno.mkdir(`${SERVER_DIR}/keys`, { recursive: true });
    for await (const entry of Deno.readDir(keydir)) {
      if (/\.bikey$/i.test(entry.name)) {
        await Deno.copyFile(
          `${keydir}/${entry.name}`,
          `${SERVER_DIR}/keys/${entry.name}`,
        );
      }
    }
  }
}

const MAX_DOWNLOAD_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = [15_000, 30_000, 60_000];
// Steam's login throttle can last 30-60 minutes. Keep retrying indefinitely,
// increasing the cooldown up to one hour rather than creating another login
// attempt while the account is still blocked.
const RATE_LIMIT_INITIAL_BACKOFF_MS = 5 * 60_000;
const RATE_LIMIT_MAX_BACKOFF_MS = 60 * 60_000;
const MIN_DEPOT_LAUNCH_GAP_MS = 3_000;
const LARGE_MOD_BYTES = 500 * 1024 * 1024;
let lastDepotLaunchAt = 0;

async function paceDepotLaunch(): Promise<void> {
  const wait = lastDepotLaunchAt + MIN_DEPOT_LAUNCH_GAP_MS - Date.now();
  if (wait > 0) await new Promise<void>((resolve) => setTimeout(resolve, wait));
  lastDepotLaunchAt = Date.now();
}

/**
 * Download (or re-validate) a single workshop item into the SteamCMD-style
 * content layout. `-validate` keeps a mod from silently going stale relative
 * to Steam, but each login counts against Steam's rate limit, so this only
 * talks to DepotDownloader for mods that aren't downloaded yet or that the
 * caller has flagged as stale (`force: true`).
 */
export async function downloadOne(
  s: Settings,
  mod: Mod,
  force = false,
): Promise<void> {
  const out = `${SERVER_DIR}/${WORKSHOP_SUBPATH}/${mod.id}`;

  if (!force && (await hasAddonPbo(mod.id))) {
    ok(`${mod.name} already present (${bytesH(await workshopBytes(mod.id))}) - up to date`);
    return;
  }

  if (force) {
    // DepotDownloader's `-validate` only adds/fixes files still present in
    // the *current* manifest - it doesn't necessarily prune files left over
    // from an older manifest revision if a mod's update restructures/moves
    // things around. Wiping the raw download dir first forces a truly clean
    // full re-sync instead of an incremental one, so a restructured mod
    // can never leave a stale, no-longer-published orphan file sitting
    // alongside the new content (general hardening - not a confirmed cause
    // of any specific issue seen so far, just a real risk this avoids).
    await Deno.remove(out, { recursive: true }).catch(() => {});
  }

  await ensureDepotLogin(s);
  await Deno.mkdir(out, { recursive: true });

  // Do not pass the password to every DepotDownloader process. That forces a
  // fresh Steam credential login for every mod and quickly trips Steam's
  // login throttle. ensureDepotLogin() seeds the remembered token once;
  // failures that prove the token is stale are handled below.
  let reauthed = false;
  let rateLimitRetries = 0;
  for (let tries = 1;; tries++) {
    log(
      `Downloading ${mod.name} (${mod.id}) via DepotDownloader - ` +
        `attempt ${tries}${rateLimitRetries ? ` (rate-limit retry ${rateLimitRetries})` : ""} (${
          bytesH(await workshopBytes(mod.id))
        } cached)…`,
    );
    await paceDepotLaunch();
    const { code, output } = await runDepotCapture([
      "-app",
      DAYZ_CLIENT_APPID,
      "-pubfile",
      mod.id,
      "-username",
      s.STEAM_USER,
      "-remember-password",
      "-validate",
      "-dir",
      out,
    ]);
    if (code === 0 && (await hasAddonPbo(mod.id))) {
      rateLimitRetries = 0;
      ok(`${mod.name} downloaded (${bytesH(await workshopBytes(mod.id))})`);
      return;
    }

    // Check rate limiting before any other login-related failure. DepotDownloader
    // often reports RateLimitExceeded through its generic exception path; treating
    // that as a stale token would immediately create another login attempt.
    const rateLimited = /RateLimitExceeded|rate.?limit|too many login attempts/i.test(output);
    if (rateLimited) {
      rateLimitRetries++;
      const wait = Math.min(
        RATE_LIMIT_INITIAL_BACKOFF_MS * 2 ** (rateLimitRetries - 1),
        RATE_LIMIT_MAX_BACKOFF_MS,
      );
      warn(
        `Attempt ${tries} hit Steam's login rate limit; ` +
          `retrying indefinitely in ${wait / 60_000} minutes (backoff ${rateLimitRetries})…`,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
      continue;
    }

    // A stale/invalid remembered-login token makes DepotDownloader crash
    // outright instead of failing gracefully, so re-authorize once and retry
    // immediately instead of burning through attempts on the normal backoff.
    const staleLogin =
      /LogOn requires a username and password|AccessDenied|InvalidSignature|Expired|Revoked/i
        .test(output);
    if (staleLogin && !reauthed) {
      reauthed = true;
      warn("DepotDownloader's cached login looks stale/invalid - re-authenticating…");
      await forceDepotRelogin(s);
      tries--; // don't count this against maxTries
      continue;
    }

    if (tries >= MAX_DOWNLOAD_ATTEMPTS) {
      die(
        `Download of ${mod.name} (${mod.id}) failed after ${MAX_DOWNLOAD_ATTEMPTS} attempts. ` +
          `Re-run 'deno task mods' to resume - DepotDownloader continues where it left off.`,
      );
    }
    const wait = RETRY_BACKOFF_MS[Math.min(tries - 1, RETRY_BACKOFF_MS.length - 1)];
    warn(
      `Attempt ${tries} failed; retrying in ${wait / 1000}s (DepotDownloader resumes)…`,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }
}

/**
 * Which already-downloaded mods have a newer content id published on Steam
 * than what we last validated. The details were fetched once for the whole
 * run, so this check does not create another API request or Steam login.
 */
async function staleModIds(
  mods: Mod[],
  remote: Map<string, WorkshopDetails>,
): Promise<Map<string, { ours: string; theirs: string }>> {
  const stale = new Map<string, { ours: string; theirs: string }>();
  for (const mod of mods) {
    const theirs = remote.get(mod.id)?.contentId;
    if (!theirs) continue; // API didn't return this one - don't guess
    const ours = await localManifestId(mod.id);
    if (ours && ours !== theirs) stale.set(mod.id, { ours, theirs });
  }
  return stale;
}

// A persistent, append-only record of every auto-update `doMods` silently
// applies. Logged only from `doMods` (not `ensureMods`'s pre-check), since
// `ensureMods` always re-runs `doMods` when anything is stale, which would
// otherwise double up every log entry.
const MOD_UPDATE_LOG = `${PROFILE_DIR}/mod-updates.log`;

async function logModUpdates(
  mods: Mod[],
  stale: Map<string, { ours: string; theirs: string }>,
): Promise<void> {
  if (stale.size === 0) return;
  const lines: string[] = [];
  for (const mod of mods) {
    const info = stale.get(mod.id);
    if (!info) continue;
    lines.push(
      `${new Date().toISOString()}  ${mod.name} (${mod.id})  ${info.ours} -> ${info.theirs}`,
    );
  }
  if (lines.length === 0) return;
  await Deno.writeTextFile(MOD_UPDATE_LOG, lines.join("\n") + "\n", { append: true }).catch(
    () => {},
  );
}

function needsDepotDownloader(details: WorkshopDetails | undefined): boolean {
  // If Steam cannot tell us the size, prefer DepotDownloader: it is resumable
  // and avoids accidentally pushing a very large item through SteamCMD.
  return details?.sizeBytes === null || details === undefined ||
    details.sizeBytes > LARGE_MOD_BYTES;
}

async function clearWorkshopCache(id: string): Promise<void> {
  await Deno.remove(`${SERVER_DIR}/${WORKSHOP_SUBPATH}/${id}`, { recursive: true }).catch(() => {});
}

async function hasPboAt(path: string): Promise<boolean> {
  if (!(await exists(path))) return false;
  const { code, stdout } = await runCapture("find", [
    path,
    "-iname",
    "*.pbo",
    "-print",
    "-quit",
  ]);
  return code === 0 && stdout.trim().length > 0;
}

async function hasInstalledMod(mod: Mod): Promise<boolean> {
  return await hasPboAt(`${SERVER_DIR}/${mod.name}`);
}

async function hasDownloadedMod(mod: Mod): Promise<boolean> {
  return await hasAddonPbo(mod.id);
}

/** Download small mods together, then install each one before moving on. */
async function downloadSmallMods(
  s: Settings,
  mods: Mod[],
  refresh: Set<string>,
  lowercase: boolean,
): Promise<void> {
  const pending: Mod[] = [];
  for (const mod of mods) {
    const force = refresh.has(mod.id);
    if (force) await clearWorkshopCache(mod.id);
    if (force || !(await hasDownloadedMod(mod) || await hasInstalledMod(mod))) {
      pending.push(mod);
    }
  }
  const pendingIds = new Set(pending.map((mod) => mod.id));

  if (pending.length > 0) {
    await ensureLogin(s);
    log(`Downloading ${pending.length} small workshop mod(s) in one SteamCMD session...`);
    const code = await runSteamWorkshopBatch(s, pending.map((mod) => mod.id));
    if (code !== 0) {
      warn(`SteamCMD exited with code ${code} while downloading small mods.`);
    }
  }

  const failed: string[] = [];
  for (const mod of mods) {
    const downloaded = await hasDownloadedMod(mod);
    const installed = await hasInstalledMod(mod);
    if (!downloaded && !installed) {
      failed.push(mod.name);
      continue;
    }
    const destination = `${SERVER_DIR}/${mod.name}`;
    if (!pendingIds.has(mod.id) && installed) continue;
    if (!downloaded) {
      failed.push(mod.name);
      continue;
    }
    await installOneMod(mod, lowercase);
    ok(`${mod.name} installed in ${destination}`);
  }
  if (failed.length > 0) {
    die(`SteamCMD did not produce usable content for: ${failed.join(", ")}.`);
  }
}

/** Download large mods one at a time and install each immediately. */
async function downloadLargeMods(
  s: Settings,
  mods: Mod[],
  refresh: Set<string>,
  lowercase: boolean,
): Promise<void> {
  if (mods.length === 0) return;
  let depotReady = false;
  for (const mod of mods) {
    const force = refresh.has(mod.id);
    if (force) await clearWorkshopCache(mod.id);

    const installed = !force && await hasInstalledMod(mod);
    const downloaded = !force && await hasDownloadedMod(mod);
    if (installed) {
      ok(`${mod.name} already installed in ${SERVER_DIR}/${mod.name}`);
      continue;
    }

    if (!downloaded) {
      if (!depotReady) {
        await ensureDepotLogin(s);
        depotReady = true;
      }
      await downloadOne(s, mod);
    } else {
      ok(`${mod.name} already downloaded (${bytesH(await workshopBytes(mod.id))})`);
    }

    await installOneMod(mod, lowercase);
    ok(`${mod.name} installed in ${SERVER_DIR}/${mod.name}`);
  }
}

/**
 * Downloaders are selected once from Steam's published item sizes:
 * SteamCMD handles every item at or below 500 MiB in one login/session,
 * while DepotDownloader handles larger items sequentially and resumes reliably.
 */
export async function doMods(s: Settings, extraRefreshIds?: Set<string>): Promise<void> {
  await requireTools();
  const mods = await loadMods();
  const details = await fetchWorkshopDetails(mods);
  const stale = await staleModIds(mods, details);
  await logModUpdates(mods, stale);
  const refresh = new Set([...(extraRefreshIds ?? []), ...stale.keys()]);
  if (stale.size > 0) {
    log(`${stale.size} mod(s) updated on Steam - refreshing with the selected downloader.`);
  }

  const lowercase = s.LOWERCASE_MODS !== "0";
  const small: Mod[] = [];
  const large: Mod[] = [];
  for (const mod of mods) {
    (needsDepotDownloader(details.get(mod.id)) ? large : small).push(mod);
  }

  await Deno.mkdir(`${SERVER_DIR}/keys`, { recursive: true });
  log(
    `Downloader plan: ${small.length} small via SteamCMD, ${large.length} large via DepotDownloader.`,
  );
  await downloadSmallMods(s, small, refresh, lowercase);
  await downloadLargeMods(s, large, refresh, lowercase);
  ok(`Mods installed. Load order: ${modParam(mods)}`);
}

export async function modsInstalled(): Promise<boolean> {
  const mods = await loadMods();
  for (const mod of mods) {
    if (!(await hasInstalledMod(mod))) return false;
  }
  return true;
}

/**
 * The automatic path used by every `up`/server start: installs anything
 * missing, then does a fast, login-free check for mods Steam has updated
 * since we last validated them and re-validates just those.
 */
export async function ensureMods(s: Settings): Promise<void> {
  if (!(await modsInstalled())) {
    await doMods(s);
    return;
  }

  const mods = await loadMods();
  const details = await fetchWorkshopDetails(mods);
  const stale = await staleModIds(mods, details);
  if (stale.size === 0) return;

  log(
    `${stale.size} mod(s) have been updated on Steam since we last checked - refreshing…`,
  );
  await doMods(s, new Set(stale.keys()));
}

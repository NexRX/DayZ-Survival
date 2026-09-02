// Downloading workshop mods (via DepotDownloader) and installing them + their
// signing keys into the server directory.

import {
  DAYZ_CLIENT_APPID,
  PROFILE_DIR,
  SERVER_DIR,
  SERVER_PACKS,
  WORKSHOP_SUBPATH,
} from "./paths.ts";
import { die, log, ok, warn } from "./ui.ts";
import { requireTools, runCapture } from "./proc.ts";
import {
  ensureDepotLogin,
  ensureLogin,
  exists,
  findWorkshopItem,
  forceDepotRelogin,
  hasAddonPbo,
  localManifestId,
  runDepotCapture,
  workshopBytes,
} from "./steam.ts";
import { fetchContentIds, loadMods, type Mod, modParam } from "./mods.ts";
import type { Settings } from "./config.ts";

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

/** Recursively lowercase every file/dir name under `dir` (deepest first). */
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
  // authority name verbatim (see modBuild.ts) - DayZ's signature check
  // matches that name case-sensitively against the key/signature content, so
  // lowercasing it here (fine for third-party mods, which is what this exists
  // for) would desync the filename from the case actually embedded in the
  // signature and break verification. We wrote this addon ourselves with
  // consistent casing throughout, so it doesn't need the Linux-compatibility
  // lowercase pass at all - but it still gets copied like every other mod
  // (never symlinked), so it's installed identically to everything else.
  const skipLowercase = SERVER_PACKS.some((p) => mod.name === `@${p.name}`);
  if (lowercase) {
    await runCapture("cp", ["-a", src, dst]);
    if (!skipLowercase) await lowercaseTree(dst);
  } else {
    await Deno.symlink(src, dst);
  }

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

/**
 * Download (or re-validate) a single workshop item into the SteamCMD-style
 * content layout so the install pipeline is unchanged. DepotDownloader always
 * checks the item's current manifest and only re-fetches changed files, so
 * `-validate` is what keeps a mod from silently going stale relative to Steam
 * once we've downloaded it once - a stale server-side copy can mismatch a
 * player's freshly-downloaded client copy and get them kicked for "a PBO
 * which is not part of the server".
 *
 * Every Steam3 login (one per mod, since DepotDownloader has no multi-item
 * batch mode) counts against Steam's login rate limit, so re-validating
 * *everything* on every run isn't viable for a large mods.txt - it reliably
 * trips `RateLimitExceeded` partway through. So this only talks to
 * DepotDownloader at all for mods that aren't downloaded yet, or that
 * `doMods`/`ensureMods` determined (via `staleModIds`, a login-free check)
 * are actually out of date - `force: true` in that case.
 */
export async function downloadOne(
  s: Settings,
  mod: Mod,
  force = false,
): Promise<void> {
  const out = `${SERVER_DIR}/${WORKSHOP_SUBPATH}/${mod.id}`;

  if (!force && (await hasAddonPbo(mod.id))) {
    ok(`${mod.name} already present (${bytesH(await workshopBytes(mod.id))}) — up to date`);
    return;
  }

  await ensureDepotLogin(s);
  await Deno.mkdir(out, { recursive: true });

  // Pace logins a bit even so, and back off hard specifically on Steam's
  // rate limit rather than the flat retry delay used for other failures.
  await new Promise<void>((resolve) => setTimeout(resolve, 2000));

  const maxTries = 4;
  const backoffMs = [15_000, 30_000, 60_000];
  let reauthed = false;
  for (let tries = 1;; tries++) {
    log(
      `Downloading ${mod.name} (${mod.id}) via DepotDownloader — ` +
        `attempt ${tries}/${maxTries} (${bytesH(await workshopBytes(mod.id))} cached)…`,
    );
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
      ok(`${mod.name} downloaded (${bytesH(await workshopBytes(mod.id))})`);
      return;
    }

    // A stale/invalid remembered-login token makes DepotDownloader crash
    // outright instead of failing gracefully - retrying with the same dead
    // token would just burn through all attempts uselessly, so re-authorize
    // once and retry immediately instead of following the normal backoff.
    const staleLogin = /LogOn requires a username and password|Unhandled exception/i
      .test(output);
    if (staleLogin && !reauthed) {
      reauthed = true;
      warn("DepotDownloader's cached login looks stale/invalid — re-authenticating…");
      await forceDepotRelogin(s);
      tries--; // don't count this against maxTries
      continue;
    }

    if (tries >= maxTries) {
      die(
        `Download of ${mod.name} (${mod.id}) failed after ${maxTries} attempts. ` +
          `Re-run 'deno task mods' to resume — DepotDownloader continues where it left off.`,
      );
    }
    const rateLimited = /RateLimitExceeded/i.test(output);
    const wait = rateLimited ? 90_000 : backoffMs[Math.min(tries - 1, backoffMs.length - 1)];
    warn(
      `Attempt ${tries} failed${rateLimited ? " (Steam login rate limit)" : ""}; ` +
        `retrying in ${wait / 1000}s (DepotDownloader resumes)…`,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }
}

/**
 * Which already-downloaded mods have a newer content id published on Steam
 * than what we last validated (see `localManifestId`) - a single, login-free
 * Web API call, so this is cheap enough to run on every `up`/`mods`
 * invocation. Anything not yet downloaded, or where the check itself fails
 * (offline, API hiccup), is left out rather than forced. Keyed by mod id;
 * values carry the old/new content ids so callers can log what changed.
 */
async function staleModIds(mods: Mod[]): Promise<Map<string, { ours: string; theirs: string }>> {
  const remote = await fetchContentIds(mods);
  const stale = new Map<string, { ours: string; theirs: string }>();
  for (const mod of mods) {
    const theirs = remote.get(mod.id);
    if (!theirs) continue; // API didn't return this one - don't guess
    const ours = await localManifestId(mod.id);
    if (ours && ours !== theirs) stale.set(mod.id, { ours, theirs });
  }
  return stale;
}

// A persistent, append-only record of every auto-update `ensureMods`/`doMods`
// has ever silently applied (by design, this project never prompts before
// re-validating an updated mod - see doMods/ensureMods below) - previously
// there was no way to tell what changed or when after the fact. Logged once,
// from `doMods` only (not `staleModIds`'s other caller, `ensureMods`'s
// pre-check), since `ensureMods` always re-runs `doMods` - which recomputes
// staleness itself - whenever it finds anything stale, so logging in both
// places would double up every entry.
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

/**
 * `extraRefreshIds`, when given, additionally forces a re-validation of
 * those specific workshop ids (e.g. to force-check a mod you suspect is
 * stale even if Steam's API hasn't caught up yet). `staleModIds` runs
 * regardless, so normal use needs nothing passed manually at all.
 */
export async function doMods(s: Settings, extraRefreshIds?: Set<string>): Promise<void> {
  await requireTools();
  await ensureLogin(s);
  const mods = await loadMods();

  const stale = await staleModIds(mods);
  await logModUpdates(mods, stale);
  const refresh = new Set([...(extraRefreshIds ?? []), ...stale.keys()]);
  if (stale.size > 0) {
    log(`${stale.size} mod(s) updated on Steam since last check - will re-validate.`);
  }

  log(`Downloading ${mods.length} workshop mod(s)...`);
  for (const mod of mods) {
    await downloadOne(s, mod, refresh.has(mod.id));
  }

  log("Installing mods + keys into the server");
  await Deno.mkdir(`${SERVER_DIR}/keys`, { recursive: true });
  const lowercase = s.LOWERCASE_MODS !== "0";
  for (const mod of mods) {
    console.log(`   ${mod.name}`);
    await installOneMod(mod, lowercase);
  }
  ok(`Mods installed. Load order: ${modParam(mods)}`);
}

export async function modsInstalled(): Promise<boolean> {
  const mods = await loadMods();
  for (const mod of mods) {
    if (!(await exists(`${SERVER_DIR}/${mod.name}`))) return false;
  }
  return true;
}

/**
 * The automatic path used by every `up`/server start: installs anything
 * missing, then does a fast, login-free check for mods Steam has updated
 * since we last validated them and re-validates just those - no manual
 * intervention (or workshop-id-hunting) required.
 */
export async function ensureMods(s: Settings): Promise<void> {
  if (!(await modsInstalled())) {
    await doMods(s);
    return;
  }

  const mods = await loadMods();
  const stale = await staleModIds(mods);
  if (stale.size === 0) return;

  log(
    `${stale.size} mod(s) have been updated on Steam since we last checked — re-validating…`,
  );
  await doMods(s, new Set(stale.keys()));
}

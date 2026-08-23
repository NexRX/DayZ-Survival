// Downloading workshop mods (via DepotDownloader) and installing them + their
// signing keys into the server directory.

import { DAYZ_CLIENT_APPID, SERVER_DIR, WORKSHOP_SUBPATH } from "./paths.ts";
import { die, log, ok, warn } from "./ui.ts";
import { requireTools, runCapture } from "./proc.ts";
import {
  ensureDepotLogin,
  ensureLogin,
  exists,
  findWorkshopItem,
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

/** Copy one downloaded mod into the server dir and collect its .bikey files. */
export async function installOneMod(
  mod: Mod,
  lowercase: boolean,
): Promise<void> {
  const src = await findWorkshopItem(mod.id);
  if (!src) die(`Downloaded content for ${mod.name} (${mod.id}) not found.`);
  const dst = `${SERVER_DIR}/${mod.name}`;
  await Deno.remove(dst, { recursive: true }).catch(() => {});

  if (lowercase) {
    await runCapture("cp", ["-a", src, dst]);
    await lowercaseTree(dst);
  } else {
    await Deno.symlink(src, dst);
  }

  for (
    const keydir of [`${dst}/keys`, `${dst}/Keys`, `${src}/keys`, `${src}/Keys`]
  ) {
    if (!(await exists(keydir))) continue;
    await Deno.mkdir(`${SERVER_DIR}/keys`, { recursive: true });
    for await (const entry of Deno.readDir(keydir)) {
      if (/\.bikey$/i.test(entry.name)) {
        await Deno.copyFile(
          `${keydir}/${entry.name}`,
          `${SERVER_DIR}/keys/${entry.name}`,
        );
      }
    }
    break;
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
 * (offline, API hiccup), is left out rather than forced.
 */
async function staleModIds(mods: Mod[]): Promise<Set<string>> {
  const remote = await fetchContentIds(mods);
  const stale = new Set<string>();
  for (const mod of mods) {
    const theirs = remote.get(mod.id);
    if (!theirs) continue; // API didn't return this one - don't guess
    const ours = await localManifestId(mod.id);
    if (ours && ours !== theirs) stale.add(mod.id);
  }
  return stale;
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
  const refresh = new Set([...(extraRefreshIds ?? []), ...stale]);
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
  await doMods(s, stale);
}

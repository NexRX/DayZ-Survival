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
  runDepot,
  workshopBytes,
} from "./steam.ts";
import { loadMods, type Mod, modParam } from "./mods.ts";
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
 * Download a single workshop item into the SteamCMD-style content layout so the
 * install pipeline is unchanged. DepotDownloader resumes on its own; we just
 * retry a few times on transient network failures.
 */
export async function downloadOne(s: Settings, mod: Mod): Promise<void> {
  const out = `${SERVER_DIR}/${WORKSHOP_SUBPATH}/${mod.id}`;

  if (await hasAddonPbo(mod.id)) {
    ok(
      `${mod.name} already present (${bytesH(await workshopBytes(mod.id))}) — skipping download`,
    );
    return;
  }

  await ensureDepotLogin(s);
  await Deno.mkdir(out, { recursive: true });

  const maxTries = 4;
  for (let tries = 1;; tries++) {
    log(
      `Downloading ${mod.name} (${mod.id}) via DepotDownloader — ` +
        `attempt ${tries}/${maxTries} (${bytesH(await workshopBytes(mod.id))} cached)…`,
    );
    const code = await runDepot([
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
    warn(`Attempt ${tries} failed; retrying in 5s (DepotDownloader resumes)…`);
    await new Promise<void>((resolve) => setTimeout(resolve, 5000));
  }
}

export async function doMods(s: Settings): Promise<void> {
  await requireTools();
  await ensureLogin(s);
  const mods = await loadMods();
  log(`Downloading ${mods.length} workshop mod(s)…`);
  for (const mod of mods) await downloadOne(s, mod);

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

export async function ensureMods(s: Settings): Promise<void> {
  if (!(await modsInstalled())) await doMods(s);
}

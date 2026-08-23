// SteamCMD + DepotDownloader integration:
//   - SteamCMD: interactive login + installing the DayZ dedicated server app.
//   - DepotDownloader: reliable (resumable) workshop-mod downloads, because
//     SteamCMD times out on the ~2.8 GB Expansion bundle and can't resume.

import {
  DAYZ_CLIENT_APPID,
  DAYZ_SERVER_APPID,
  DD_LOGIN_MARKER,
  LOGIN_MARKER,
  PROFILE_DIR,
  SERVER_DIR,
  STEAMCMD_DIR,
  WORKSHOP_SUBPATH,
} from "./paths.ts";
import { requireTools, runCapture, runFiltered, runInherit } from "./proc.ts";
import { askSecret, die, hint, log, ok } from "./ui.ts";
import { ensureConfig, type Settings } from "./config.ts";
import { loadMods } from "./mods.ts";

/** Known-benign SteamCMD Linux log spam to filter out of install/download output. */
const BENIGN =
  /SaveInstallBaseFolders: rejecting attempt to save with no libraries|applicationmanager\.cpp \(\d+\) :/;

export async function exists(p: string): Promise<boolean> {
  try {
    await Deno.stat(p);
    return true;
  } catch {
    return false;
  }
}

const homeEnv = () => ({ HOME: STEAMCMD_DIR });

/** SteamCMD with project-local HOME + inherited stdio (for interactive login). */
async function runSteamcmd(args: string[]): Promise<number> {
  await Deno.mkdir(STEAMCMD_DIR, { recursive: true });
  return runInherit("steamcmd", args, { env: homeEnv() });
}

/** SteamCMD, but with benign Linux log spam filtered (non-interactive ops). */
async function runSteamcmdQuiet(args: string[]): Promise<number> {
  await Deno.mkdir(STEAMCMD_DIR, { recursive: true });
  return runFiltered("steamcmd", args, BENIGN, { env: homeEnv() });
}

/** DepotDownloader run with its config/token kept project-local (cwd + HOME). */
export async function runDepot(args: string[]): Promise<number> {
  await Deno.mkdir(STEAMCMD_DIR, { recursive: true });
  return runInherit("DepotDownloader", args, {
    cwd: STEAMCMD_DIR,
    env: homeEnv(),
  });
}

/**
 * Whether a workshop item's downloaded content includes at least one .pbo
 * addon file. This is the real signal that a download is complete and
 * usable — unlike a raw byte-size threshold, it isn't fooled by mods whose
 * total content is legitimately small (settings-only addons, etc.).
 */
export async function hasAddonPbo(id: string): Promise<boolean> {
  const p = await findWorkshopItem(id);
  if (!p) return false;
  const { code, stdout } = await runCapture("find", [
    p,
    "-iname",
    "*.pbo",
    "-print",
    "-quit",
  ]);
  return code === 0 && stdout.trim().length > 0;
}

export async function findWorkshopItem(id: string): Promise<string | null> {
  const roots = [
    SERVER_DIR,
    STEAMCMD_DIR,
    `${STEAMCMD_DIR}/.local/share/Steam`,
    `${STEAMCMD_DIR}/Steam`,
  ];
  for (const root of roots) {
    const p = `${root}/${WORKSHOP_SUBPATH}/${id}`;
    if (await exists(p)) return p;
  }
  return null;
}

/** Total bytes fetched for a workshop item (partial + complete), across dirs. */
export async function workshopBytes(id: string): Promise<number> {
  let total = 0;
  const roots = [
    SERVER_DIR,
    `${STEAMCMD_DIR}/.local/share/Steam`,
    STEAMCMD_DIR,
  ];
  const subs = [
    `steamapps/workshop/downloading/${DAYZ_CLIENT_APPID}/${id}`,
    `steamapps/workshop/content/${DAYZ_CLIENT_APPID}/${id}`,
  ];
  for (const root of roots) {
    for (const sub of subs) {
      const p = `${root}/${sub}`;
      if (!(await exists(p))) continue;
      const { code, stdout } = await runCapture("du", ["-sb", p]);
      if (code === 0) total += Number(stdout.split(/\s+/)[0] || 0);
    }
  }
  return total;
}

export async function serverInstalled(): Promise<boolean> {
  return (await exists(`${SERVER_DIR}/DayZServer`)) ||
    (await exists(`${SERVER_DIR}/DayZServer_x64`));
}

export async function serverBinary(): Promise<string> {
  return (await exists(`${SERVER_DIR}/DayZServer_x64`))
    ? `${SERVER_DIR}/DayZServer_x64`
    : `${SERVER_DIR}/DayZServer`;
}

export async function loggedIn(user: string): Promise<boolean> {
  if (await exists(LOGIN_MARKER)) return true;
  // Heuristic: an existing cached Steam session for this user counts as logged in.
  const vdf = `${STEAMCMD_DIR}/.local/share/Steam/config/config.vdf`;
  if (user && (await exists(vdf))) {
    try {
      const t = await Deno.readTextFile(vdf);
      if (t.toLowerCase().includes(`"${user.toLowerCase()}"`)) {
        await Deno.writeTextFile(LOGIN_MARKER, "").catch(() => {});
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export async function doLogin(s: Settings): Promise<void> {
  await requireTools();
  await ensureConfig(s);
  log(`Logging in to Steam as '${s.STEAM_USER}'`);
  hint("Password is used once to cache a session; it is NOT saved.");
  const pass = await askSecret("Steam password");
  hint("(Steam Guard: confirm on your phone or enter the code when asked.)");
  if ((await runSteamcmd(["+login", s.STEAM_USER, pass, "+quit"])) === 0) {
    await Deno.writeTextFile(LOGIN_MARKER, "");
    ok("Logged in and session cached.");
  } else {
    await Deno.remove(LOGIN_MARKER).catch(() => {});
    die("Login failed. Re-run and check username / password / Steam Guard.");
  }
}

export async function ensureLogin(s: Settings): Promise<void> {
  if (!(await loggedIn(s.STEAM_USER))) await doLogin(s);
}

export async function doInstall(s: Settings): Promise<void> {
  await requireTools();
  await ensureLogin(s);
  log(`Installing/updating DayZ dedicated server (app ${DAYZ_SERVER_APPID})`);
  await Deno.mkdir(SERVER_DIR, { recursive: true });
  await Deno.mkdir(PROFILE_DIR, { recursive: true });
  // App 223350 rejects anonymous logins ("No subscription"), so use the account.
  await runSteamcmdQuiet([
    "+force_install_dir",
    SERVER_DIR,
    "+login",
    s.STEAM_USER,
    "+app_update",
    DAYZ_SERVER_APPID,
    "validate",
    "+quit",
  ]);
  if (!(await serverInstalled())) {
    die("DayZServer binary missing after install — check output above.");
  }
  ok("Server installed.");
}

export async function ensureServer(s: Settings): Promise<void> {
  if (!(await serverInstalled())) await doInstall(s);
}

/**
 * One-time: cache a DepotDownloader login token (separate from SteamCMD's).
 * Does a tiny manifest-only fetch of the first mod to trigger the login prompt;
 * afterwards downloads reuse the token via -remember-password.
 */
export async function ensureDepotLogin(s: Settings): Promise<void> {
  if (await exists(DD_LOGIN_MARKER)) return;
  await ensureConfig(s);
  const mods = await loadMods();
  log("Authorizing DepotDownloader for workshop access (one-time)");
  hint(
    "Password is used once to cache a DepotDownloader token; it is NOT saved.",
  );
  const pass = await askSecret("Steam password");
  hint("(Steam Guard: confirm on your phone or enter the code when asked.)");
  const code = await runDepot([
    "-app",
    DAYZ_CLIENT_APPID,
    "-pubfile",
    mods[0].id,
    "-manifest-only",
    "-username",
    s.STEAM_USER,
    "-password",
    pass,
    "-remember-password",
  ]);
  if (code === 0) {
    await Deno.writeTextFile(DD_LOGIN_MARKER, "");
    ok("DepotDownloader authorized.");
  } else {
    die(
      "DepotDownloader login failed. Re-run and check username / password / Steam Guard.",
    );
  }
}

// Signs server pack PBOs with the *real* Bohemia `DSSignFile.exe` (from the
// official DayZ Tools, Steam app 830640, Windows-only) via Wine - instead of
// BiSignUtils, a reimplementation that turned out to be the actual root
// cause of a long-reproduced, previously-unexplained connect-time kick:
//
//   "Client has a mod which is not on the server. [...] Client has a PBO
//   which is not part of the server. (.../DZSurvivalFindStone.pbo)"
//
// Every other angle (byte-identical content, V3 signature format, matching
// 1024-bit key length, product=dayz ugc header property, CfgPatches/CfgMods
// structure, A2S advertisement, BattlEye, mod-load-order/interactions) was
// independently verified correct across many sessions - see git history/
// README for the long list. The actual bug: BiSignUtils' own `checkAll`
// happily validates signatures *it* produced, but the real
// `DSCheckSignatures.exe` (confirmed to be what the shipped DayZ engine's
// connect-time verification agrees with) rejects those exact same
// BiSignUtils-produced `.bisign` files as "wrong" - while it accepts a
// `DSSignFile.exe`-produced signature over the identical PBO, using the
// identical key. BiSignUtils' signature algorithm is subtly spec-incompatible
// despite being internally self-consistent. Confirmed by directly
// cross-checking both tools' outputs against each other this session.
//
// armake2 is still used for packing (building README.md/config.cpp into a
// .pbo) - only *signing* needed the swap, since armake2 doesn't implement
// its own signer at all here (BiSignUtils always did the signing step).

import { DAYTOOLS_DIR, DAYZ_TOOLS_APPID, DSSIGNFILE_EXE, ROOT, WINE_PREFIX_DIR } from "./paths.ts";
import { runCapture, runInherit } from "./proc.ts";
import { die, log, ok, warn } from "./ui.ts";
import { ensureLogin, exists, runSteamcmdQuietForceWindows } from "./steam.ts";
import type { Settings } from "./config.ts";

/** Convert an absolute Unix path to the Wine `Z:\...` path DsUtils expects. */
function toWinePath(unixPath: string): string {
  if (!unixPath.startsWith("/")) {
    throw new Error(`toWinePath expects an absolute path, got: ${unixPath}`);
  }
  return `Z:${unixPath.replaceAll("/", "\\")}`;
}

function wineEnv(): Record<string, string> {
  return { WINEPREFIX: WINE_PREFIX_DIR };
}

/** One-time: download the real DayZ Tools (Windows-only) via SteamCMD. */
export async function ensureDayZTools(s: Settings): Promise<void> {
  if (await exists(`${DAYTOOLS_DIR}/Bin/DsUtils/DSSignFile.exe`)) return;
  await ensureLogin(s);
  log(`Installing DayZ Tools (app ${DAYZ_TOOLS_APPID}) - needed for real PBO signing`);
  await Deno.mkdir(DAYTOOLS_DIR, { recursive: true });
  const code = await runSteamcmdQuietForceWindows([
    "+force_install_dir",
    DAYTOOLS_DIR,
    "+login",
    s.STEAM_USER,
    "+app_update",
    DAYZ_TOOLS_APPID,
    "validate",
    "+quit",
  ]);
  if (code !== 0 || !(await exists(`${DAYTOOLS_DIR}/Bin/DsUtils/DSSignFile.exe`))) {
    die("DayZ Tools install failed - see output above.");
  }
  ok("DayZ Tools installed.");
}

/** One-time: initialize the Wine prefix used to run DsUtils. */
export async function ensureWinePrefix(): Promise<void> {
  if (await exists(`${WINE_PREFIX_DIR}/system.reg`)) return;
  log("Initializing Wine prefix for DsUtils...");
  await Deno.mkdir(WINE_PREFIX_DIR, { recursive: true });
  const code = await runInherit("wine", ["wineboot", "--init"], { env: wineEnv() });
  if (code !== 0 || !(await exists(`${WINE_PREFIX_DIR}/system.reg`))) {
    die("Wine prefix initialization failed - see output above.");
  }
  ok("Wine prefix ready.");
}

/**
 * Sign `pboPath` with `privKeyPath` (both absolute Unix paths) using the real
 * `DSSignFile.exe`, producing `<pboPath>.<keyname>.bisign` next to the PBO
 * (DSSignFile writes it there directly - no cwd trick needed, unlike
 * BiSignUtils).
 */
export async function signPboReal(privKeyPath: string, pboPath: string): Promise<void> {
  const { code, stdout, stderr } = await runCapture(
    "wine",
    [DSSIGNFILE_EXE, toWinePath(privKeyPath), toWinePath(pboPath)],
    { env: wineEnv() },
  );
  const bisignPath = `${pboPath}.${
    privKeyPath.replace(/^.*\//, "").replace(/\.biprivatekey$/, "")
  }.bisign`;
  if (code !== 0 || !(await exists(bisignPath))) {
    warn(stdout);
    warn(stderr);
    die(`DSSignFile.exe failed to sign ${pboPath} - see output above.`);
  }
}

export function isUnderRoot(p: string): boolean {
  return p.startsWith(ROOT);
}

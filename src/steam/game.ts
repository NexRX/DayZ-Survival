import { loadBaseConfig, persistentSteamOptions } from "./config.ts";
import { runInteractive } from "./process.ts";
import { withRateLimitBackoff } from "./backoff.ts";
import { DAYZ_CLIENT_APPID, NEWS_CACHE, ROOT } from "../constants/paths.ts";

export interface GameSyncResult {
  appId: string;
  path: string;
  status: "success" | "failed";
  error?: string;
}

/**
 * Installs the given app if it isn't present at `path` yet, or updates it
 * in place if it already is — both via steamcmd's `app_update`, which is
 * inherently idempotent (it only downloads what's missing or changed, so
 * "install" and "update" are the same operation here).
 *
 * Uses the same `.env`-driven config and interactive login as
 * `updateWorkshopMods` (see README.md): stdin is attached so you can type
 * your password/2FA code when prompted, and a rate-limited response from
 * Steam is retried with indefinitely-growing exponential backoff, while any
 * other failure is returned immediately.
 */
export async function updateGame(
  appId: string,
  path: string,
): Promise<GameSyncResult> {
  await Deno.mkdir(path, { recursive: true });

  const serverBinary = `${path}/DayZServer`;
  const needsLogin = await checkServerNeedsUpdate(appId, path, serverBinary);

  if (!needsLogin) {
    return { appId, path, status: "success" };
  }

  const config = await loadBaseConfig();
  const scriptDir = await Deno.makeTempDir({ prefix: "steamcmd-game-", dir: ROOT });

  try {
    const scriptLines = [
      `force_install_dir ${path}`,
      `login ${config.steamUser}`,
      `app_update ${appId} validate`,
      `quit`,
    ];
    const scriptPath = `${scriptDir}/script.txt`;
    await Deno.writeTextFile(scriptPath, scriptLines.join("\n") + "\n");

    const steamOptions = await persistentSteamOptions();
    const { code, output } = await withRateLimitBackoff(
      () => runInteractive(config.steamCmdPath, ["+runscript", scriptPath], steamOptions),
      {
        baseDelayMs: config.rateLimitBaseDelayMs,
        maxDelayMs: config.rateLimitMaxDelayMs,
        onRetry: (attempt, delayMs) =>
          console.warn(
            `[workshop-manager] steamcmd looks rate-limited installing/updating app ${appId} (attempt ${attempt}). Retrying in ${
              Math.round(delayMs / 1000)
            }s...`,
          ),
      },
    );

    if (code !== 0) {
      return {
        appId,
        path,
        status: "failed",
        error: `steamcmd exited with code ${code}. Output:\n${output}`,
      };
    }

    return { appId, path, status: "success" };
  } finally {
    await Deno.remove(scriptDir, { recursive: true }).catch(() => {});
  }
}

/**
 * Returns whether the server needs an authenticated SteamCMD login.
 *
 * If the binary doesn't exist → login needed to install.
 * If the binary exists → check Steam News API for new announcements.
 *   Server updates are posted as news on the DayZ client page.
 *   If no new news → skip entirely (zero SteamCMD, zero SDA risk).
 *   If new news → fall back to authenticated SteamCMD login.
 */
async function checkServerNeedsUpdate(
  _appId: string,
  _path: string,
  serverBinary: string,
): Promise<boolean> {
  // Not installed yet — definitely needs login.
  try {
    await Deno.stat(serverBinary);
  } catch {
    return true;
  }

  // Binary exists — check Steam News API for new update announcements.
  const latestGid = await getLatestNewsGid();
  if (!latestGid) return false; // API failed — assume up-to-date

  try {
    const cached = await Deno.readTextFile(NEWS_CACHE);
    if (cached.trim() === latestGid) return false; // same news — no update
  } catch {
    // No cached gid yet — first run, assume up-to-date
    await Deno.writeTextFile(NEWS_CACHE, latestGid).catch(() => {});
    return false;
  }

  // New news found — auth login needed to check for server update.
  await Deno.writeTextFile(NEWS_CACHE, latestGid).catch(() => {});
  return true;
}

interface NewsApiResponse {
  appnews: {
    newsitems: Array<{ gid: string }>;
  };
}

const NEWS_API_URL = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/` +
  `?appid=${DAYZ_CLIENT_APPID}&count=1&feedlist=feed_steam_announcements`;

/** Fetches the latest news gid from the Steam News API. Returns null on failure. */
async function getLatestNewsGid(): Promise<string | null> {
  try {
    const resp = await fetch(NEWS_API_URL);
    if (!resp.ok) return null;
    const json = (await resp.json()) as NewsApiResponse;
    return json.appnews?.newsitems?.[0]?.gid ?? null;
  } catch {
    return null;
  }
}

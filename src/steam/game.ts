import { loadBaseConfig, persistentSteamOptions } from "./config.ts";
import { runInteractive } from "./process.ts";
import { withRateLimitBackoff } from "./backoff.ts";
import { ROOT } from "../constants/paths.ts";

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
  const config = await loadBaseConfig();
  await Deno.mkdir(path, { recursive: true });

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

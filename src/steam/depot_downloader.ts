import { persistentSteamOptions, type WorkshopManagerConfig } from "./config.ts";
import type { WorkshopModRequest } from "./types.ts";
import type { StepResult } from "./steamcmd.ts";
import { run } from "./process.ts";
import { withRateLimitBackoff } from "./backoff.ts";

/**
 * Downloads one large mod via DepotDownloader, writing straight into its
 * final folder via `-dir`.
 *
 * `-username <user> -remember-password` is passed without `-password`, so
 * DepotDownloader prompts interactively (stdin is attached to this process)
 * for the password, and for a Steam Guard/2FA code if one is required. That
 * only needs to happen once per machine — `-remember-password` caches a
 * login key to disk, so later invocations (this run or future ones) reuse
 * the cached session instead of logging in again, which is what keeps
 * repeated calls to this function from tripping Steam's login rate limit.
 *
 * If DepotDownloader itself reports being rate-limited, the download is
 * retried with indefinitely-growing exponential backoff. Any other failure
 * is returned as-is, with no retry.
 */
export async function downloadWithDepotDownloader(
  config: WorkshopManagerConfig,
  mod: WorkshopModRequest,
  destBasePath: string,
): Promise<StepResult> {
  const destPath = `${destBasePath}/${mod.folderName}`;
  await Deno.mkdir(destPath, { recursive: true });

  const args = [
    "-app",
    config.appId,
    "-pubfile",
    `${mod.workshopId}`,
    "-dir",
    destPath,
    "-validate",
    "-username",
    config.steamUser,
    "-remember-password",
  ];

  const steamOptions = await persistentSteamOptions();
  const { code, output } = await withRateLimitBackoff(
    () => run(config.depotDownloaderPath, args, steamOptions),
    {
      baseDelayMs: config.rateLimitBaseDelayMs,
      maxDelayMs: config.rateLimitMaxDelayMs,
      onRetry: (attempt, delayMs) =>
        console.warn(
          `[workshop-manager] DepotDownloader looks rate-limited on ${mod.workshopId} (attempt ${attempt}). Retrying in ${
            Math.round(delayMs / 1000)
          }s...`,
        ),
    },
  );

  if (code !== 0) {
    return {
      success: false,
      error: `DepotDownloader exited with code ${code} for ${mod.workshopId}. Output:\n${output}`,
    };
  }

  return { success: true };
}

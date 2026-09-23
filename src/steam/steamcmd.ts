import { persistentSteamOptions, type WorkshopManagerConfig } from "./config.ts";
import type { WorkshopModRequest } from "./types.ts";
import { runInteractive } from "./process.ts";
import { withRateLimitBackoff } from "./backoff.ts";
import { ROOT } from "../constants/paths.ts";

export interface StepResult {
  success: boolean;
  error?: string;
}

/**
 * Downloads every given mod through a *single* steamcmd invocation, using a
 * `+runscript` file that logs in once and issues one `workshop_download_item`
 * per mod before quitting. Batching like this means steamcmd only ever logs
 * in once per call to this function, no matter how many small mods are
 * queued up — so this path never risks login rate limiting on its own.
 *
 * stdin is attached to this process, so if steamcmd needs a password or a
 * Steam Guard/2FA code (only expected the first time you log in on a given
 * machine — it caches the login after that), you can type it directly when
 * prompted.
 *
 * If steamcmd itself reports being rate-limited, the whole batch is retried
 * with indefinitely-growing exponential backoff. Any other failure is
 * returned as-is, with no retry.
 */
export async function downloadWithSteamCmd(
  config: WorkshopManagerConfig,
  mods: WorkshopModRequest[],
  destBasePath: string,
): Promise<Map<number, StepResult>> {
  const results = new Map<number, StepResult>();
  if (mods.length === 0) return results;

  const stagingDir = await Deno.makeTempDir({ prefix: "steamcmd-workshop-", dir: ROOT });

  try {
    const scriptLines = [
      `force_install_dir ${stagingDir}`,
      `login ${config.steamUser}`,
      ...mods.map((m) => `workshop_download_item ${config.appId} ${m.workshopId}`),
      `quit`,
    ];
    const scriptPath = `${stagingDir}/script.txt`;
    await Deno.writeTextFile(scriptPath, scriptLines.join("\n") + "\n");

    const steamOptions = await persistentSteamOptions();
    const { code, output } = await withRateLimitBackoff(
      () => runInteractive(config.steamCmdPath, ["+runscript", scriptPath], steamOptions),
      {
        baseDelayMs: config.rateLimitBaseDelayMs,
        maxDelayMs: config.rateLimitMaxDelayMs,
        onRetry: (attempt, delayMs) =>
          console.warn(
            `[workshop-manager] steamcmd looks rate-limited (attempt ${attempt}). Retrying in ${
              Math.round(delayMs / 1000)
            }s...`,
          ),
      },
    );

    if (code !== 0) {
      const error = `steamcmd exited with code ${code}. Output:\n${output}`;
      for (const mod of mods) results.set(mod.workshopId, { success: false, error });
      return results;
    }

    for (const mod of mods) {
      const downloadedPath =
        `${stagingDir}/steamapps/workshop/content/${config.appId}/${mod.workshopId}`;
      const destPath = `${destBasePath}/${mod.folderName}`;

      try {
        const info = await Deno.stat(downloadedPath);
        if (!info.isDirectory) throw new Error("downloaded path is not a directory");

        await Deno.remove(destPath, { recursive: true }).catch(() => {});
        await Deno.mkdir(destBasePath, { recursive: true });
        await moveDir(downloadedPath, destPath);
        results.set(mod.workshopId, { success: true });
      } catch (err) {
        results.set(mod.workshopId, {
          success: false,
          error: `steamcmd reported success but no content was found for ${mod.workshopId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }
    }

    return results;
  } finally {
    await Deno.remove(stagingDir, { recursive: true }).catch(() => {});
  }
}

async function moveDir(src: string, dest: string): Promise<void> {
  try {
    await Deno.rename(src, dest);
  } catch {
    // Likely a cross-device rename (e.g. staging dir on a different mount) — fall back to copy.
    await copyDir(src, dest);
    await Deno.remove(src, { recursive: true });
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;
    if (entry.isDirectory) {
      await copyDir(srcPath, destPath);
    } else {
      await Deno.copyFile(srcPath, destPath);
    }
  }
}

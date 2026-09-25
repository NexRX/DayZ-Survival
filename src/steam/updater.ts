import { loadConfig } from "./config.ts";
import { getPublishedFileDetails } from "./steam_api.ts";
import { loadMetadata, type ModRecord, saveMetadata } from "./metadata.ts";
import { downloadWithSteamCmd } from "./steamcmd.ts";
import { downloadWithDepotDownloader } from "./depot_downloader.ts";
import type { UpdateResult, WorkshopModRequest } from "./types.ts";

interface QueuedMod {
  mod: WorkshopModRequest;
  sizeBytes: number;
  timeUpdated: number;
  /** True if a metadata record already existed (this is an update, not a fresh download). */
  isUpdate: boolean;
}

/**
 * Downloads/updates every mod in `mods` into `path`, choosing steamcmd or
 * DepotDownloader per item based on size, and skipping anything already
 * downloaded and up to date.
 *
 * Configuration (Steam AppID, credentials, tool paths, size cutoff) comes
 * from environment variables — see README.md.
 */
export async function updateWorkshopMods(
  path: string,
  mods: WorkshopModRequest[],
): Promise<UpdateResult[]> {
  if (mods.length === 0) return [];

  const config = await loadConfig();
  await Deno.mkdir(path, { recursive: true });

  const metadata = await loadMetadata(path);
  const results: UpdateResult[] = [];
  const queued: QueuedMod[] = [];

  const details = await getPublishedFileDetails(
    mods.map((m) => m.workshopId),
    config.steamApiKey,
  );

  for (const mod of mods) {
    const detail = details.get(mod.workshopId);

    if (!detail || detail.result !== 1) {
      results.push({
        workshopId: mod.workshopId,
        folderName: mod.folderName,
        status: "failed",
        error: `Steam Workshop API could not resolve item ${mod.workshopId} (result=${
          detail?.result ?? "missing"
        }).`,
      });
      continue;
    }

    const sizeBytes = Number(detail.file_size ?? 0);
    const timeUpdated = detail.time_updated ?? 0;
    const record = metadata[mod.workshopId];

    const folderExists = await dirExists(`${path}/${mod.folderName}`);

    const isUpToDate = Boolean(
      record &&
        folderExists &&
        record.folderName === mod.folderName &&
        record.timeUpdated === timeUpdated,
    );

    if (isUpToDate) {
      results.push({
        workshopId: mod.workshopId,
        folderName: mod.folderName,
        status: "up-to-date",
        method: record!.method,
        sizeBytes,
      });
      continue;
    }

    // Folder exists but there's no record of it — most likely it was put
    // there by something other than this tool (a manual steamcmd run, an
    // earlier setup, etc). We have no baseline to diff against, so rather
    // than redownload something that's probably fine, adopt it as-is: treat
    // it as current for this run and start tracking it from here on. If
    // it's actually stale, the next run will catch that via a real
    // `time_updated` mismatch.
    if (!record && folderExists) {
      metadata[mod.workshopId] = {
        workshopId: mod.workshopId,
        folderName: mod.folderName,
        timeUpdated,
        sizeBytes,
        lastSyncedAt: new Date().toISOString(),
      };
      results.push({
        workshopId: mod.workshopId,
        folderName: mod.folderName,
        status: "adopted",
        sizeBytes,
      });
      continue;
    }

    queued.push({ mod, sizeBytes, timeUpdated, isUpdate: Boolean(record) });
  }

  // Skip downloading entirely when everything is up-to-date — avoids a
  // SteamCMD login that can interfere with other tools sharing the same
  // account (e.g. Steam Desktop Authenticator).
  if (queued.length === 0) {
    await saveMetadata(path, metadata);
    return results;
  }

  const smallMods = queued.filter((q) => q.sizeBytes <= config.largeFileCutoffBytes);
  const largeMods = queued.filter((q) => q.sizeBytes > config.largeFileCutoffBytes);

  function recordResult(
    queuedMod: QueuedMod,
    stepResult: { success: boolean; error?: string } | undefined,
    method: ModRecord["method"],
  ) {
    const { mod, sizeBytes, timeUpdated, isUpdate } = queuedMod;

    if (stepResult?.success) {
      metadata[mod.workshopId] = {
        workshopId: mod.workshopId,
        folderName: mod.folderName,
        timeUpdated,
        sizeBytes,
        method,
        lastSyncedAt: new Date().toISOString(),
      };
      results.push({
        workshopId: mod.workshopId,
        folderName: mod.folderName,
        status: isUpdate ? "updated" : "downloaded",
        method,
        sizeBytes,
      });
    } else {
      results.push({
        workshopId: mod.workshopId,
        folderName: mod.folderName,
        status: "failed",
        method,
        sizeBytes,
        error: stepResult?.error ?? "Unknown error",
      });
    }
  }

  // One batched steamcmd session (one login) handles every small mod.
  if (smallMods.length > 0) {
    const stepResults = await downloadWithSteamCmd(
      config,
      smallMods.map((q) => q.mod),
      path,
    );

    for (const queuedMod of smallMods) {
      recordResult(queuedMod, stepResults.get(queuedMod.mod.workshopId), "steamcmd");
    }
  }

  // Large mods go through DepotDownloader one at a time, relying on its
  // cached login (see depot_downloader.ts) to avoid relogin rate limits.
  for (const queuedMod of largeMods) {
    const stepResult = await downloadWithDepotDownloader(config, queuedMod.mod, path);
    recordResult(queuedMod, stepResult, "depotdownloader");
  }

  await saveMetadata(path, metadata);
  return results;
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const info = await Deno.stat(path);
    return info.isDirectory;
  } catch {
    return false;
  }
}

import type { DownloadMethod } from "./types.ts";

export interface ModRecord {
  workshopId: number;
  folderName: string;
  /** Steam's `time_updated` (unix seconds) at the point this mod was last synced. */
  timeUpdated: number;
  sizeBytes: number;
  /** Omitted when the folder was "adopted" (already on disk, never downloaded by this tool). */
  method?: DownloadMethod;
  lastSyncedAt: string;
}

/** Keyed by workshopId. Persisted as a single JSON file inside the target path. */
export type MetadataStore = Record<string, ModRecord>;

const META_FILENAME = ".workshop-meta.json";

export async function loadMetadata(basePath: string): Promise<MetadataStore> {
  try {
    const raw = await Deno.readTextFile(`${basePath}/${META_FILENAME}`);
    return JSON.parse(raw) as MetadataStore;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return {};
    throw err;
  }
}

export async function saveMetadata(
  basePath: string,
  store: MetadataStore,
): Promise<void> {
  await Deno.mkdir(basePath, { recursive: true });
  await Deno.writeTextFile(
    `${basePath}/${META_FILENAME}`,
    JSON.stringify(store, null, 2),
  );
}

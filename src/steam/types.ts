/** A single workshop item to sync locally. */
export interface WorkshopModRequest {
  /** The Steam Workshop published file id (as seen in the workshop URL). */
  workshopId: number;
  /** The folder name this mod should be persisted under, inside the target path. */
  folderName: string;
}

export type SyncStatus = "up-to-date" | "adopted" | "downloaded" | "updated" | "failed";
export type DownloadMethod = "steamcmd" | "depotdownloader";

/** The outcome for a single mod after `updateWorkshopMods` runs. */
export interface UpdateResult {
  workshopId: number;
  folderName: string;
  status: SyncStatus;
  method?: DownloadMethod;
  sizeBytes?: number;
  error?: string;
}

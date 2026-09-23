/**
 * Talks to the public (keyless) ISteamRemoteStorage/GetPublishedFileDetails
 * endpoint to find out, per workshop item, how big it is and when it was
 * last updated. This is what lets `updateWorkshopMods` decide whether a mod
 * needs downloading at all, and whether it's small/large enough for
 * steamcmd vs DepotDownloader — without downloading anything.
 */
export interface PublishedFileDetails {
  publishedfileid: string;
  /** 1 = ok. Anything else means the item couldn't be resolved. */
  result: number;
  title?: string;
  file_size?: string;
  time_updated?: number;
  consumer_app_id?: number;
}

interface GetPublishedFileDetailsResponse {
  response?: {
    result?: number;
    resultcount?: number;
    publishedfiledetails?: PublishedFileDetails[];
  };
}

const API_URL = "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/";
const BATCH_SIZE = 100;

/**
 * Fetches details for a list of workshop ids, batching requests as needed.
 * `apiKey` is optional — this endpoint has historically been keyless, but
 * is passed through if provided in case Steam starts requiring one.
 */
export async function getPublishedFileDetails(
  workshopIds: number[],
  apiKey?: string,
): Promise<Map<number, PublishedFileDetails>> {
  const results = new Map<number, PublishedFileDetails>();

  for (let i = 0; i < workshopIds.length; i += BATCH_SIZE) {
    const batch = workshopIds.slice(i, i + BATCH_SIZE);
    const body = new URLSearchParams();
    if (apiKey) body.set("key", apiKey);
    body.set("itemcount", String(batch.length));
    batch.forEach((id, idx) => body.set(`publishedfileids[${idx}]`, `${id}`));

    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!resp.ok) {
      throw new Error(
        `Steam Workshop API request failed: ${resp.status} ${resp.statusText}`,
      );
    }

    const json = (await resp.json()) as GetPublishedFileDetailsResponse;
    const details = json.response?.publishedfiledetails ?? [];
    for (const detail of details) {
      results.set(Number(detail.publishedfileid), detail);
    }
  }

  return results;
}

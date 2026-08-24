// Publishes the server pack (see modBuild.ts) - this project's single
// Workshop mod bundling every custom addon - via SteamCMD's
// `+workshop_build_item`, reusing this project's existing SteamCMD
// session-cache/login pattern (see steam.ts).

import {
  DAYZ_CLIENT_APPID,
  SERVERPACK_DIR,
  SERVERPACK_WORKSHOP_ID_FILE,
  STEAMCMD_DIR,
} from "./paths.ts";
import { requireTools } from "./proc.ts";
import { die, hint, log, ok, warn } from "./ui.ts";
import type { Settings } from "./config.ts";
import { ensureLogin, exists, runSteamcmdCapture } from "./steam.ts";
import { buildServerPack } from "./modBuild.ts";

async function cachedWorkshopId(): Promise<string> {
  if (await exists(SERVERPACK_WORKSHOP_ID_FILE)) {
    return (await Deno.readTextFile(SERVERPACK_WORKSHOP_ID_FILE)).trim();
  }
  return "0"; // 0 = first-time publish (Steam assigns a new id)
}

/**
 * Build the server pack, then upload/update it as the one Workshop item
 * that bundles every custom addon.
 *
 * First publish creates a *private* Workshop item (visibility 2) - change
 * it to public yourself from the item's Steam page once you're happy with
 * it, to avoid accidentally shipping untested addons.
 */
export async function publishServerPack(s: Settings): Promise<void> {
  await requireTools(["armake2"]);
  await ensureLogin(s);

  const outRoot = await buildServerPack();

  const previewFile = `${SERVERPACK_DIR}/preview.png`;
  const hasPreview = await exists(previewFile);
  if (!hasPreview) {
    warn(
      `No preview.png found at ${previewFile} - publishing without a preview image. ` +
        "Add one and re-run to set it (1024x1024 recommended).",
    );
  }

  const existingId = await cachedWorkshopId();
  const firstPublish = existingId === "0";

  const vdfPath = `${STEAMCMD_DIR}/serverpack.workshop.vdf`;
  await Deno.mkdir(STEAMCMD_DIR, { recursive: true });
  const vdf = [
    '"workshopitem"',
    "{",
    `\t"appid"\t\t"${DAYZ_CLIENT_APPID}"`,
    `\t"publishedfileid"\t\t"${existingId}"`,
    `\t"contentfolder"\t\t"${outRoot}"`,
    hasPreview ? `\t"previewfile"\t\t"${previewFile}"` : "",
    `\t"visibility"\t\t"${firstPublish ? 2 : 0}"`,
    `\t"changenote"\t\t"Automated update via 'deno task publish-serverpack'"`,
    "}",
  ].filter(Boolean).join("\n");
  await Deno.writeTextFile(vdfPath, vdf);

  log(`${firstPublish ? "Publishing new" : "Updating"} Workshop item for the server pack`);
  const { code, output } = await runSteamcmdCapture([
    "+login",
    s.STEAM_USER,
    "+workshop_build_item",
    vdfPath,
    "+quit",
  ]);
  if (code !== 0) {
    die("steamcmd workshop_build_item failed - see output above.");
  }

  const match = /publishedfileid\D+(\d+)/i.exec(output) ??
    /PublishItemResult.*?(\d{6,})/i.exec(output);
  if (firstPublish) {
    const id = match?.[1];
    if (!id) {
      warn(
        "Could not detect the new publishedfileid from steamcmd's output - " +
          "check the Workshop items page for your account and save it manually to " +
          `${SERVERPACK_WORKSHOP_ID_FILE} so future updates target the same item.`,
      );
    } else {
      await Deno.writeTextFile(SERVERPACK_WORKSHOP_ID_FILE, `${id}\n`);
      ok(`Published as new Workshop item ${id} (visibility: Friends-only/private).`);
      hint(
        `Visit https://steamcommunity.com/sharedfiles/filedetails/?id=${id} to add a ` +
          "description, tags, and flip it to Public once you're ready.",
      );
    }
  } else {
    ok(`Updated Workshop item ${existingId}.`);
  }
}

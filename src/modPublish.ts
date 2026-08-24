// Publishes the server pack (see modBuild.ts) - this project's single
// Workshop mod bundling every custom addon - via SteamCMD's
// `+workshop_build_item`, reusing this project's existing SteamCMD
// session-cache/login pattern (see steam.ts).

import {
  DAYZ_CLIENT_APPID,
  SERVERPACK_DIR,
  SERVERPACK_NAME,
  SERVERPACK_WORKSHOP_ID_FILE,
  STEAMCMD_DIR,
} from "./paths.ts";
import { requireTools } from "./proc.ts";
import { die, hint, log, ok, warn } from "./ui.ts";
import type { Settings } from "./config.ts";
import { ensureLogin, exists, runSteamcmdCapture } from "./steam.ts";
import { buildServerPack } from "./modBuild.ts";
import { fetchContentIds } from "./mods.ts";

async function cachedWorkshopId(): Promise<string> {
  if (await exists(SERVERPACK_WORKSHOP_ID_FILE)) {
    return (await Deno.readTextFile(SERVERPACK_WORKSHOP_ID_FILE)).trim();
  }
  return "0"; // 0 = first-time publish (Steam assigns a new id)
}

async function upload(
  s: Settings,
  outRoot: string,
  publishedFileId: string,
  visibility: 0 | 2,
  previewFile: string,
): Promise<{ code: number; output: string }> {
  const vdfPath = `${STEAMCMD_DIR}/serverpack.workshop.vdf`;
  await Deno.mkdir(STEAMCMD_DIR, { recursive: true });
  const vdf = [
    '"workshopitem"',
    "{",
    `\t"appid"\t\t"${DAYZ_CLIENT_APPID}"`,
    `\t"publishedfileid"\t\t"${publishedFileId}"`,
    `\t"contentfolder"\t\t"${outRoot}"`,
    (await exists(previewFile)) ? `\t"previewfile"\t\t"${previewFile}"` : "",
    `\t"visibility"\t\t"${visibility}"`,
    `\t"changenote"\t\t"Automated update via 'deno task publish-serverpack'"`,
    "}",
  ].filter(Boolean).join("\n");
  await Deno.writeTextFile(vdfPath, vdf);

  return await runSteamcmdCapture([
    "+login",
    s.STEAM_USER,
    "+workshop_build_item",
    vdfPath,
    "+quit",
  ]);
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
  if (!(await exists(previewFile))) {
    warn(
      `No preview.png found at ${previewFile} - publishing without a preview image. ` +
        "Add one and re-run to set it (1024x1024 recommended).",
    );
  }

  const existingId = await cachedWorkshopId();
  const firstPublish = existingId === "0";

  // Captured *before* uploading so the post-upload poll below can detect
  // when Steam's API actually reflects this specific upload's new manifest,
  // rather than just checking a `timestamp` field exists (which would also
  // be true of a stale one left over from the previous publish).
  const previousManifest = firstPublish
    ? null
    : (await fetchContentIds([{ id: existingId, name: SERVERPACK_NAME, serverOnly: false }]))
      .get(existingId) ?? null;

  log(`${firstPublish ? "Publishing new" : "Updating"} Workshop item for the server pack`);
  const { code, output } = await upload(s, outRoot, existingId, firstPublish ? 2 : 0, previewFile);
  if (code !== 0) {
    die("steamcmd workshop_build_item failed - see output above.");
  }

  let id = existingId;
  if (firstPublish) {
    const match = /publishedfileid\D+(\d+)/i.exec(output) ??
      /PublishItemResult.*?(\d{6,})/i.exec(output) ??
      /PublishFileID\D+(\d+)/i.exec(output);
    const newId = match?.[1];
    if (!newId) {
      warn(
        "Could not detect the new publishedfileid from steamcmd's output - " +
          "check the Workshop items page for your account and save it manually to " +
          `${SERVERPACK_WORKSHOP_ID_FILE} so future updates target the same item.`,
      );
      return;
    }
    id = newId;
    await Deno.writeTextFile(SERVERPACK_WORKSHOP_ID_FILE, `${id}\n`);
    ok(`Published as new Workshop item ${id} (visibility: Friends-only/private).`);
    hint(
      `Visit https://steamcommunity.com/sharedfiles/filedetails/?id=${id} to add a ` +
        "description, tags, and flip it to Public once you're ready.",
    );
  } else {
    ok(`Updated Workshop item ${id}.`);
  }

  // meta.cpp's `timestamp` field is the Workshop item's manifest id (see
  // modBuild.ts's writeMeta) - but that's fetched from Steam's Web API
  // *before* this exact upload happens, so it can only ever reflect the
  // *previous* manifest, never the one this upload just created (Steam only
  // assigns the new manifest id during/after the upload itself). Every
  // publish therefore shipped a meta.cpp one version stale - previously this
  // rebuild-and-reupload step only ran for the very first publish (to embed
  // an id that didn't exist yet at all), which meant every subsequent update
  // kept shipping a stale timestamp. That's the likely real cause of a
  // long-reproduced client-side kick ("Client has a mod which is not on the
  // server" / "PBO which is not part of the server") that survived 8
  // independently-verified content/signing/namespace fixes - none of them
  // touched this. Steam's API needs a little time to reflect a just-uploaded
  // manifest, so this polls until it actually changes (not just that a
  // timestamp field is present, which would also be true of a stale one).
  log("Re-uploading once more so meta.cpp's timestamp matches this exact upload…");
  let rebuilt: string | null = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, attempt === 1 ? 8_000 : 20_000));
    rebuilt = await buildServerPack();
    const meta = await Deno.readTextFile(`${rebuilt}/meta.cpp`).catch(() => "");
    const m = /timestamp\s*=\s*(\d+)/.exec(meta);
    if (m && m[1] !== previousManifest) break;
    warn(`Steam hasn't reflected this upload's manifest yet (attempt ${attempt}/6) - retrying…`);
  }
  const second = await upload(s, rebuilt!, id, firstPublish ? 2 : 0, previewFile);
  if (second.code !== 0) {
    warn(
      "Re-upload with an up-to-date meta.cpp failed - run 'deno task publish-serverpack' " +
        `again to retry; item ${id} is already live but its meta.cpp may still be stale until then.`,
    );
    return;
  }
  ok(`Re-uploaded Workshop item ${id} with an up-to-date meta.cpp.`);
}

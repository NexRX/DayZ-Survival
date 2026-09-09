// Builds the DZSurvivalCustomMap addon's textures (see
// serverpack/addons/DZSurvivalCustomMap) from checked-in source PNGs under
// CUSTOM_MAP_ASSETS_DIR - the editable "source of truth" for this server's
// custom physical map / tourist-signpost artwork (see paths.ts).
//
// Re-encoding PNG -> PAA needs the real Bohemia `ImageToPAA.exe` (from the
// same DayZ Tools install used for PBO signing, via Wine - see modSign.ts).
// No reliable PAA *encoder* exists on Linux, so this shells out exactly like
// modSign.ts's signPboReal() does.
//
// IMPORTANT: feed it plain, correctly-colored PNGs with no channel
// pre-processing. An earlier version of this file pre-swapped red/blue
// before encoding to "fix" a color mismatch - that was chasing a bug in a
// third-party JS PAA reader used only for one-off manual inspection
// (@bis-toolkit/paa swaps R/B on decode), not in ImageToPAA.exe itself.
// Confirmed directly: encoding a PNG with ImageToPAA.exe and decoding the
// result back with ImageToPAA.exe itself (PAA -> PNG both directions)
// reproduces the source pixels exactly, no swap involved. Pre-swapping here
// would just bake in wrong colors (e.g. a blue ocean turning orange/tan) in
// the shipped .paa.
import {
  CUSTOM_MAP_ADDON_DATA_DIR,
  CUSTOM_MAP_ASSETS_DIR,
  IMAGETOPAA_EXE,
  WINE_PREFIX_DIR,
} from "./paths.ts";
import { runCapture } from "./proc.ts";
import { die, hint, log, ok, warn } from "./ui.ts";
import { exists } from "./steam.ts";
import { ensureDayZTools, ensureWinePrefix, toWinePath } from "./modSign.ts";
import { ensureConfig, loadSettings } from "./config.ts";

/** Source PNG (checked into CUSTOM_MAP_ASSETS_DIR) -> final addon .paa filename. */
const MAP_TEXTURES: { png: string; paa: string }[] = [
  { png: "karta_co.png", paa: "karta_co.paa" }, // main topographic map face
  { png: "karta_side_co.png", paa: "karta_side_co.paa" }, // legend/cover face
];

function wineEnv(): Record<string, string> {
  return { WINEPREFIX: WINE_PREFIX_DIR };
}

/** Re-encode one source PNG into a final .paa via the real ImageToPAA.exe. */
async function convertOne(srcPng: string, dstPaa: string, tmpDir: string): Promise<void> {
  // Filename deliberately ends in "_dxt1" (not "_co") so ImageToPAA's own
  // TexConvert.cfg naming rules apply a plain DXT1 encode with no
  // dynamic-range remap of its own (a "_co"-suffixed name triggers a
  // `dynRange=1` transform this project doesn't want).
  const tmpPaa = `${tmpDir}/custommap_dxt1.paa`;

  const { code, stdout, stderr } = await runCapture(
    "wine",
    [IMAGETOPAA_EXE, toWinePath(srcPng), toWinePath(tmpPaa)],
    { env: wineEnv() },
  );
  if (code !== 0 || !(await exists(tmpPaa))) {
    warn(stdout);
    warn(stderr);
    die(`ImageToPAA.exe failed converting ${srcPng} - see output above.`);
  }
  await Deno.mkdir(dstPaa.replace(/\/[^/]*$/, ""), { recursive: true });
  await Deno.copyFile(tmpPaa, dstPaa);
}

/**
 * Re-encode every source PNG under CUSTOM_MAP_ASSETS_DIR into
 * CUSTOM_MAP_ADDON_DATA_DIR's matching .paa, overwriting whatever's there.
 * Missing individual source PNGs are skipped (with a warning) rather than
 * failing outright, so editing just one of the two faces still works.
 */
export async function buildCustomMapTextures(): Promise<void> {
  const s = await ensureConfig(await loadSettings());
  await ensureDayZTools(s);
  await ensureWinePrefix();

  const tmpDir = await Deno.makeTempDir({ prefix: "dzsurvival-custommap-" });
  try {
    let any = false;
    for (const { png, paa } of MAP_TEXTURES) {
      const srcPath = `${CUSTOM_MAP_ASSETS_DIR}/${png}`;
      const dstPath = `${CUSTOM_MAP_ADDON_DATA_DIR}/${paa}`;
      if (!(await exists(srcPath))) {
        warn(`No source PNG at ${srcPath} - leaving existing ${paa} untouched.`);
        continue;
      }
      log(`Encoding ${png} -> ${paa}`);
      await convertOne(srcPath, dstPath, tmpDir);
      any = true;
    }
    if (!any) {
      die(
        `No source PNGs found under ${CUSTOM_MAP_ASSETS_DIR} (expected ` +
          `${MAP_TEXTURES.map((m) => m.png).join(" and/or ")}).`,
      );
    }
    ok(`Custom map textures rebuilt in ${CUSTOM_MAP_ADDON_DATA_DIR}.`);
    hint("Run 'deno task build-serverpack' (or publish-serverpack) to bundle the change.");
  } finally {
    await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
  }
}

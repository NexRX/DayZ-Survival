// Lads-Lighting-Overhaul (@Lads-Lighting-Overhaul) tuning: the mod ships
// dormant - it does nothing at all until `lightingConfig` is set to one of
// its preset values, in BOTH the mission's cfggameplay.json (this file) and
// serverDZ.cfg (see the matching `lightingConfig` line in server.ts's
// genConfig(), which must use the same value). Confirmed via the mod's own
// Steam Workshop page:
//
//   2222 = Darker Overcast Nights           6666 = Darker Overcast Nights (Livonia)
//   3333 = Brighter Overcast Nights         7777 = Brighter Overcast Nights (Livonia)
//   4444 = Darker Overcast Nights + grain   8888 = Darker + grain (Livonia)
//   5555 = Brighter Overcast Nights + grain 9999 = Brighter + grain (Livonia)
//   1010 = DayZ 0.63-style lighting
//
// We run Chernarus, so only the 2222-5555/1010 range applies. Picked 2222
// (darker nights, no film grain) as the default to fit this project's
// "world that fights back" philosophy - nights should be genuinely
// threatening. Easy to change: just edit the constant below.
//
// Like difficulty.ts/scavenging.ts, this deliberately force-overwrites the
// field on every start rather than only setting it once, so it keeps
// winning over the mod's own default (0, vanilla lighting) or any other
// mod/update that might reset it. Trade-off: an admin who manually sets
// lightingConfig back to 0 to disable the effect will have it reasserted on
// the next start - update LIGHTING_PRESET here instead of editing the JSON
// directly if you want a different (or no) preset.

import { CFG_GAMEPLAY_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

// See the preset table above - change this to retune or set to 0 to disable.
export const LIGHTING_PRESET = 2222;

interface CfgGameplay {
  WorldsData?: {
    lightingConfig?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function tuneLightingConfig(): Promise<void> {
  if (!(await exists(CFG_GAMEPLAY_FILE))) {
    log(`${CFG_GAMEPLAY_FILE} not found yet - skipping lighting tuning`);
    return;
  }

  const cfg: CfgGameplay = JSON.parse(await Deno.readTextFile(CFG_GAMEPLAY_FILE));
  if (!cfg.WorldsData) cfg.WorldsData = {};

  if (cfg.WorldsData.lightingConfig === LIGHTING_PRESET) return;

  cfg.WorldsData.lightingConfig = LIGHTING_PRESET;
  await Deno.writeTextFile(CFG_GAMEPLAY_FILE, JSON.stringify(cfg, null, "\t"));
  ok(`Set lightingConfig=${LIGHTING_PRESET} in ${CFG_GAMEPLAY_FILE}`);
}

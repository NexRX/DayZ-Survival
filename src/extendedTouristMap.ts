// Extended Tourist Map (@Extended-Tourist-Map, id 3788295678) replaces this
// project's own DZSurvivalMapGate addon (removed) as the map-access gate.
//
// DZSurvivalMapGate worked by gating the vanilla M-key fullscreen map
// (requiring both a Map and a GPSReceiver in inventory before the shortcut
// would do anything - see git history for its removed
// serverpack/addons/DZSurvivalMapGate). Extended Tourist Map replaces that
// whole approach: instead of a fullscreen toggle, it enhances the actual
// held Tourist Map item with a live "3D" position marker/pin system, gated
// by its own server-side GPS-receiver settings below. So this file does two
// things:
//
// 1. Reverts cfggameplay.json's MapData.ignoreMapOwnership back to false
//    (vanilla default) - the M-key fullscreen map shortcut no longer does
//    anything, matching vanilla, since map access is now entirely through
//    physically holding the Tourist Map item.
// 2. Sets cfggameplay.json's UIData.use3DMap = true - a real vanilla field
//    (not mod-added) that switches the held map item from a flat static
//    image to the interactive "3D map" experience Extended Tourist Map
//    builds its marker/pin system on top of. Per the mod's own Workshop
//    page: "How to disable the 2D map on your server: ... Change 'false'
//    to 'true'".
// 3. Force-sets UseGPSReceiver/SlotGPSReceiver in the mod's own
//    Settings.json (self-generated on first server start, see paths.ts) -
//    both on, so the live position marker only shows if the player has a
//    GPSReceiver actually slotted and powered, not just carried. Every
//    other field (UpdateMarkAlways, EnablePlayerMark, EnablePlayerPins,
//    MaxPlayerPins, OldPlayerMarker) is left at whatever the mod already
//    wrote - its own shipped defaults matched what was asked for here.
//
// Like lighting.ts, the cfggameplay.json fields are force-overwritten every
// start so they keep winning over the mod's/vanilla's own defaults.

import { CFG_GAMEPLAY_FILE, EXTENDED_TOURIST_MAP_SETTINGS } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface CfgGameplay {
  UIData?: {
    use3DMap?: boolean;
    [key: string]: unknown;
  };
  MapData?: {
    ignoreMapOwnership?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function tuneMapGameplayConfig(): Promise<void> {
  if (!(await exists(CFG_GAMEPLAY_FILE))) {
    log(`${CFG_GAMEPLAY_FILE} not found yet - skipping map config tuning`);
    return;
  }

  const cfg: CfgGameplay = JSON.parse(await Deno.readTextFile(CFG_GAMEPLAY_FILE));
  if (!cfg.UIData) cfg.UIData = {};
  if (!cfg.MapData) cfg.MapData = {};

  const wantUse3DMap = cfg.UIData.use3DMap !== true;
  const wantIgnoreMapOwnershipReverted = cfg.MapData.ignoreMapOwnership !== false;
  if (!wantUse3DMap && !wantIgnoreMapOwnershipReverted) return;

  cfg.UIData.use3DMap = true;
  cfg.MapData.ignoreMapOwnership = false;
  await Deno.writeTextFile(CFG_GAMEPLAY_FILE, JSON.stringify(cfg, null, "\t"));
  ok(
    `Enabled the 3D held map (UIData.use3DMap) and reverted the M-key map shortcut ` +
      `(MapData.ignoreMapOwnership) to vanilla in ${CFG_GAMEPLAY_FILE}`,
  );
}

interface ExtendedTouristMapSettings {
  UseGPSReceiver?: boolean;
  SlotGPSReceiver?: boolean;
  [key: string]: unknown;
}

export async function tuneExtendedTouristMap(): Promise<void> {
  if (!(await exists(EXTENDED_TOURIST_MAP_SETTINGS))) {
    log(
      `${EXTENDED_TOURIST_MAP_SETTINGS} not generated yet — Extended Tourist Map will ` +
        "create it (with its own defaults) on first server start",
    );
    return;
  }

  const settings: ExtendedTouristMapSettings = JSON.parse(
    await Deno.readTextFile(EXTENDED_TOURIST_MAP_SETTINGS),
  );

  if (settings.UseGPSReceiver === true && settings.SlotGPSReceiver === true) return;

  settings.UseGPSReceiver = true;
  settings.SlotGPSReceiver = true;
  await Deno.writeTextFile(EXTENDED_TOURIST_MAP_SETTINGS, JSON.stringify(settings, null, 4));
  ok(
    `Set UseGPSReceiver/SlotGPSReceiver=true in ${EXTENDED_TOURIST_MAP_SETTINGS} - the map ` +
      "marker now requires a slotted, powered GPS Receiver",
  );
}

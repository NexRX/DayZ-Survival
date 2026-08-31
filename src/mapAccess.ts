// Enables DayZ's own M-key ("map toggle") shortcut in the mission's
// cfggameplay.json, which the shortcut requires to even be reachable in the
// first place (see serverpack/addons/DZSurvivalMapGate). Unpacked from
// vanilla's own server/dta/scripts.pbo, 5_Mission/mission/missionGameplay.c:
//
//   if (CfgGameplayHandler.GetMapIgnoreMapOwnership() && !CfgGameplayHandler.GetUse3DMap())
//     if (GetUApi().GetInputByID(UAMapToggle).LocalPress() && ...)
//       HandleMapToggleByKeyboardShortcut(player);
//
// With this off (the vanilla default), pressing M does nothing at all,
// regardless of inventory - so this must be on for the shortcut to work,
// full stop. Vanilla's own gate is otherwise all-or-nothing (no Map/GPS
// check whatsoever once enabled) - DZSurvivalMapGate's modded
// MissionGameplay is what actually re-adds the "must have both a Map and a
// GPS" requirement on top of this.
//
// Like lighting.ts, this force-overwrites the field on every start so it
// keeps winning over the field's own vanilla default.

import { CFG_GAMEPLAY_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface CfgGameplay {
  MapData?: {
    ignoreMapOwnership?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function tuneMapAccess(): Promise<void> {
  if (!(await exists(CFG_GAMEPLAY_FILE))) {
    log(`${CFG_GAMEPLAY_FILE} not found yet - skipping map-access tuning`);
    return;
  }

  const cfg: CfgGameplay = JSON.parse(await Deno.readTextFile(CFG_GAMEPLAY_FILE));
  if (!cfg.MapData) cfg.MapData = {};

  if (cfg.MapData.ignoreMapOwnership === true) return;

  cfg.MapData.ignoreMapOwnership = true;
  await Deno.writeTextFile(CFG_GAMEPLAY_FILE, JSON.stringify(cfg, null, "\t"));
  ok(`Enabled the M-key map-toggle shortcut (MapData.ignoreMapOwnership) in ${CFG_GAMEPLAY_FILE}`);
}

// Forever_Burning_Campfire (@Forever_Burning_Campfire) wires its ambience
// light/fire props into the custom trader city via DayZ-Expansion-Core's
// EXPANSION_OBJECTS_DIR placed-object file, the same mechanism traders.ts's
// traderMapLine() uses for trader NPCs.
//
// Only plain decorative props (FireBarrel/Torch/AreaLight) are placed here.
// FBF_Fireplace/Pot/FryingPan are persistent gameplay entities that the
// mod's own docs warn will "multiply" if placed via Editor/VPP builder
// tools (a fresh one spawned every mission start on top of whatever already
// persisted) - those are instead spawned exactly once by a separate
// EnforceScript addon (serverpack/addons/DZSurvivalTraderFireplace).
//
// FIRE_BARREL_OFFSET is a placeholder, not visually confirmed against the
// built town. Scout the real spot in-game, then update it (and
// DZSurvivalTraderFireplace_Module.c's matching FIRE_POSITION) to match.

import { EXPANSION_OBJECTS_DIR } from "./paths.ts";
import { CUSTOM_POSITION } from "./traders.ts";
import type { Mod } from "./mods.ts";
import { exists } from "./steam.ts";
import { ok } from "./ui.ts";

const MOD_NAME = "@Forever_Burning_Campfire";
const OBJECTS_FILE = `${EXPANSION_OBJECTS_DIR}/ForeverBurningCampfire.map`;

interface CampfirePlacement {
  className: string;
  /** Offset in meters from CUSTOM_POSITION, same convention as traders.ts's CUSTOM_NPCS. */
  offset: [number, number, number];
  orientation: [number, number, number];
}

// Exported (rather than read back out of PLACEMENTS) so
// DZSurvivalTraderFireplace_Module.c's own hardcoded copy is easy to find
// and keep in sync.
export const FIRE_BARREL_OFFSET: [number, number, number] = [-4, 0, 2];

const PLACEMENTS: CampfirePlacement[] = [
  { className: "FBF_FireBarrel", offset: FIRE_BARREL_OFFSET, orientation: [0, 0, 0] },
  { className: "FBF_Torch", offset: [-4, 0, 5], orientation: [0, 0, 0] },
  { className: "FBF_Torch", offset: [-4, 0, -1], orientation: [0, 0, 0] },
  { className: "FBF_AreaLight_Warm", offset: [-2, 2, 3], orientation: [0, 0, 0] },
  // Two more scouted spots; assumed FBF_Torch since no classname was given.
  { className: "FBF_Torch", offset: [2.30, -0.207, -4.8], orientation: [0, 0, 0] },
  { className: "FBF_Torch", offset: [2.32, -0.268, -8.5], orientation: [0, 0, 0] },
];

function objectMapLine(p: CampfirePlacement, origin: [number, number, number]): string {
  const pos = origin.map((v, i) => v + p.offset[i]).map((n) => n.toFixed(3)).join(" ");
  const orientation = p.orientation.join(" ");
  // <ClassName>|<Position>|<Orientation>|<Special>|<Takeable>|<Attachments>
  // - see EXPANSION_OBJECTS_DIR's own comment in paths.ts. Special=0,
  // Takeable=0, Attachments empty: every placement here is a plain static
  // decoration, never player-takeable and never carrying attachments.
  return `${p.className}|${pos}|${orientation}|0|0|`;
}

export async function ensureForeverBurningCampfireWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;
  if (!CUSTOM_POSITION) return; // same guard as traders.ts's own placements
  const origin = CUSTOM_POSITION;

  await Deno.mkdir(EXPANSION_OBJECTS_DIR, { recursive: true });

  const body = PLACEMENTS.map((p) => objectMapLine(p, origin)).join("\n") + "\n";
  const existing = (await exists(OBJECTS_FILE)) ? await Deno.readTextFile(OBJECTS_FILE) : null;
  if (existing === body) return;

  await Deno.writeTextFile(OBJECTS_FILE, body);
  ok(
    `Wrote ${PLACEMENTS.length} ${MOD_NAME} ambience prop(s) to ${OBJECTS_FILE} ` +
      "(FBF_Fireplace itself is spawned/ignited separately - see " +
      "serverpack/addons/DZSurvivalTraderFireplace)",
  );
}

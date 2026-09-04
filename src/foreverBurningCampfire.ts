// Forever_Burning_Campfire (@Forever_Burning_Campfire) - automatically wires
// its ambience light/fire props into the custom trader city, replacing the
// removed @NeonMurder-Lights (see mods.txt / TESTS.md for that swap).
//
// The mod's own Steam page splits its content into two very different
// categories, each needing a different automated-spawn approach:
//
//   - "Map items" (FBF_FireBarrel, FBF_Torch, FBF_LongTorch,
//     FBF_AreaLight_White/Warm): plain decorative props with no
//     inventory/persistence logic at all (confirmed by derapifying
//     forever_burning_campfire.pbo's config.bin, 2026-09: all four are
//     `class X: HouseNoDestruct { scope = 1; ... }` - a static building-type
//     base, not ItemBase). The mod's own docs say these are safe to place
//     with "DayZ Editor or other similar ways" - this uses one of those
//     "other similar ways" instead of a manual Editor step:
//     DayZ-Expansion-Core's own generic placed-object file format
//     (EXPANSION_OBJECTS_DIR - `ExpansionWorldObjectsModule`'s
//     GetObjectFromFile(), confirmed via that mod's own script source; same
//     mechanism traders.ts's traderMapLine() uses for trader NPCs, just for
//     arbitrary static props here instead). This file is declarative - fully
//     re-applied from this exact list every mission load, same as any other
//     static terrain prop - so it can never "multiply" the way the section
//     below describes.
//   - "Regular items with persistency" (FBF_Fireplace, FBF_Pot,
//     FBF_FryingPan): genuine persistent gameplay entities (fuel/build state
//     saved to storage_1, like a player-built campfire). The mod's own Steam
//     page explicitly warns these "shouldn't be spawned with VPP builder
//     tools or DayZ Editor... if you leave them in init/editor/vpp, they
//     will multiply" - i.e. every mission start would create a brand new one
//     on top of whatever already persisted from before. This is why
//     FBF_Fireplace is deliberately NOT included in the placements below -
//     it's handled by a separate EnforceScript addon instead
//     (serverpack/addons/DZSurvivalTraderFireplace), which spawns exactly
//     ONE, ever, guarded by a persistent marker file. See that addon's own
//     Module.c for the full story.
//
// FIRE_BARREL_OFFSET is a PLACEHOLDER, same caveat as traders.ts's own
// CUSTOM_POSITION originally shipped with: picked close to the general
// trader (a few meters off CUSTOM_POSITION, clear of both trader NPCs' own
// spots) but NOT visually confirmed against the real built town - there's no
// way to preview the live DayZ-Editor scene from here. Scout the exact spot
// you want (COT free-cam + position readout, same technique already used for
// the trader NPCs/stock board), then update FIRE_BARREL_OFFSET/the other
// PLACEMENTS offsets below AND DZSurvivalTraderFireplace_Module.c's own
// FIRE_POSITION (must be kept in sync by hand - see that file's comment) to
// match. See TESTS.md.

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

// Kept as its own export (rather than reading it back out of PLACEMENTS)
// so DZSurvivalTraderFireplace_Module.c's own hardcoded copy is easy to
// find and keep in sync - see that file's FIRE_POSITION comment.
export const FIRE_BARREL_OFFSET: [number, number, number] = [-4, 0, 2];

const PLACEMENTS: CampfirePlacement[] = [
  { className: "FBF_FireBarrel", offset: FIRE_BARREL_OFFSET, orientation: [0, 0, 0] },
  { className: "FBF_Torch", offset: [-4, 0, 5], orientation: [0, 0, 0] },
  { className: "FBF_Torch", offset: [-4, 0, -1], orientation: [0, 0, 0] },
  { className: "FBF_AreaLight_Warm", offset: [-2, 2, 3], orientation: [0, 0, 0] },
  // Two more real, user-scouted spots (absolute coords converted to
  // CUSTOM_POSITION-relative offsets, same convention as everything else
  // here) - assumed FBF_Torch since no classname was given; swap the
  // className below if something else (e.g. FBF_AreaLight_Warm/White) was
  // actually wanted.
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

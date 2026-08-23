// Ambient "spawn almost anywhere" bandits, via DayZ-Dynamic-AI-Addon (aka
// Spatial AI), built on top of DayZ-Expansion-AI.
//
// Unlike Expansion's own patrols (ai.ts), which are anchored to named
// waypoints, Spatial AI's `Group` entries aren't tied to any location at
// all — they spawn purely based on proximity to *any* player, governed by
// the file's global MinDistance/MaxDistance/timer settings. This is what
// makes AI genuinely "encounterable almost anywhere" rather than only near
// a fixed set of hotspots.
//
// The addon generates its own config (with sane defaults) the first time it
// loads, in the *server profile* dir (not the mission):
//   profiles/ExpansionMod/AI/Spatial/SpatialSettings.json
// As with ensureAIPatrols(), we only ever merge extra curated `Group`
// entries into that file once it exists — never overwrite the addon's own
// defaults or an admin's tuning.

import { AI_TEMPLATE_DIR, SPATIAL_SETTINGS } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface SpatialGroup {
  Spatial_Name?: string;
  [key: string]: unknown;
}

interface SpatialSettings {
  Group: SpatialGroup[];
  [key: string]: unknown;
}

export async function ensureSpatialAI(): Promise<void> {
  if (!(await exists(SPATIAL_SETTINGS))) {
    log(
      "SpatialSettings.json not generated yet — DayZ-Dynamic-AI-Addon will create it " +
        "(with its own defaults) on first server start",
    );
    return;
  }

  const settings: SpatialSettings = JSON.parse(
    await Deno.readTextFile(SPATIAL_SETTINGS),
  );
  const template: SpatialSettings = JSON.parse(
    await Deno.readTextFile(`${AI_TEMPLATE_DIR}/SpatialSettings.json`),
  );

  const existingNames = new Set(
    settings.Group.map((g) => g.Spatial_Name).filter(Boolean),
  );
  const added = template.Group.filter(
    (g) => g.Spatial_Name && !existingNames.has(g.Spatial_Name),
  );
  if (added.length === 0) return;

  settings.Group.push(...added);
  await Deno.writeTextFile(SPATIAL_SETTINGS, JSON.stringify(settings, null, 4));
  ok(`Added ${added.length} spatial bandit group(s) to ${SPATIAL_SETTINGS}`);
}

export async function spatialAIConfigured(): Promise<boolean> {
  return await exists(SPATIAL_SETTINGS);
}

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
// As with ensureAIPatrols(), we only ever merge extra curated `Group`/`Audio`
// entries into that file once it exists — never overwrite the addon's own
// defaults or an admin's tuning. The one exception: `Audio_Enabled` defaults
// to 0 out of the box, which makes the addon's own placeholder `Audio`
// zones (and floors raised on them by tuneSpatialAIDifficulty()) dead code —
// so the first time we add a real, positioned `Audio` zone, we also flip
// that switch so it's actually testable.

import { AI_TEMPLATE_DIR, SPATIAL_SETTINGS } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface SpatialGroup {
  Spatial_Name?: string;
  [key: string]: unknown;
}

interface SpatialSettings {
  Group: SpatialGroup[];
  Audio?: SpatialGroup[];
  Audio_Enabled?: number;
  [key: string]: unknown;
}

/** Merges curated entries from `template` into `existing` by name, non-destructively. */
function mergeByName(existing: SpatialGroup[], template: SpatialGroup[]): SpatialGroup[] {
  const existingNames = new Set(existing.map((g) => g.Spatial_Name).filter(Boolean));
  return template.filter((g) => g.Spatial_Name && !existingNames.has(g.Spatial_Name));
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

  let changed = false;

  const addedGroups = mergeByName(settings.Group, template.Group);
  if (addedGroups.length > 0) {
    settings.Group.push(...addedGroups);
    changed = true;
    ok(`Added ${addedGroups.length} spatial bandit group(s) to ${SPATIAL_SETTINGS}`);
  }

  // Audio zones are useless while Audio_Enabled is 0 (the addon's own
  // default) - once we add a real, positioned zone (not the mod's [0,1,0]
  // placeholder), flip the switch so it actually fires. Only touched on the
  // run that adds the zone - if an admin later disables it again, we won't
  // fight that choice on subsequent starts.
  const audioList = settings.Audio ?? (settings.Audio = []);
  const addedAudio = mergeByName(audioList, template.Audio ?? []);
  if (addedAudio.length > 0) {
    audioList.push(...addedAudio);
    changed = true;
    ok(`Added ${addedAudio.length} spatial audio zone(s) to ${SPATIAL_SETTINGS}`);
    if (settings.Audio_Enabled !== 1) {
      settings.Audio_Enabled = 1;
      ok(`Enabled Audio_Enabled in ${SPATIAL_SETTINGS} (was disabled by default)`);
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(SPATIAL_SETTINGS, JSON.stringify(settings, null, 4));
}

export async function spatialAIConfigured(): Promise<boolean> {
  return await exists(SPATIAL_SETTINGS);
}

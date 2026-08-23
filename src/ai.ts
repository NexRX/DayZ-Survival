// Roaming AI bandit patrols, via DayZ-Expansion-AI.
//
// Expansion reads per-mission AI patrol config from
// `<mission>/expansion/settings/AIPatrolSettings.json` (NOT the server
// profile), and generates this file itself — with a solid default set of
// town patrols plus genuine ROAMING/ROAMING_LOCAL bandits — the first time
// the mission loads.
//
// Rather than overwrite that (which would *downgrade* a good default), we
// merge a few extra curated roaming hotspots (see ai/AIPatrolSettings.json)
// into the existing file, skipping any patrol name that's already present.
// This only runs once the file exists (i.e. after the server has started at
// least once) and is idempotent, so it's safe to call on every `up`/`start`.

import { AI_PATROL_SETTINGS, AI_TEMPLATE_DIR } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface Patrol {
  Name?: string;
  [key: string]: unknown;
}

interface AIPatrolSettings {
  Patrols: Patrol[];
  LoadBalancingCategories?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function ensureAIPatrols(): Promise<void> {
  if (!(await exists(AI_PATROL_SETTINGS))) {
    log(
      "AIPatrolSettings.json not generated yet — DayZ-Expansion-AI will create it " +
        "(with its own default patrols) on first server start",
    );
    return;
  }

  const settings: AIPatrolSettings = JSON.parse(
    await Deno.readTextFile(AI_PATROL_SETTINGS),
  );
  const template: AIPatrolSettings = JSON.parse(
    await Deno.readTextFile(`${AI_TEMPLATE_DIR}/AIPatrolSettings.json`),
  );

  const existingNames = new Set(settings.Patrols.map((p) => p.Name).filter(Boolean));
  const added = template.Patrols.filter((p) => p.Name && !existingNames.has(p.Name));

  settings.LoadBalancingCategories ??= {};
  const templateCategories = template.LoadBalancingCategories ?? {};
  const addedCategories = Object.keys(templateCategories).filter(
    (name) => !(name in settings.LoadBalancingCategories!),
  );
  for (const name of addedCategories) {
    settings.LoadBalancingCategories[name] = templateCategories[name];
  }

  if (added.length === 0 && addedCategories.length === 0) return;

  settings.Patrols.push(...added);
  await Deno.writeTextFile(AI_PATROL_SETTINGS, JSON.stringify(settings, null, 4));
  const parts = [];
  if (added.length > 0) parts.push(`${added.length} roaming bandit patrol(s)`);
  if (addedCategories.length > 0) {
    parts.push(`${addedCategories.length} load balancing categor(y/ies)`);
  }
  ok(`Added ${parts.join(" and ")} to ${AI_PATROL_SETTINGS}`);
}

export async function aiPatrolsConfigured(): Promise<boolean> {
  return await exists(AI_PATROL_SETTINGS);
}

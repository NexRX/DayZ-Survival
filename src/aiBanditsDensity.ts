// AI-Bandits map density: the mod self-generates profiles/AI_Bandits/
// DynamicAIB.json with just its own single generic example patrol/sniper.
// Way too sparse for "the world feels dangerous/alive even solo".
//
// AI-Bandits itself ships a much denser, Chernarus-specific example at
// server/@AI-Bandits/doc/chernarus_dynamicaib.json (6 real patrol routes:
// NWAF x2, Tisy x2, Petrovka, Severograd) - copied into
// ai/AIBanditsDynamic.json (trimmed to just GroupLocations/
// PredefinedWeapons) so it's stable across mod re-downloads, matching how
// ai/AIPatrolSettings.json works for DayZ-Expansion-AI.
//
// The mod's own chernarus_dynamicaib.json SniperLocations entry ships with
// a literal "0 0 0" position (world origin, not a real coordinate) -
// deliberately NOT merged here. Add a real SniperLocation by hand if wanted.
//
// Same additive, name-deduped merge as ai.ts, so this never touches an
// admin's own hand-placed patrols/snipers and is safe to run on every
// start.

import { AI_BANDITS_DYNAMIC_SETTINGS, AI_TEMPLATE_DIR } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface NamedEntry {
  name?: string;
  [key: string]: unknown;
}

interface DynamicAIB {
  GroupLocations?: NamedEntry[];
  PredefinedWeapons?: NamedEntry[];
  [key: string]: unknown;
}

export async function ensureAIBanditsDensity(): Promise<void> {
  if (!(await exists(AI_BANDITS_DYNAMIC_SETTINGS))) {
    log(
      `${AI_BANDITS_DYNAMIC_SETTINGS} not generated yet - AI-Bandits will create it ` +
        "(with its own single default patrol) on first server start",
    );
    return;
  }

  const settings: DynamicAIB = JSON.parse(
    await Deno.readTextFile(AI_BANDITS_DYNAMIC_SETTINGS),
  );
  const template: DynamicAIB = JSON.parse(
    await Deno.readTextFile(`${AI_TEMPLATE_DIR}/AIBanditsDynamic.json`),
  );

  settings.GroupLocations ??= [];
  settings.PredefinedWeapons ??= [];

  const existingGroupNames = new Set(
    settings.GroupLocations.map((g) => g.name).filter(Boolean),
  );
  const addedGroups = (template.GroupLocations ?? []).filter(
    (g) => g.name && !existingGroupNames.has(g.name),
  );

  const existingWeaponNames = new Set(
    settings.PredefinedWeapons.map((w) => w.name).filter(Boolean),
  );
  const addedWeapons = (template.PredefinedWeapons ?? []).filter(
    (w) => w.name && !existingWeaponNames.has(w.name),
  );

  if (addedGroups.length === 0 && addedWeapons.length === 0) return;

  settings.GroupLocations.push(...addedGroups);
  settings.PredefinedWeapons.push(...addedWeapons);
  await Deno.writeTextFile(AI_BANDITS_DYNAMIC_SETTINGS, JSON.stringify(settings, null, 4));
  const parts = [];
  if (addedGroups.length > 0) parts.push(`${addedGroups.length} patrol group(s)`);
  if (addedWeapons.length > 0) parts.push(`${addedWeapons.length} weapon preset(s)`);
  ok(`Added ${parts.join(" and ")} to ${AI_BANDITS_DYNAMIC_SETTINGS}`);
}

// Dynamic AI missions (Epoch-style crash sites / raids with real loot
// rewards), via @Dynamic-AI-Missions (+ optional @Dynamic-AI-Missions-Extended).
//
// Like AIPatrolSettings.json and SpatialSettings.json, this mod
// self-regenerates its own MainConfig.json (with a default mission set) the
// first time it loads, at DYNAMIC_MISSIONS_SETTINGS.
//
// Merge strategy:
// - `Missions[]` entries are added by unique `Name`, never overwritten.
// - Each mission needs a `Bots_Loadout_ID` pointing at a *sub-group* inside
//   `Loadouts[0]` (shared by that group's Weapons/Armour/Headgear entries
//   via a repeated `Loadout_ID` field), not a separate top-level Loadouts
//   array item. Rather than risk colliding with whatever Loadout_IDs the
//   admin's file already has, we mint a new, unused Loadout_ID for our
//   curated gear.
// - `Settings`, `RewardObjects`, and `Loot` are never touched.

import { AI_TEMPLATE_DIR, DYNAMIC_MISSIONS_SETTINGS } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface LoadoutItem {
  Loadout_ID?: number;
  [key: string]: unknown;
}

interface LoadoutGroup {
  Weapons?: LoadoutItem[];
  Armour?: LoadoutItem[];
  Headgear?: LoadoutItem[];
  [key: string]: unknown;
}

interface Mission {
  Name?: string;
  Bots_Loadout_ID?: number;
  [key: string]: unknown;
}

interface MainConfig {
  Missions: Mission[];
  Loadouts: LoadoutGroup[];
  [key: string]: unknown;
}

interface MissionsTemplate {
  Missions: Mission[];
  LoadoutGroup: {
    Weapons: LoadoutItem[];
    Armour: LoadoutItem[];
    Headgear: LoadoutItem[];
  };
}

export async function ensureDynamicMissions(): Promise<void> {
  if (!(await exists(DYNAMIC_MISSIONS_SETTINGS))) {
    log(
      "MainConfig.json not generated yet — Dynamic AI Missions will create it " +
        "(with its own default missions) on first server start",
    );
    return;
  }

  const settings: MainConfig = JSON.parse(
    await Deno.readTextFile(DYNAMIC_MISSIONS_SETTINGS),
  );
  const template: MissionsTemplate = JSON.parse(
    await Deno.readTextFile(`${AI_TEMPLATE_DIR}/DynamicAIMissions.json`),
  );

  const existingNames = new Set(settings.Missions.map((m) => m.Name).filter(Boolean));
  const newMissions = template.Missions.filter((m) => m.Name && !existingNames.has(m.Name));
  if (newMissions.length === 0) return;

  settings.Loadouts ??= [{}];
  const group = settings.Loadouts[0];
  group.Weapons ??= [];
  group.Armour ??= [];
  group.Headgear ??= [];

  const existingIds = [...group.Weapons, ...group.Armour, ...group.Headgear]
    .map((item) => item.Loadout_ID)
    .filter((id): id is number => typeof id === "number");
  const newLoadoutId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0;

  const tag = (item: LoadoutItem) => ({ ...item, Loadout_ID: newLoadoutId });
  group.Weapons.push(...template.LoadoutGroup.Weapons.map(tag));
  group.Armour.push(...template.LoadoutGroup.Armour.map(tag));
  group.Headgear.push(...template.LoadoutGroup.Headgear.map(tag));

  for (const mission of newMissions) mission.Bots_Loadout_ID = newLoadoutId;
  settings.Missions.push(...newMissions);

  await Deno.writeTextFile(
    DYNAMIC_MISSIONS_SETTINGS,
    JSON.stringify(settings, null, 4),
  );
  ok(`Added ${newMissions.length} mission(s) to ${DYNAMIC_MISSIONS_SETTINGS}`);
}

export async function dynamicMissionsConfigured(): Promise<boolean> {
  return await exists(DYNAMIC_MISSIONS_SETTINGS);
}

// No-Build-Zones (@No-Build-Zones): blocks construction around
// high-value/high-loot locations, per TODO.md item 10.
//
// Self-generates a flat profiles/NoBuildZone.json (confirmed via the mod's
// own Steam Workshop page) with an empty `NoBuildZones` array and two
// placeholder example entries baked into its description, not actually
// written to the file - so unlike most other mods in this project, there's
// no shipped-default zone list to leave alone; this only ever *adds* our
// own curated zones by name, never touching an admin's own hand-added
// entries.
//
// Only one zone is authored here so far: NWAF, using the exact coordinate
// already verified for its `Roaming_Bandits_NWAF` patrol waypoint in
// ai/AIPatrolSettings.json (`[4501.0, 300.0, 10231.0]`) - a real, working
// position confirmed live rather than a newly-guessed one. The other
// Chernarus military bases (Tisy, Balota, Vybor, Devil's Castle, Green
// Mountain, etc.) still need their own coordinates verified on a live map
// before a zone can be safely added for them too - see TODO.md item 11 and
// TESTS.md.

import { NO_BUILD_ZONES_SETTINGS } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface NoBuildZone {
  Name?: string;
  Description?: string;
  X?: number;
  Y?: number;
  Radius?: number;
  [key: string]: unknown;
}

interface NoBuildZoneConfig {
  NoBuildZones?: NoBuildZone[];
  [key: string]: unknown;
}

// The mod's own field names use "X"/"Y" for the two horizontal world
// coordinates (confirmed by its shipped example, "Y": 7500.0 next to an
// "X" of the same magnitude - not a vertical height) - "Y" here is what
// every other file in this project calls "Z".
const CURATED_ZONES: NoBuildZone[] = [
  {
    Name: "NWAF",
    Description: "the Northwest Airfield",
    X: 4501.0,
    Y: 10231.0,
    Radius: 300.0,
  },
];

export async function tuneNoBuildZones(): Promise<void> {
  if (!(await exists(NO_BUILD_ZONES_SETTINGS))) {
    log(
      `${NO_BUILD_ZONES_SETTINGS} not generated yet - No-Build-Zones will create it ` +
        "(empty) on first server start",
    );
    return;
  }

  const config: NoBuildZoneConfig = JSON.parse(
    await Deno.readTextFile(NO_BUILD_ZONES_SETTINGS),
  );
  config.NoBuildZones ??= [];

  const existingNames = new Set(config.NoBuildZones.map((z) => z.Name).filter(Boolean));
  const added = CURATED_ZONES.filter((z) => z.Name && !existingNames.has(z.Name));
  if (added.length === 0) return;

  config.NoBuildZones.push(...added);
  await Deno.writeTextFile(NO_BUILD_ZONES_SETTINGS, JSON.stringify(config, null, 4));
  ok(`Added ${added.length} no-build zone(s) to ${NO_BUILD_ZONES_SETTINGS}`);
}

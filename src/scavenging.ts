// Dynamic Scavenging (@Dynamic-Scavenging) tuning: a hold-to-search loot
// source layered on top of (not replacing) the vanilla Central Economy - see
// TODO.md / MODS.md for how it was added. Like difficulty.ts, this
// deliberately overwrites a handful of scalar fields rather than merging, so
// re-running `up`/`start` keeps re-applying the same opinionated values even
// if a host or a future mod update resets them.
//
// The generated DynamicScavenging.json (confirmed on a live server run) is a
// single flat JSON object mixing real settings with `_xxxFieldName_info`
// human-readable documentation strings for every field - both are preserved
// verbatim by JSON.parse/stringify; only the specific keys below are ever
// touched.

import { DYNAMIC_SCAVENGING_SETTINGS } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

interface DynamicScavengingConfig {
  searchWhileCombat?: number;
  baseFindChance?: number;
  diminishingFactor?: number;
  enableBuildingExhaustion?: number;
  [key: string]: unknown;
}

export async function tuneDynamicScavenging(): Promise<void> {
  if (!(await exists(DYNAMIC_SCAVENGING_SETTINGS))) {
    log(
      "DynamicScavenging.json not generated yet - Dynamic Scavenging will create it " +
        "(with its own defaults) on first server start",
    );
    return;
  }

  const settings: DynamicScavengingConfig = JSON.parse(
    await Deno.readTextFile(DYNAMIC_SCAVENGING_SETTINGS),
  );
  let changed = false;

  // Confirmed default ships as 1 (combat search allowed) - the mod's own
  // description says disabling this blocks searching for 10s after taking
  // damage, which is exactly the "world that fights back" behavior we want:
  // getting shot should interrupt looting, not be ignorable. Not a
  // preset-controlled field (see lootPreset in the generated file), so this
  // never gets clobbered by a lootPreset switch.
  if (settings.searchWhileCombat !== 0) {
    settings.searchWhileCombat = 0;
    changed = true;
  }

  // Confirmed real shipped default is 0.95 (near-guaranteed on the first
  // search of anything) - too generous for "hunt/scavenge, don't just loot
  // buildings". Tightened so a search is a real gamble, not a formality.
  if (settings.baseFindChance !== 0.65) {
    settings.baseFindChance = 0.65;
    changed = true;
  }

  // Confirmed real shipped default is 0.95 (barely diminishes despite the
  // mod's own docstring example using 0.5 as "95% -> 47% -> 24%") - restores
  // that documented steep decline so repeat-searching the same desk/shelf
  // stops paying off after the first try or two.
  if (settings.diminishingFactor !== 0.5) {
    settings.diminishingFactor = 0.5;
    changed = true;
  }

  // Confirmed real shipped default is 0 (off). Enabling this means an entire
  // building goes "exhausted" once enough furniture inside it has been
  // searched (maxSearchesPerBuilding, shipped default 10 - left as-is),
  // rather than every single container being independently farmable forever
  // - pushes players to keep moving/exploring instead of parking in one
  // building.
  if (settings.enableBuildingExhaustion !== 1) {
    settings.enableBuildingExhaustion = 1;
    changed = true;
  }

  if (!changed) return;
  await Deno.writeTextFile(DYNAMIC_SCAVENGING_SETTINGS, JSON.stringify(settings, null, 4));
  ok(`Tightened Dynamic Scavenging generosity/lockout in ${DYNAMIC_SCAVENGING_SETTINGS}`);
}

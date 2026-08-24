// Vehicle3PP (@Vehicle3PP) 3rd-person-camera classname whitelist. The mod
// self-generates `profiles/3PPVehicleWhitelist.json` with only 5 vanilla car
// classnames (confirmed on a live server run) - any vehicle classname not in
// this flat array doesn't get the mod's 3rd-person treatment. Additive
// merge only, same rule as modTypes.ts: an existing entry (vanilla, another
// mod, or an admin's own edit) is never removed or duplicated.
//
// The mod's own docs warn an invalid/unknown classname in this file can
// crash the server, so only classnames pulled directly from a mod's own
// shipped reference list (never guessed) are added here. Each mod below
// ships a plain-text classname list in its own folder - keyed by @name used
// in mods.txt, with only the actual driveable vehicle roots kept (door/
// wheel/wreck sub-parts from those same lists are deliberately excluded,
// since they aren't things the camera mod needs to whitelist).

import { VEHICLE_3PP_WHITELIST } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const VEHICLE_3PP_SOURCES: Record<string, string[]> = {
  "@UAZ-31514": [
    "UAZ_31514",
    "UAZ_31514_blue",
    "UAZ_31514_yellow",
    "UAZ_31514_tdc",
    "UAZ_31514_cargo2",
    "UAZ_31514_cargo2_blue",
    "UAZ_31514_cargo2_yellow",
    "UAZ_31514_cargo2_tdc",
    "UAZ_31514_hunter",
    "UAZ_31514_hunter_camos",
    "UAZ_31514_hunter_camow",
  ],
  "@MBM-ApocalypseTruck": ["MBM_Apocalypse_Truck"],
  "@MBM-ApocalypticPAZ": [
    "MBM_ApocalypticPAZ_White",
    "MBM_ApocalypticPAZ_Black",
    "MBM_ApocalypticPAZ_Blue",
    "MBM_ApocalypticPAZ_Green",
    "MBM_ApocalypticPAZ_Yellow",
    "MBM_ApocalypticPAZ_Camo",
  ],
};

interface Vehicle3PPConfig {
  DriverOnly?: string;
  Whitelist?: string[];
  [key: string]: unknown;
}

export async function ensureVehicle3PPWhitelist(mods: Mod[]): Promise<void> {
  if (!(await exists(VEHICLE_3PP_WHITELIST))) {
    log(
      "3PPVehicleWhitelist.json not generated yet - Vehicle3PP will create it " +
        "(with its own vanilla-only defaults) on first server start",
    );
    return;
  }

  const config: Vehicle3PPConfig = JSON.parse(
    await Deno.readTextFile(VEHICLE_3PP_WHITELIST),
  );
  config.Whitelist ??= [];
  const existing = new Set(config.Whitelist);

  const modNames = new Set(mods.map((m) => m.name));
  let addedTotal = 0;
  for (const [modName, classnames] of Object.entries(VEHICLE_3PP_SOURCES)) {
    if (!modNames.has(modName)) continue;
    let addedForMod = 0;
    for (const classname of classnames) {
      if (existing.has(classname)) continue;
      existing.add(classname);
      config.Whitelist.push(classname);
      addedForMod++;
    }
    if (addedForMod > 0) {
      addedTotal += addedForMod;
      ok(`Added ${addedForMod} ${modName} classname(s) to ${VEHICLE_3PP_WHITELIST}`);
    }
  }

  if (addedTotal === 0) return;
  await Deno.writeTextFile(VEHICLE_3PP_WHITELIST, JSON.stringify(config, null, 4));
}

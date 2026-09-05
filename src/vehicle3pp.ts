// Vehicle3PP (@Vehicle3PP) 3rd-person-camera classname whitelist. The mod
// self-generates `profiles/3PPVehicleWhitelist.json` with only 5 vanilla car
// classnames - any vehicle classname not in this flat array doesn't get the
// mod's 3rd-person treatment. Additive merge only, same rule as modTypes.ts:
// an existing entry is never removed or duplicated.
//
// The mod's own docs warn an invalid/unknown classname in this file can
// crash the server, so only classnames pulled directly from a mod's own
// shipped reference list are added here (door/wheel/wreck sub-parts are
// excluded - the camera mod doesn't need those whitelisted).

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
  "@TP-Apoc-SUV": [
    "TP_Apoc_Suv",
    "TP_Apoc_Black_Suv",
    "TP_Apoc_Blue_Suv",
    "TP_Apoc_Camo_Suv",
    "TP_Apoc_Green_Suv",
    "TP_Apoc_Grey_Suv",
    "TP_Apoc_Red_Suv",
    "TP_Apoc_Yellow_Suv",
    "TP_Apoc_Suv_Auto",
    "TP_Apoc_Suv_Black_Auto",
    "TP_Apoc_Suv_Blue_Auto",
    "TP_Apoc_Suv_Camo_Auto",
    "TP_Apoc_Suv_Green_Auto",
    "TP_Apoc_Suv_Grey_Auto",
    "TP_Apoc_Suv_Red_Auto",
    "TP_Apoc_Suv_Yellow_Auto",
  ],
  "@TP-Apoc-M1025": [
    "TP_Apoc_M1025",
    "TP_Apoc_M1025_Black",
    "TP_Apoc_M1025_Camo",
    "TP_Apoc_M1025_Tan",
    "TP_Apoc_M1025_NoGun",
    "TP_Apoc_M1025_NoGun_Black",
    "TP_Apoc_M1025_NoGun_Camo",
    "TP_Apoc_M1025_NoGun_Tan",
    "TP_Apoc_M1025_StaticGun",
    "TP_Apoc_M1025_StaticGun_Black",
    "TP_Apoc_M1025_StaticGun_Camo",
    "TP_Apoc_M1025_StaticGun_Tan",
  ],
  "@TP-Apoc-Pickup": [
    "TP_ApocPickup_Truck",
    "TP_ApocPickup_Truck_Black",
    "TP_ApocPickup_Truck_Red",
    "TP_ApocPickup_Truck_Blue",
    "TP_ApocPickup_Truck_Yellow",
    "TP_ApocPickup_Truck_Green",
    "TP_ApocPickup_Truck_Camo",
    "TP_ApocPickup_Truck_BlackCamo",
    "TP_ApocPickup_Truck_Bloody",
    "TP_ApocPickup_Truck_Auto",
    "TP_ApocPickup_Truck_Black_Auto",
    "TP_ApocPickup_Truck_Red_Auto",
    "TP_ApocPickup_Truck_Blue_Auto",
    "TP_ApocPickup_Truck_Yellow_Auto",
    "TP_ApocPickup_Truck_Green_Auto",
    "TP_ApocPickup_Truck_Camo_Auto",
    "TP_ApocPickup_Truck_BlackCamo_Auto",
    "TP_ApocPickup_Truck_Bloody_Auto",
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

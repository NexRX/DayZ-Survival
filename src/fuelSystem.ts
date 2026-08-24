// Fuel-System (@Fuel-System) matches vehicle fuel type/consumption by
// classname in profiles/iTzMods/FuelSystem/vehicles.xml, self-generated on
// first world load with only vanilla base-class entries (confirmed on a
// live server run):
//
//   CarScript/BoatScript (generic fallback), CivilianSedan, Hatchback_02,
//   Sedan_02, OffroadHatchback, Offroad_02, Truck_01_Base,
//   ExpansionHelicopterScript, ExpansionVehicleHelicopterBase
//
// The mod's own Steam page confirms `type` "can be a base class" (i.e. it
// walks the inheritance chain, not just exact-match), so every custom
// vehicle here likely already gets *some* fallback via CarScript/
// Offroad_02/Truck_01_Base. But the mod's own comments section has a live
// user report of base-class diesel matching not applying reliably (see
// TODO.md's compatibility/risk section), so this adds explicit exact-match
// entries for our confirmed custom vehicle classnames as a safety net -
// never wrong, and removes any dependency on that inheritance-matching
// working correctly.
//
// Consumption/fuel-type values are not invented: each custom vehicle reuses
// the exact numbers already shipped for its closest vanilla counterpart
// (UAZ-31514 -> OffroadHatchback, MBM trucks -> Truck_01_Base, MoreCars
// reskins -> whichever vanilla body they're a texture variant of).
//
// Additive merge only, same rule as modTypes.ts/moreCars.ts: an existing
// `type="..."` entry is never touched or duplicated.

import { FUEL_SYSTEM_VEHICLES } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

interface VehicleFuel {
  type: string;
  fuel: "GASOLINE" | "DIESEL" | "KEROSENE";
  consumption: number;
}

// UAZ-31514 - Soviet 4x4 utility vehicle, closest vanilla counterpart is
// OffroadHatchback (DIESEL, 1.21 - reused verbatim from vehicles.xml).
const UAZ_31514: VehicleFuel[] = [
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
].map((type) => ({ type, fuel: "DIESEL", consumption: 1.21 }));

// MBM trucks - closest vanilla counterpart is Truck_01_Base
// (DIESEL, 1.4 - reused verbatim from vehicles.xml).
const MBM_TRUCKS: VehicleFuel[] = [
  "MBM_Apocalypse_Truck",
  "MBM_ApocalypticPAZ_White",
  "MBM_ApocalypticPAZ_Black",
  "MBM_ApocalypticPAZ_Blue",
  "MBM_ApocalypticPAZ_Green",
  "MBM_ApocalypticPAZ_Yellow",
  "MBM_ApocalypticPAZ_Camo",
].map((type) => ({ type, fuel: "DIESEL", consumption: 1.4 }));

// MoreCars - each reskin reuses the exact fuel/consumption already shipped
// for the vanilla body it's a texture variant of.
const MORE_CARS: VehicleFuel[] = [
  ...[
    "OffroadHatchback_Firefighter",
    "OffroadHatchback_Cab",
    "OffroadHatchback_PoliceRus",
    "OffroadHatchback_wineblue",
    "OffroadHatchback_wineblue_rust",
    "OffroadHatchback_chernarusarmy",
    "OffroadHatchback_chernarusarmy_rust",
    "OffroadHatchback_5000ca",
    "OffroadHatchback_5000ca_rust",
  ].map((type) => ({ type, fuel: "DIESEL" as const, consumption: 1.21 })),
  ...[
    "Hatchback_02_Cab",
    "Hatchback_02_Cab_rust",
    "Hatchback_02_cat",
    "Hatchback_02_Pizzapresto",
    "Hatchback_02_rustbeige",
    "Hatchback_02_stripes1",
    "Hatchback_02_stripes1_rust",
    "Hatchback_02_mtconstruction",
    "Hatchback_02_mtconstruction_rust",
    "Hatchback_02_fat",
    "Hatchback_02_fat_rust",
    "Hatchback_02_purplesmoke",
    "Hatchback_02_icegem",
    "Hatchback_02_purplebomb",
  ].map((type) => ({ type, fuel: "GASOLINE" as const, consumption: 1.11 })),
  ...[
    "Sedan_02_Medic01",
    "Sedan_02_peacebird",
  ].map((type) => ({ type, fuel: "GASOLINE" as const, consumption: 1.13 })),
];

const VEHICLE_FUEL_SOURCES: Record<string, VehicleFuel[]> = {
  "@UAZ-31514": UAZ_31514,
  "@MBM-ApocalypseTruck": MBM_TRUCKS.filter((v) => v.type.startsWith("MBM_Apocalypse_Truck")),
  "@MBM-ApocalypticPAZ": MBM_TRUCKS.filter((v) => v.type.startsWith("MBM_ApocalypticPAZ")),
  "@MoreCars": MORE_CARS,
};

const VEHICLE_TYPE = /<vehicle\s+type="([^"]+)"/g;

export async function ensureFuelSystemVehicles(mods: Mod[]): Promise<void> {
  if (!(await exists(FUEL_SYSTEM_VEHICLES))) {
    log(
      `${FUEL_SYSTEM_VEHICLES} not generated yet - Fuel-System will create it ` +
        "(with its own vanilla-only defaults) on first server start",
    );
    return;
  }

  let text = await Deno.readTextFile(FUEL_SYSTEM_VEHICLES);
  const existing = new Set([...text.matchAll(VEHICLE_TYPE)].map((m) => m[1]));

  const modNames = new Set(mods.map((m) => m.name));
  let addedTotal = 0;
  for (const [modName, vehicles] of Object.entries(VEHICLE_FUEL_SOURCES)) {
    if (!modNames.has(modName)) continue;
    let addedForMod = 0;
    for (const v of vehicles) {
      if (existing.has(v.type)) continue;
      existing.add(v.type);
      const line = `\t<vehicle type="${v.type}" fuel="${v.fuel}" consumption="${v.consumption}" />`;
      text = text.replace("</vehicles>", `${line}\n</vehicles>`);
      addedForMod++;
    }
    if (addedForMod > 0) {
      addedTotal += addedForMod;
      ok(`Added ${addedForMod} ${modName} fuel entry(s) to ${FUEL_SYSTEM_VEHICLES}`);
    }
  }

  if (addedTotal === 0) return;
  await Deno.writeTextFile(FUEL_SYSTEM_VEHICLES, text);
}

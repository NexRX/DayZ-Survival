// DayZ-Expansion-Market tuning: caps trader stock levels for "power" item
// categories (weapons, ammo, attachments, vehicles) so the trader can't be
// used to instantly gear up - "not everything can be bought" / "earned
// power" per this project's design goals (see README.md).
//
// Confirmed live (profiles/ExpansionMod/Market/*.json, self-generated on
// first server start): every single category ships the exact same blanket
// defaults regardless of what it sells - `InitStockPercent: 75.0` and
// `MaxStockThreshold: 100` per item (500 for Ammo, 250 for Ammo_Boxes -
// still just as generous). This isn't a targeted "weapons are extra
// generous" choice by the mod, it's one flat default applied everywhere -
// so this file makes a deliberate, opinionated choice to only tighten the
// categories that actually represent "earned power" (weapons/ammo/
// attachments/vehicles), leaving survival essentials (food, medical, tools,
// clothing, backpacks, etc.) at the shipped defaults, matching "hardcore,
// but respects your time".
//
// Like economy.ts, this overwrites specific fields rather than merging, and
// is idempotent via an absolute cap (min(existing, cap)) rather than a
// relative multiplier - safe to re-run indefinitely without over-shrinking
// on every restart.

import { EXPANSION_MARKET_DIR } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

// Full weapons - the biggest single "earned power" jump, capped tightest.
const WEAPON_CATEGORIES = [
  "Assault_Rifles",
  "Sniper_Rifles",
  "Rifles",
  "Shotguns",
  "Submachine_Guns",
  "Pistols",
  "Crossbows",
];
const WEAPON_MAX_STOCK_CAP = 5;

// Ammo/attachments/vehicle parts - meaningful but incremental power, capped
// looser than whole weapons.
const AMMO_ATTACHMENT_CATEGORIES = [
  "Ammo",
  "Ammo_Boxes",
  "Magazines",
  "Optics",
  "Explosives_And_Grenades",
  "Muzzles",
  "Handguards",
  "Buttstocks",
  "Bayonets",
  "Vehicle_Parts",
];
const AMMO_ATTACHMENT_MAX_STOCK_CAP = 15;

// Whole vehicles - already naturally low (3-10 shipped) but still capped
// further so a heli/car is never a same-day trader purchase.
const VEHICLE_CATEGORIES = ["Helicopters", "Cars", "Boats"];
const VEHICLE_MAX_STOCK_CAP = 2;

const INIT_STOCK_PERCENT_TARGET = 10.0;

interface MarketItem {
  MaxStockThreshold?: number;
  [key: string]: unknown;
}

interface MarketCategory {
  InitStockPercent?: number;
  Items?: MarketItem[];
  [key: string]: unknown;
}

async function tuneCategory(name: string, maxStockCap: number): Promise<boolean> {
  const path = `${EXPANSION_MARKET_DIR}/${name}.json`;
  if (!(await exists(path))) return false;

  const data: MarketCategory = JSON.parse(await Deno.readTextFile(path));
  let changed = false;

  if (
    typeof data.InitStockPercent === "number" &&
    data.InitStockPercent > INIT_STOCK_PERCENT_TARGET
  ) {
    data.InitStockPercent = INIT_STOCK_PERCENT_TARGET;
    changed = true;
  }

  for (const item of data.Items ?? []) {
    if (typeof item.MaxStockThreshold === "number" && item.MaxStockThreshold > maxStockCap) {
      item.MaxStockThreshold = maxStockCap;
      changed = true;
    }
  }

  if (!changed) return false;
  await Deno.writeTextFile(path, JSON.stringify(data, null, 4));
  return true;
}

export async function tuneExpansionMarket(): Promise<void> {
  if (!(await exists(EXPANSION_MARKET_DIR))) {
    log(
      `${EXPANSION_MARKET_DIR} not generated yet - DayZ-Expansion-Market will create it ` +
        "(with its own defaults) on first server start",
    );
    return;
  }

  let changedFiles = 0;
  for (const name of WEAPON_CATEGORIES) {
    if (await tuneCategory(name, WEAPON_MAX_STOCK_CAP)) changedFiles++;
  }
  for (const name of AMMO_ATTACHMENT_CATEGORIES) {
    if (await tuneCategory(name, AMMO_ATTACHMENT_MAX_STOCK_CAP)) changedFiles++;
  }
  for (const name of VEHICLE_CATEGORIES) {
    if (await tuneCategory(name, VEHICLE_MAX_STOCK_CAP)) changedFiles++;
  }

  if (changedFiles === 0) return;
  ok(
    `Capped trader stock levels for ${changedFiles} DayZ-Expansion-Market ` +
      `categor${changedFiles === 1 ? "y" : "ies"} in ${EXPANSION_MARKET_DIR}`,
  );
}

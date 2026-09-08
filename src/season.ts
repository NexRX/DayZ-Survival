// Per-restart "season" roll deciding whether this server session is
// "Early Winter" (the whole-map @Early-Winter-Chernarus visual reskin) or
// "Normal". Weather Lighting Control (@WeatherLightingControl) drives
// actual weather/precipitation every session regardless of this roll - see
// mods.txt's Environment/atmosphere/events section and wlcWeather.ts.
//
// Deliberately NOT persisted to disk. Restarts are common on this server
// and world wipes are meant to become rare once it's stable - tying this
// to a wipe would effectively fix it indefinitely rather than giving the
// variety the project owner actually wants. Every restart is therefore an
// independent roll with no memory of the previous result.
//
// NOTE: Early Winter and WLC do NOT conflict. Early Winter's own config
// (unpacked and verified directly, not just taken on a Steam comment's
// word) only touches CfgWorlds > ChernarusPlus > Weather > Overcast
// lighting/sky bands plus ground/plant/tree models and footstep sounds -
// it has no CfgWeather/precipitation logic of its own. So WLC is always
// in the launch line; only Early Winter's presence is toggled by the roll.

import type { Mod } from "./mods.ts";
import { log } from "./ui.ts";

/** Chance (0-100) that a given restart rolls "Early Winter" instead of "Normal". */
export const EARLY_WINTER_CHANCE_PERCENT = 40;

export const WLC_MOD_NAME = "@WeatherLightingControl";
export const EARLY_WINTER_MOD_NAME = "@Early-Winter-Chernarus";

/** Rolls this session's season. Call once per doStart() and reuse the result. */
export function rollEarlyWinter(chancePercent: number = EARLY_WINTER_CHANCE_PERCENT): boolean {
  const roll = Math.random() * 100;
  const earlyWinter = roll < chancePercent;
  log(
    `Season roll: ${roll.toFixed(1)} vs ${chancePercent}% threshold -> ` +
      `${earlyWinter ? "EARLY WINTER" : "Normal"} this session`,
  );
  return earlyWinter;
}

/**
 * Drops @Early-Winter-Chernarus from the launch line on sessions that
 * didn't roll it. @WeatherLightingControl is never filtered - it drives
 * weather every session regardless of season (see note above). Both mods
 * stay listed in mods.txt (and therefore always downloaded/kept up to
 * date via ensureMods()) regardless of the roll - only this session's
 * actual launch line is filtered.
 */
export function filterModsForSeason(mods: Mod[], earlyWinter: boolean): Mod[] {
  if (earlyWinter) return mods;
  return mods.filter((m) => m.name !== EARLY_WINTER_MOD_NAME);
}

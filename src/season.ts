// Per-restart "season" roll deciding whether this server session is
// "Early Winter" (the whole-map @Early-Winter-Chernarus visual reskin) or
// "Normal". Weather Lighting Control (@WeatherLightingControl) drives
// actual weather/precipitation every session regardless of this roll - see
// mods.txt's Environment/atmosphere/events section and wlcWeather.ts.
//
// Deliberately NOT persisted to disk. Restarts are common on this server
// and world wipes are meant to become rare once it's stable - tying this
// to a wipe would effectively fix it indefinitely rather than giving the
// variety the project owner actually wants. Instead, the result is pinned
// to a fixed-length wall-clock window (see EARLY_WINTER_PERIOD_MS below):
// any restart within the same window reproduces the same result with no
// state on disk, and it's free to change again once the window rolls over.
//
// NOTE: Early Winter and WLC do NOT conflict. Early Winter's own config
// (unpacked and verified directly, not just taken on a Steam comment's
// word) only touches CfgWorlds > ChernarusPlus > Weather > Overcast
// lighting/sky bands plus ground/plant/tree models and footstep sounds -
// it has no CfgWeather/precipitation logic of its own. So WLC is always
// in the launch line; only Early Winter's presence is toggled by the roll.

import type { Mod } from "./mods.ts";
import { log } from "./ui.ts";

/** Chance (0-100) that a given window rolls "Early Winter" instead of "Normal". */
export const EARLY_WINTER_CHANCE_PERCENT = 40;

/**
 * Length of the wall-clock window a season roll is pinned to. Every restart
 * that falls within the same window (as measured from the Unix epoch, so
 * windows are stable and shared across restarts rather than relative to
 * whenever the server first started) reproduces the same result - a
 * restart 5 minutes after the last one won't flip the season back and
 * forth, but restarting 2+ hours later can roll a fresh one.
 */
export const EARLY_WINTER_PERIOD_MS = 2 * 60 * 60 * 1000;

export const WLC_MOD_NAME = "@WeatherLightingControl";
export const EARLY_WINTER_MOD_NAME = "@Early-Winter-Chernarus";

/**
 * Deterministically hashes an integer seed to a pseudo-random float in
 * [0, 1). Used instead of Math.random() so the same window always produces
 * the same roll without persisting anything to disk.
 */
function hashToUnitFloat(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

/**
 * Rolls the season for whichever EARLY_WINTER_PERIOD_MS window `now` falls
 * in. Call once per doStart() and reuse the result. Deterministic within a
 * window (same window -> same result on every restart) and independent
 * across windows (different window -> effectively a fresh random roll).
 */
export function rollEarlyWinter(
  chancePercent: number = EARLY_WINTER_CHANCE_PERCENT,
  now: number = Date.now(),
): boolean {
  const windowIndex = Math.floor(now / EARLY_WINTER_PERIOD_MS);
  const windowEndsAt = new Date((windowIndex + 1) * EARLY_WINTER_PERIOD_MS);
  const roll = hashToUnitFloat(windowIndex) * 100;
  const earlyWinter = roll < chancePercent;
  log(
    `Season roll: ${roll.toFixed(1)} vs ${chancePercent}% threshold -> ` +
      `${earlyWinter ? "EARLY WINTER" : "Normal"} for this ` +
      `${EARLY_WINTER_PERIOD_MS / 3_600_000}h window (until ${windowEndsAt.toISOString()})`,
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

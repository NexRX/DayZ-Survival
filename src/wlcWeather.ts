// Patches Weather Lighting Control's (WLC) self-generated weather_config.json
// to add snow, tuned by this session's Early Winter roll (see season.ts).
//
// WLC's own default config ships with `global_allow_snow: 0` and zero snow
// patterns at all ("Snow patterns are not included [by default]... add your
// own snow patterns with snow_min/snow_max values" - WLC's own example.md).
// This adds exactly 2 managed patterns (flurries + a heavier snowstorm) and
// leaves every one of WLC's other ~30 default patterns/9 sequences alone.
//
// Weighting (see WLC's own "Weight System": chance(X) = X.weight / sum(all
// weights)):
//   - Early Winter session: combined snow weight is set to ~1.3x the total
//     weight of every other (non-snow) pattern, split 70/30 between
//     flurries/snowstorm. That gives snow a ~56.5% chance of being the pick
//     each time WLC selects a new pattern - "slightly more often than not",
//     as requested, while still leaving room for clear/rain/fog variety.
//   - Normal session: both snow patterns' weight is 0 (present but inert,
//     matching WLC's own no-snow-by-default design) and global_allow_snow
//     is left off, so Early-Winter-Chernarus visuals never show snow.
// This is a baseline approximation, not an exact runtime probability - WLC's
// existing default patterns still carry their own built-in time-of-day/
// seasonal multipliers (see its docs' "Effective Weight" formula), which
// this project doesn't touch or control.
//
// Idempotent: re-run on every start, upserts by pattern `name` so re-runs
// (or a config the mod regenerated after a version update) don't duplicate
// entries or stomp on manual admin edits to unrelated patterns.
//
// Also unconditionally sets enable_testing_mode: 1, required by the
// optional WLC COT Control Panel sub-mod (@WeatherLightingControl-COT-
// Control-Panel, mods.txt) to actually apply panel button-clicks - without
// it the panel opens and shows live status but every action silently
// no-ops. TRADEOFF (confirmed by unpacking WLC core's MissionServer.c):
// this same flag also unlocks WLC's plain chat commands (/w next, /w
// random, ...) for EVERY connected player, not just admins - WLC's chat
// handler checks only this flag, no permission/identity check at all. The
// panel itself stays admin-gated via COT's own Weather.WLC permission; the
// chat-command side does not. See mods.txt's entry for this sub-mod for
// the full writeup if this tradeoff ever needs revisiting.

import { WLC_CONFIG_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

const SNOW_FLURRIES_NAME = "DZSURVIVAL SNOW FLURRIES";
const SNOWSTORM_NAME = "DZSURVIVAL SNOWSTORM";
const MANAGED_PATTERN_NAMES = new Set([SNOW_FLURRIES_NAME, SNOWSTORM_NAME]);

// Combined snow weight, relative to the total weight of every other
// (untouched) pattern, when this session is Early Winter.
const EARLY_WINTER_SNOW_WEIGHT_RATIO = 1.3;
const FLURRIES_SHARE = 0.7;
const SNOWSTORM_SHARE = 0.3;

// deno-lint-ignore no-explicit-any
type WeatherPattern = Record<string, any>;

interface WlcConfig {
  global_allow_snow?: number;
  enable_testing_mode?: number;
  weather_patterns?: WeatherPattern[];
  [key: string]: unknown;
}

function snowFlurriesPattern(weight: number): WeatherPattern {
  return {
    name: SNOW_FLURRIES_NAME,
    weight,
    overcast_min: 0.5,
    overcast_max: 0.75,
    fog_min: 0.05,
    fog_max: 0.15,
    fog_density: 0.3,
    rain_min: 0.0,
    rain_max: 0.0,
    snow_min: 0.15,
    snow_max: 0.4,
    wind_speed_min: 3.0,
    wind_speed_max: 9.0,
    wind_max_speed: 14.0,
    wind_direction_min: 0.0,
    wind_direction_max: 6.28,
    wind_function_min: 0.1,
    wind_function_max: 0.25,
    wind_function_frequency: 45,
    storm_density: 0.0,
    storm_threshold: 1.0,
    storm_timeout: 45.0,
    transition_min: 300.0,
    transition_max: 600.0,
    duration_min: 900.0,
    duration_max: 2400.0,
    volumetric_fog_enabled: 1,
    volumetric_fog_height_density: 0.05,
    volumetric_fog_distance_density: 0.03,
    volumetric_fog_height_bias: 20.0,
    volumetric_fog_transition_time: 200,
  };
}

function snowstormPattern(weight: number): WeatherPattern {
  return {
    name: SNOWSTORM_NAME,
    weight,
    overcast_min: 0.85,
    overcast_max: 1.0,
    fog_min: 0.1,
    fog_max: 0.25,
    fog_density: 0.4,
    rain_min: 0.0,
    rain_max: 0.0,
    snow_min: 0.55,
    snow_max: 0.85,
    wind_speed_min: 12.0,
    wind_speed_max: 20.0,
    wind_max_speed: 28.0,
    wind_direction_min: 0.0,
    wind_direction_max: 6.28,
    wind_function_min: 0.4,
    wind_function_max: 0.8,
    wind_function_frequency: 25,
    storm_density: 0.0,
    storm_threshold: 1.0,
    storm_timeout: 45.0,
    transition_min: 240.0,
    transition_max: 480.0,
    duration_min: 600.0,
    duration_max: 1500.0,
    volumetric_fog_enabled: 1,
    volumetric_fog_height_density: 0.15,
    volumetric_fog_distance_density: 0.08,
    volumetric_fog_height_bias: 35.0,
    volumetric_fog_transition_time: 150,
  };
}

/** Upserts a pattern by name in-place, or appends it if not already present. */
function upsertPattern(patterns: WeatherPattern[], pattern: WeatherPattern): void {
  const i = patterns.findIndex((p) => p.name === pattern.name);
  if (i === -1) patterns.push(pattern);
  else patterns[i] = pattern;
}

export async function tuneWlcWeather(earlyWinter: boolean): Promise<void> {
  if (!(await exists(WLC_CONFIG_FILE))) {
    log(
      `${WLC_CONFIG_FILE} not generated yet - Weather Lighting Control will create it on first server start`,
    );
    return;
  }

  const data: WlcConfig = JSON.parse(await Deno.readTextFile(WLC_CONFIG_FILE));
  data.weather_patterns ??= [];

  const othersTotalWeight = data.weather_patterns
    .filter((p) => !MANAGED_PATTERN_NAMES.has(p.name))
    .reduce((sum, p) => sum + (Number(p.weight) || 0), 0);

  let flurriesWeight = 0;
  let snowstormWeight = 0;
  if (earlyWinter && othersTotalWeight > 0) {
    const totalSnowWeight = othersTotalWeight * EARLY_WINTER_SNOW_WEIGHT_RATIO;
    flurriesWeight = Math.round(totalSnowWeight * FLURRIES_SHARE);
    snowstormWeight = Math.round(totalSnowWeight * SNOWSTORM_SHARE);
  }

  upsertPattern(data.weather_patterns, snowFlurriesPattern(flurriesWeight));
  upsertPattern(data.weather_patterns, snowstormPattern(snowstormWeight));

  // Only actually enables snow rendering when this session can use it -
  // harmless either way since both patterns carry weight 0 when not Early
  // Winter, but keeps the flag itself honest about what's active.
  data.global_allow_snow = earlyWinter ? 1 : 0;

  // Required for the optional COT Control Panel sub-mod's buttons to work
  // (see this file's header comment for the chat-command tradeoff this
  // implies). Set unconditionally - independent of the season roll.
  data.enable_testing_mode = 1;

  await Deno.writeTextFile(WLC_CONFIG_FILE, JSON.stringify(data, null, 4));
  ok(
    `Tuned ${WLC_CONFIG_FILE}: snow patterns weight ${flurriesWeight}/${snowstormWeight} ` +
      `(flurries/snowstorm), global_allow_snow=${earlyWinter ? 1 : 0} ` +
      `(${earlyWinter ? "EARLY WINTER" : "Normal"} session)`,
  );
}

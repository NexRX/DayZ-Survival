// Makes the world naturally colder/greyer/damper - more overcast, thicker
// and more frequent fog, rain that triggers more readily, and a windier
// baseline - without touching any map asset, weather VFX model, or the
// vanilla temperature/wind-chill formula itself (all of that is engine-side
// and derived from these same weather values). Deliberately weather-pattern
// tuning only; see TODO.md item 13.
//
// cfgweather.xml ships as part of the mission itself (not mod-generated) -
// re-downloaded/validated by steamcmd on every `install`, same caveat as
// economy.ts - so this is re-applied on every start via a marker comment,
// exactly like economy.ts's food/game scarcity tuning.
//
// Confirmed on a live install: the mission ships this file with
// enable="0" - meaning literally none of its <overcast>/<fog>/<rain>/
// <windMagnitude>/etc values do anything until it's turned on (the engine
// falls back to its own baked-in default weather pattern instead). Turning
// it on is therefore the actual prerequisite for any "colder world" tuning
// to have any effect at all, not just a nice-to-have.
//
// Snowfall is deliberately left fully alone (still forced to 0, matching
// the file's own "Snowfall should always remain at 0 for this world"
// comment) - Chernarus's ground textures/objects aren't built for snow
// coverage, and adding it would change how the map looks, which is
// explicitly out of scope here.

import { CFG_WEATHER_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

const WEATHER_MARKER = "<!-- dayz-survival:colder-weather-tuned -->";

// Full replacement content. Kept as a plain, hand-authored XML file (same
// call as economy.ts's regex-scoped approach, just simpler since we own
// every byte here rather than a 24k-line Bohemia file) - a real XML
// parser/serializer would be overkill for 70 lines we're fully replacing
// anyway. Diffed field-by-field against the vanilla shipped defaults (see
// git history/TODO.md) so every change below is an intentional delta:
//
//   overcast: current actual 0.45->0.55, limits min 0.0->0.2 (skies are
//     never fully clear - there's always at least some grey overhead)
//   fog: current actual 0.05->0.12, limits 0.02-0.08 -> 0.05-0.35 (fog is
//     thicker and much more common, not just a thin haze)
//   rain: thresholds min 0.6->0.45 (rain now kicks in at a lower overcast
//     level, so it actually rains more often given the raised overcast
//     baseline above)
//   windMagnitude: current actual 8.0->10.0, limits min 0.0->2.0 (air is
//     never fully still - there's always some wind chill)
//
// Wind direction, snowfall, and storm density/threshold/timeout are left
// exactly as shipped - none of them bear on "colder", just on which way the
// wind blows and how dramatic thunderstorms look.
const WEATHER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
${WEATHER_MARKER}
<!-- 'reset' and 'enable' are a bool, and therefore supports: 0/1, true/false, yes/no -->
<!-- 'reset' controls whether you want to load in the weather from storage or not (false by default) -->
<!-- 'enable' controls whether this file is enabled or not (true by default) -->
<weather reset="0" enable="1">
    <overcast>
        <!-- Initial conditions of the overcast (target value, time to change, how long will it stay) -->
        <current actual="0.55" time="120" duration="240" />
        <!-- What is the range of the overcast value (0..1) -->
        <limits min="0.2" max="1.0" />
        <!-- How long does it take to the overcast to change from one value to other (time in seconds) -->
        <timelimits min="600" max="900" />
        <!-- How much should the overcast change (0..1) -->
        <changelimits min="0.0" max="1.0" />
    </overcast>
    <fog>
        <!-- Initial conditions of the fog (target value, time to change, how long will it stay) -->
        <current actual="0.12" time="120" duration="240" />
        <!-- What is the range of the fog value (0..1) -->
        <limits min="0.05" max="0.35" />
        <!-- How long does it take to the fog to change from one value to other (time in seconds) -->
        <timelimits min="900" max="900" />
        <!-- How much should the fog change (0..1) -->
        <changelimits min="0.0" max="1.0" />
    </fog>
    <rain>
        <!-- Initial conditions of the rain (target value, time to change, how long will it stay), restricted by thresholds (see below) -->
        <current actual="0.0" time="60" duration="120" />
        <!-- What is the range of the rain value (0..1) -->
        <limits min="0.0" max="1.0" />
        <!-- How long does it take to the rain to change from one value to other (time in seconds) -->
        <timelimits min="60" max="120" />
        <!-- How much should the rain change (0..1) -->
        <changelimits min="0.0" max="1.0" />
        <!-- What range of the overcast value allows the rain to be preset (min, max overcast value, time in seconds it takes for rain to stop if the overcast is outside of the specified range) -->
        <thresholds min="0.45" max="1.0" end="60" />
    </rain>
    <windMagnitude>
        <!-- Initial conditions of the wind magnitude (target value, time to change, how long will it stay), restricted by thresholds (see below) -->
        <current actual="10.0" time="120" duration="240" />
        <!-- What is the range of the wind magnitude value in m/s -->
        <limits min="2.0" max="20.0" />
        <!-- How long does it take to the wind magnitude to change from one value to other (time in seconds) -->
        <timelimits min="120" max="240" />
        <!-- How much should the wind change -->
        <changelimits min="0.0" max="20.0" />
    </windMagnitude>
    <windDirection>
        <!-- Initial conditions of the wind direction(target value, time to change, how long will it stay), restricted by thresholds (see below) -->
        <current actual="0.0" time="120" duration="240" />
        <!-- What is the range of the wind direction (angle in radians) -->
        <limits min="-3.14" max="3.14" />
        <!-- How long does it take to the wind direction to change from one value to other (time in seconds) -->
        <timelimits min="60" max="120" />
        <!-- How much should the wind change direction -->
        <changelimits min="-1.0" max="1.0" />
    </windDirection>
    <!-- Snowfall should always remain at 0 for this world. -->
    <snowfall>
        <!-- Initial conditions of the snowfall (target value, time to change, how long will it stay), restricted by thresholds (see below) -->
        <current actual="0.0" time="0" duration="32768" />
        <!-- What is the range of the snowfall value (0..1) -->
        <limits min="0.0" max="0.0" />
        <!-- How long does it take to the snowfall to change from one value to other (time in seconds) -->
        <timelimits min="300" max="3600" />
        <!-- How much should the snowfall change (0..1) -->
        <changelimits min="0.0" max="0.0" />
        <!-- What range of the overcast value allows the snowfall to be preset (min, max overcast value, time in seconds it takes for snowfall to stop if the overcast is outside of the specified range) -->
        <thresholds min="1.0" max="1.0" end="120" />
    </snowfall>
    <!-- Lightning density (0..1), threshold for the lightning appearance (tied to the overcast value, 0..1), time (seconds) between the lightning strikes -->
    <storm density="1.0" threshold="0.9" timeout="45"/>
</weather>
`;

export async function tuneWeather(): Promise<void> {
  if (!(await exists(CFG_WEATHER_FILE))) {
    log(`${CFG_WEATHER_FILE} not found yet - skipping weather tuning`);
    return;
  }

  const current = await Deno.readTextFile(CFG_WEATHER_FILE);
  if (current.includes(WEATHER_MARKER)) return;

  await Deno.writeTextFile(CFG_WEATHER_FILE, WEATHER_XML);
  ok(`Enabled and tuned a colder/foggier/windier baseline in ${CFG_WEATHER_FILE}`);
}

// Forces vanilla weather off, unconditionally, every start.
//
// This project used to hand-author a custom colder/foggier/windier
// cfgweather.xml here. That's been replaced by Weather Lighting Control
// (WLC, @WeatherLightingControl - see mods.txt's Environment/atmosphere/
// events section and src/wlcWeather.ts), which manages weather itself via
// its own self-generated $ServerProfile/WLC/weather_config.json. WLC's own
// installation instructions require vanilla weather disabled ("Without
// this step both systems run simultaneously and conflict"), so this file's
// only remaining job is guaranteeing that.
//
// WLC (and therefore this) is active every session regardless of the
// Early Winter roll (see season.ts) - Early Winter is a visual-only reskin
// with no weather logic of its own, so it never conflicts with WLC.
//
// cfgweather.xml ships as part of the mission itself (not mod-generated) -
// re-downloaded/validated by steamcmd on every `install`, same caveat as
// economy.ts - so this is re-applied on every start via a marker comment,
// exactly like economy.ts's food/game scarcity tuning.

import { CFG_WEATHER_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

const WEATHER_MARKER = "<!-- dayz-survival:vanilla-weather-disabled -->";

const WEATHER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
${WEATHER_MARKER}
<!-- 'reset' and 'enable' are a bool, and therefore supports: 0/1, true/false, yes/no -->
<!-- 'reset' controls whether you want to load in the weather from storage or not (false by default) -->
<!-- 'enable' controls whether this file is enabled or not (true by default) -->
<!-- Kept disabled: weather is always managed by Weather Lighting Control
     (see src/wlcWeather.ts). @Early-Winter-Chernarus (src/season.ts) is a
     visual-only reskin with no weather logic of its own, so it never
     conflicts with this. -->
<weather reset="0" enable="0">
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
  ok(
    `Disabled vanilla weather in ${CFG_WEATHER_FILE} (Weather Lighting Control manages it instead)`,
  );
}

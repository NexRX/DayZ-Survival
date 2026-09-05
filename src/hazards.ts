// Turns on the one real danger zone Terje-Radiation ships out of the box.
//
// Terje-Radiation self-generates ScriptableAreasSpawner.xml on first world
// load with exactly one example `TerjeRadioactiveScriptableArea` (a
// radiation zone that contaminates items/vehicles/zombies/animals/players
// within it - see profiles/TerjeSettings/ScriptableAreas/README.md), shipped
// with `Active=0` - so out of the box it does nothing. This turns it on,
// trusting the mod author's own example position/radius/power rather than
// guessing new Chernarus coordinates blindly.
//
// CJ187-RandomMineFields' own RandomMineFields.json ships two real,
// already-populated minefield/claymore-field entries with no separate
// on/off switch in its schema - they're live by default, so nothing to
// change there; this only covers Terje-Radiation's zone.

import { TERJE_SCRIPTABLE_AREAS } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

const RADIOACTIVE_AREA_BLOCK =
  /(<Area>\s*<Active>)(\d)(<\/Active>\s*<Classname>TerjeRadioactiveScriptableArea<\/Classname>)/;

export async function tuneHazardZones(): Promise<void> {
  if (!(await exists(TERJE_SCRIPTABLE_AREAS))) {
    log(
      `${TERJE_SCRIPTABLE_AREAS} not generated yet - Terje-Radiation will create it ` +
        "(with its own disabled example zone) on first server start",
    );
    return;
  }

  const text = await Deno.readTextFile(TERJE_SCRIPTABLE_AREAS);
  const match = RADIOACTIVE_AREA_BLOCK.exec(text);
  if (!match || match[2] === "1") return; // already enabled, or shape changed - don't guess

  const updated = text.replace(RADIOACTIVE_AREA_BLOCK, `$11$3`);
  await Deno.writeTextFile(TERJE_SCRIPTABLE_AREAS, updated);
  ok(`Enabled the default Terje-Radiation danger zone in ${TERJE_SCRIPTABLE_AREAS}`);
}

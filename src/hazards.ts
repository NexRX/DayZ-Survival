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
//
// Also owns a second, hand-placed TerjeRadioactiveScriptableArea at Stary
// Sobor (see ensureStarySoborRadiationZone below) - a real danger zone with
// its own monster garrison/loot reward (starySoborRadiationZone.ts), AI
// guard patrol (ai/AIPatrolSettings.json's "Radiation_Guards_StarySobor"),
// and a toxic gas sub-zone at its core (starySoborToxicZone.ts, reusing
// vanilla's own StaticContaminatedArea event).

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

// Stary Sobor, 6067.79/0/7766.76 - a real hardcore danger zone, not the
// mod's own disabled example above (left untouched). OuterRadius 300 keeps
// the whole hazard tight and localized to the village itself (deliberately
// shrunk down from an earlier, much larger 1200m version - too disruptive
// for a server this size). InnerRadius 50 keeps a small, brutally
// radioactive core right at the village center, so the danger still ramps
// up sharply the closer a player gets (Power lerps linearly from
// OuterRadius down to InnerRadius, per Terje's own scriptable-area docs) -
// Power 4.0 is deliberately harsher than the shipped example's 2.5, near
// the top of the mod's recommended 1-5 range.
const STARY_SOBOR_POSITION = "6067.79 0 7766.76";

const STARY_SOBOR_AREA_BLOCK = `    <Area>
        <Active>1</Active>
        <Classname>TerjeRadioactiveScriptableArea</Classname>
        <Position>${STARY_SOBOR_POSITION}</Position>
        <SpawnChance>1.0</SpawnChance>
        <Data>
            <OuterRadius>300</OuterRadius>
            <InnerRadius>50</InnerRadius>
            <HeightMin>-100</HeightMin>
            <HeightMax>100</HeightMax>
            <Power>4.0</Power>
        </Data>
    </Area>`;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches the whole indented <Area>...</Area> block for this specific
// position, regardless of what radius/power values it currently holds -
// lets this function both add the zone fresh and fix up an already-deployed
// one whose OuterRadius/InnerRadius/Power have since been retuned in code.
// Anchored on the same leading 4-space indent STARY_SOBOR_AREA_BLOCK itself
// uses, so a matched block's text is directly comparable (===) to the
// current template instead of always mismatching by that indent.
const STARY_SOBOR_AREA_BLOCK_PATTERN = new RegExp(
  `[ \\t]*<Area>\\s*<Active>1<\\/Active>\\s*<Classname>TerjeRadioactiveScriptableArea<\\/Classname>\\s*<Position>${
    escapeRegExp(STARY_SOBOR_POSITION)
  }<\\/Position>[\\s\\S]*?<\\/Area>`,
);

export async function ensureStarySoborRadiationZone(): Promise<void> {
  if (!(await exists(TERJE_SCRIPTABLE_AREAS))) {
    log(
      `${TERJE_SCRIPTABLE_AREAS} not generated yet - skipping the Stary Sobor radiation zone`,
    );
    return;
  }

  const text = await Deno.readTextFile(TERJE_SCRIPTABLE_AREAS);
  const existing = STARY_SOBOR_AREA_BLOCK_PATTERN.exec(text);

  if (existing) {
    if (existing[0] === STARY_SOBOR_AREA_BLOCK) return; // already up to date
    const updated = text.replace(STARY_SOBOR_AREA_BLOCK_PATTERN, STARY_SOBOR_AREA_BLOCK);
    await Deno.writeTextFile(TERJE_SCRIPTABLE_AREAS, updated);
    ok(
      `Updated the Stary Sobor radiation danger zone (300m radius, Power 4.0) in ${TERJE_SCRIPTABLE_AREAS}`,
    );
    return;
  }

  const updated = text.replace("</Areas>", `${STARY_SOBOR_AREA_BLOCK}\n</Areas>`);
  await Deno.writeTextFile(TERJE_SCRIPTABLE_AREAS, updated);
  ok(
    `Added the Stary Sobor radiation danger zone (300m radius, Power 4.0) to ${TERJE_SCRIPTABLE_AREAS}`,
  );
}

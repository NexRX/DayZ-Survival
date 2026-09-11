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
// and a toxic gas sub-zone at its core (starySoborToxicZone.ts - NOT
// vanilla's own StaticContaminatedArea event in the end, see that file's
// header comment for why a dedicated event was required instead).
//
// And a third at Skalisty Island's military base (see
// ensureSkalistyMilitaryRadiationZone below), added alongside the
// @Mapping_Skalisty_Military mod - same recipe: monster garrison
// (skalistyMilitaryRadiationZone.ts), AI guard patrol
// ("Radiation_Guards_Skalisty"), and a toxic gas sub-zone
// (skalistyMilitaryToxicZone.ts, sharing StaticContaminatedArea's nominal
// budget with Stary Sobor's own position).

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

// Stary Sobor - a real hardcore danger zone, not the mod's own disabled
// example above (left untouched). OuterRadius 300 keeps the whole hazard
// tight and localized to the village itself (deliberately shrunk down from
// an earlier, much larger 1200m version - too disruptive for a server this
// size). InnerRadius 50 keeps a small, brutally radioactive core right at
// the village center, so the danger still ramps up sharply the closer a
// player gets (Power lerps linearly from OuterRadius down to InnerRadius,
// per Terje's own scriptable-area docs) - Power 4.0 is deliberately harsher
// than the shipped example's 2.5, near the top of the mod's recommended 1-5
// range.
//
// Position Y is deliberately 0, not the village's real ~301m elevation -
// the mod's own ScriptableAreasSpawner.xml header comment documents "If
// parameter Y is zero - the script zone will be automatically set at ground
// level", so this sidesteps ever having to know/maintain the real elevation
// by hand (and matches the pattern the mod's own shipped example area uses
// above). Re-centered from an original 6067.79/0/7766.76 to this real,
// in-game-scouted spot (adjacent unlocked loot rooms in customKeycards.ts's
// SECURED_BUILDINGS were scouted around this same new center).
const STARY_SOBOR_POSITION = "6220.72 0 7762.35";

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

// Matches the whole indented <Area>...</Area> block for THIS zone,
// identified by its OuterRadius/InnerRadius/HeightMin/HeightMax/Power
// signature rather than its Position - deliberately NOT anchored on
// STARY_SOBOR_POSITION, so that changing the Position constant (moving the
// zone's epicenter) still finds and replaces the existing block instead of
// leaving a stale duplicate behind at the old coordinates. The signature
// values themselves (300/50/-100/100/4.0) are unique to this zone vs. the
// mod's own shipped example area (500/400/-100/100/2.5) above, so it can't
// accidentally match that one instead. Anchored on the same leading
// 4-space indent STARY_SOBOR_AREA_BLOCK itself uses, so a matched block's
// text is directly comparable (===) to the current template instead of
// always mismatching by that indent.
const STARY_SOBOR_AREA_BLOCK_PATTERN =
  /[ \t]*<Area>\s*<Active>1<\/Active>\s*<Classname>TerjeRadioactiveScriptableArea<\/Classname>\s*<Position>[^<]*<\/Position>\s*<SpawnChance>[^<]*<\/SpawnChance>\s*<Data>\s*<OuterRadius>300<\/OuterRadius>\s*<InnerRadius>50<\/InnerRadius>\s*<HeightMin>-100<\/HeightMin>\s*<HeightMax>100<\/HeightMax>\s*<Power>4\.0<\/Power>\s*<\/Data>\s*<\/Area>/;

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

// Skalisty Island - the @Mapping_Skalisty_Military base. Epicenter
// originally picked at the mod's own "Skalisty-Centrale-Nucléaire"
// (nuclear power plant) object cluster (see server/@Mapping_Skalisty_
// Military/json/cfgeffectarea.json), then re-centered to a real,
// in-game-scouted spot at 13675.37/3036.81 with a wider 400m OuterRadius -
// now the largest of this project's hand-placed radiation zones, covering
// most of the base rather than just its power-plant corner. That mod's own
// "toxic area" effect at its original position is confirmed broken/does no
// damage (see the mod's Steam discussion thread) - this project's own
// hazard stack (this zone, skalistyMilitaryRadiationZone.ts's garrison,
// skalistyMilitaryToxicZone.ts's gas cloud, and the
// "Radiation_Guards_Skalisty" AI patrol) replaces it instead.
//
// Position Y is 0 for the same reason as Stary Sobor's above (Terje's own
// "zero means ground level" convention).
const SKALISTY_POSITION = "13675.37 0 3036.81";

const SKALISTY_AREA_BLOCK = `    <Area>
        <Active>1</Active>
        <Classname>TerjeRadioactiveScriptableArea</Classname>
        <Position>${SKALISTY_POSITION}</Position>
        <SpawnChance>1.0</SpawnChance>
        <Data>
            <OuterRadius>400</OuterRadius>
            <InnerRadius>40</InnerRadius>
            <HeightMin>-100</HeightMin>
            <HeightMax>100</HeightMax>
            <Power>3.5</Power>
        </Data>
    </Area>`;

// Same reasoning as STARY_SOBOR_AREA_BLOCK_PATTERN above - matched by its
// own unique OuterRadius/InnerRadius/HeightMin/HeightMax/Power signature
// (400/40/-100/100/3.5, distinct from both the mod's shipped example and
// the Stary Sobor zone), not by Position, so re-centering the zone later
// still finds and replaces the existing block.
const SKALISTY_AREA_BLOCK_PATTERN =
  /[ \t]*<Area>\s*<Active>1<\/Active>\s*<Classname>TerjeRadioactiveScriptableArea<\/Classname>\s*<Position>[^<]*<\/Position>\s*<SpawnChance>[^<]*<\/SpawnChance>\s*<Data>\s*<OuterRadius>400<\/OuterRadius>\s*<InnerRadius>40<\/InnerRadius>\s*<HeightMin>-100<\/HeightMin>\s*<HeightMax>100<\/HeightMax>\s*<Power>3\.5<\/Power>\s*<\/Data>\s*<\/Area>/;

export async function ensureSkalistyMilitaryRadiationZone(): Promise<void> {
  if (!(await exists(TERJE_SCRIPTABLE_AREAS))) {
    log(
      `${TERJE_SCRIPTABLE_AREAS} not generated yet - skipping the Skalisty Island radiation zone`,
    );
    return;
  }

  const text = await Deno.readTextFile(TERJE_SCRIPTABLE_AREAS);
  const existing = SKALISTY_AREA_BLOCK_PATTERN.exec(text);

  if (existing) {
    if (existing[0] === SKALISTY_AREA_BLOCK) return; // already up to date
    const updated = text.replace(SKALISTY_AREA_BLOCK_PATTERN, SKALISTY_AREA_BLOCK);
    await Deno.writeTextFile(TERJE_SCRIPTABLE_AREAS, updated);
    ok(
      `Updated the Skalisty Island radiation danger zone (400m radius, Power 3.5) in ${TERJE_SCRIPTABLE_AREAS}`,
    );
    return;
  }

  const updated = text.replace("</Areas>", `${SKALISTY_AREA_BLOCK}\n</Areas>`);
  await Deno.writeTextFile(TERJE_SCRIPTABLE_AREAS, updated);
  ok(
    `Added the Skalisty Island radiation danger zone (400m radius, Power 3.5) to ${TERJE_SCRIPTABLE_AREAS}`,
  );
}

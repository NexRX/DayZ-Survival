// The Stary Sobor danger zone's inner toxic gas pocket.
//
// Two earlier approaches were tried and abandoned here - both confirmed
// dead ends by actually reading the server's own RPT log after a real
// restart, not just by reasoning about the XML:
//
// 1. Tacking a lone <pos> onto vanilla's own shared `StaticContaminatedArea`
//    event without touching its `<nominal>0</nominal>` - inert, since a
//    target of 0 active instances means the central economy never spawns
//    ANY instance of it map-wide, regardless of how many positions are
//    listed.
// 2. A brand new, dedicated `DZSurvival_ToxicZone_StarySobor` event (its own
//    nominal/min/max and exactly one position) mirroring the pattern this
//    same zone's monster garrison/loot reward use successfully
//    (starySoborRadiationZone.ts). This one is impossible, not just
//    untuned: DayZ's central economy sorts every DynamicEvent into one of 8
//    "spawner types" (Vehicle/Static/Loot/Infected/Animal/Ambient/Item/
//    Trajectory), and RPT logs confirm `ContaminatedArea_Dynamic` can only
//    ever resolve as "Static" - a category reserved for a hardcoded
//    whitelist of vanilla event NAMES (StaticHeliCrash/
//    StaticContaminatedArea/StaticMilitaryConvoy/etc.), each with its own
//    extra per-position `<zone smin=.. smax=.. dmin=.. dmax=.. r=../>`
//    metadata in cfgeventspawns.xml that only Static events use. A new
//    custom event name can't opt into that whitelist, and giving
//    `ContaminatedArea_Dynamic` a `<category>` tag in types.xml (the usual
//    fix for a "failed to determine spawner type" error - see
//    RadiationZoneLootStarySobor's own such bug fixed in
//    starySoborRadiationZone.ts) did NOT help here either - confirmed by
//    restarting with that fix in place and seeing the exact same "failed to
//    determine spawner type!" / "setup is invalid, event will be disabled"
//    RPT lines. This object's underlying engine class simply isn't
//    loot/infected/etc.-spawnable; only the native "Static" path can ever
//    instantiate it.
//
// So the only real lever left is the ORIGINAL idea from attempt 1, done
// properly this time: add Stary Sobor as an extra position to vanilla's own
// `StaticContaminatedArea` event AND actually raise its nominal above 0.
// This is a genuine trade-off, disclosed rather than hidden: nominal is a
// MAP-WIDE target (shared across all ~83 vanilla positions plus this one -
// and, since skalistyMilitaryToxicZone.ts, plus a second dedicated
// position at Skalisty Island too), so raising it means occasional toxic
// clouds can now appear at other, unrelated vanilla locations too - there
// is no way within DayZ's central economy to pin a guaranteed, permanent
// cloud to one exact spot for this specific object type. NOMINAL is kept
// deliberately small (6, up from 4 when Skalisty Island's own position was
// added alongside it) to keep spillover rare and the map mostly gas-free
// elsewhere, while still giving both dedicated positions a real, working
// chance of getting a toxic pocket during normal play - a working
// "sometimes" beats a broken "always" that silently never fires at all.
//
// Combined with hazards.ts's TerjeRadioactiveScriptableArea (300m radiation
// radius) at the same coordinates, this gives Stary Sobor's core a second,
// independent hazard layer whenever the cloud does roll in there: radiation
// damage further out, plus a lung/gas mask-and-filter-gated toxic pocket
// right at the center.

import { ECONOMY_EVENTS_FILE, MISSION_EVENT_SPAWNS_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

const STATIC_EVENT_NAME = "StaticContaminatedArea";
const ZONE_X = 6220.72;
const ZONE_Z = 7762.35;

// Small but non-zero - see this file's header comment for why this can't
// be a guaranteed, permanent, Stary-Sobor-only cloud. Vanilla ships this at
// 0 (fully off, map-wide). Raised from 4 to 6 alongside
// skalistyMilitaryToxicZone.ts adding its own second dedicated position.
const NOMINAL = 6;

const NOMINAL_PATTERN = new RegExp(
  `(<event name="${STATIC_EVENT_NAME}">\\s*<nominal>)\\d+(<\\/nominal>)`,
);

// Matches vanilla's own real <pos> formatting exactly (tab x2 indent, no
// "a=" heading attribute, space before the self-close) - see any of the
// ~83 existing entries in cfgeventspawns.xml for this same event.
const POS_LINE = `\t\t<pos x="${ZONE_X}" z="${ZONE_Z}" />`;

// Cleans up the earlier, dead attempt (see header comment #2): the
// dedicated custom event's own entries, under its own now-removed event
// name. Harmless if left behind but confusing - removed if present.
const DEAD_CUSTOM_EVENT_PATTERN =
  / {4}<event name="DZSurvival_ToxicZone_StarySobor">[\s\S]*?<\/event>\n/;

export async function ensureStarySoborToxicZone(): Promise<void> {
  const [eventsFileExists, eventSpawnsFileExists] = await Promise.all([
    exists(ECONOMY_EVENTS_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (!eventsFileExists || !eventSpawnsFileExists) {
    log(
      `${ECONOMY_EVENTS_FILE}/${MISSION_EVENT_SPAWNS_FILE} not found yet - ` +
        "skipping the Stary Sobor toxic zone",
    );
    return;
  }

  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);
  let changed = false;
  const added: string[] = [];

  if (DEAD_CUSTOM_EVENT_PATTERN.test(eventsText)) {
    eventsText = eventsText.replace(DEAD_CUSTOM_EVENT_PATTERN, "");
    changed = true;
    added.push("removed the earlier dead custom toxic zone event");
  }
  if (DEAD_CUSTOM_EVENT_PATTERN.test(eventSpawnsText)) {
    eventSpawnsText = eventSpawnsText.replace(DEAD_CUSTOM_EVENT_PATTERN, "");
    changed = true;
  }

  const nominalMatch = NOMINAL_PATTERN.exec(eventsText);
  if (nominalMatch && nominalMatch[0] !== `${nominalMatch[1]}${NOMINAL}${nominalMatch[2]}`) {
    eventsText = eventsText.replace(NOMINAL_PATTERN, `$1${NOMINAL}$2`);
    changed = true;
    added.push(`raised ${STATIC_EVENT_NAME}'s nominal to ${NOMINAL} (was inert at 0)`);
  }

  const staticEventSpawnPattern = new RegExp(
    `(    <event name="${STATIC_EVENT_NAME}">[\\s\\S]*?)(\\s*<\\/event>)`,
  );
  const existingSpawnBlock = staticEventSpawnPattern.exec(eventSpawnsText);
  if (existingSpawnBlock && !existingSpawnBlock[1].includes(POS_LINE)) {
    eventSpawnsText = eventSpawnsText.replace(
      staticEventSpawnPattern,
      `$1\n${POS_LINE}$2`,
    );
    changed = true;
    added.push(`added Stary Sobor as a ${STATIC_EVENT_NAME} position`);
  }

  if (!changed) return;
  await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);
  ok(`Stary Sobor toxic zone: ${added.join(", ")}`);
}

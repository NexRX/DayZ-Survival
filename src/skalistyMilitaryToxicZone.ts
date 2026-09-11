// Skalisty Island's inner toxic gas pocket - adds a second position to the
// same vanilla `StaticContaminatedArea` event that starySoborToxicZone.ts
// already raised off its inert, shipped-at-0 nominal (see that file's
// header comment for the full story on why this event, specifically, is
// the only real lever: DayZ's central economy can only ever resolve
// ContaminatedArea_Dynamic as the "Static" spawner type, which is reserved
// for a hardcoded whitelist of vanilla event names).
//
// This file only ever adds/moves this ONE position - it deliberately never
// touches <nominal> itself. That's still starySoborToxicZone.ts's job (see
// its own NOMINAL constant, bumped from 4 to 6 to account for this second
// dedicated position sharing the same map-wide budget); having two files
// independently "own" the same XML value would just fight each other on
// every run.
//
// Same genuine trade-off as Stary Sobor's own position: nominal is a
// MAP-WIDE target shared across every registered position (now ~83 vanilla
// + Stary Sobor + this one), so a toxic cloud can occasionally appear
// elsewhere too - there's no way to pin a guaranteed, permanent cloud to
// one exact spot for this object type. Combined with hazards.ts's
// TerjeRadioactiveScriptableArea (400m radiation radius) at the same
// coordinates, this gives Skalisty's base a second, independent hazard
// layer whenever the cloud does roll in there.

import { ECONOMY_EVENTS_FILE, MISSION_EVENT_SPAWNS_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

const STATIC_EVENT_NAME = "StaticContaminatedArea";

const ZONE_X = 13675.37;
const ZONE_Z = 3036.81;

// Matches vanilla's own real <pos> formatting exactly (tab x2 indent, no
// "a=" heading attribute, space before the self-close) - see any of the
// ~83 existing entries in cfgeventspawns.xml for this same event.
const POS_LINE = `\t\t<pos x="${ZONE_X}" z="${ZONE_Z}" />`;

export async function ensureSkalistyMilitaryToxicZone(): Promise<void> {
  const [eventsFileExists, eventSpawnsFileExists] = await Promise.all([
    exists(ECONOMY_EVENTS_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (!eventsFileExists || !eventSpawnsFileExists) {
    log(
      `${ECONOMY_EVENTS_FILE}/${MISSION_EVENT_SPAWNS_FILE} not found yet - ` +
        "skipping the Skalisty Island toxic zone",
    );
    return;
  }

  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);

  const staticEventSpawnPattern = new RegExp(
    `(    <event name="${STATIC_EVENT_NAME}">[\\s\\S]*?)(\\s*<\\/event>)`,
  );
  const existingSpawnBlock = staticEventSpawnPattern.exec(eventSpawnsText);
  if (!existingSpawnBlock || existingSpawnBlock[1].includes(POS_LINE)) return;

  eventSpawnsText = eventSpawnsText.replace(
    staticEventSpawnPattern,
    `$1\n${POS_LINE}$2`,
  );
  await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);
  ok(`Skalisty Island toxic zone: added Skalisty Island as a ${STATIC_EVENT_NAME} position`);
}

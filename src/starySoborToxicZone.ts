// The Stary Sobor danger zone's inner toxic gas pocket.
//
// This is NOT a new mechanic or mod - it reuses vanilla DayZ's own
// StaticContaminatedArea event (already shipped, active, and populated with
// ~200+ positions in db/events.xml/cfgeventspawns.xml - the same event that
// spawns the toxic gas clouds seen around helicopter crash sites). Its
// event definition already lives in db/events.xml:
//
//   <event name="StaticContaminatedArea">
//       <min>2</min><max>4</max><lifetime>2100</lifetime>
//       <distanceradius>120</distanceradius>
//       <position>fixed</position><limit>parent</limit><active>1</active>
//       <children><child .../ type="ContaminatedArea_Dynamic"/></children>
//   </event>
//
// i.e. every position fed to this event gets 2-4 ContaminatedArea_Dynamic
// gas-cloud objects scattered within ~120m of it - almost exactly the
// requested "100m toxic zone", so this only needs one more <pos> entry in
// cfgeventspawns.xml, anchored to the radiation zone's own center. The
// shared 120m distanceradius is deliberately left untouched here - it's
// shared by every StaticContaminatedArea position on the whole map (all the
// vanilla heli-crash toxic zones too), so changing it would affect all of
// those as a side effect.
//
// Combined with hazards.ts's TerjeRadioactiveScriptableArea (300m radiation
// radius) at the same coordinates, this gives Stary Sobor's core a second,
// independent hazard layer: radiation damage further out, plus a lung/gas
// mask-and-filter-gated toxic cloud pocket right at the center.

import { MISSION_EVENT_SPAWNS_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

const EVENT_NAME = "StaticContaminatedArea";
const ZONE_X = 6067.79;
const ZONE_Z = 7766.76;
const POS_LINE = `\t\t<pos x="${ZONE_X}" z="${ZONE_Z}" />`;

export async function ensureStarySoborToxicZone(): Promise<void> {
  if (!(await exists(MISSION_EVENT_SPAWNS_FILE))) {
    log(`${MISSION_EVENT_SPAWNS_FILE} not found yet - skipping the Stary Sobor toxic zone`);
    return;
  }

  const text = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);
  const eventPattern = new RegExp(`<event name="${EVENT_NAME}">[\\s\\S]*?<\\/event>`);
  const match = eventPattern.exec(text);
  if (!match) {
    log(
      `${MISSION_EVENT_SPAWNS_FILE} has no "${EVENT_NAME}" event (unexpected for vanilla) - ` +
        "skipping the Stary Sobor toxic zone",
    );
    return;
  }
  if (match[0].includes(POS_LINE)) return; // already added

  const updatedEvent = match[0].replace("</event>", `${POS_LINE}\n\t</event>`);
  const updated = text.replace(eventPattern, updatedEvent);
  await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, updated);
  ok(
    `Added the Stary Sobor toxic gas pocket (vanilla StaticContaminatedArea, ~120m) ` +
      `to ${MISSION_EVENT_SPAWNS_FILE}`,
  );
}

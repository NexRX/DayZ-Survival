// Stations Yuretskiy-Creatures' 7 tougher zombie variants (already typed by
// yuretskiy.ts) as a fixed "garrison" at each of the 5 confirmed military
// patrol coordinates already used by ai/AIPatrolSettings.json (NWAF, Tisy,
// Balota, Vybor, Green Mountain).
//
// This is on top of, not instead of, Yuretskiy's own ambient
// `InfectedYuretskiy` event (yuretskiy.ts), which is `position=player`
// (spawns anywhere as players roam). This new `InfectedYuretskiyMilitary`
// event is `position=fixed` with a real <pos> list in cfgeventspawns.xml,
// mirroring vanilla's own multi-position/multi-type spawn events.
//
// Same classnames as yuretskiy.ts (never touched here - already registered
// as <type> by that module, which runs first). Purely additive: skipped
// entirely if the event already exists in either file.

import { ECONOMY_EVENTS_FILE, MISSION_EVENT_SPAWNS_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@Yuretskiy-Creatures";
const EVENT_NAME = "InfectedYuretskiyMilitary";

const CLASSNAMES = [
  "YRTSK_ZMB_SWAT",
  "YRTSK_ZMB_Male",
  "YRTSK_ZMB_TShirt",
  "YRTSK_ZMB_Fitness_F",
  "YRTSK_ZMB_Fitness_F_2",
  "YRTSK_ZMB_Fat",
  "YRTSK_ZMB_PartFoot",
];

// Same 5 coordinates as ai/AIPatrolSettings.json's MilitaryPatrols
// (X/Z only - the engine snaps Y to terrain).
const MILITARY_POSITIONS: { name: string; x: number; z: number }[] = [
  { name: "NWAF", x: 4501, z: 10231 },
  { name: "Tisy", x: 1900, z: 14100 },
  { name: "Balota", x: 4800, z: 2400 },
  { name: "Vybor", x: 4400, z: 8850 },
  { name: "GreenMountain", x: 7650, z: 11150 },
];

function eventBlock(): string {
  const children = CLASSNAMES.map((c) =>
    `            <child lootmax="5" lootmin="0" max="5" min="1" type="${c}"/>`
  ).join("\n");
  return `    <event name="${EVENT_NAME}">
        <nominal>15</nominal>
        <min>5</min>
        <max>20</max>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <saferadius>500</saferadius>
        <distanceradius>1000</distanceradius>
        <cleanupradius>1000</cleanupradius>
        <flags deletable="0" init_random="0" remove_damaged="1"/>
        <position>fixed</position>
        <limit>mixed</limit>
        <active>1</active>
        <children>
${children}
        </children>
    </event>`;
}

function eventSpawnsBlock(): string {
  const positions = MILITARY_POSITIONS
    .map((p) => `        <pos x="${p.x}" z="${p.z}" a="0"/>`)
    .join("\n");
  return `    <event name="${EVENT_NAME}">
${positions}
    </event>`;
}

export async function ensureMilitaryMonsterGarrisons(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  const [eventsFileExists, eventSpawnsFileExists] = await Promise.all([
    exists(ECONOMY_EVENTS_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (!eventsFileExists || !eventSpawnsFileExists) {
    log(
      `${ECONOMY_EVENTS_FILE}/${MISSION_EVENT_SPAWNS_FILE} not found yet - ` +
        `skipping ${MOD_NAME} military garrisons`,
    );
    return;
  }

  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);
  let changed = false;

  if (!new RegExp(`<event name="${EVENT_NAME}"`).test(eventsText)) {
    eventsText = eventsText.replace("</events>", `${eventBlock()}\n</events>`);
    changed = true;
  }

  if (!new RegExp(`<event name="${EVENT_NAME}"`).test(eventSpawnsText)) {
    eventSpawnsText = eventSpawnsText.replace(
      "</eventposdef>",
      `${eventSpawnsBlock()}\n</eventposdef>`,
    );
    changed = true;
  }

  if (!changed) return;
  await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);
  ok(
    `Added ${MOD_NAME} military garrison event "${EVENT_NAME}" ` +
      `(${CLASSNAMES.length} classnames at ${MILITARY_POSITIONS.length} military locations)`,
  );
}

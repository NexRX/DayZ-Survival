// Skalisty Island's radiation danger zone monster garrison.
//
// The TerjeRadioactiveScriptableArea itself lives in hazards.ts
// (ensureSkalistyMilitaryRadiationZone) - that's this project's one file
// for Terje-Radiation config. This file owns the garrison - same
// Yuretskiy-Creatures roster/pattern as starySoborRadiationZone.ts's
// InfectedYuretskiyStarySobor event (itself copied from
// militaryMonsters.ts's InfectedYuretskiyMilitary), but its own dedicated
// event/position. Garrison radii were originally scaled down alongside a
// smaller 220m OuterRadius - the zone has since been re-centered and
// widened to 400m (see hazards.ts), but the garrison numbers themselves
// were deliberately left as-is (concentrated tightly around the zone's
// center rather than spread across the full radiation radius, mirroring
// the radiation gradient itself getting worse toward the middle).
//
// No standalone loot-reward DynamicEvent here, for the exact same reason
// starySoborRadiationZone.ts doesn't have one either - confirmed
// impossible (not just untuned) by a real restart + RPT read: DayZ's
// central economy can never resolve a custom event to the "Loot" spawner
// type on this server (see that file's header comment for the full
// writeup). This zone's own reward instead comes from
// @Mapping_Skalisty_Military's own shipped mapgrouppos.xml/
// mapgroupproto.xml loot points inside the new buildings, merged into the
// mission by skalistyMilitaryMapping.ts - real loot spawns, just not a
// central-economy DynamicEvent.
//
// NOT wired here: the AI guard patrol. That's a plain data addition to
// ai/AIPatrolSettings.json's template ("Radiation_Guards_Skalisty") -
// already picked up by ai.ts's ensureAIPatrols() the normal way, needing no
// extra code.

import { ECONOMY_EVENTS_FILE, MISSION_EVENT_SPAWNS_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const YURETSKIY_MOD_NAME = "@Yuretskiy-Creatures";
const MONSTER_EVENT_NAME = "InfectedYuretskiySkalisty";

const ZONE_X = 13675.37;
const ZONE_Z = 3036.81;

// Same roster as starySoborRadiationZone.ts - duplicated rather than
// imported since the two events are conceptually independent one-offs: a
// future change to one zone's garrison shouldn't silently also change the
// other's.
const MONSTER_CLASSNAMES = [
  "YRTSK_ZMB_SWAT",
  "YRTSK_ZMB_Male",
  "YRTSK_ZMB_TShirt",
  "YRTSK_ZMB_Fitness_F",
  "YRTSK_ZMB_Fitness_F_2",
  "YRTSK_ZMB_Fat",
  "YRTSK_ZMB_PartFoot",
];

function monsterEventBlock(): string {
  const children = MONSTER_CLASSNAMES.map((c) =>
    `            <child lootmax="5" lootmin="0" max="6" min="2" type="${c}"/>`
  ).join("\n");
  return `    <event name="${MONSTER_EVENT_NAME}">
        <nominal>8</nominal>
        <min>3</min>
        <max>12</max>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <saferadius>55</saferadius>
        <distanceradius>110</distanceradius>
        <cleanupradius>110</cleanupradius>
        <flags deletable="0" init_random="0" remove_damaged="1"/>
        <position>fixed</position>
        <limit>mixed</limit>
        <active>1</active>
        <children>
${children}
        </children>
    </event>`;
}

function monsterEventSpawnsBlock(): string {
  return `    <event name="${MONSTER_EVENT_NAME}">
        <pos x="${ZONE_X}" z="${ZONE_Z}" a="0"/>
    </event>`;
}

export async function ensureSkalistyMilitaryRadiationGarrison(mods: Mod[]): Promise<void> {
  const [eventsFileExists, eventSpawnsFileExists] = await Promise.all([
    exists(ECONOMY_EVENTS_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (!eventsFileExists || !eventSpawnsFileExists) {
    log(
      `${ECONOMY_EVENTS_FILE}/${MISSION_EVENT_SPAWNS_FILE} not found yet - ` +
        "skipping the Skalisty Island radiation zone garrison",
    );
    return;
  }

  const hasYuretskiy = mods.some((m) => m.name === YURETSKIY_MOD_NAME);
  if (!hasYuretskiy) return;

  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);
  let changed = false;
  const added: string[] = [];

  const monsterEventPattern = new RegExp(
    `    <event name="${MONSTER_EVENT_NAME}">[\\s\\S]*?<\\/event>`,
  );
  const existingMonsterEvent = monsterEventPattern.exec(eventsText);
  if (!existingMonsterEvent) {
    eventsText = eventsText.replace("</events>", `${monsterEventBlock()}\n</events>`);
    eventSpawnsText = eventSpawnsText.replace(
      "</eventposdef>",
      `${monsterEventSpawnsBlock()}\n</eventposdef>`,
    );
    changed = true;
    added.push(`${MONSTER_CLASSNAMES.length}-classname monster garrison`);
  } else {
    if (existingMonsterEvent[0] !== monsterEventBlock()) {
      // Already added, but radii (or other tuning) has since changed in
      // code - keep the live event in sync rather than leaving it stale.
      eventsText = eventsText.replace(monsterEventPattern, monsterEventBlock());
      changed = true;
      added.push("updated monster garrison radii");
    }
    const existingMonsterSpawn = monsterEventPattern.exec(eventSpawnsText);
    if (existingMonsterSpawn && existingMonsterSpawn[0] !== monsterEventSpawnsBlock()) {
      eventSpawnsText = eventSpawnsText.replace(monsterEventPattern, monsterEventSpawnsBlock());
      changed = true;
      added.push("moved monster garrison to the zone's new epicenter");
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);
  ok(`Skalisty Island radiation zone: ${added.join(", ")}`);
}

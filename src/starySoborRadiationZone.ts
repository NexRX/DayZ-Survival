// The Stary Sobor radiation danger zone's monster garrison + loot reward.
//
// The TerjeRadioactiveScriptableArea itself lives in hazards.ts
// (ensureStarySoborRadiationZone) - that's this project's one file for
// Terje-Radiation config. This file owns the two things that make wading
// into that radiation worth it:
//
// 1. A monster garrison - same Yuretskiy-Creatures roster/pattern as
//    militaryMonsters.ts's InfectedYuretskiyMilitary event, but its own
//    dedicated event/position (Stary Sobor isn't one of that event's 5
//    military coordinates, so it gets its own event rather than a 6th
//    position tacked onto a differently-named event).
// 2. A loot reward - a plain fixed-position item event reusing the exact
//    same classnames as the Red/Violet-tier Custom-Keycards rooms
//    (customKeycards.ts's RED_VIOLET_TIER_CLASSNAMES), so the reward is "as
//    good as the best keycard rooms" without needing a real placed door/
//    crate object (which Custom-Keycards' own loot-crate system requires).
//
// Both events are concentrated tightly around the zone's center rather than
// spread across the full radiation radius - the danger and the reward both
// live at the core, mirroring the radiation gradient itself getting worse
// toward the center. The monster garrison's radii are quarter-scaled
// alongside the radiation zone's own OuterRadius (hazards.ts shrunk it from
// 1200m to 300m), so the garrison stays proportional to the now-smaller
// hazard footprint instead of sprawling out past its edge.
//
// NOT wired here: the NBC-suited AI guard patrol. That's a plain data
// addition to ai/AIPatrolSettings.json's template
// ("Radiation_Guards_StarySobor") - already picked up by ai.ts's
// ensureAIPatrols() the normal way, needing no extra code.

import { ECONOMY_EVENTS_FILE, MISSION_EVENT_SPAWNS_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";
import { RED_VIOLET_TIER_CLASSNAMES } from "./customKeycards.ts";

const YURETSKIY_MOD_NAME = "@Yuretskiy-Creatures";
const MONSTER_EVENT_NAME = "InfectedYuretskiyStarySobor";
const LOOT_EVENT_NAME = "RadiationZoneLootStarySobor";

const ZONE_X = 6067.79;
const ZONE_Z = 7766.76;

// Same 7 classnames as militaryMonsters.ts's roster (already typed by
// yuretskiy.ts, which runs first) - duplicated rather than imported since
// the two events are conceptually independent one-offs: a future change to
// the 5-location military garrison shouldn't silently also change this
// zone's garrison, or vice versa.
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
    `            <child lootmax="5" lootmin="0" max="8" min="3" type="${c}"/>`
  ).join("\n");
  return `    <event name="${MONSTER_EVENT_NAME}">
        <nominal>10</nominal>
        <min>4</min>
        <max>15</max>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <saferadius>75</saferadius>
        <distanceradius>150</distanceradius>
        <cleanupradius>150</cleanupradius>
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

function lootEventBlock(): string {
  const children = RED_VIOLET_TIER_CLASSNAMES.map((c) =>
    `            <child lootmax="1" lootmin="0" max="1" min="0" type="${c}"/>`
  ).join("\n");
  return `    <event name="${LOOT_EVENT_NAME}">
        <nominal>8</nominal>
        <min>4</min>
        <max>10</max>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <saferadius>50</saferadius>
        <distanceradius>100</distanceradius>
        <cleanupradius>100</cleanupradius>
        <flags deletable="1" init_random="0" remove_damaged="0"/>
        <position>fixed</position>
        <limit>mixed</limit>
        <active>1</active>
        <children>
${children}
        </children>
    </event>`;
}

function lootEventSpawnsBlock(): string {
  return `    <event name="${LOOT_EVENT_NAME}">
        <pos x="${ZONE_X}" z="${ZONE_Z}" a="0"/>
    </event>`;
}

export async function ensureStarySoborRadiationGarrisonAndLoot(mods: Mod[]): Promise<void> {
  const [eventsFileExists, eventSpawnsFileExists] = await Promise.all([
    exists(ECONOMY_EVENTS_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (!eventsFileExists || !eventSpawnsFileExists) {
    log(
      `${ECONOMY_EVENTS_FILE}/${MISSION_EVENT_SPAWNS_FILE} not found yet - ` +
        "skipping the Stary Sobor radiation zone garrison/loot",
    );
    return;
  }

  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);
  let changed = false;
  const added: string[] = [];

  const hasYuretskiy = mods.some((m) => m.name === YURETSKIY_MOD_NAME);
  const monsterEventPattern = new RegExp(
    `    <event name="${MONSTER_EVENT_NAME}">[\\s\\S]*?<\\/event>`,
  );
  const existingMonsterEvent = monsterEventPattern.exec(eventsText);
  if (hasYuretskiy) {
    if (!existingMonsterEvent) {
      eventsText = eventsText.replace("</events>", `${monsterEventBlock()}\n</events>`);
      eventSpawnsText = eventSpawnsText.replace(
        "</eventposdef>",
        `${monsterEventSpawnsBlock()}\n</eventposdef>`,
      );
      changed = true;
      added.push(`${MONSTER_CLASSNAMES.length}-classname monster garrison`);
    } else if (existingMonsterEvent[0] !== monsterEventBlock()) {
      // Already added, but radii (or other tuning) has since changed in
      // code - keep the live event in sync rather than leaving it stale.
      eventsText = eventsText.replace(monsterEventPattern, monsterEventBlock());
      changed = true;
      added.push("updated monster garrison radii");
    }
  }

  if (!new RegExp(`<event name="${LOOT_EVENT_NAME}"`).test(eventsText)) {
    eventsText = eventsText.replace("</events>", `${lootEventBlock()}\n</events>`);
    eventSpawnsText = eventSpawnsText.replace(
      "</eventposdef>",
      `${lootEventSpawnsBlock()}\n</eventposdef>`,
    );
    changed = true;
    added.push(`${RED_VIOLET_TIER_CLASSNAMES.length}-classname red/violet-tier loot reward`);
  } else {
    const lootEventPattern = new RegExp(
      `    <event name="${LOOT_EVENT_NAME}">[\\s\\S]*?<\\/event>`,
    );
    const existingLootEvent = lootEventPattern.exec(eventsText);
    if (existingLootEvent && existingLootEvent[0] !== lootEventBlock()) {
      // Already added, but the item pool/nominal has since changed in code
      // (e.g. trimming common consumables out of RED_VIOLET_TIER_CLASSNAMES)
      // - keep the live event in sync rather than leaving it stale.
      eventsText = eventsText.replace(lootEventPattern, lootEventBlock());
      changed = true;
      added.push("updated loot reward pool");
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);
  ok(`Stary Sobor radiation zone: ${added.join(", ")}`);
}

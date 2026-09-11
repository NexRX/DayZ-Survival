// The Stary Sobor radiation danger zone's monster garrison.
//
// The TerjeRadioactiveScriptableArea itself lives in hazards.ts
// (ensureStarySoborRadiationZone) - that's this project's one file for
// Terje-Radiation config. This file owns a monster garrison - same
// Yuretskiy-Creatures roster/pattern as militaryMonsters.ts's
// InfectedYuretskiyMilitary event, but its own dedicated event/position
// (Stary Sobor isn't one of that event's 5 military coordinates, so it
// gets its own event rather than a 6th position tacked onto a
// differently-named event). Quarter-scaled radii alongside the radiation
// zone's own OuterRadius (hazards.ts shrunk it from 1200m to 300m), so the
// garrison stays proportional to the now-smaller hazard footprint instead
// of sprawling out past its edge, and concentrated tightly around the
// zone's center rather than spread across the full radiation radius -
// mirroring the radiation gradient itself getting worse toward the middle.
//
// NOT wired here anymore: a dedicated "RadiationZoneLootStarySobor" loot
// reward event was attempted (reusing customKeycards.ts's
// RED_VIOLET_TIER_CLASSNAMES so this zone's reward would be "as good as
// the best keycard rooms") but had to be abandoned - confirmed impossible,
// not just untuned, by actually restarting the server and reading its own
// RPT log. DayZ's central economy sorts every DynamicEvent into one of 8
// "spawner types" (Vehicle/Static/Loot/Infected/Animal/Ambient/Item/
// Trajectory); "Loot" turns out to be just as reserved as "Static" is (see
// hazards.ts/starySoborToxicZone.ts's own writeup on Static) - only the
// single, literal, built-in "Loot" event (vanilla's own generic ground-loot
// economy) ever resolves to that type on this server. This was tested two
// different ways before giving up: once as one event mixing multiple
// types.xml <category> values, and once split into 4 separate
// single-category events (weapons/clothes/containers/tools) - ALL of them,
// including the fully homogeneous ones, failed identically with "failed to
// determine spawner type!" / "setup is invalid, event will be disabled".
// So a custom item-reward DynamicEvent just isn't achievable here.
//
// This zone's "worth wading into the radiation for" reward now comes from
// the 3 real, unlocked (no-keycard) loot crates instead - see
// customKeycards.ts's SECURED_BUILDINGS entries prefixed
// "DZSurvival_StaryZone_*", which use Custom-Keycards' own internal
// crate-loot-filling system (not a central economy DynamicEvent at all,
// so it isn't affected by this same limitation).
//
// NOT wired here: the NBC-suited AI guard patrol. That's a plain data
// addition to ai/AIPatrolSettings.json's template
// ("Radiation_Guards_StarySobor") - already picked up by ai.ts's
// ensureAIPatrols() the normal way, needing no extra code.

import { ECONOMY_EVENTS_FILE, MISSION_EVENT_SPAWNS_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const YURETSKIY_MOD_NAME = "@Yuretskiy-Creatures";
const MONSTER_EVENT_NAME = "InfectedYuretskiyStarySobor";

const ZONE_X = 6220.72;
const ZONE_Z = 7762.35;

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

// Cleans up every earlier, dead loot-reward attempt (see header comment):
// the original combined event, and the later 4 category-split ones. None
// of them ever resolved a spawner type or spawned anything, so removing
// them loses nothing that was ever actually live in-game.
const DEAD_LOOT_EVENT_PATTERN =
  / {4}<event name="RadiationZoneLootStarySobor(?:_\w+)?">[\s\S]*?<\/event>\n/g;

export async function ensureStarySoborRadiationGarrisonAndLoot(mods: Mod[]): Promise<void> {
  const [eventsFileExists, eventSpawnsFileExists] = await Promise.all([
    exists(ECONOMY_EVENTS_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (!eventsFileExists || !eventSpawnsFileExists) {
    log(
      `${ECONOMY_EVENTS_FILE}/${MISSION_EVENT_SPAWNS_FILE} not found yet - ` +
        "skipping the Stary Sobor radiation zone garrison",
    );
    return;
  }

  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);
  let changed = false;
  const added: string[] = [];

  if (DEAD_LOOT_EVENT_PATTERN.test(eventsText)) {
    eventsText = eventsText.replace(DEAD_LOOT_EVENT_PATTERN, "");
    changed = true;
    added.push("removed the earlier dead loot reward event(s) (see this file's header comment)");
  }
  if (DEAD_LOOT_EVENT_PATTERN.test(eventSpawnsText)) {
    eventSpawnsText = eventSpawnsText.replace(DEAD_LOOT_EVENT_PATTERN, "");
    changed = true;
  }

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
    } else {
      if (existingMonsterEvent[0] !== monsterEventBlock()) {
        // Already added, but radii (or other tuning) has since changed in
        // code - keep the live event in sync rather than leaving it stale.
        eventsText = eventsText.replace(monsterEventPattern, monsterEventBlock());
        changed = true;
        added.push("updated monster garrison radii");
      }
      // Position lives in the *spawns* file, tracked separately from the
      // event body above (same shape/indent, so the same pattern matches
      // both) - so a zone re-center (ZONE_X/ZONE_Z changing) still needs
      // its own check even when the body itself is unchanged.
      const existingMonsterSpawn = monsterEventPattern.exec(eventSpawnsText);
      if (existingMonsterSpawn && existingMonsterSpawn[0] !== monsterEventSpawnsBlock()) {
        eventSpawnsText = eventSpawnsText.replace(monsterEventPattern, monsterEventSpawnsBlock());
        changed = true;
        added.push("moved monster garrison to the zone's new epicenter");
      }
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);
  ok(`Stary Sobor radiation zone: ${added.join(", ")}`);
}

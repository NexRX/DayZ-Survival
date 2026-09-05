// Custom Zombies - The Astronaut, The Butcher & The Zombie Bear
// (@Custom-Zombies) adds 3 custom creature models with no shipped
// types.xml, so classnames/base classes below were confirmed via `strings`
// on the mod's own PBO (same treatment as necromutant.ts/bmmChemicalZombie.ts):
//   - TCHCAI_TheAstronaut_Zombie_1 : TCHCAI1_CitizenASkinny_Base -> ZombieMaleBase -> ZombieBase
//   - TCHCAI_TheAstronaut_Zombie_2 : same chain as _1 (a second skin variant)
//   - TCHC_TheButcher_Zombie       : TCHCAI_CitizenASkinny_Base -> ZombieMaleBase -> ZombieBase
//   - TCHC_ZombieBear              : Animal_UrsusArctos -> AnimalBase (an ANIMAL, not Infected)
//
// Gotcha: DayZ's DynamicEvent engine picks its spawner handler purely from
// the event NAME's prefix (Animal/Infected/Ambient/Static/Vehicle/Item/Loot/
// Trajectory). A custom-named bear event fails with "failed to determine
// spawner type", and even a correctly-prefixed new Animal territory fails
// with a missing "Herd<name>" AI template that can only exist in core game
// data. So instead of registering a new territory/event, the bear is wired
// in by reactivating vanilla's own dormant "Bear"/"AnimalBear" pair (which
// ships inert: no <agent>/<spawn> block and nominal=0) - adding the missing
// spawn block and bumping nominal 0->1, capped at 1 as a rare encounter.
// STALE_BEAR_NAMES below are cleanup for two earlier attempts that used the
// broken custom-name approach.

import {
  ECONOMY_EVENTS_FILE,
  ECONOMY_TYPES_FILE,
  MISSION_DIR,
  MISSION_EVENT_SPAWNS_FILE,
} from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const CFG_ENVIRONMENT_FILE = `${MISSION_DIR}/cfgenvironment.xml`;

const MOD_NAME = "@Custom-Zombies";

const ZOMBIE_EVENT_NAME = "InfectedTCHCCustom";
const ZOMBIE_CLASSNAMES = [
  "TCHCAI_TheAstronaut_Zombie_1",
  "TCHCAI_TheAstronaut_Zombie_2",
  "TCHC_TheButcher_Zombie",
];

// Vanilla's own dormant names, reused rather than inventing new ones - see
// this file's header comment ("Round 2").
const BEAR_TERRITORY_NAME = "Bear";
const BEAR_EVENT_NAME = "AnimalBear";
const BEAR_CLASSNAME = "TCHC_ZombieBear";

// Stale names from the two earlier broken attempts - cleaned up below, see
// this file's header comment.
const STALE_BEAR_NAMES = ["TCHCZombieBear", "AnimalTCHCZombieBear"];

// Matches vanilla's own Animal_UrsusArctos/ZmbM_SoldierNormal <type> shape
// (db/types.xml) - no <category> tag, nominal=0 since population is
// entirely event-driven below.
function typeBlock(classname: string): string {
  return `    <type name="${classname}">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`;
}

// Same event shape as bmmChemicalZombie.ts's own InfectedBMMChemical
// (ambient, rare, position=player) - the closest existing precedent in
// this project for "a hostile custom creature that should feel like an
// occasional surprise, not a population to grind". Valid here because all
// 3 children are real ZombieBase-derived Infected, unlike the bear below.
function zombieEventBlock(): string {
  const children = ZOMBIE_CLASSNAMES.map((c) =>
    `            <child lootmax="1" lootmin="0" max="1" min="0" type="${c}"/>`
  ).join("\n");
  return `    <event name="${ZOMBIE_EVENT_NAME}">
        <nominal>2</nominal>
        <min>1</min>
        <max>3</max>
        <lifetime>3</lifetime>
        <restock>0</restock>
        <saferadius>100</saferadius>
        <distanceradius>50</distanceradius>
        <cleanupradius>100</cleanupradius>
        <flags deletable="0" init_random="0" remove_damaged="1"/>
        <position>player</position>
        <limit>custom</limit>
        <active>1</active>
        <children>
${children}
        </children>
    </event>`;
}

const TYPE_NAME = /<type name="([^"]+)">/g;
const EVENT_NAME_RE = /<event name="([^"]+)"/g;
const EVENT_BLOCK_RE = (name: string) =>
  new RegExp(`    <event name="${name}">[\\s\\S]*?</event>\\n?`);
const TERRITORY_BLOCK_RE = (name: string) =>
  new RegExp(`\\t\\t<territory[^>]*\\sname="${name}"[\\s\\S]*?</territory>\\n?`);

export async function ensureCustomZombiesTchcWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  const haveMissionFiles = await Promise.all([
    exists(ECONOMY_TYPES_FILE),
    exists(ECONOMY_EVENTS_FILE),
    exists(CFG_ENVIRONMENT_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (haveMissionFiles.some((v) => !v)) {
    log(`Mission types/events/env/eventspawns files not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let envText = await Deno.readTextFile(CFG_ENVIRONMENT_FILE);
  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);

  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));
  const existingEvents = new Set([...eventsText.matchAll(EVENT_NAME_RE)].map((m) => m[1]));
  const existingEventSpawns = new Set(
    [...eventSpawnsText.matchAll(EVENT_NAME_RE)].map((m) => m[1]),
  );

  let typesChanged = false;
  let eventsChanged = false;
  let envChanged = false;
  let eventSpawnsChanged = false;

  for (const classname of [...ZOMBIE_CLASSNAMES, BEAR_CLASSNAME]) {
    if (existingTypes.has(classname)) continue;
    typesText = typesText.replace("</types>", `${typeBlock(classname)}\n</types>`);
    existingTypes.add(classname);
    typesChanged = true;
  }

  if (!existingEvents.has(ZOMBIE_EVENT_NAME)) {
    eventsText = eventsText.replace("</events>", `${zombieEventBlock()}\n</events>`);
    existingEvents.add(ZOMBIE_EVENT_NAME);
    eventsChanged = true;
  }

  // Clean up any artifacts from the earlier broken naming attempts.
  for (const staleName of STALE_BEAR_NAMES) {
    if (eventsText.includes(`<event name="${staleName}">`)) {
      const match = EVENT_BLOCK_RE(staleName).exec(eventsText);
      if (match) {
        eventsText = eventsText.replace(match[0], "");
        eventsChanged = true;
      }
    }
    if (envText.includes(`name="${staleName}"`)) {
      const match = TERRITORY_BLOCK_RE(staleName).exec(envText);
      if (match) {
        envText = envText.replace(match[0], "");
        envChanged = true;
      }
    }
    if (existingEventSpawns.has(staleName)) {
      eventSpawnsText = eventSpawnsText.replace(`    <event name="${staleName}" />\n`, "");
      existingEventSpawns.delete(staleName);
      eventSpawnsChanged = true;
    }
  }

  // Reactivate vanilla's own dormant "Bear" territory - add the missing
  // <agent>/<spawn> block if it's not there yet (idempotent: if a future
  // change ever adds one first, this leaves it alone).
  const territoryMatch = TERRITORY_BLOCK_RE(BEAR_TERRITORY_NAME).exec(envText);
  if (territoryMatch && !territoryMatch[0].includes(BEAR_CLASSNAME)) {
    const withAgent = territoryMatch[0].replace(
      "</territory>",
      `\t\t\t<agent type="Male" chance="1">\n\t\t\t\t<spawn configName="${BEAR_CLASSNAME}" chance="1" />\n\t\t\t</agent>\n\n\t\t\t<item name="globalCountMax" val="1" />\n\t\t\t<item name="zoneCountMin" val="1" />\n\t\t\t<item name="zoneCountMax" val="1" />\n\t\t\t<item name="playerSpawnRadiusNear" val="100" />\n\t\t\t<item name="playerSpawnRadiusFar" val="300" />\n\t\t</territory>`,
    );
    envText = envText.replace(territoryMatch[0], withAgent);
    envChanged = true;
  }

  // Reactivate vanilla's own dormant "AnimalBear" event - add TCHC_ZombieBear
  // as an additional child (leaving the existing, still-unused
  // Animal_UrsusArctos child untouched) and bump nominal 0->1 so it can
  // actually be placed.
  const eventMatch = EVENT_BLOCK_RE(BEAR_EVENT_NAME).exec(eventsText);
  if (eventMatch && !eventMatch[0].includes(BEAR_CLASSNAME)) {
    const withChild = eventMatch[0]
      .replace("<nominal>0</nominal>", "<nominal>1</nominal>")
      .replace(
        "</children>",
        `            <child lootmax="0" lootmin="0" max="1" min="0" type="${BEAR_CLASSNAME}"/>\n        </children>`,
      );
    eventsText = eventsText.replace(eventMatch[0], withChild);
    eventsChanged = true;
  }

  if (typesChanged) await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  if (eventsChanged) await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  if (envChanged) await Deno.writeTextFile(CFG_ENVIRONMENT_FILE, envText);
  if (eventSpawnsChanged) await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);

  if (typesChanged || eventsChanged || envChanged || eventSpawnsChanged) {
    ok(
      `Wired up ${MOD_NAME} (${ZOMBIE_CLASSNAMES.length} zombie variant(s), ` +
        `1 zombie bear via vanilla's own "${BEAR_TERRITORY_NAME}"/"${BEAR_EVENT_NAME}" pair, event "${ZOMBIE_EVENT_NAME}")`,
    );
  }
}

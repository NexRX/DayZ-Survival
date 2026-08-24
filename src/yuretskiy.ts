// Yuretskiy-Creatures (@Yuretskiy-Creatures) adds 7 tougher zombie variants
// with real classnames confirmed via the mod's own
// server/@Yuretskiy-Creatures/extras/classname.txt: YRTSK_ZMB_SWAT,
// YRTSK_ZMB_Male, YRTSK_ZMB_TShirt, YRTSK_ZMB_Fitness_F,
// YRTSK_ZMB_Fitness_F_2, YRTSK_ZMB_Fat, YRTSK_ZMB_PartFoot.
//
// Unlike Burning-Mutant/Freezing-Mutant, these ARE real CE-spawnable
// creatures out of the box: the mod's extras/config.cpp only *forward
// declares* them (e.g. `class YRTSK_ZMB_SWAT;`, no body) as base classes to
// optionally inherit a custom-HP subclass from - which only works if
// they're already fully defined with scope=2 inside the mod's own compiled
// yrtsk_creatures.pbo. So spawning them at their shipped default stats needs
// nothing but standard types.xml/events.xml wiring, same as every other
// creature mod here (DayZ-Raven/Rat/Horse, MoreCars, etc.).
//
// What's genuinely NOT automatable (left in TODO.md) is *customizing their
// HP*: that requires hand-editing extras/config.cpp and re-packing it into
// your own PBO - a source-edit-and-recompile workflow this project doesn't
// do for any mod. This file only wires up the default-stat classnames.
//
// Folded into one dedicated event (like AmbientRaven/AmbientRat/
// AnimalWildHorse) rather than into an existing InfectedCity/Military event,
// so its rarity is independently tunable without touching vanilla zombie
// balance.

import { ECONOMY_EVENTS_FILE, ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@Yuretskiy-Creatures";
const EVENT_NAME = "InfectedYuretskiy";

const CLASSNAMES = [
  "YRTSK_ZMB_SWAT",
  "YRTSK_ZMB_Male",
  "YRTSK_ZMB_TShirt",
  "YRTSK_ZMB_Fitness_F",
  "YRTSK_ZMB_Fitness_F_2",
  "YRTSK_ZMB_Fat",
  "YRTSK_ZMB_PartFoot",
];

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

function eventBlock(): string {
  const children = CLASSNAMES.map((c) =>
    `            <child lootmax="5" lootmin="0" max="0" min="1" type="${c}"/>`
  ).join("\n");
  return `    <event name="${EVENT_NAME}">
        <nominal>3</nominal>
        <min>1</min>
        <max>6</max>
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

export async function ensureYuretskiyWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE)) || !(await exists(ECONOMY_EVENTS_FILE))) {
    log(`${ECONOMY_TYPES_FILE}/${ECONOMY_EVENTS_FILE} not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));
  const existingEvents = new Set([...eventsText.matchAll(EVENT_NAME_RE)].map((m) => m[1]));

  let typesChanged = false;
  let eventsChanged = false;

  for (const classname of CLASSNAMES) {
    if (existingTypes.has(classname)) continue;
    typesText = typesText.replace("</types>", `${typeBlock(classname)}\n</types>`);
    existingTypes.add(classname);
    typesChanged = true;
  }

  if (!existingEvents.has(EVENT_NAME)) {
    eventsText = eventsText.replace("</events>", `${eventBlock()}\n</events>`);
    existingEvents.add(EVENT_NAME);
    eventsChanged = true;
  }

  if (typesChanged) await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  if (eventsChanged) await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  if (typesChanged || eventsChanged) {
    ok(`Wired up ${MOD_NAME} (${CLASSNAMES.length} classnames, event "${EVENT_NAME}")`);
  }
}

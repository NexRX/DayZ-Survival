// BMM Chemical Zombie (@BMM-Chemical-Zombie) adds one tougher, gas-attack
// zombie variant. Its real classname is confirmed via strings on its own
// server/@BMM-Chemical-Zombie/addons/bmm_chimical_zombie.pbo (CfgVehicles +
// scope tokens both present, confirming it's a real spawnable creature, not
// just a forward declaration): BMM_Chimical_Zombies.
//
// The mod also ships a small extra/types.xml (BMM_ChimicalZombie_Head/Hand/
// Foot - skinning byproducts from looting a downed one) which modTypes.ts
// already auto-merges via MOD_TYPES_SOURCES. The creature classname itself
// is NOT in that file, so it still needs its own types.xml entry + a
// dedicated event to actually spawn in the world, same pattern as
// yuretskiy.ts. BMM_ContaminatedArea_Local (the hazard cloud it leaves
// behind) is script-`CreateObject()`'d directly by the mod itself, not
// CE-registered, and deliberately left alone here.
//
// Folded into its own dedicated event rather than an existing InfectedCity/
// Military event, so its rarity is independently tunable without touching
// vanilla zombie balance. Kept deliberately rarer than Yuretskiy-Creatures
// (nominal 3) since this one leaves a lingering area hazard on death.

import { ECONOMY_EVENTS_FILE, ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@BMM-Chemical-Zombie";
const EVENT_NAME = "InfectedBMMChemical";
const CLASSNAME = "BMM_Chimical_Zombies";

function typeBlock(): string {
  return `    <type name="${CLASSNAME}">
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
  return `    <event name="${EVENT_NAME}">
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
            <child lootmax="1" lootmin="0" max="0" min="1" type="${CLASSNAME}"/>
        </children>
    </event>`;
}

const TYPE_NAME = /<type name="([^"]+)">/g;
const EVENT_NAME_RE = /<event name="([^"]+)"/g;

export async function ensureBmmChemicalZombieWired(mods: Mod[]): Promise<void> {
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

  if (!existingTypes.has(CLASSNAME)) {
    typesText = typesText.replace("</types>", `${typeBlock()}\n</types>`);
    typesChanged = true;
  }

  if (!existingEvents.has(EVENT_NAME)) {
    eventsText = eventsText.replace("</events>", `${eventBlock()}\n</events>`);
    eventsChanged = true;
  }

  if (typesChanged) await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  if (eventsChanged) await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  if (typesChanged || eventsChanged) {
    ok(`Wired up ${MOD_NAME} (${CLASSNAME}, event "${EVENT_NAME}")`);
  }
}

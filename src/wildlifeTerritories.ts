// Wires up wildlife mods (Raven, Rat, Horse, Dog) by performing the manual
// setup steps each mod's readme normally asks an admin to do:
//   1. Copy the mod's per-map territory file into the mission's env/ folder.
//   2. Register that file + a <territory> block in cfgenvironment.xml.
//   3. Add an <event> block to db/events.xml.
//   4. Add the matching <type> blocks to db/types.xml.
//   5. "Herd"-type territories (Horse, Dog) also need a self-closing
//      <event name="..." /> stub in cfgeventspawns.xml; "Ambient" territories
//      (Raven, Rat) do not.
//
// All edits are additive only - existing entries are never touched or
// duplicated.

import {
  ECONOMY_EVENTS_FILE,
  ECONOMY_TYPES_FILE,
  MISSION_DIR,
  MISSION_EVENT_SPAWNS_FILE,
  SERVER_DIR,
} from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const CFG_ENVIRONMENT_FILE = `${MISSION_DIR}/cfgenvironment.xml`;

interface WildlifeTerritory {
  modName: string;
  sourceFile: string;
  envFileName: string;
  territoryBlock: string;
  eventBlock: string;
  typeBlocks: string[];
  eventSpawnsBlock?: string;
}

const TERRITORIES: WildlifeTerritory[] = [
  {
    modName: "@DayZ-Raven",
    sourceFile: "raven_territories/chernarus/raven_territories.xml",
    envFileName: "raven_territories.xml",
    territoryBlock: `\t\t<!-- RAVEN -->
\t\t<territory type="Ambient" name="AmbientRaven" behavior="DZRavenGroupBeh">
\t\t\t<file usable="raven_territories" />
\t\t\t<agent type="Male" chance="1">
\t\t\t\t<spawn configName="Animal_Raven_Airborne" chance="1" />
\t\t\t</agent>
\t\t\t<agent type="Female" chance="3">
\t\t\t\t<spawn configName="Animal_Raven" chance="10" />
\t\t\t\t<spawn configName="Animal_Raven2" chance="10" />
\t\t\t</agent>

\t\t\t<item name="globalCountMax" val="50" />
\t\t\t<item name="zoneCountMin" val="1" />
\t\t\t<item name="zoneCountMax" val="1" />
\t\t\t<item name="playerSpawnRadiusNear" val="25" />
\t\t\t<item name="playerSpawnRadiusFar" val="75" />
\t\t</territory>`,
    eventBlock: `    <event name="AmbientRaven">
        <nominal>3</nominal>
        <min>0</min>
        <max>50</max>
        <lifetime>33</lifetime>
        <restock>15</restock>
        <saferadius>40</saferadius>
        <distanceradius>0</distanceradius>
        <cleanupradius>0</cleanupradius>
        <flags deletable="0" init_random="0" remove_damaged="0"/>
        <position>fixed</position>
        <limit>mixed</limit>
        <active>1</active>
        <children>
            <child lootmax="0" lootmin="0" max="2" min="1" type="Animal_Raven"/>
            <child lootmax="0" lootmin="0" max="4" min="1" type="Animal_Raven2"/>
            <child lootmax="0" lootmin="0" max="2" min="1" type="Animal_Raven_Airborne"/>
        </children>
    </event>`,
    typeBlocks: [
      `    <type name="Animal_Raven">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`,
      `    <type name="Animal_Raven2">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`,
      `    <type name="Animal_Raven_Airborne">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`,
    ],
  },
  {
    modName: "@DayZ-Rat",
    sourceFile: "rat_territories/chernarus/rat_territories.xml",
    envFileName: "rat_territories.xml",
    territoryBlock: `\t\t<!-- RAT -->
\t\t<territory type="Ambient" name="AmbientRat" behavior="DZRatGroupBeh">
\t\t\t<file usable="rat_territories" />
\t\t\t<agent type="Male" chance="1">
\t\t\t\t<spawn configName="Animal_Rat_Grey" chance="1" />
\t\t\t</agent>
\t\t\t<agent type="Female" chance="3">
\t\t\t\t<spawn configName="Animal_Rat_White" chance="10" />
\t\t\t</agent>

\t\t\t<item name="globalCountMax" val="50" />
\t\t\t<item name="zoneCountMin" val="1" />
\t\t\t<item name="zoneCountMax" val="1" />
\t\t\t<item name="playerSpawnRadiusNear" val="25" />
\t\t\t<item name="playerSpawnRadiusFar" val="75" />
\t\t</territory>`,
    eventBlock: `    <event name="AmbientRat">
        <nominal>3</nominal>
        <min>0</min>
        <max>50</max>
        <lifetime>33</lifetime>
        <restock>15</restock>
        <saferadius>40</saferadius>
        <distanceradius>0</distanceradius>
        <cleanupradius>0</cleanupradius>
        <flags deletable="0" init_random="0" remove_damaged="0"/>
        <position>fixed</position>
        <limit>mixed</limit>
        <active>1</active>
        <children>
            <child lootmax="0" lootmin="0" max="2" min="1" type="Animal_Rat_Grey"/>
            <child lootmax="0" lootmin="0" max="4" min="1" type="Animal_Rat_White"/>
        </children>
    </event>`,
    typeBlocks: [
      `    <type name="Animal_Rat_Grey">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`,
      `    <type name="Animal_Rat_White">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`,
      `    <type name="SkinnedRat">
        <nominal>0</nominal>
        <lifetime>14400</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="1" deloot="0"/>
        <category name="food"/>
    </type>`,
      `    <type name="DeadRat_Grey">
        <nominal>0</nominal>
        <lifetime>14400</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="1" deloot="0"/>
        <category name="food"/>
    </type>`,
      `    <type name="DeadRat_White">
        <nominal>0</nominal>
        <lifetime>14400</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="1" deloot="0"/>
        <category name="food"/>
    </type>`,
    ],
  },
  {
    modName: "@DayZ-Horse",
    sourceFile: "horse_territories/horses_chernarus.xml",
    envFileName: "wild_horse_territories.xml",
    territoryBlock: `\t\t<!-- HORSE -->
\t\t<territory type="Herd" name="WildHorse" behavior="DZDeerGroupBeh">
\t\t\t<file usable="wild_horse_territories" />
\t\t</territory>`,
    eventBlock: `    <event name="AnimalWildHorse">
        <nominal>8</nominal>
        <min>1</min>
        <max>4</max>
        <lifetime>180</lifetime>
        <restock>0</restock>
        <saferadius>200</saferadius>
        <distanceradius>0</distanceradius>
        <cleanupradius>0</cleanupradius>
        <flags deletable="0" init_random="0" remove_damaged="1"/>
        <position>fixed</position>
        <limit>child</limit>
        <active>1</active>
        <children>
            <child lootmax="0" lootmin="0" max="1" min="1" type="Animal_Horse_Brown"/>
            <child lootmax="0" lootmin="0" max="1" min="1" type="Animal_Horse_White"/>
            <child lootmax="0" lootmin="0" max="1" min="1" type="Animal_Horse_Gray"/>
            <child lootmax="0" lootmin="0" max="1" min="1" type="Animal_Horse_Gray2"/>
            <child lootmax="0" lootmin="0" max="1" min="1" type="Animal_Horse_Palomino"/>
        </children>
    </event>`,
    typeBlocks: [
      "Brown",
      "White",
      "Gray",
      "Gray2",
      "Palomino",
    ].map((variant) =>
      `    <type name="Animal_Horse_${variant}">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`
    ),
    eventSpawnsBlock: `    <event name="AnimalWildHorse" />`,
  },
  {
    modName: "@DayZ-Dog",
    sourceFile: "dog_territories/dog_territories_cherno.xml",
    envFileName: "dog_territories.xml",
    territoryBlock: `\t\t<!-- DOG -->
\t\t<territory type="Herd" name="WildDog" behavior="DZWolfGroupBeh">
\t\t\t<file usable="dog_territories" />
\t\t</territory>`,
    eventBlock: `    <event name="AnimalWildDog">
        <nominal>6</nominal>
        <min>1</min>
        <max>5</max>
        <lifetime>180</lifetime>
        <restock>0</restock>
        <saferadius>350</saferadius>
        <distanceradius>0</distanceradius>
        <cleanupradius>0</cleanupradius>
        <flags deletable="0" init_random="0" remove_damaged="0"/>
        <position>fixed</position>
        <limit>mixed</limit>
        <active>1</active>
        <children>
${
      Array.from(
        { length: 35 },
        (_, i) =>
          `            <child lootmax="0" lootmin="0" max="1" min="0" type="Doggo_Wild${i + 1}"/>`,
      ).join("\n")
    }
        </children>
    </event>`,
    typeBlocks: Array.from(
      { length: 35 },
      (_, i) =>
        `    <type name="Doggo_Wild${i + 1}">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`,
    ),
    eventSpawnsBlock: `    <event name="AnimalWildDog" />`,
  },
];

const TYPE_NAME = /<type name="([^"]+)">/g;
const EVENT_NAME = /<event name="([^"]+)"/g;
const TERRITORY_NAME = /<territory[^>]*\sname="([^"]+)"/g;

export async function ensureWildlifeTerritories(mods: Mod[]): Promise<void> {
  const haveMissionFiles = await Promise.all([
    exists(CFG_ENVIRONMENT_FILE),
    exists(ECONOMY_EVENTS_FILE),
    exists(ECONOMY_TYPES_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (haveMissionFiles.some((v) => !v)) {
    log("Mission env/events/types files not found yet - skipping wildlife territory setup");
    return;
  }

  let envText = await Deno.readTextFile(CFG_ENVIRONMENT_FILE);
  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);

  const existingTerritories = new Set(
    [...envText.matchAll(TERRITORY_NAME)].map((m) => m[1]),
  );
  const existingEvents = new Set([...eventsText.matchAll(EVENT_NAME)].map((m) => m[1]));
  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));
  const existingEventSpawns = new Set(
    [...eventSpawnsText.matchAll(EVENT_NAME)].map((m) => m[1]),
  );

  let envChanged = false;
  let eventsChanged = false;
  let typesChanged = false;
  let eventSpawnsChanged = false;

  for (const mod of mods) {
    const t = TERRITORIES.find((x) => x.modName === mod.name);
    if (!t) continue;

    const modDir = `${SERVER_DIR}/${mod.name}`;
    const srcPath = `${modDir}/${t.sourceFile}`;
    if (!(await exists(srcPath))) continue; // not installed yet

    let didSomething = false;

    // 1. Copy the territory file into the mission's env/ folder.
    const destPath = `${MISSION_DIR}/env/${t.envFileName}`;
    if (!(await exists(destPath))) {
      await Deno.mkdir(`${MISSION_DIR}/env`, { recursive: true });
      await Deno.copyFile(srcPath, destPath);
      didSomething = true;
    }

    // 2. Register the file + territory block in cfgenvironment.xml. Both
    // are appended together right before </territories> - sibling <file>/
    // <territory> elements aren't order-sensitive (territories reference
    // their file by the usable="..." name, not by position).
    const fileLine = `\t\t<file path="env/${t.envFileName}" />`;
    const territoryName = /name="(\w+)"/.exec(t.territoryBlock)?.[1] ?? "";
    const needsFileLine = !envText.includes(`path="env/${t.envFileName}"`);
    const needsTerritory = territoryName && !existingTerritories.has(territoryName);
    if (needsFileLine || needsTerritory) {
      const insertion = [
        ...(needsFileLine ? [fileLine] : []),
        ...(needsTerritory ? [t.territoryBlock] : []),
      ].join("\n");
      envText = envText.replace("\t</territories>", `${insertion}\n\n\t</territories>`);
      if (territoryName) existingTerritories.add(territoryName);
      envChanged = true;
    }

    // 3. Add the <event> block to db/events.xml.
    const eventName = /name="([^"]+)"/.exec(t.eventBlock)?.[1] ?? "";
    if (eventName && !existingEvents.has(eventName)) {
      eventsText = eventsText.replace("</events>", `${t.eventBlock}\n</events>`);
      existingEvents.add(eventName);
      eventsChanged = true;
    }

    // 4. Add the <type> blocks to db/types.xml.
    for (const block of t.typeBlocks) {
      const name = /<type name="([^"]+)">/.exec(block)?.[1] ?? "";
      if (!name || existingTypes.has(name)) continue;
      typesText = typesText.replace("</types>", `${block}\n</types>`);
      existingTypes.add(name);
      typesChanged = true;
      didSomething = true;
    }

    // 5. "Herd"-type territories also need a matching self-closing stub in
    // cfgeventspawns.xml (see the file header above for why).
    if (t.eventSpawnsBlock) {
      const spawnName = /name="([^"]+)"/.exec(t.eventSpawnsBlock)?.[1] ?? "";
      if (spawnName && !existingEventSpawns.has(spawnName)) {
        eventSpawnsText = eventSpawnsText.replace(
          "</eventposdef>",
          `${t.eventSpawnsBlock}\n</eventposdef>`,
        );
        existingEventSpawns.add(spawnName);
        eventSpawnsChanged = true;
        didSomething = true;
      }
    }

    if (didSomething) ok(`Wired up ${mod.name} territory/loot entries`);
  }

  if (envChanged) await Deno.writeTextFile(CFG_ENVIRONMENT_FILE, envText);
  if (eventsChanged) await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  if (typesChanged) await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  if (eventSpawnsChanged) {
    await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);
  }
}

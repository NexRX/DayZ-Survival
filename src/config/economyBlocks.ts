// Reads economy block overrides from overrides_server/mpmissions/db/economy_blocks.json
// and applies them to the mission's db/types.xml, db/events.xml,
// cfgeventspawns.xml, cfgenvironment.xml, mapgroupproto.xml, mapgrouppos.xml
// and cfggameplay.json files.
//
// Block types (XML files):
// - "append" (default): appends block before closing tag (types.xml, events.xml)
// - "replace_nominal": replaces <nominal>\d+</nominal> with <nominal>N</nominal>
//   within the named event block (events.xml)
// - "insert_pos": inserts a position line into an existing event in cfgeventspawns.xml
// - "modify_tag": inserts content before a specified closing tag in a named territory (cfgenvironment.xml)
// - "append_file": appends a <file> line and copies territory file from mod dir (cfgenvironment.xml)
//
// Blocks are keyed by mod name - only blocks for installed mods are written,
// and each block is guarded by a marker comment so it won't be duplicated.
//
// JSON config files (cfggameplay.json):
// - Object spawner JSON files in overrides_server/mpmissions/custom/ are
//   copied to the mission's custom/ dir and their paths merged into
//   WorldsData.objectSpawnersArr.

import {
  CFG_ENVIRONMENT_FILE,
  CFG_GAMEPLAY_FILE,
  ECONOMY_EVENTS_FILE,
  ECONOMY_TYPES_FILE,
  MISSION_DIR,
  MISSION_EVENT_SPAWNS_FILE,
  MISSION_MAPGROUPPOS_FILE,
  MISSION_MAPGROUPPROTO_FILE,
  ROOT,
  SERVER_DIR,
} from "../constants/paths.ts";
import { log, ok } from "../ui.ts";
import { exists } from "jsr:@std/fs@1.0.24";
import type { Mod } from "../server/server.ts";

// ─── Entry type detection ───────────────────────────────────────────────────

interface AppendBlock {
  marker: string;
  block: string;
  action?: "append";
}

interface ReplaceNominalEntry {
  marker: string;
  block: string; // replacement text e.g. "<nominal>6</nominal>"
  action: "replace_nominal";
  target_nominal: number;
}

interface InsertPosEntry {
  marker: string;
  block: string; // position line to insert
  action: "insert_pos";
}

interface AppendChildEntry {
  marker: string;
  block: string; // child line(s) to append (e.g. "<child .../>")
  action: "append_child";
}

type EventXmlEntry = AppendBlock | ReplaceNominalEntry | AppendChildEntry;
type CfgSpawnEntry = AppendBlock | InsertPosEntry;

// ─── cfgenvironment.xml ─────────────────────────────────────────────────────

// Appends content inside an existing territory (before target_tag)
interface ModifyTagEntry {
  marker: string;
  block: string; // content to insert before closing tag
  target_tag: string; // tag to insert before (e.g. "</territory>")
  action: "modify_tag";
}

// Appends a new territory block before </territories>
interface AppendTerritoryEntry {
  marker: string;
  block: string; // full <territory>...</territory> block
  action: "append";
}

// Appends a <file path="..." /> line; also copies territory file from mod dir
interface AppendFileEntry {
  marker: string;
  block: string; // <file path="env/..." />
  source_file?: string; // path within mod dir to copy territory file from
  action: "append_file";
}

type EnvironmentEntry = ModifyTagEntry | AppendTerritoryEntry | AppendFileEntry;

// ─── mapgroupproto.xml / mapgrouppos.xml ────────────────────────────────────

interface MapGroupProtoEntry {
  marker: string;
  block: string; // <group>...</group> block
  action: "append";
}

interface MapGroupPosEntry {
  marker: string;
  block: string; // self-closing <group name=... pos=... rpy=... a=... />
  action: "append";
}

// ─── Top-level structure ────────────────────────────────────────────────────

interface EconomyBlocksData {
  version: number;
  "types.xml": {
    [modName: string]: { [id: string]: AppendBlock };
  };
  "events.xml"?: {
    [modName: string]: { [eventId: string]: EventXmlEntry };
  };
  "cfgeventspawns.xml"?: {
    [modName: string]: { [eventId: string]: CfgSpawnEntry };
  };
  "cfgenvironment.xml"?: {
    [modName: string]: { [id: string]: EnvironmentEntry };
  };
  "mapgroupproto.xml"?: {
    [modName: string]: { [id: string]: MapGroupProtoEntry };
  };
  "mapgrouppos.xml"?: {
    [modName: string]: { [id: string]: MapGroupPosEntry };
  };
}

const BLOCKS_FILE = `${ROOT}/overrides_server/mpmissions/db/economy_blocks.json`;

export async function ensureEconomyBlocks(mods: Mod[]): Promise<void> {
  const installedModNames = new Set(mods.map(([_, name]) => name));

  if (
    !(await exists(ECONOMY_TYPES_FILE)) &&
    !(await exists(ECONOMY_EVENTS_FILE)) &&
    !(await exists(MISSION_EVENT_SPAWNS_FILE)) &&
    !(await exists(MISSION_MAPGROUPPROTO_FILE)) &&
    !(await exists(MISSION_MAPGROUPPOS_FILE))
  ) {
    log("Economy files not found yet - skipping economy blocks setup");
    return;
  }

  let text: string;
  try {
    text = await Deno.readTextFile(BLOCKS_FILE);
  } catch {
    log(`Economy blocks file not found at ${BLOCKS_FILE} - skipping`);
    return;
  }

  const data: EconomyBlocksData = JSON.parse(text);

  // Handle types.xml (append before </types>)
  if (data["types.xml"] && await exists(ECONOMY_TYPES_FILE)) {
    await handleTypesXml(data["types.xml"], installedModNames);
  }

  // Handle events.xml (append before </events>, replace nominal, etc.)
  if (data["events.xml"] && await exists(ECONOMY_EVENTS_FILE)) {
    await handleEventsXml(data["events.xml"], installedModNames);
  }

  // Handle cfgeventspawns.xml (append new events, insert positions)
  if (data["cfgeventspawns.xml"] && await exists(MISSION_EVENT_SPAWNS_FILE)) {
    await handleCfgeventspawns(data["cfgeventspawns.xml"], installedModNames);
  }

  // Handle cfgenvironment.xml (modify territory blocks)
  if (data["cfgenvironment.xml"] && await exists(CFG_ENVIRONMENT_FILE)) {
    await handleCfgenenvironment(data["cfgenvironment.xml"], installedModNames);
  }

  // Handle mapgroupproto.xml (append <group> blocks before </prototype>)
  if (data["mapgroupproto.xml"] && await exists(MISSION_MAPGROUPPROTO_FILE)) {
    await handleMapGroupProto(data["mapgroupproto.xml"], installedModNames);
  }

  // Handle mapgrouppos.xml (append <group> lines before </map>)
  if (data["mapgrouppos.xml"] && await exists(MISSION_MAPGROUPPOS_FILE)) {
    await handleMapGroupPos(data["mapgrouppos.xml"], installedModNames);
  }

  // Handle cfggameplay.json (copy JSON spawner files + update objectSpawnersArr)
  await handleJsonConfig();
}

// ─── types.xml ──────────────────────────────────────────────────────────────

async function handleTypesXml(
  modMap: { [modName: string]: { [id: string]: AppendBlock } },
  installedModNames: Set<string>,
): Promise<void> {
  let fileText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  let changed = false;
  let toAppend = "";

  for (const [modName, blocks] of Object.entries(modMap)) {
    if (!installedModNames.has(modName)) continue;
    for (const [_id, entry] of Object.entries(blocks)) {
      if (fileText.includes(entry.marker)) continue;
      toAppend += entry.block + "\n" + entry.marker + "\n";
      changed = true;
    }
  }

  if (changed) {
    fileText = fileText.replace("</types>", toAppend + "</types>");
    await Deno.writeTextFile(ECONOMY_TYPES_FILE, fileText);
    const modList = Object.entries(modMap)
      .filter(([modName]) => installedModNames.has(modName))
      .map(([modName]) => modName)
      .join(", ");
    ok(`Applied types.xml blocks for: ${modList}`);
  }
}

// ─── events.xml ─────────────────────────────────────────────────────────────

function isReplaceNominal(e: EventXmlEntry): e is ReplaceNominalEntry {
  return e.action === "replace_nominal";
}

function isAppendChild(e: EventXmlEntry): e is AppendChildEntry {
  return e.action === "append_child";
}

async function handleEventsXml(
  modMap: { [modName: string]: { [eventId: string]: EventXmlEntry } },
  installedModNames: Set<string>,
): Promise<void> {
  let fileText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let changed = false;
  let toAppend = "";

  for (const [modName, events] of Object.entries(modMap)) {
    if (!installedModNames.has(modName)) continue;

    for (const [eventId, entry] of Object.entries(events)) {
      if (isReplaceNominal(entry)) {
        // Replace nominal in the named event
        if (fileText.includes(entry.marker)) continue;
        const pattern = new RegExp(
          `(    <event name="${eventId}">[\\s\\S]*?<nominal>)\\d+(</nominal>)`,
        );
        const replacement = `$1${entry.target_nominal}$2`;
        if (pattern.test(fileText)) {
          fileText = fileText.replace(pattern, replacement);
          toAppend += entry.marker + "\n";
          changed = true;
        }
      } else if (isAppendChild(entry)) {
        // Append child line(s) to an existing event's <children> block
        if (fileText.includes(entry.marker)) continue;
        const childPattern = new RegExp(
          `(    <event name="${eventId}">[\\s\\S]*?)\\s*<\\/children>`,
        );
        const match = childPattern.exec(fileText);
        if (match) {
          fileText = fileText.replace(
            childPattern,
            `${match[1]}\n            ${entry.block.trim()}\n        </children>`,
          );
          toAppend += entry.marker + "\n";
          changed = true;
        }
      } else {
        // Append block (default action or explicit "append")
        if (fileText.includes(entry.marker)) continue;
        toAppend += entry.block + "\n" + entry.marker + "\n";
        changed = true;
      }
    }
  }

  if (changed) {
    fileText = fileText.replace("</events>", toAppend + "</events>");
    await Deno.writeTextFile(ECONOMY_EVENTS_FILE, fileText);
    const modList = Object.entries(modMap)
      .filter(([modName]) => installedModNames.has(modName))
      .map(([modName]) => modName)
      .join(", ");
    ok(`Applied events.xml blocks for: ${modList}`);
  }
}

// ─── cfgeventspawns.xml ─────────────────────────────────────────────────────

function isInsertPos(e: CfgSpawnEntry): e is InsertPosEntry {
  return e.action === "insert_pos";
}

async function handleCfgeventspawns(
  modMap: { [modName: string]: { [eventId: string]: CfgSpawnEntry } },
  installedModNames: Set<string>,
): Promise<void> {
  let fileText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);
  let changed = false;
  let newEventsToAppend = "";
  const positionsToInsert: { marker: string; eventId: string; posLine: string }[] = [];

  for (const [modName, events] of Object.entries(modMap)) {
    if (!installedModNames.has(modName)) continue;

    for (const [eventId, entry] of Object.entries(events)) {
      if (fileText.includes(entry.marker)) continue;

      if (isInsertPos(entry)) {
        // Insert position into existing event
        positionsToInsert.push({
          marker: entry.marker,
          eventId,
          posLine: entry.block.trim(),
        });
        changed = true;
      } else {
        // Append new event block
        newEventsToAppend += entry.block + "\n" + entry.marker + "\n";
        changed = true;
      }
    }
  }

  // Append new event blocks before </eventposdef>
  if (newEventsToAppend) {
    fileText = fileText.replace(
      "</eventposdef>",
      newEventsToAppend + "</eventposdef>",
    );
  }

  // Insert position lines into existing events
  for (const { marker, eventId, posLine } of positionsToInsert) {
    const eventPattern = new RegExp(
      `(    <event name="${eventId}">[\\s\\S]*?)(\\s*<\\/event>)`,
    );
    const existingSpawnBlock = eventPattern.exec(fileText);
    if (existingSpawnBlock && !existingSpawnBlock[1].includes(posLine)) {
      fileText = fileText.replace(
        eventPattern,
        `$1\n${posLine}\n${marker}$2`,
      );
    }
  }

  if (changed) {
    await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, fileText);
    const modList = Object.entries(modMap)
      .filter(([modName]) => installedModNames.has(modName))
      .map(([modName]) => modName)
      .join(", ");
    ok(`Applied cfgeventspawns.xml blocks for: ${modList}`);
  }
}

// ─── cfgenvironment.xml ─────────────────────────────────────────────────────

function isModifyTag(e: EnvironmentEntry): e is ModifyTagEntry {
  return e.action === "modify_tag";
}

function isAppendFile(e: EnvironmentEntry): e is AppendFileEntry {
  return e.action === "append_file";
}

async function handleCfgenenvironment(
  modMap: { [modName: string]: { [id: string]: EnvironmentEntry } },
  installedModNames: Set<string>,
): Promise<void> {
  let fileText = await Deno.readTextFile(CFG_ENVIRONMENT_FILE);
  let changed = false;

  // Collect modifications by category (track modName for file copying)
  const modifyTags: { modName: string; id: string; entry: ModifyTagEntry }[] = [];
  const appendTerritories: { id: string; entry: AppendTerritoryEntry }[] = [];
  const appendFiles: { modName: string; id: string; entry: AppendFileEntry }[] = [];

  for (const [modName, entries] of Object.entries(modMap)) {
    if (!installedModNames.has(modName)) continue;

    for (const [id, entry] of Object.entries(entries)) {
      if (fileText.includes(entry.marker)) continue;

      if (isModifyTag(entry)) {
        modifyTags.push({ modName, id, entry });
      } else if (isAppendFile(entry)) {
        appendFiles.push({ modName, id, entry });
      } else {
        // append (territory block)
        appendTerritories.push({ id, entry });
      }
      changed = true;
    }
  }

  // 1. Copy territory files from mod dirs and append <file> lines
  let filesToAppend = "";
  for (const { modName, entry } of appendFiles) {
    const sourceFile = entry.source_file;
    if (sourceFile) {
      const modDir = `${SERVER_DIR}/${modName}`;
      const srcPath = `${modDir}/${sourceFile}`;
      const dstName = sourceFile.split("/").pop() ?? sourceFile;
      const dstPath = `${MISSION_DIR}/env/${dstName}`;
      if (await exists(srcPath)) {
        await Deno.mkdir(`${MISSION_DIR}/env`, { recursive: true });
        if (!(await exists(dstPath))) {
          await Deno.copyFile(srcPath, dstPath);
        }
      }
    }
    filesToAppend += entry.block + "\n" + entry.marker + "\n";
  }

  // 2. Append territory blocks
  let territoriesToAppend = "";
  for (const { entry } of appendTerritories) {
    territoriesToAppend += entry.block + "\n" + entry.marker + "\n";
  }

  // 3. Modify existing territories (insert content before target_tag)
  for (const { id: territoryName, entry } of modifyTags) {
    const territoryPattern = new RegExp(
      `(\t\t<territory[^>]*\sname="${territoryName}"[\\s\\S]*?)(${entry.target_tag})`,
    );
    const match = territoryPattern.exec(fileText);
    if (match) {
      fileText = fileText.replace(
        territoryPattern,
        `${match[1]}\n${entry.block.trim()}\n${entry.marker}${match[2]}`,
      );
    }
  }

  // 4. Insert file lines and territory blocks before </territories>
  if (filesToAppend || territoriesToAppend) {
    const insertion = filesToAppend + territoriesToAppend;
    fileText = fileText.replace("\t</territories>", `${insertion}\n\t</territories>`);
  }

  if (changed) {
    await Deno.writeTextFile(CFG_ENVIRONMENT_FILE, fileText);
    const modList = Object.entries(modMap)
      .filter(([modName]) => installedModNames.has(modName))
      .map(([modName]) => modName)
      .join(", ");
    ok(`Applied cfgenvironment.xml blocks for: ${modList}`);
  }
}

// ─── mapgroupproto.xml ──────────────────────────────────────────────────────

async function handleMapGroupProto(
  modMap: { [modName: string]: { [id: string]: MapGroupProtoEntry } },
  installedModNames: Set<string>,
): Promise<void> {
  let fileText = await Deno.readTextFile(MISSION_MAPGROUPPROTO_FILE);
  let changed = false;
  let toAppend = "";

  for (const [modName, blocks] of Object.entries(modMap)) {
    if (!installedModNames.has(modName)) continue;
    for (const [_id, entry] of Object.entries(blocks)) {
      if (fileText.includes(entry.marker)) continue;
      toAppend += entry.block + "\n" + entry.marker + "\n";
      changed = true;
    }
  }

  if (changed) {
    fileText = fileText.replace("</prototype>", toAppend + "</prototype>");
    await Deno.writeTextFile(MISSION_MAPGROUPPROTO_FILE, fileText);
    const modList = Object.entries(modMap)
      .filter(([modName]) => installedModNames.has(modName))
      .map(([modName]) => modName)
      .join(", ");
    ok(`Applied mapgroupproto.xml blocks for: ${modList}`);
  }
}

// ─── mapgrouppos.xml ────────────────────────────────────────────────────────

async function handleMapGroupPos(
  modMap: { [modName: string]: { [id: string]: MapGroupPosEntry } },
  installedModNames: Set<string>,
): Promise<void> {
  let fileText = await Deno.readTextFile(MISSION_MAPGROUPPOS_FILE);
  let changed = false;
  let toAppend = "";

  for (const [modName, blocks] of Object.entries(modMap)) {
    if (!installedModNames.has(modName)) continue;
    for (const [_id, entry] of Object.entries(blocks)) {
      if (fileText.includes(entry.marker)) continue;
      toAppend += entry.block + "\n" + entry.marker + "\n";
      changed = true;
    }
  }

  if (changed) {
    fileText = fileText.replace("</map>", toAppend + "</map>");
    await Deno.writeTextFile(MISSION_MAPGROUPPOS_FILE, fileText);
    const modList = Object.entries(modMap)
      .filter(([modName]) => installedModNames.has(modName))
      .map(([modName]) => modName)
      .join(", ");
    ok(`Applied mapgrouppos.xml blocks for: ${modList}`);
  }
}

// ─── cfggameplay.json ───────────────────────────────────────────────────────

interface CfgGameplay {
  WorldsData?: {
    objectSpawnersArr?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

async function handleJsonConfig(): Promise<void> {
  const customOverrideDir = `${ROOT}/overrides_server/mpmissions/custom`;
  if (!(await exists(customOverrideDir))) return;

  // Collect JSON file names from the override directory
  const jsonFiles: string[] = [];
  try {
    for await (const entry of Deno.readDir(customOverrideDir)) {
      if (entry.isFile && entry.name.toLowerCase().endsWith(".json")) {
        jsonFiles.push(entry.name);
      }
    }
  } catch {
    // Directory doesn't exist or isn't readable - nothing to do
    return;
  }

  jsonFiles.sort();
  if (jsonFiles.length === 0) return;

  // Copy files to mission's custom/ directory
  await Deno.mkdir(`${MISSION_DIR}/custom`, { recursive: true });
  for (const name of jsonFiles) {
    const srcPath = `${customOverrideDir}/${name}`;
    const dstPath = `${MISSION_DIR}/custom/${name}`;
    if (await exists(dstPath)) continue; // already copied
    await Deno.copyFile(srcPath, dstPath);
  }

  // Update cfggameplay.json's objectSpawnersArr
  if (!(await exists(CFG_GAMEPLAY_FILE))) return;

  const cfg: CfgGameplay = JSON.parse(await Deno.readTextFile(CFG_GAMEPLAY_FILE));
  if (!cfg.WorldsData) cfg.WorldsData = {};
  const existing = cfg.WorldsData.objectSpawnersArr ?? [];
  const wanted = jsonFiles.map((name) => `custom/${name}`);
  const merged = [...new Set([...existing, ...wanted])];

  if (existing.length === merged.length && existing.every((v, i) => v === merged[i])) {
    return; // no change needed
  }

  cfg.WorldsData.objectSpawnersArr = merged;
  await Deno.writeTextFile(CFG_GAMEPLAY_FILE, JSON.stringify(cfg, null, "\t"));
  ok(
    `Copied ${jsonFiles.length} JSON spawner file(s) to ${MISSION_DIR}/custom/ ` +
      `and merged into ${CFG_GAMEPLAY_FILE}`,
  );
}

// @Mapping_Skalisty_Military ships raw content (a .dze editor save plus XML
// loot/type fragments) that its own readme-infos.txt says an admin must
// manually wire in - nothing places itself in the world just because the
// mod's PBO is loaded via -servermod=. Four pieces, all copied/merged
// straight from the mod's own shipped files
// (server/@Mapping_Skalisty_Military/{files editor,xml}/):
//
//   1. skalisty_island.dze (places the base itself) copied into this
//      mission's EditorFiles/ folder, where @DayZ-Editor-Loader reads and
//      places every .dze it finds there on each mission load - the same
//      mechanism as the admin's own hand-built trader-town .dze (see
//      editorSync.ts). This is the actual "buildings appear in the world"
//      step - it was never done, which is why the base stayed invisible
//      even though the mod's PBO, radiation zone, monster garrison and AI
//      patrol were otherwise all wired up and working (those are all
//      independent of whether the mod's own buildings are placed).
//
//      The mod's OTHER .dze, pont_skalisty.dze (the bridge connecting the
//      island to the mainland - 32 "bldr_Bridge_Concrete2_25" deck
//      segments plus its own guard shed/pier cranes/mine building/rubble),
//      is deliberately NEVER copied here - the admin wants the base but not
//      the bridge. If a stale copy is already sitting in EditorFiles/ from
//      before this decision, it's removed on every start too.
//   2. mapgroupproto.xml - loot container point definitions for the mod's
//      new CS_* building groups. Without these the placed buildings exist
//      but the central economy has no loot points to spawn anything into.
//   3. mapgrouppos.xml - where in the world each of those group instances
//      actually sits, so the central economy's loot spawner can find them.
//   4. types.xml - economy <type> entries for the mod's new CS_* classnames.
//      A handful of the mod's shipped names are dangerously generic
//      ("Wall", "Tent", "Fence", "Trader", "Bridge", "Airdrop", ...) - any
//      that already collide with an existing type name are skipped, same
//      as any other already-defined name (see moreCars.ts's merge).
//
// All four are additive-only (matched/deduped against what's already
// there) and safe to re-run on every start.

import {
  ECONOMY_TYPES_FILE,
  EDITOR_FILES_DIR,
  MISSION_MAPGROUPPOS_FILE,
  MISSION_MAPGROUPPROTO_FILE,
  SKALISTY_MILITARY_MOD_DIR,
} from "./paths.ts";
import { ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@Mapping_Skalisty_Military";

// Only the base - see the header comment above for why pont_skalisty.dze
// (the bridge) is intentionally excluded.
const DZE_FILES = ["skalisty_island.dze"];

// .dze files this project used to copy in but no longer wants loaded -
// removed from EditorFiles/ on every start so a stale copy can't linger.
const REMOVED_DZE_FILES = ["pont_skalisty.dze"];

async function ensureDzeFilesCopied(): Promise<{ copied: string[]; removed: string[] }> {
  const copied: string[] = [];
  const removed: string[] = [];
  await Deno.mkdir(EDITOR_FILES_DIR, { recursive: true });

  for (const name of REMOVED_DZE_FILES) {
    const stale = `${EDITOR_FILES_DIR}/${name}`;
    if (await exists(stale)) {
      await Deno.remove(stale);
      removed.push(name);
    }
  }

  for (const name of DZE_FILES) {
    const src = `${SKALISTY_MILITARY_MOD_DIR}/files editor/${name}`;
    if (!(await exists(src))) continue; // mod not (fully) downloaded yet
    const dst = `${EDITOR_FILES_DIR}/${name}`;

    const srcInfo = await Deno.stat(src);
    let needsCopy = true;
    if (await exists(dst)) {
      const dstInfo = await Deno.stat(dst);
      needsCopy = dstInfo.size !== srcInfo.size;
    }
    if (!needsCopy) continue;

    await Deno.copyFile(src, dst);
    copied.push(name);
  }
  return { copied, removed };
}

const TYPE_BLOCK = /<type name="([^"]+)">[\s\S]*?<\/type>/g;

async function ensureTypesMerged(): Promise<number> {
  const src = `${SKALISTY_MILITARY_MOD_DIR}/xml/objetsfree-types.xml`;
  if (!(await exists(src)) || !(await exists(ECONOMY_TYPES_FILE))) return 0;

  const modText = await Deno.readTextFile(src);
  let text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingNames = new Set([...text.matchAll(TYPE_BLOCK)].map((m) => m[1]));

  let added = 0;
  for (const match of modText.matchAll(TYPE_BLOCK)) {
    const [block, name] = match;
    if (existingNames.has(name)) continue;
    existingNames.add(name);
    text = text.replace("</types>", `${block}\n</types>`);
    added++;
  }
  if (added > 0) await Deno.writeTextFile(ECONOMY_TYPES_FILE, text);
  return added;
}

const PROTO_GROUP_BLOCK = /<group name="([^"]+)"[^>]*>[\s\S]*?<\/group>/g;

async function ensureMapGroupProtoMerged(): Promise<number> {
  const src = `${SKALISTY_MILITARY_MOD_DIR}/xml/mapgroupproto.xml`;
  if (!(await exists(src)) || !(await exists(MISSION_MAPGROUPPROTO_FILE))) return 0;

  const modText = await Deno.readTextFile(src);
  let text = await Deno.readTextFile(MISSION_MAPGROUPPROTO_FILE);
  const existingNames = new Set([...text.matchAll(PROTO_GROUP_BLOCK)].map((m) => m[1]));

  let added = 0;
  for (const match of modText.matchAll(PROTO_GROUP_BLOCK)) {
    const [block, name] = match;
    if (existingNames.has(name)) continue;
    existingNames.add(name);
    text = text.replace("</prototype>", `${block}\n</prototype>`);
    added++;
  }
  if (added > 0) await Deno.writeTextFile(MISSION_MAPGROUPPROTO_FILE, text);
  return added;
}

// Self-closing single-line entries, e.g.:
//   <group name="CS_Bunker2" pos="14143.00 1.70 2667.40" rpy="0 0 0" a="90"/>
// Deduped by full trimmed line (not just name) - many entries share the
// same group name at different world positions.
const POS_GROUP_LINE = /<group name="[^"]*" pos="[^"]*" rpy="[^"]*" a="[^"]*"\s*\/>/g;

async function ensureMapGroupPosMerged(): Promise<number> {
  const src = `${SKALISTY_MILITARY_MOD_DIR}/xml/mapgrouppos.xml`;
  if (!(await exists(src)) || !(await exists(MISSION_MAPGROUPPOS_FILE))) return 0;

  const modText = await Deno.readTextFile(src);
  let text = await Deno.readTextFile(MISSION_MAPGROUPPOS_FILE);
  const existingLines = new Set([...text.matchAll(POS_GROUP_LINE)].map((m) => m[0].trim()));

  const toAdd: string[] = [];
  for (const match of modText.matchAll(POS_GROUP_LINE)) {
    const line = match[0].trim();
    if (existingLines.has(line)) continue;
    existingLines.add(line);
    toAdd.push(`    ${line}`);
  }
  if (toAdd.length > 0) {
    text = text.replace("</map>", `${toAdd.join("\n")}\n</map>`);
    await Deno.writeTextFile(MISSION_MAPGROUPPOS_FILE, text);
  }
  return toAdd.length;
}

export async function ensureSkalistyMilitaryMapping(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;
  if (!(await exists(SKALISTY_MILITARY_MOD_DIR))) return;

  const summary: string[] = [];

  const { copied: dzeCopied, removed: dzeRemoved } = await ensureDzeFilesCopied();
  if (dzeCopied.length) summary.push(`copied ${dzeCopied.join(", ")} into ${EDITOR_FILES_DIR}`);
  if (dzeRemoved.length) {
    summary.push(`removed stale ${dzeRemoved.join(", ")} from ${EDITOR_FILES_DIR}`);
  }

  const typesAdded = await ensureTypesMerged();
  if (typesAdded) summary.push(`${typesAdded} new type(s) into ${ECONOMY_TYPES_FILE}`);

  const protoAdded = await ensureMapGroupProtoMerged();
  if (protoAdded) {
    summary.push(`${protoAdded} new loot group(s) into ${MISSION_MAPGROUPPROTO_FILE}`);
  }

  const posAdded = await ensureMapGroupPosMerged();
  if (posAdded) summary.push(`${posAdded} new group position(s) into ${MISSION_MAPGROUPPOS_FILE}`);

  if (summary.length === 0) return;
  ok(`Skalisty Island mapping: ${summary.join("; ")}`);
}

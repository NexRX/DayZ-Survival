// Keeps the new "world feels alive" AI event mods (2026-08 batch: Knock
// Knock Zombies, Airborne AI, AI War Zones, hSF Zombie Horde Event) from
// firing on top of the custom trader city, and caps AI War Zones' own
// concurrent-zone setting for FPS safety given how much other AI this
// project already stacks (DayZ-Expansion-AI patrols, AI-Bandits, Dynamic AI
// Missions, InediaInfectedAI, CreepyZombies, the fixed military garrisons,
// AIConvoy, and now these four).
//
// Each mod self-generates its own config on first world load (see
// src/prime.ts) with a real per-mod schema for "don't spawn here" - none
// share a format:
//   - Knock Knock Zombies / Airborne AI (same author, agent001): a single
//     comma-joined string field, each entry "X Radius Z" (radius is the
//     *second* token, not a fourth) - confirmed via the mods' own shipped
//     admin/explanation.txt and a live-generated config.
//   - hSF Zombie Horde Event: a proper `SafeZones` JSON array of
//     `{ Position: [x, y, z], Radius: N }` objects - confirmed via a live-
//     generated config (which already ships one placeholder example zone;
//     left alone, only appended to).
//   - AI War Zones has no generic "safe zone" concept (it's a fixed list of
//     hand-authored zones) - not applicable, and its 3 shipped example
//     zones (Berezino/Vybor/Krasnostav PD) are all >1.5km from the trader
//     city anyway, confirmed via their own shipped positions.
//
// Idempotent: every run checks whether our own trader position is already
// present (by exact string match) before appending, so this never
// duplicates an entry across restarts, and never touches any other
// safe-zone entry an admin added by hand.

import {
  AI_WARZONES_SETTINGS,
  AIRBORNE_AI_SETTINGS,
  KNOCK_KNOCK_ZOMBIES_SETTINGS,
  ZOMBIE_HORDE_GENERAL_SETTINGS,
} from "./paths.ts";
import { ok } from "./ui.ts";
import { exists } from "./steam.ts";
import { CUSTOM_POSITION, CUSTOM_SAFE_ZONE_RADIUS } from "./traders.ts";

// AI War Zones' own Steam page recommends "I would not suggest allowing
// more than 1-3 active zones at once" even standalone - with this project's
// already-heavy AI stack on top, cap it below the mod's own shipped default
// (3) rather than at it. A floor/cap, not a fixed overwrite: never raises a
// host's own deliberately-lower setting.
const MAX_CONCURRENT_WARZONES_CAP = 2;

interface GenericSafeZoneConfig {
  safeZonePositions?: string;
  [key: string]: unknown;
}

interface HsfSafeZone {
  Position: [number, number, number];
  Radius: number;
}

interface HsfGeneralSettings {
  SafeZones?: HsfSafeZone[];
  [key: string]: unknown;
}

interface AiWarzonesSettings {
  maxConcurrentZones?: number;
  [key: string]: unknown;
}

/** "X Radius Z" token used by Knock Knock Zombies / Airborne AI's safeZonePositions. */
function xrzToken(): string {
  const [x, , z] = CUSTOM_POSITION!;
  return `${x} ${CUSTOM_SAFE_ZONE_RADIUS} ${z}`;
}

async function patchGenericSafeZone(path: string, label: string): Promise<boolean> {
  if (!(await exists(path))) return false;
  const data: GenericSafeZoneConfig = JSON.parse(await Deno.readTextFile(path));
  const token = xrzToken();
  const existing = (data.safeZonePositions ?? "").trim();
  if (existing.split(",").map((s) => s.trim()).includes(token)) return false;

  data.safeZonePositions = existing.length > 0 ? `${existing}, ${token}` : token;
  await Deno.writeTextFile(path, JSON.stringify(data, null, 4));
  ok(`${label}: excluded the trader city (safeZonePositions) from spawning near it`);
  return true;
}

async function patchHsfSafeZone(): Promise<boolean> {
  if (!(await exists(ZOMBIE_HORDE_GENERAL_SETTINGS))) return false;
  const data: HsfGeneralSettings = JSON.parse(
    await Deno.readTextFile(ZOMBIE_HORDE_GENERAL_SETTINGS),
  );
  const [x, , z] = CUSTOM_POSITION!;
  data.SafeZones ??= [];
  const already = data.SafeZones.some(
    (zone) =>
      Array.isArray(zone.Position) &&
      Math.abs(zone.Position[0] - x) < 1 &&
      Math.abs(zone.Position[2] - z) < 1,
  );
  if (already) return false;

  data.SafeZones.push({ Position: [x, 0, z], Radius: CUSTOM_SAFE_ZONE_RADIUS });
  await Deno.writeTextFile(ZOMBIE_HORDE_GENERAL_SETTINGS, JSON.stringify(data, null, 4));
  ok("hSF Zombie Horde Event: excluded the trader city (SafeZones) from being targeted");
  return true;
}

async function capWarzoneDensity(): Promise<boolean> {
  if (!(await exists(AI_WARZONES_SETTINGS))) return false;
  const data: AiWarzonesSettings = JSON.parse(await Deno.readTextFile(AI_WARZONES_SETTINGS));
  if (
    typeof data.maxConcurrentZones !== "number" ||
    data.maxConcurrentZones <= MAX_CONCURRENT_WARZONES_CAP
  ) {
    return false;
  }
  data.maxConcurrentZones = MAX_CONCURRENT_WARZONES_CAP;
  await Deno.writeTextFile(AI_WARZONES_SETTINGS, JSON.stringify(data, null, 4));
  ok(`AI War Zones: capped maxConcurrentZones to ${MAX_CONCURRENT_WARZONES_CAP} (FPS safety)`);
  return true;
}

export async function tuneNewAIEventMods(): Promise<void> {
  if (!CUSTOM_POSITION) return; // no trader city configured yet - nothing to protect

  await patchGenericSafeZone(KNOCK_KNOCK_ZOMBIES_SETTINGS, "Knock Knock Zombies");
  await patchGenericSafeZone(AIRBORNE_AI_SETTINGS, "Airborne AI");
  await patchHsfSafeZone();
  await capWarzoneDensity();
}

// Global AI combat-difficulty rebalance across every AI mod, so encounters
// feel like a genuine threat (the "world that fights back" design goal)
// without turning bots into bullet sponges — kills should stay fast in both
// directions ("hardcore, but respects your time").
//
// Covers DayZ-Expansion-AI (patrols/spatial/missions), InediaInfectedAI
// (infected), and AI-Bandits (standalone bandit spawns). Like loot.ts, this
// deliberately *overwrites*/floors a handful of scalar fields on every start
// rather than merging - it's an explicit, opinionated tuning pass, not an
// additive merge of new content. Edit the constants below (and re-run
// `deno task up`/`start`) to adjust, rather than hand-editing the generated
// JSON, since these values get re-applied on every start.

import {
  AI_BANDITS_DYNAMIC_SETTINGS,
  AI_BANDITS_STATIC_SETTINGS,
  AI_SETTINGS,
  DYNAMIC_MISSIONS_SETTINGS,
  INEDIA_SETTINGS,
  SPATIAL_SETTINGS,
} from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

// --- DayZ-Expansion-AI global baseline (AISettings.json) ---
//
// Every patrol in AIPatrolSettings.json (confirmed across all 46 generated
// entries) uses `-1` for its own Accuracy/Damage/Threat fields, which means
// "inherit this file's values". So this is the single lever that governs
// difficulty for every Expansion AI patrol on the map — roaming bandits,
// town guards, helicopter wreck defenders, everything.
interface AISettings {
  AccuracyMin?: number;
  AccuracyMax?: number;
  ThreatDistanceLimit?: number;
  NoiseInvestigationDistanceLimit?: number;
  MaxFlankingDistance?: number;
  EnableFlankingOutsideCombat?: number;
  DamageMultiplier?: number;
  DamageReceivedMultiplier?: number;
  AggressionTimeout?: number;
  GuardAggressionTimeout?: number;
  [key: string]: unknown;
}

const AI_TARGETS: [keyof AISettings, number][] = [
  ["AccuracyMin", 0.45], // engine default 0.35 — even a "miss" should sting
  ["AccuracyMax", 0.95], // engine default already near-max, keep it
  ["ThreatDistanceLimit", 1200], // spot/engage you from further out
  ["NoiseInvestigationDistanceLimit", 650], // gunfire/noise draws AI in from further
  ["MaxFlankingDistance", 300], // more willing to reposition tactically
  ["EnableFlankingOutsideCombat", 1], // patrols posture before you're even spotted
  ["DamageMultiplier", 1.15], // hits from AI hurt more
  ["DamageReceivedMultiplier", 1], // but AI still dies at a normal rate — no bullet sponges
  ["AggressionTimeout", 180], // stays engaged/hunting longer after losing you
  ["GuardAggressionTimeout", 240],
];

export async function tuneAIDifficulty(): Promise<void> {
  if (!(await exists(AI_SETTINGS))) {
    log(
      "AISettings.json not generated yet — DayZ-Expansion-AI will create it " +
        "(with its own defaults) on first server start",
    );
    return;
  }

  const settings: AISettings = JSON.parse(await Deno.readTextFile(AI_SETTINGS));
  let changed = false;
  for (const [key, value] of AI_TARGETS) {
    if (settings[key] !== value) {
      settings[key] = value;
      changed = true;
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(AI_SETTINGS, JSON.stringify(settings, null, 4));
  ok(`Rebalanced global AI difficulty in ${AI_SETTINGS}`);
}

// --- DayZ-Dynamic-AI-Addon ambient spawns (SpatialSettings.json) ---
//
// Each Group/Point/Location/Audio entry carries its own accuracy + trigger
// chance, so unlike AISettings.json there's no single global knob — we raise
// every entry's floor instead of guessing at one number for all of them.
interface SpatialEntry {
  Spatial_MinAccuracy?: number;
  Spatial_MaxAccuracy?: number;
  Spatial_Chance?: number;
  [key: string]: unknown;
}

interface SpatialSettings {
  Group?: SpatialEntry[];
  Point?: SpatialEntry[];
  Location?: SpatialEntry[];
  Audio?: SpatialEntry[];
  [key: string]: unknown;
}

const SPATIAL_ACCURACY_MIN_FLOOR = 0.35;
const SPATIAL_ACCURACY_MAX_FLOOR = 0.75;
const SPATIAL_CHANCE_FLOOR = 0.65; // when an encounter triggers, it should usually happen

function raiseSpatialFloors(entry: SpatialEntry): boolean {
  let changed = false;
  if ((entry.Spatial_MinAccuracy ?? 0) < SPATIAL_ACCURACY_MIN_FLOOR) {
    entry.Spatial_MinAccuracy = SPATIAL_ACCURACY_MIN_FLOOR;
    changed = true;
  }
  if ((entry.Spatial_MaxAccuracy ?? 0) < SPATIAL_ACCURACY_MAX_FLOOR) {
    entry.Spatial_MaxAccuracy = SPATIAL_ACCURACY_MAX_FLOOR;
    changed = true;
  }
  if ((entry.Spatial_Chance ?? 0) < SPATIAL_CHANCE_FLOOR) {
    entry.Spatial_Chance = SPATIAL_CHANCE_FLOOR;
    changed = true;
  }
  return changed;
}

export async function tuneSpatialAIDifficulty(): Promise<void> {
  // ensureSpatialAI() already logs the "not generated yet" case.
  if (!(await exists(SPATIAL_SETTINGS))) return;

  const settings: SpatialSettings = JSON.parse(
    await Deno.readTextFile(SPATIAL_SETTINGS),
  );
  let changed = false;
  for (const list of [settings.Group, settings.Point, settings.Location, settings.Audio]) {
    for (const entry of list ?? []) {
      if (raiseSpatialFloors(entry)) changed = true;
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(SPATIAL_SETTINGS, JSON.stringify(settings, null, 4));
  ok(`Raised ambient AI accuracy/spawn-chance floors in ${SPATIAL_SETTINGS}`);
}

// --- @Dynamic-AI-Missions curated raids (MainConfig.json) ---
interface MissionEntry {
  Bots_Accuracy?: number;
  Bots_Damage_Done_Multiplier?: number;
  Bots_Damage_Taken_Multiplier?: number;
  [key: string]: unknown;
}

interface MainConfig {
  Missions?: MissionEntry[];
  [key: string]: unknown;
}

const MISSION_ACCURACY_FLOOR = 0.65;
const MISSION_DAMAGE_DONE_MULTIPLIER = 1.15;

export async function tuneMissionDifficulty(): Promise<void> {
  // ensureDynamicMissions() already logs the "not generated yet" case.
  if (!(await exists(DYNAMIC_MISSIONS_SETTINGS))) return;

  const settings: MainConfig = JSON.parse(
    await Deno.readTextFile(DYNAMIC_MISSIONS_SETTINGS),
  );
  let changed = false;
  for (const mission of settings.Missions ?? []) {
    if ((mission.Bots_Accuracy ?? 0) < MISSION_ACCURACY_FLOOR) {
      mission.Bots_Accuracy = MISSION_ACCURACY_FLOOR;
      changed = true;
    }
    if (mission.Bots_Damage_Done_Multiplier !== MISSION_DAMAGE_DONE_MULTIPLIER) {
      mission.Bots_Damage_Done_Multiplier = MISSION_DAMAGE_DONE_MULTIPLIER;
      changed = true;
    }
    // No bullet sponges — leave the bots' own damage-taken rate at normal.
    if (mission.Bots_Damage_Taken_Multiplier !== 1) {
      mission.Bots_Damage_Taken_Multiplier = 1;
      changed = true;
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(
    DYNAMIC_MISSIONS_SETTINGS,
    JSON.stringify(settings, null, 4),
  );
  ok(`Raised curated mission bot accuracy/damage in ${DYNAMIC_MISSIONS_SETTINGS}`);
}

// --- InediaInfectedAI infected combat (Inedia/InediaInfectedAIConfig.json) ---
//
// The mod's own shipped defaults are tuned for "hardcore" play (e.g.
// DamageToPlayerHealthMultiplier 1.2-1.4x, StunToPlayerChancePercent
// 25-35%, and a 4s post-stagger immunity window on zombies) which in
// practice reads as "infected hit too hard and can never be staggered
// again mid-fight". So unlike the other AI mods above, this rebalance is a
// direct target-setter (always overwrites to an exact value) rather than a
// floor - we're deliberately pulling several fields *below* the mod's own
// defaults, not just guarding a minimum.
interface InediaScaledValue {
  all?: number;
  highstr?: number;
  mediumstr?: number;
  lowstr?: number;
  [key: string]: unknown;
}

interface InediaZombiesConfig {
  DamageToZombieHeadRangeMultiplier?: InediaScaledValue;
  [key: string]: unknown;
}

interface InediaConfig {
  Zombies?: InediaZombiesConfig;
  [key: string]: unknown;
}

type InediaTierTargets = Partial<
  Record<"all" | "highstr" | "mediumstr" | "lowstr", number>
>;

// Player-facing pain, pulled down from the mod's aggressive defaults to
// roughly-vanilla-plus-a-bit, scaled by infected "strength" tier.
const INEDIA_PLAYER_DAMAGE_TARGETS: Record<string, InediaTierTargets> = {
  DamageToPlayerHealthMultiplier: { all: 1.0, lowstr: 1.0, mediumstr: 1.05, highstr: 1.15 },
  DamageToPlayerInBlockHealthMultiplier: { all: 0.5, lowstr: 0.5, mediumstr: 0.55, highstr: 0.6 },
  DamageToPlayerShockMultiplier: { all: 1.0, lowstr: 1.0, mediumstr: 1.05, highstr: 1.15 },
  DamageToPlayerInBlockShockMultiplier: { all: 0.5, lowstr: 0.5, mediumstr: 0.55, highstr: 0.6 },
  DamageToPlayerStaminaPercent: { all: 8, lowstr: 8, mediumstr: 10, highstr: 14 },
  DamageToPlayerInBlockStaminaPercent: { all: 4, lowstr: 4, mediumstr: 5, highstr: 7 },
  DamageToPlayerBleedingChancePercent: { all: 6, lowstr: 6, mediumstr: 8, highstr: 10 },
  DamageToPlayerInBlockBleedingChancePercent: { all: 3, lowstr: 3, mediumstr: 4, highstr: 5 },
  StunToPlayerChancePercent: { all: 12, lowstr: 12, mediumstr: 15, highstr: 20 },
  StunToPlayerInBlockChancePercent: { all: 6, lowstr: 6, mediumstr: 7.5, highstr: 10 },
};

// Let players stagger zombies again sooner mid-fight, without making it
// trivial/spammable (10% ignore-chance on qualifying hits is left as-is).
const INEDIA_ZOMBIE_STAGGER_TARGETS: Record<string, InediaTierTargets> = {
  DamageToZombieShockToStunImmunityAfterMeleeHitSeconds: { all: 2.0 },
  DamageToZombieShockToStunImmunityAfterRangedHitSeconds: { all: 2.0 },
};

// No bullet sponges: a clean headshot should never be worth *less* than a
// full-power hit (the mod's own default is already 1.0 - this only guards
// against a host accidentally nerfing it).
const INEDIA_HEADSHOT_MULTIPLIER_FLOOR = 1;

const INEDIA_EPSILON = 1e-6;

function setInediaTiers(
  value: InediaScaledValue | undefined,
  targets: InediaTierTargets,
): [InediaScaledValue, boolean] {
  const v = value ?? {};
  let changed = false;
  for (const [tier, target] of Object.entries(targets)) {
    if (target === undefined) continue;
    const current = v[tier] as number | undefined;
    if (current === undefined || Math.abs(current - target) > INEDIA_EPSILON) {
      v[tier] = target;
      changed = true;
    }
  }
  return [v, changed];
}

function raiseInediaFloor(
  value: InediaScaledValue | undefined,
  floor: number,
): [InediaScaledValue, boolean] {
  const v = value ?? {};
  if ((v.all ?? 0) >= floor) return [v, false];
  v.all = floor;
  return [v, true];
}

export async function tuneInediaInfectedAIDifficulty(): Promise<void> {
  if (!(await exists(INEDIA_SETTINGS))) {
    log(
      "InediaInfectedAIConfig.json not generated yet — InediaInfectedAI will create it " +
        "(already tuned for hardcore play by default) on first server start",
    );
    return;
  }

  const settings: InediaConfig = JSON.parse(await Deno.readTextFile(INEDIA_SETTINGS));
  const zombies = settings.Zombies ?? (settings.Zombies = {});
  let changed = false;

  for (
    const [key, targets] of Object.entries({
      ...INEDIA_PLAYER_DAMAGE_TARGETS,
      ...INEDIA_ZOMBIE_STAGGER_TARGETS,
    })
  ) {
    let updated: boolean;
    [zombies[key], updated] = setInediaTiers(
      zombies[key] as InediaScaledValue | undefined,
      targets,
    );
    changed ||= updated;
  }

  let raised: boolean;
  [zombies.DamageToZombieHeadRangeMultiplier, raised] = raiseInediaFloor(
    zombies.DamageToZombieHeadRangeMultiplier,
    INEDIA_HEADSHOT_MULTIPLIER_FLOOR,
  );
  changed ||= raised;

  if (!changed) return;
  await Deno.writeTextFile(INEDIA_SETTINGS, JSON.stringify(settings, null, 4));
  ok(`Rebalanced infected combat difficulty in ${INEDIA_SETTINGS}`);
}

// --- AI-Bandits patrol/sniper accuracy (AI_Bandits/{Dynamic,Static}AIB.json) ---
//
// Each patrol/sniper/static-guard entry carries its own 0-100 "accuracy"
// integer (confirmed via github.com/hunter688/Hunterz-mods-Wiki) - there's
// no separate damage multiplier to tune, since AI-Bandits fire real
// ammunition through the engine's normal ballistics ("no bullet sponges" is
// automatic here, in both directions). Raise the accuracy floor only.
interface BanditEntry {
  accuracy?: number;
  [key: string]: unknown;
}

interface BanditConfig {
  GroupLocations?: BanditEntry[];
  SniperLocations?: BanditEntry[];
  [key: string]: unknown;
}

const BANDIT_ACCURACY_FLOOR = 55; // 0-100 scale

async function tuneBanditAccuracy(path: string): Promise<void> {
  if (!(await exists(path))) return; // not generated/customized for this map yet

  const config: BanditConfig = JSON.parse(await Deno.readTextFile(path));
  let changed = false;
  for (const list of [config.GroupLocations, config.SniperLocations]) {
    for (const entry of list ?? []) {
      if ((entry.accuracy ?? 0) < BANDIT_ACCURACY_FLOOR) {
        entry.accuracy = BANDIT_ACCURACY_FLOOR;
        changed = true;
      }
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(path, JSON.stringify(config, null, 4));
  ok(`Raised AI-Bandits accuracy floor in ${path}`);
}

export async function tuneAIBanditsDifficulty(): Promise<void> {
  if (
    !(await exists(AI_BANDITS_DYNAMIC_SETTINGS)) &&
    !(await exists(AI_BANDITS_STATIC_SETTINGS))
  ) {
    log(
      "AI_Bandits configs not generated yet — AI-Bandits will create them on first " +
        "server start (see MODS.md for per-map example configs)",
    );
    return;
  }
  await tuneBanditAccuracy(AI_BANDITS_DYNAMIC_SETTINGS);
  await tuneBanditAccuracy(AI_BANDITS_STATIC_SETTINGS);
}

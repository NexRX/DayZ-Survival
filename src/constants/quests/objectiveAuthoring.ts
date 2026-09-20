import type {
  AICampObjective,
  AIPatrolObjective,
  AIVipObjective,
  Objective,
  TargetObjective,
  TreasureHuntObjective,
} from "../types/objective.ts";
import type { BoolNum, Vec3 } from "../types/common.ts";

/**
 * Faction values used by the installed Expansion AI configs and AI-Bandits.
 * This is an authoring constraint only; the serialized config remains a string.
 */
export type Faction =
  | "Bandit"
  | "Gorka"
  | "Raiders"
  | "Civilian"
  | "Survivor"
  | "PlayerSurvivor"
  | "East"
  | "North"
  | "South"
  | "Human"
  | "West"
  | "Guards"
  | "FireFighter"
  | "Police"
  | "NBC"
  | "Shamans"
  | "Cannibal"
  | "Passive"
  | "Mercenaries"
  | "Bandits";

/** Expansion's nested AI spawn definition used by AI Patrol/Camp objectives. */
export interface QuestAIObjectiveSpawn {
  NumberOfAI: number;
  NPCName: string;
  Waypoints: Vec3[];
  Behaviour: string;
  Formation: string;
  Loadout: string;
  Faction: Faction;
  Speed: string;
  ThreatSpeed: string;
  MinAccuracy: number;
  MaxAccuracy: number;
  CanBeLooted: BoolNum;
  UnlimitedReload: BoolNum;
  ThreatDistanceLimit: number;
  DamageMultiplier: number;
  DamageReceivedMultiplier: number;
  ClassNames: string[];
  SniperProneDistanceThreshold: number;
  RespawnTime: number;
  DespawnTime: number;
  MinDistanceRadius: number;
  MaxDistanceRadius: number;
  DespawnRadius: number;
}

/** Expansion's treasure loot entry. */
export interface QuestTreasureLoot {
  Name: string;
  Attachments: string[];
  Chance: number;
  QuantityPercent: number;
  Max: number;
  Min: number;
  Variants: string[];
}

/** Generator-only additions used to build the documented wire shape. */
export type QuestTargetObjective = TargetObjective;

export type QuestAIPatrolObjective = AIPatrolObjective & {
  AISpawn?: QuestAIObjectiveSpawn;
};

export type QuestAICampObjective = AICampObjective & {
  InfectedDeletionRadius?: number;
  AISpawns?: QuestAIObjectiveSpawn[];
};

export type QuestAIVipObjective = AIVipObjective & {
  ShowDistance?: BoolNum;
  CanLootAI?: BoolNum;
  NPCLoadoutFile?: string;
  NPCClassName?: string;
  NPCName?: string;
};

export type QuestTreasureHuntObjective = TreasureHuntObjective & {
  ShowDistance?: BoolNum;
  ContainerName?: string;
  DigInStash?: BoolNum;
  MarkerVisibility?: number;
  Positions?: Vec3[];
  Loot?: QuestTreasureLoot[];
  LootItemsAmount?: number;
};

export type QuestObjective =
  | Objective
  | QuestAIPatrolObjective
  | QuestAICampObjective
  | QuestAIVipObjective
  | QuestTreasureHuntObjective;

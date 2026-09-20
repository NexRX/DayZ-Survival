export enum QuestType {
  NORMAL = 1, // default
  SCRIPTED = 2,
}

/** RewardBehavior enum values (ExpansionQuestRewardBehavior). */
export enum RewardBehavior {
  RANDOMIZED_ON_COMPLETION = 0,
}

/** Quest type selector (0–2) — maps to ExpansionQuestNPCType in the mod. */
export enum QuestNPCType {
  NORMAL = 0,
  FENCE = 1,
}

/** A single reward entry — all non-core fields are optional because the mod
 *  only requires ClassName/Amount for the basic case. */
export interface RewardEntry {
  ClassName: string;
  Amount: number;
  Attachments?: unknown[];
  DamagePercent?: number;
  QuestID?: number;
  Chance?: number;
}

/** QuestItem — a named item with a quantity (used in QuestItems array). */
export interface QuestItem {
  ClassName: string;
  Amount: number;
}

/**
 * Full quest JSON shape (ExpansionQuestConfig).
 * This is exactly what the mod reads from DZSurvival_Quest_*.json files.
 */
export interface Quest {
  ConfigVersion?: number;
  ID: number;
  Type: QuestType;
  Title: string;
  /** [On Offer, Active, Turn In] descriptions  */
  Descriptions: readonly [string, string, string];
  ObjectiveText: string;
  FollowUpQuest?: number;
  Repeatable?: BoolNum;
  IsDailyQuest?: BoolNum;
  IsWeeklyQuest?: BoolNum;
  CancelQuestOnPlayerDeath?: BoolNum;
  Autocomplete?: BoolNum;
  IsGroupQuest?: BoolNum;
  ObjectSetFileName?: string;
  QuestItems?: QuestItem[];
  Rewards?: RewardEntry[];
  NeedToSelectReward?: BoolNum;
  RandomReward?: BoolNum;
  RandomRewardAmount?: number;
  RewardsForGroupOwnerOnly?: BoolNum;
  RewardBehavior?: number;
  QuestGiverIDs: number[];
  QuestTurnInIDs: number[];
  IsAchievement?: BoolNum;
  Objectives: ObjectiveRef[];
  QuestColor?: number;
  ReputationReward?: number;
  ReputationRequirement?: number;
  PreQuestIDs?: number[];
  RequiredFaction?: string;
  FactionReward?: string;
  PlayerNeedQuestItems?: BoolNum;
  DeleteQuestItems?: BoolNum;
  SequentialObjectives?: BoolNum;
  FactionReputationRequirements?: Record<string, unknown>;
  FactionReputationRewards?: Record<string, unknown>;
  SuppressQuestLogOnCompetion?: BoolNum;
  Active?: BoolNum;
}

/** Runtime mapping of type names to their enum/class values.
 * Use `ALL_QUEST_TYPES` for runtime type lookups; individual types
 * are exported separately for direct type references. */
export const ALL_QUEST_TYPES = {
  ObjectiveType,
  QuestType,
  RewardBehavior,
  QuestNPCType,
} as const;

import { PROFILE_DIR } from "../paths.ts";
import { BoolNum, Vec3 } from "./common.ts";
import {
  AICampObjective,
  AIPatrolObjective,
  AIVipObjective,
  Objective,
  ObjectiveRef,
  ObjectiveType,
  TargetObjective,
  TreasureHuntObjective,
} from "./objective.ts";

export const QUEST_SETTINGS_CONFIG = `${PROFILE_DIR}/ExpansionMod/Settings/QuestSettings.json`;
export const QUEST_CONFIG_DIR = `${PROFILE_DIR}/ExpansionMod/Quests/Quests`;

/** Days of the week for the weekly quest reset */
export enum WeeklyResetDay {
  Sunday = "Sunday",
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
}

/** Group quest mode selector (0–2); exact labels unknown */
export enum GroupQuestMode {
  Mode0 = 0,
  Mode1 = 1,
  Mode2 = 2,
}

export interface QuestSettings {
  /** M_version — kept required: this drives config migration/versioning, shouldn't be silently defaulted */
  m_Version: number;

  // --- Core toggles ---
  /** Enable or disable quests — kept required: master switch, an omitted value here is ambiguous rather than "off" */
  EnableQuests: BoolNum;
  /** Enable or disable quest log tab (default: 1) */
  EnableQuestLogTab?: BoolNum;
  /** Create quest npc markers (default: 1) */
  CreateQuestNPCMarkers?: number;
  /** Enable or disable quest npc indicators (default: 1) */
  UseQuestNPCIndicators?: BoolNum;
  /** Enable or disable utc time (default: 0) */
  UseUTCTime?: BoolNum;

  // --- Notification: Quest Accepted ---
  /** Quest accepted title (default: "Quest Accepted") */
  QuestAcceptedTitle?: string;
  /** Quest accepted text (default: "The quest %1 has been accepted!") */
  QuestAcceptedText?: string;

  // --- Notification: Quest Completed ---
  /** Quest completed title (default: "Quest Completed") */
  QuestCompletedTitle?: string;
  /** Quest completed text (default: "All objectives of the quest %1 have been completed") */
  QuestCompletedText?: string;

  // --- Notification: Quest Failed ---
  /** Quest failed title (default: "Quest Failed") */
  QuestFailedTitle?: string;
  /** Quest failed text (default: "The quest %1 failed!") */
  QuestFailedText?: string;

  // --- Notification: Quest Canceled ---
  /** Quest canceled title (default: "Quest Canceled") */
  QuestCanceledTitle?: string;
  /** Quest canceled text (default: "The quest %1 has been canceled!") */
  QuestCanceledText?: string;

  // --- Notification: Quest Turn-In ---
  /** Quest turn in title (default: "Quest Turn-In") */
  QuestTurnInTitle?: string;
  /** Quest turn in text (default: "The quest %1 has been completed!") */
  QuestTurnInText?: string;

  // --- Notification: Quest Objective Completed ---
  /** Quest objective completed title (default: "Objective Completed") */
  QuestObjectiveCompletedTitle?: string;
  /** Quest objective completed text (default: "You have completed the objective %1 of the quest %2.") */
  QuestObjectiveCompletedText?: string;

  // --- Notification: Quest Cooldown ---
  /** Quest cooldown title (default: "Quest Cooldown") */
  QuestCooldownTitle?: string;
  /** Quest cooldown text (default: "This quest is still on cooldown! Come back in %1") */
  QuestCooldownText?: string;

  // --- Notification: Group Quest (not in group) ---
  /** Quest not in group title (default: "Group Quest") */
  QuestNotInGroupTitle?: string;
  /** Quest not in group text (default: "Group quests can only be accepted while in a group!") */
  QuestNotInGroupText?: string;

  // --- Notification: Group Quest (not group owner) ---
  /** Quest not group owner title (default: "Group Quest") */
  QuestNotGroupOwnerTitle?: string;
  /** Quest not group owner text (default: "Only a group owner can accept and turn-in a group quest!") */
  QuestNotGroupOwnerText?: string;

  /** Group quest mode selector (0–2) (default: 0) */
  GroupQuestMode?: GroupQuestMode;

  // --- Notification: Achievement ---
  /** Achievement completed title (default: "Achievement \"%1\" completed!") */
  AchievementCompletedTitle?: string;
  /** Achievement completed text (default: "%1") */
  AchievementCompletedText?: string;

  // --- Reset scheduling ---
  /** Weekly reset day (default: "Wednesday") */
  WeeklyResetDay?: WeeklyResetDay;
  /** Weekly reset minute (default: 0) */
  WeeklyResetMinute?: number;
  /** Weekly reset hour (default: 8) */
  WeeklyResetHour?: number;
  /** Daily reset hour (default: 8) */
  DailyResetHour?: number;
  /** Daily reset minute (default: 0) */
  DailyResetMinute?: number;

  // --- Limits ---
  /** Max active quests, -1 = unlimited (default: -1) */
  MaxActiveQuests?: number;
}

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

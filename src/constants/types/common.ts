import type { ClassNameModded } from "./classNames.ts";

/** [x, y, z] */
export type Vec3 = readonly [number, number, number];

export type BoolNum = 0 | 1;

export const TRUE = 1 as const;
export const FALSE = 0 as const;

/** Expansion objective type selector — maps to ExpansionQuestObjectiveType in the mod. */
export enum ObjectiveType {
  NONE = 1,
  TARGET = 2,
  TRAVEL = 3,
  COLLECT = 4,
  DELIVERY = 5,
  TREASUREHUNT = 6,
  AIPATROL = 7,
  AICAMP = 8,
  AIVIP = 9,
  ACTION = 10,
  CRAFTING = 11,
}

/** Quest type selector (0–2) — maps to ExpansionQuestNPCType in the mod. */
export enum QuestType {
  NORMAL = 1,
  SCRIPTED = 2,
}

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

/** ExpansionQuestNPCType from the installed Expansion Quests build. */
export enum NPCType {
  NORMAL = 0,
  OBJECT = 1,
  AI = 2,
}

/** AI movement speed */
export enum AISpeed {
  WALK = "WALK",
  JOG = "JOG",
  SPRINT = "SPRINT",
}

/** AI default combat stance */
export enum AIDefaultStance {
  STANDING = "STANDING",
  PRONE = "PRONE",
  CROUCHED = "CROUCHED",
}

/** AI loot drop behaviour on death */
export enum AILootDropOnDeath {
  DEFAULT = 0,
  NO_LOOT = 1,
  ALWAYS_LOOT = 2,
  LOOT_ON_COMBAT = 3,
  LOOT_ON_SUSPICIOUS = 4,
}

/** AI looting behaviour — what items to pick up */
export enum AILootingBehaviour {
  DEFAULT = "DEFAULT",
  NONE = "NONE",
  ALL = "ALL",
  WEAPONS = "WEAPONS",
  WEAPONS_FIREARMS = "WEAPONS_FIREARMS",
  WEAPONS_LAUNCHERS = "WEAPONS_LAUNCHERS",
  WEAPONS_MELEE = "WEAPONS_MELEE",
  BANDAGES = "BANDAGES",
  FOOD = "FOOD",
  UPGRADE = "UPGRADE",
  CLOTHING = "CLOTHING",
  CLOTHING_SIMILAR = "CLOTHING_SIMILAR",
  CLOTHING_IDENTICAL = "CLOTHING_IDENTICAL",
  CLOTHING_ARMBAND = "CLOTHING_ARMBAND",
  CLOTHING_BACK = "CLOTHING_BACK",
  CLOTHING_BACK_LARGE = "CLOTHING_BACK_LARGE",
  CLOTHING_BACK_MEDIUM = "CLOTHING_BACK_MEDIUM",
  CLOTHING_BACK_SMALL = "CLOTHING_BACK_SMALL",
  CLOTHING_BODY = "CLOTHING_BODY",
  CLOTHING_EYEWEAR = "CLOTHING_EYEWEAR",
  CLOTHING_FEET = "CLOTHING_FEET",
  CLOTHING_GLOVES = "CLOTHING_GLOVES",
  CLOTHING_HEADGEAR = "CLOTHING_HEADGEAR",
  CLOTHING_HIPS = "CLOTHING_HIPS",
  CLOTHING_LEGS = "CLOTHING_LEGS",
  CLOTHING_MASK = "CLOTHING_MASK",
  CLOTHING_MELEE = "CLOTHING_MELEE",
  CLOTHING_SHOULDER = "CLOTHING_SHOULDER",
  CLOTHING_VEST = "CLOTHING_VEST",
}

/** Waypoint path interpolation curve */
export enum AIWaypointInterpolation {
  NONE = "NONE",
  CATMULLROM = "CATMULLROM",
  NATURALCUBIC = "NATURALCUBIC",
  UNIFORMCUBIC = "UNIFORMCUBIC",
}

/** AI formation shape */
export enum AIFormation {
  LINE = "LINE",
  VEE = "VEE",
  WEDGE = "WEDGE",
  ECHLEON_LEFT = "ECHLEON_LEFT",
  ECHLEON_RIGHT = "ECHLEON_RIGHT",
  FILE = "FILE",
  DIAMOND = "DIAMOND",
  LINE_ABREAST = "LINE_ABREAST",
  STACK = "STACK",
  ARC = "ARC",
  SPHERE = "SPHERE",
  CUSTOM = "CUSTOM",
  NONE = "NONE",
}

export interface CollectionEntry {
  Amount: number;
  ClassName: ClassNameModded;
  /** -1 for any Quantity percentage, 1-100 otherwise */
  QuantityPercent: number;
  MinQuantityPercent: number;
}

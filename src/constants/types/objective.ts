import { PROFILE_DIR } from "../paths.ts";
import type { BoolNum, CollectionEntry, Vec3 } from "./common.ts";
import type { ClassName, ClassNameAction } from "./classNames.ts";
import { , LoadoutName } from "./npc.ts";
import { NPCClassName } from "./classNamesMod.ts";

export const OBJECTIVE_ACTION_DIR = PROFILE_DIR + "/ExpansionMod/Quests/Objectives/Action";

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

/** Minimal pointer used inside Quest.Objectives arrays. */
export interface ObjectiveRef {
  ConfigVersion?: number;
  ID: number;
  ObjectiveType: ObjectiveType;
}

export interface ObjectiveBase {
  ConfigVersion?: number;
  ID: number;
  ObjectiveType: ObjectiveType;
  ObjectiveText: string;
  TimeLimit?: number; // seconds
  Active: BoolNum;
}

export interface TravelObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.TRAVEL;
  Position: Vec3;
  MaxDistance: number;
  MarkerName: string;
  ShowDistance?: BoolNum;
  TriggerOnEnter: BoolNum;
  TriggerOnExit: BoolNum;
}

export interface TargetObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.TARGET;
  Position: Vec3;
  MaxDistance: number;
  MinDistance: number;
  Amount: number;
  ClassNames: NPCClassName[];
  CountSelfKill: BoolNum;
  AllowedWeapons: ClassName[];
  ExcludedClassNames: ClassName[];
  CountAIPlayers: BoolNum;
  AllowedTargetFactions: string[];
  AllowedDamageZones: string[];
}

export interface DeliveryObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.DELIVERY;
  Collections: CollectionEntry[];
  ShowDistance: BoolNum;
  AddItemsToNearbyMarketZone: BoolNum;
  MaxDistance: number;
  MarkerName: string;
}

export interface CollectionObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.COLLECT;
  Collections: CollectionEntry[];
  ShowDistance: BoolNum;
  AddItemsToNearbyMarketZone: BoolNum;
  NeedAnyCollection: BoolNum;
}

export interface CraftingObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.CRAFTING;
  ItemNames: string[];
  ExecutionAmount: number;
}

export interface ActionObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.ACTION;
  ActionNames: ClassNameAction[];
  AllowedClassNames: ClassName[];
  ExcludedClassNames?: ClassName[];
  ExecutionAmount: number;
}

/**
 * Treasure Hunt objective — dig up buried items (ExpansionQuestObjectiveTreasureHunt).
 */
export interface TreasureHuntObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.TREASUREHUNT;
  Position: Vec3;
  MaxDistance: number;
  MarkerName: string;
}

export interface AIPatrolObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.AIPATROL;
  Position: Vec3;
  MaxDistance: number;
  MinDistance: number;
  Amount: number;
  ClassNames: ClassName[];
  CountSelfKill: BoolNum;
  AllowedWeapons: ClassName[];
  ExcludedClassNames: ClassName[];
  CountAIPlayers: BoolNum;
  AllowedTargetFactions: string[];
  AllowedDamageZones: string[];
}

export interface AICampObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.AICAMP;
  Position: Vec3;
  MaxDistance: number;
  MinDistance: number;
  Amount: number;
  ClassNames: NPCClassName[];
  CountSelfKill: BoolNum;
  AllowedWeapons: ClassName[];
  ExcludedClassNames: ClassName[];
  CountAIPlayers: BoolNum;
  AllowedTargetFactions: string[];
  AllowedDamageZones: string[];
}

export interface AIVipObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.AIVIP;
  Position: Vec3;
  MaxDistance: number;
  MarkerName: string;
  CanLootAI: BoolNum;
  NPCLoadoutFile: LoadoutName;
  NPCClassName: AINpcClassNames;
}

export type Objective =
  | TravelObjective
  | TargetObjective
  | DeliveryObjective
  | CollectionObjective
  | CraftingObjective
  | ActionObjective
  | TreasureHuntObjective
  | AIPatrolObjective
  | AICampObjective
  | AIVipObjective;

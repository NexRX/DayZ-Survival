import type {
  AIDefaultStance,
  AIFormation,
  AILootDropOnDeath,
  AILootingBehaviour,
  AISpeed,
  AIWaypointInterpolation,
  BoolNum,
  CollectionEntry,
  ObjectiveType,
  Vec3,
} from "./common.ts";
import type { ClassNameAction } from "./classNamesGenerated.d.ts";
import type { LoadoutName } from "./npc.d.ts";
import type { AINpcClassNames, ClassNameModded, NPCClassName } from "./classNames.ts";
import { Faction } from "./quest.d.ts";

export type DamageZone =
  | "Head"
  | "Brain"
  | "LeftArm"
  | "RightArm"
  | "LeftLeg"
  | "RightLeg"
  | "LeftFoot"
  | "RightFoot"
  | "Torso";

export interface AISpawn {
  NumberOfAI: number;
  Waypoints: Vec3[];
  Faction: Faction;
  Loadout: LoadoutName;
  Chance: number;
  CanBeLooted: BoolNum;
  Name?: string;
  Behaviour?: string;
  Speed?: AISpeed;
  Units?: string[];
  Persist?: BoolNum;
  Formation?: AIFormation;
  AccuracyMax?: number;
  AccuracyMin?: number;
  DespawnTime?: number;
  RespawnTime?: number;
  DefaultStance?: AIDefaultStance;
  DespawnRadius?: number;
  MaxDistRadius?: number;
  MinDistRadius?: number;
  NumberOfAIMax?: number;
  FormationScale?: number;
  LootDropOnDeath?: AILootDropOnDeath;
  MaxSpreadRadius?: number;
  MinSpreadRadius?: number;
  ObjectClassName?: string;
  ShoryukenChance?: number;
  UnlimitedReload?: number;
  DamageMultiplier?: number;
  DefaultLookAngle?: number;
  LootingBehaviour?: AILootingBehaviour;
  UnderThreatSpeed?: AISpeed;
  CanBeTriggeredByAI?: BoolNum;
  FormationLooseness?: number;
  HeadshotResistance?: number;
  MaxFlankingDistance?: number;
  ThreatDistanceLimit?: number;
  LoadBalancingCategory?: string;
  WaypointInterpolation?: AIWaypointInterpolation;
  DamageReceivedMultiplier?: number;
  ShoryukenDamageMultiplier?: number;
  CanSpawnInContaminatedArea?: BoolNum;
  EnableFlankingOutsideCombat?: number;
  SniperProneDistanceThreshold?: number;
  UseRandomWaypointAsStartPoint?: BoolNum;
  NoiseInvestigationDistanceLimit?: number;
}

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
  AllowedWeapons?: ClassNameModded[];
  ExcludedClassNames?: ClassNameModded[];
  CountAIPlayers: BoolNum;
  AllowedTargetFactions?: Faction[];
  AllowedDamageZones?: DamageZone[];
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
  AllowedClassNames: ClassNameModded[];
  ExcludedClassNames?: ClassNameModded[];
  ExecutionAmount: number;
}

export interface TreasureLootItem {
  Name: ClassNameModded;
  Min: number;
  Max: number;
  Chance: number;
  QuantityPercent: number;
  Variants: string[];
  Attachments: string[];
}

export interface TreasureHuntObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.TREASUREHUNT;
  Positions: Vec3;
  Loot: TreasureLootItem[];
  MaxDistance: number;
  MarkerName: string;
  ShowDistance: BoolNum;
  DigInStash: number;
  LootItemsAmount?: number;
  MarkerVisibility?: number;
  ContainerName: ClassNameModded;
}

export interface AIPatrolObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.AIPATROL;
  AISpawn: AISpawn;
  MaxDistance: number;
  MinDistance: number;
  AllowedWeapons?: ClassNameModded[];
  AllowedDamageZones?: DamageZone[];
}

export interface AICampObjective extends ObjectiveBase {
  ObjectiveType: ObjectiveType.AICAMP;
  AISpawn: AISpawn;
  MaxDistance: number;
  MinDistance: number;
  AllowedWeapons?: ClassNameModded[];
  AllowedDamageZones?: DamageZone[];
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

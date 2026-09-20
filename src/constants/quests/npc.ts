import { Npc, NPC_CONFIG_DIR, NPCType } from "../types/npc.ts";
import { configToRecord, NPC_CONFIG_VERSION } from "./common.ts";

export const NPC_TASKMASTER_DANIELS: Npc = {
  ID: 1,
  ClassName: "ExpansionQuestNPCDenis",
  Position: [7984.24, 221.09, 11302.8],
  Orientation: [45, 0, 0],
  NPCName: "Taskmaster Daniels",
  DefaultNPCText: "You need something? Talk to me if you're looking for work.",
  NPCLoadoutFile: "TaskmasterLoadout",
  NPCType: NPCType.NORMAL,
};

export const NPC_GUARD_BORIS: Npc = {
  ID: 2,
  ClassName: "ExpansionQuestNPCBoris",
  Position: [8009.97, 223.647, 11300.2],
  Orientation: [60, 0, 0],
  NPCName: "Compound Guard",
  DefaultNPCText: "Move along. Taskmaster's business is his own.",
  NPCLoadoutFile: "GuardLoadout",
  NPCType: NPCType.NORMAL,
};

export const NPC_GUARD_KAITO: Npc = {
  ID: 3,
  ClassName: "ExpansionQuestNPCKaito",
  Position: [8010.5, 223.244, 11308.7],
  Orientation: [149, 0, 0],
  NPCName: "Compound Guard",
  DefaultNPCText: "Eyes open. Wouldn't want trouble finding the Taskmaster.",
  NPCLoadoutFile: "GuardLoadout",
  NPCType: NPCType.NORMAL,
};

export const NPC_BLACKMARKET_HASSAN: Npc = {
  ID: 4,
  ClassName: "ExpansionQuestNPCHassan", // TODO CHANGE
  Position: [13119.5, 1.9622, 8178.82],
  Orientation: [176.868, 0, -0],
  NPCName: "Hassan",
  DefaultNPCText: "I don't do introductions. You got what I want, or you know where to get it.",
  NPCLoadoutFile: "GorkaLoadout",
  NPCType: NPCType.NORMAL,
};

export const NPC_SCOUT_NIKI: Npc = {
  ID: 5,
  ClassName: "ExpansionQuestNPCNiki",
  Position: [391.664, 145.604, 4721.08],
  Orientation: [173.618, 0, -0],
  NPCName: "Niki",
  DefaultNPCText: "Shhh. How did you know I was here, did the Taskmaster send you?",
  NPCLoadoutFile: "GhillieMossy",
  NPCType: NPCType.NORMAL,
};

const ALL_NPCS: Npc[] = [
  NPC_TASKMASTER_DANIELS,
  NPC_GUARD_BORIS,
  NPC_GUARD_KAITO,
  NPC_BLACKMARKET_HASSAN,
  NPC_SCOUT_NIKI,
];

export const ALL_NPC_CONFIGS = configToRecord(
  ALL_NPCS.map((npc) => ({ ConfigVersion: NPC_CONFIG_VERSION, Active: true, ...npc })),
  `${NPC_CONFIG_DIR}/NPC_`,
);

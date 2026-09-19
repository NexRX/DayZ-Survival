import { Npc, NPC_CONFIG_DIR, NPCType } from "../types/npc.ts";
import { configToRecord, PLACEHOLDER_ORIENTATION, PLACEHOLDER_POSITION } from "./common.ts";

export const NPC_TASKMASTER_DANIELS: Npc = {
  ID: 1,
  ClassName: "ExpansionQuestNPCDenis",
  Position: PLACEHOLDER_POSITION,
  Orientation: PLACEHOLDER_ORIENTATION,
  NPCName: "Taskmaster Daniels",
  DefaultNPCText: "You need something? Talk to me if you're looking for work.",
  NPCLoadoutFile: "TaskmasterLoadout",
  Killable: false,
  NPCType: NPCType.GiveAndTurnIn,
};

export const NPC_GUARD_BORIS: Npc = {
  ID: 2,
  ClassName: "ExpansionQuestNPCBoris",
  Position: PLACEHOLDER_POSITION,
  Orientation: PLACEHOLDER_ORIENTATION,
  NPCName: "Compound Guard",
  DefaultNPCText: "Move along. Taskmaster's business is his own.",
  NPCLoadoutFile: "GuardLoadout",
  Killable: false,
  NPCType: NPCType.TurnIn,
};

export const NPC_GUARD_KAITO: Npc = {
  ID: 3,
  ClassName: "ExpansionQuestNPCKaito",
  Position: PLACEHOLDER_POSITION,
  Orientation: PLACEHOLDER_ORIENTATION,
  NPCName: "Compound Guard",
  DefaultNPCText: "Eyes open. Wouldn't want trouble finding the Taskmaster.",
  NPCLoadoutFile: "GuardLoadout",
  Killable: false,
  NPCType: NPCType.TurnIn,
};

export const NPC_BLACKMARKET_SERY: Npc = {
  ID: 4,
  ClassName: "ExpansionQuestNPCKaito", // TODO CHANGE
  Position: PLACEHOLDER_POSITION,
  Orientation: PLACEHOLDER_ORIENTATION,
  NPCName: "Sery",
  DefaultNPCText: "I don't do introductions. You got what I want, or you know where to get it.",
  NPCLoadoutFile: "TraderBlueLoadout", // TODO CHANGE
  Killable: false,
  NPCType: NPCType.GiveAndTurnIn,
};

export const NPC_SCOUT_JAMES: Npc = {
  ID: 4,
  ClassName: "ExpansionQuestNPCKaito", // TODO CHANGE
  Position: PLACEHOLDER_POSITION,
  Orientation: PLACEHOLDER_ORIENTATION,
  NPCName: "James",
  DefaultNPCText: "Shhh. How did you know I was here, did the Taskmaster send you?",
  NPCLoadoutFile: "TraderBlueLoadout", // TODO CHANGE - Ghilie Suit
  Killable: false,
  NPCType: NPCType.TurnIn,
};

const ALL_NPCS: Npc[] = [
  NPC_TASKMASTER_DANIELS,
  NPC_GUARD_BORIS,
  NPC_GUARD_KAITO,
  NPC_BLACKMARKET_SERY,
  NPC_SCOUT_JAMES,
];

export const ALL_NPC_CONFIGS = configToRecord(
  ALL_NPCS,
  `${NPC_CONFIG_DIR}/NPC_`,
);

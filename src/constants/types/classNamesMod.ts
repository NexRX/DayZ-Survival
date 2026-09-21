export const AI_NPCS_READ_ONLY = [
  "eAI_SurvivorM_Denis",
  "eAI_SurvivorM_Cyril",
  "eAI_SurvivorM_Denis",
  "eAI_SurvivorM_Elias",
  "eAI_SurvivorM_Francis",
  "eAI_SurvivorM_Guo",
  "eAI_SurvivorM_Hassan",
  "eAI_SurvivorM_Indar",
  "eAI_SurvivorM_Jose",
  "eAI_SurvivorM_Kaito",
  "eAI_SurvivorM_Lewis",
  "eAI_SurvivorM_Manua",
  "eAI_SurvivorM_Mirek",
  "eAI_SurvivorM_Niki",
  "eAI_SurvivorM_Oliver",
  "eAI_SurvivorM_Peter",
  "eAI_SurvivorM_Quinn",
  "eAI_SurvivorM_Rolf",
  "eAI_SurvivorM_Seth",
  "eAI_SurvivorM_Taiki",
  "eAI_SurvivorF_Baty",
  "eAI_SurvivorF_Eva",
  "eAI_SurvivorF_Frida",
  "eAI_SurvivorF_Gabi",
  "eAI_SurvivorF_Helga",
  "eAI_SurvivorF_Irena",
  "eAI_SurvivorF_Judy",
  "eAI_SurvivorF_Keiko",
  "eAI_SurvivorF_Linda",
  "eAI_SurvivorF_Maria",
  "eAI_SurvivorF_Naomi",
] as const;
export const AI_NPCS = [...AI_NPCS_READ_ONLY];
export type AINpcClassNames = typeof AI_NPCS[number];

export const QUEST_NPCS_READ_ONLY = [
  "ExpansionQuestNPCBoris",
  "ExpansionQuestNPCDenis",
  "ExpansionQuestNPCElias",
  "ExpansionQuestNPCFrancis",
  "ExpansionQuestNPCGuang",
  "ExpansionQuestNPCHassan",
  "ExpansionQuestNPCIndika",
  "ExpansionQuestNPCJose",
  "ExpansionQuestNPCKaito",
  "ExpansionQuestNPCLewis",
  "ExpansionQuestNPCManji",
  "ExpansionQuestNPCNiki",
  "ExpansionQuestNPCOliver",
  "ExpansionQuestNPCPeter",
  "ExpansionQuestNPCQuinn",
  "ExpansionQuestNPCRolf",
  "ExpansionQuestNPCSeth",
  "ExpansionQuestNPCTaiga",
] as const;
export const QUEST_NPCS = [...QUEST_NPCS_READ_ONLY];
export type QuestNpcClassNames = typeof QUEST_NPCS[number];

export const BANDIT_NPCS_READ_ONLY = [
  "BanditAI_Boris",
  "BanditAI_Denis",
  "BanditAI_Elias",
  "BanditAI_Francis",
  "BanditAI_Guang",
  "BanditAI_Hassan",
  "BanditAI_Indika",
  "BanditAI_Jose",
  "BanditAI_Kaito",
  "BanditAI_Lewis",
  "BanditAI_Manji",
  "BanditAI_Niki",
  "BanditAI_Oliver",
  "BanditAI_Peter",
  "BanditAI_Quinn",
  "BanditAI_Rolf",
  "BanditAI_Seth",
  "BanditAI_Taiga",
] as const;
export const BANDIT_NPCS = [...BANDIT_NPCS_READ_ONLY];
export type BanditNpcClassNames = typeof BANDIT_NPCS[number];

export type NPCClassName = QuestNpcClassNames | AINpcClassNames | BanditNpcClassNames;

export type NPCClassNames = NPCClassName[] | readonly NPCClassNames[];

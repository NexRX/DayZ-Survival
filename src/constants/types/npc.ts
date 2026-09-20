import { PROFILE_DIR } from "../paths.ts";
import { BoolNum, Vec3 } from "./common.ts";

/** Config path constant — the mod reads from this path. */
export const NPC_CONFIG_DIR = `${PROFILE_DIR}/ExpansionMod/Quests/NPCs`;

export enum NPCEmoteID {
  None = -1,
  GREETING = 1,
  SOS = 2,
  HEART = 3,
  TAUNT = 4,
  LYINGDOWN = 5,
  TAUNTKISS = 6,
  FACEPALM = 7,
  TAUNTELBOW = 8,
  THUMB = 9,
  THROAT = 10,
  SUICIDE = 11,
  DANCE = 12,
  CAMPFIRE = 13,
  SITA = 14,
  SITB = 15,
  THUMBDOWN = 16,
  DABBING = 32,
  TIMEOUT = 35,
  CLAP = 39,
  POINT = 40,
  SILENT = 43,
  SALUTE = 44,
  RPS = 45,
  WATCHING = 46,
  HOLD = 47,
  LISTENING = 48,
  POINTSELF = 49,
  LOOKATME = 50,
  TAUNTTHINK = 51,
  MOVE = 52,
  DOWN = 53,
  COME = 54,
  RPS_R = 55,
  RPS_P = 56,
  RPS_S = 57,
  NOD = 58,
  SHAKE = 59,
  SHRUG = 60,
  SURRENDER = 61,
  VOMIT = 62,
  DEBUG = 1000,
}

/** ExpansionQuestNPCType from the installed Expansion Quests build. */
export enum NPCType {
  NORMAL = 0,
  OBJECT = 1,
  AI = 2,
}

export type AINpcClassNames =
  | "eAI_SurvivorM_Denis"
  | "eAI_SurvivorM_Cyril"
  | "eAI_SurvivorM_Denis"
  | "eAI_SurvivorM_Elias"
  | "eAI_SurvivorM_Francis"
  | "eAI_SurvivorM_Guo"
  | "eAI_SurvivorM_Hassan"
  | "eAI_SurvivorM_Indar"
  | "eAI_SurvivorM_Jose"
  | "eAI_SurvivorM_Kaito"
  | "eAI_SurvivorM_Lewis"
  | "eAI_SurvivorM_Manua"
  | "eAI_SurvivorM_Mirek"
  | "eAI_SurvivorM_Niki"
  | "eAI_SurvivorM_Oliver"
  | "eAI_SurvivorM_Peter"
  | "eAI_SurvivorM_Quinn"
  | "eAI_SurvivorM_Rolf"
  | "eAI_SurvivorM_Seth"
  | "eAI_SurvivorM_Taiki"
  | "eAI_SurvivorF_Baty"
  | "eAI_SurvivorF_Eva"
  | "eAI_SurvivorF_Frida"
  | "eAI_SurvivorF_Gabi"
  | "eAI_SurvivorF_Helga"
  | "eAI_SurvivorF_Irena"
  | "eAI_SurvivorF_Judy"
  | "eAI_SurvivorF_Keiko"
  | "eAI_SurvivorF_Linda"
  | "eAI_SurvivorF_Maria"
  | "eAI_SurvivorF_Naomi";

export type QuestNpcClassNames =
  | "ExpansionQuestNPCBoris"
  | "ExpansionQuestNPCDenis"
  | "ExpansionQuestNPCElias"
  | "ExpansionQuestNPCFrancis"
  | "ExpansionQuestNPCGuang"
  | "ExpansionQuestNPCHassan"
  | "ExpansionQuestNPCIndika"
  | "ExpansionQuestNPCJose"
  | "ExpansionQuestNPCKaito"
  | "ExpansionQuestNPCLewis"
  | "ExpansionQuestNPCManji"
  | "ExpansionQuestNPCNiki"
  | "ExpansionQuestNPCOliver"
  | "ExpansionQuestNPCPeter"
  | "ExpansionQuestNPCQuinn"
  | "ExpansionQuestNPCRolf"
  | "ExpansionQuestNPCSeth"
  | "ExpansionQuestNPCTaiga";

export type NPCClassName = QuestNpcClassNames | AINpcClassNames;

export type LoadoutName =
  | "AirfieldLoadout"
  | "BlackLoadout"
  | "GuardLoadout"
  | "MMG_SNAFU_Tan"
  | "PoliceLoadoutMMG"
  | "Sea_VanillaW_Admiral"
  | "TraderGroup"
  | "AirfieldSniperLoadout_dark_woodland"
  | "Captain_Loadout"
  | "HeliPilot"
  | "MMGTanLoadout"
  | "Quest_Survivor_noWeapon"
  | "Ship_eAI_Pirates_Loadout_1"
  | "TraderVehicleLoadout"
  | "AirfieldSniperLoadout"
  | "CultistLoadout"
  | "HumanLoadout_1"
  | "MulticamBlackLoadout"
  | "ReshalaGuardsLoadout"
  | "Ship_eAI_Pirates_Loadout_3"
  | "TTSKOLoadout"
  | "AlpineLoadout"
  | "GhillieWoodland"
  | "GhillieWinter"
  | "GhillieMossy"
  | "GhillieTan"
  | "DarkWoodlandLoadout"
  | "HumanLoadout"
  | "MulticamLoadout"
  | "ReshalaLoadout"
  | "Ship_eAI_Pirates_Loadout"
  | "UCPLoadout"
  | "ATACSLoadout"
  | "EastLoadout"
  | "KillaLoadout"
  | "MulticamTropicLoadout"
  | "RoguesLoadout"
  | "ShturmanGuardsLoadout"
  | "WestLoadout"
  | "BanditAK"
  | "EFTRaidersLoadout"
  | "KnightLoadout"
  | "NBCLoadout_1"
  | "SanitarGuardsLoadout"
  | "ShturmanLoadout"
  | "Winter_Bandit"
  | "BanditAK_MMG"
  | "ERDLLoadout"
  | "Knights"
  | "NBCLoadout"
  | "SanitarLoadout"
  | "SurvivorLoadout"
  | "YeetBrigadeLoadout"
  | "Bandit_Black"
  | "FireFighterLoadout"
  | "MMG_SNAFU_Basic_NEW"
  | "PilotNPCExtraction"
  | "SantaLoadout"
  | "SurvivorLoadoutTraders"
  | "YellowKingLoadout"
  | "BanditLoadout"
  | "FreshSpawnLoadout"
  | "MMG_SNAFU_Black"
  | "PlayerFemaleSuitLoadout"
  | "ScavsLoadout"
  | "TagillaLoadout"
  | "Bandits_ATM"
  | "GlukharGuardsLoadout"
  | "MMG_SNAFU_DarkWoodland"
  | "PlayerMaleSuitLoadout"
  | "SeaAlpha_MMG_Snafu_Admiral"
  | "TanLoadout"
  | "BigPipeLoadout"
  | "GlukharLoadout"
  | "MMG_SNAFU_Erdl"
  | "PlayerSurvivorLoadout"
  | "SeaBravoMMG_Snafu_Admiral"
  | "TaskmasterLoadout"
  | "BirdeyeLoadout"
  | "GorkaLoadout"
  | "MMG_SNAFU_Green"
  | "PoliceLoadout"
  | "SeaCharlie_MMG_Snafu_Admiral"
  | "TraderBlueLoadout";

export interface Npc {
  ConfigVersion?: number;
  ID: number;
  ClassName: QuestNpcClassNames;
  Position: Vec3;
  Orientation: Vec3;
  NPCName: string;
  DefaultNPCText: string;
  NPCLoadoutFile: LoadoutName;
  NPCInteractionEmoteID?: NPCEmoteID;
  NPCQuestCancelEmoteID?: NPCEmoteID;
  NPCQuestStartEmoteID?: NPCEmoteID;
  NPCQuestCompleteEmoteID?: NPCEmoteID;
  NPCType?: NPCType;
  Active: BoolNum;
}

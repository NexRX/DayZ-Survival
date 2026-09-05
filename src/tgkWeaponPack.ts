// TGK-WeaponPack (@TGK-WeaponPack, aka "SOBR"/"SM_" weapon pack) adds ~280
// Russian-special-forces-themed weapons/attachments/melee items.
//
// The mod ships a cfgspawnabletypes.xml (root <spawnabletypes>, not
// <types>), so src/modTypes.ts's generic merger correctly skips it - there's
// no types.xml shipped, so every classname below is authored from scratch.
//
// Follows the same nominal=0, trader-only-stub pattern as @Optics (see
// src/optics.ts): nothing here spawns naturally, everything is earned via
// the trader's stock/restock system, with rarity controlled by
// src/data/marketGapFill.json's tier assignment (see market.ts's
// TIER_MAX_STOCK).
//
// Additive merge only, same rule as modTypes.ts/moreCars.ts/optics.ts: a
// <type name="..."> already present is never touched or duplicated.

import { ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@TGK-WeaponPack";

export const AMMUNITION = [
  "Sobr_Ammo_762x25",
  "SM_Ammo_366TKM_BP_M",
  "SM_Ammo_366TKM_EKO",
  "SM_Ammo_366TKM_FMJ",
  "SM_Ammo_366TKM_GEKSA",
  "SM_Ammo_338_Lapua_Magnum_AP",
  "SM_Ammo_338_Lapua_Magnum_FMJ",
  "SM_Ammo_338_Lapua_Magnum_UPZ",
  "SM_Ammo_338_Lapua_Magnum_TAC_X",
  "SM_Ammo_762x51_M80",
  "SM_Ammo_762x51_BPZ_FMJ",
  "SM_Ammo_762x51_M61",
  "SM_Ammo_762x51_M62_Tracer",
  "SM_Ammo_762x51_M993",
  "SM_Ammo_762x51_TPZ_SP",
  "SM_Ammo_762x51_Ultra_Nosler",
  "SM_Ammo_792x57",
];

export const AMMUNITION_BOXES = [
  "Sobr_AmmoBox_762x25_35Rnd",
  "SM_AmmoBox_792x57",
  "SM_AmmoBox_338_LM_AP",
  "SM_AmmoBox_338_LM_FMJ",
  "SM_AmmoBox_338_LM_UPZ",
  "SM_AmmoBox_338_LM_TAC_X",
  "SM_AmmoBox_366TKM_BP_M",
  "SM_AmmoBox_366TKM_EKO",
  "SM_AmmoBox_366TKM_FMJ",
  "SM_AmmoBox_366TKM_GEKSA",
  "SM_AmmoBox_762x51_M80",
  "SM_AmmoBox_762x51_BPZ_FMJ",
  "SM_AmmoBox_762x51_M61",
  "SM_AmmoBox_762x51_M62_Tracer",
  "SM_AmmoBox_762x51_M993",
  "SM_AmmoBox_762x51_TPZ_SP",
  "SM_AmmoBox_762x51_Ultra_Nosler",
];

// SM_Ammo_Empty_Crate spawns automatically when a full crate is opened;
// included so it's typed, but excluded from the market manifest (same
// treatment as other cosmetic byproducts, e.g. bmmChemicalZombie.ts).
export const AMMUNITION_CRATES = [
  "SM_Ammo_Empty_Crate",
  "SM_AmmoCrate_338_LM_AP",
  "SM_AmmoCrate_338_LM_FMJ",
  "SM_AmmoCrate_338_LM_UPZ",
  "SM_AmmoCrate_338_LM_TAC_X",
  "SM_AmmoCrate_366TKM_BP_M",
  "SM_AmmoCrate_366TKM_EKO",
  "SM_AmmoCrate_366TKM_FMJ",
  "SM_AmmoCrate_366TKM_GEKSA",
  "SM_AmmoCrate_762x51_M80",
  "SM_AmmoCrate_762x51_BPZ_FMJ",
  "SM_AmmoCrate_762x51_M61",
  "SM_AmmoCrate_762x51_M62_Tracer",
  "SM_AmmoCrate_762x51_M993",
  "SM_AmmoCrate_762x51_TPZ_SP",
  "SM_AmmoCrate_762x51_Ultra_Nosler",
];

export const MAGAZINES = [
  "Sobr_mag_9A_91_20Rnd",
  "Sobr_Mag_AK74_60Rnd",
  "Sobr_Mag_AK74_45Rnd",
  "Sobr_Mag_AK12_Izhmash_std_30Rnd",
  "Sobr_Mag_RPK16_Izhmash_Drum_95Rnd",
  "Sobr_Mag_AK74_Magpul_PMAG_Gen_M3_30Rnd",
  "Sobr_Mag_AKM_Magpul_PMAG_Gen_M3_Black_30Rnd",
  "Sobr_Mag_AKM_Magpul_PMAG_Gen_M3_Beige_30Rnd",
  "Sobr_Mag_Glock_Big_Stick_33Rnd",
  "Sobr_Mag_Glock_SGM_Tactical_50Rnd",
  "Sobr_Mag_STANAG_30Rnd_Black",
  "Sobr_Mag_STANAG_Magpul_PMAG_Drum_60Rnd",
  "Sobr_Mag_M14_20Rnd",
  "Sobr_Mag_M14_60Rnd",
  "Sobr_Mag_MP5_60Rnd",
  "Sobr_Mag_PPSh_41_35Rnd",
  "Sobr_Mag_PPSh_41_71Rnd",
  "Sobr_Mag_RPD_100Rnd",
  "Sobr_Mag_SS2V5_30Rnd_Black",
  "Sobr_Mag_SVT_40_10Rnd",
  "SM_Magazine_HK417_G28_10Rnd",
  "SM_Magazine_HK417_G28_20Rnd",
  "SM_Magazine_KAC_10Rnd",
  "SM_Magazine_KAC_20Rnd",
  "SM_Magazine_Magpul_Pmag_20_SR_LR_Gen_M3_20Rnd",
  "SM_Magazine_VPO_215_4Rnd",
  "SM_Magazine_MK18_Mjolnir_10Rnd",
  "SM_Magazine_Remington_700_5Rnd_Black",
  "SM_Magazine_Remington_700_10Rnd_Black",
  "SM_Magazine_M2010_Snow_Owl_5Rnd",
  "SM_Magazine_T5000_Orsis_5Rnd_Black",
  "Sobr_Mag_AKM_Magpul_PMAG_Gen_M3_Banana_30Rnd",
  "SM_Mag_TT_33_8Rnd",
  "SM_Mag_CP3M_130_VSS_VAL_30Rnd",
  "SM_Mag_SVD_20Rnd",
  "SM_Mag_VPO_205_Black_10Rnd",
  "SM_Mag_CZ_Shadow_2_Compact_15Rnd_Blue",
  "SM_Mag_CZ_Shadow_2_Compact_15Rnd_Red",
  "SM_Mag_Beretta_M9A3_17Rnd_BLK",
  "SM_Mag_Beretta_M9A3_17Rnd_FDE",
  "SM_Mag_DVL_10_Diversant_10Rnd",
  "SM_Mag_PKP_100Rnd",
  "SM_Mag_PKP_200Rnd",
  "SM_Mag_Agram_2000_32Rnd",
  "SM_Mag_Origin_12_20Rnd",
  "SM_Mag_Pancor_JackHammer_10Rnd",
  "SM_Mag_VRBP_100_5Rnd",
  "SM_Mag_Stanag_30Rnd_Strip_Blue",
  "SM_Mag_Stanag_30Rnd_Strip_Green",
  "SM_Mag_Stanag_30Rnd_Strip_Pink",
  "SM_Mag_Stanag_30Rnd_Strip_Yellow",
  "SM_Mag_Killo_141_60Rnd",
];

export const SUPPRESSORS_AND_MUZZLES = [
  "Sobr_9A_91_Suppressor",
  "AK_Suppressor_Black",
  "AK_Suppressor_Beige",
  "AK_Suppressor_Camo",
  "Sobr_Suppressor_AK_Pouch_Black",
  "Sobr_Suppressor_AK_Pouch_Beige",
  "Sobr_Suppressor_AK_Pouch_Camo",
  "M4_Suppressor_Black",
  "M4_Suppressor_Beige",
  "M4_Suppressor_Camo",
  "Sobr_Suppressor_M4_Pouch_Black",
  "Sobr_Suppressor_M4_Pouch_Beige",
  "Sobr_Suppressor_M4_Pouch_Camo",
  "Pistol_Suppressor_Black",
  "Pistol_Suppressor_Beige",
  "Pistol_Suppressor_Camo",
  "Sobr_Suppressor_Pistol_Pouch_Black",
  "Sobr_Suppressor_Pistol_Pouch_Beige",
  "Sobr_Suppressor_Pistol_Pouch_Camo",
  "SM_Suppressor_Rotor_43",
  "SM_Compensator_HK417_G28_Prolonged",
  "SM_Suppressor_HK417_G28_QD",
  "SM_Compensator_MDR_556x45",
  "SM_Compensator_MDR_762x51",
  "SM_Compensator_VPO_215",
  "SM_Muzzle_MK18_Mjolnir_Black",
  "SM_Muzzle_Remington_700_Black",
  "SM_Muzzle_T5000_Orsis_Black",
  "SM_Muzzle_AK_JMac_Customs_RRD_4C_Multi",
  "SM_Muzzle_AK_DTK_1",
  "SM_Muzzle_AK_Hexagon_Reactor",
  "SM_Muzzle_AK_Izhmash_AK105",
  "SM_Muzzle_AK_Izhmash_AKS_74U",
  "SM_Muzzle_AK_PWS_CQB",
  "SM_Muzzle_AK_SRVV",
  "SM_Muzzle_AK_Izhmash_6p20_0_20",
  "SM_Suppressor_AK_tgp_a",
  "SM_Suppressor_AK_Hexagon_AKM",
  "SM_Suppressor_AK_PBS_4",
  "SM_Muzzle_RD_704_Dead_Air_Keymount",
  "SM_Al_338_LM_Tactical_Sound_Moderator_Black",
  "SM_Muzzle_AR10_CMMG_SV_BRAKE",
  "SM_Suppressor_TT_33_Black",
  "SM_Muzzle_TT_33_Black",
  "SM_Suppressor_SVD_S_Rotor43_DTK_Black",
  "SM_Suppressor_12ga",
];

export const HANDGUARDS = [
  "Sobr_AK_Krebs_UFM_LongHndgrd_Black",
  "Sobr_AK_Magpul_ZhukovHndgrd_Blk",
  "Sobr_AK_Magpul_ZhukovHndgrd_Fde",
  "Sobr_AK_Magpul_ZhukovHndgrd_Plm",
  "Sobr_AK_Red_Head_AgressorHndgrd_Black",
  "Sobr_AK_TDI_AKM_LHndgrd_Black",
  "Sobr_AK_TDI_AKM_LHndgrd_Gld",
  "Sobr_AK_TDI_AKM_LHndgrd_Red",
  "Sobr_AK_Vltor_CMRDHndgrd_Black",
  "Sobr_AK_Hexagon_Hndgrd_Black",
  "Sobr_AK_Hexagon_Hndgrd_Red",
  "Sobr_M4_Adar_Wood_Black",
  "Sobr_M4_AeroknoxHndgrd_Black",
  "Sobr_M4_Alexander_ArmsHndgrd_Black",
  "Sobr_M4_DD_Ris_FSPHndgrd_Black",
  "Sobr_M4_Geissele_SMRHndgrd_Beige",
  "Sobr_M4_Sai_QD_RailHndgrd_Beige",
  "Sobr_M4_Sai_QD_Rail_LongHndgrd_Beige",
  "Sobr_M4_Unique_Ars_Wind_and_SkullHndgrd_Black",
  "Sobr_M4_War_Sport_LVOA_CHndgrd_Black",
  "Sobr_M4_War_Sport_LVOA_Chndgrd_Grey",
  "Sobr_M4_War_Sport_LVOA_Chndgrd_Beige",
  "SM_Handguard_HK417_G28_Extended_Free_Float",
  "SM_Handguard_HK417_G28_Patrol",
  "SM_Handguard_MDR_BLK",
  "SM_Handguard_MDR_FDE",
  "SM_Handguard_MK18_Mjolnir_Tan",
  "SM_Handguard_Snow_Owl",
  "SM_Handguard_T5000_Orsis_Black",
  "SM_RD_704_SLR_ION_LiteHndgrd_Black",
  "SM_AR15_JP_RSASSHndgrd_FDE",
  "SM_AR10_Noveske_SWS_N6_SplitHndgrd_Black",
  "SM_AR10_Noveske_SWS_N6Hndgrd_Black",
  "SM_AR10_Lancer_LCH7_M_LOCKHndgrd_Black",
  "SM_AR10_KAC_URX_4Hndgrd_Black",
  "SM_AR10_CMMG_MK3_RML15_M_LOCKHndgrd_Black",
  "SM_AR10_CMMG_MK3_RML9_M_LOCKHndgrd_Black",
  "SM_SVD_S_CAA_XRS_DRGHndgrd_Black",
  "SM_SVD_S_Izhmash_STDHndgrd_Black",
  "SM_SVD_S_SAG_MK1Hndgrd_Black",
  "SM_Handguard_VPO_205_Black",
  "SM_FN2000_Foregrip_Monolit_Black",
  "SM_FN2000_Foregrip_Round_Black",
  "SM_FN2000_Foregrip_Round_TR_Black",
  "SM_FN2000_Foregrip_Trirail_Black",
  "SM_Handguard_AKS_74u_Alfa_Arms_Goliaf",
  "SM_Handguard_AKS_74u_Caa_Xrsu47su",
  "SM_Handguard_AKS_74u_Zenit_B11",
  "SM_Handguard_PKP_Zenitco",
];

export const BUTTSTOCKS = [
  "Sobr_9A_91_Buttstock",
  "Sobr_AK_Fab_Defense_UasBttstck_Black",
  "Sobr_AK_Magpul_ZhukovBttstck_Black",
  "Sobr_AK_ProMag_ArchangelBttstck_Black",
  "Sobr_AK_Zenit_1_Bttstck_Black",
  "Sobr_AK_Zenit_3_Bttstck_Black",
  "Sobr_AK_Hexagon_KochergaBttstck_Red",
  "Sobr_AK_Hexagon_KochergaBttstck_Black",
  "Sobr_M4_Double_Star_ACE_Socom_Gen_4Bttstck_Black",
  "Sobr_M4_Ergo_F93_ProBttstck_Black",
  "Sobr_M4_FAB_Defense_GLRBttstck_Black",
  "Sobr_M4_Magpul_PRS_GEN2Bttstck_FDE",
  "Sobr_M4_Magpul_UBR_GEN2Bttstck_Black",
  "Sobr_M4_Magpul_UBR_GEN2Bttstck_FDE",
  "Sobr_M4_Strike_Industries_Viper_ModBttstck_Black",
  "Sobr_M4_Troy_M7A1_PDWBttstck_Black",
  "Sobr_M4_Troy_M7A1_PDWBttstck_FDE",
  "SM_Buttstock_HK417_G28_Adj",
  "SM_Buttstock_HK417_G28_E2",
  "SM_Buttstock_T5000_Orsis_Black",
  "SM_SVD_IzhmashBttstck_Black",
  "SM_Buttstock_VPO_205_Black",
  "SM_AKS74u_Izhmash_stdBttstck",
  "SM_Buttstock_PKP_Zenitco",
];

export const PISTOLGRIPS = [
  "SM_AK_Pistolgrip_Aeroknox_Scorpius_Black",
  "SM_AK_Pistolgrip_AK_12_Black",
  "SM_AK_Pistolgrip_Custom_Arms_AGS_74_PRO_Sniper_Kit_Black",
  "SM_AK_Pistolgrip_FAB_Defense_AGR_47_FDE",
  "SM_AK_Pistolgrip_KGB_MG_47_FDE",
  "SM_AK_Pistolgrip_KGB_MG_47_RED",
  "SM_AK_Pistolgrip_Strike_Industries_Enhanced_BLK",
  "SM_AK_Pistolgrip_Strike_Industries_Enhanced_FDE",
  "SM_AK_Pistolgrip_TangoDown_Battle_Grip_BLK",
  "SM_AK_Pistolgrip_TangoDown_Battle_Grip_FDE",
  "SM_AK_Pistolgrip_TAPCO_SAW_Style_BLK",
  "SM_AK_Pistolgrip_TAPCO_SAW_Style_FDE",
  "SM_AK_Pistolgrip_Zenit_PK_3_BLK",
  "SM_M4_Pistolgrip_Aeroknox_Orion_Grip_Black",
  "SM_M4_Pistolgrip_DLG_Tactical_123_Black",
  "SM_M4_Pistolgrip_F1_FireArms_Skeletonized_Style_1_Black",
  "SM_M4_Pistolgrip_F1_FireArms_Skeletonized_Style_2_Black",
  "SM_M4_Pistolgrip_F1_FireArms_Skeletonized_Style_2_PC_Black",
  "SM_M4_Pistolgrip_HK_Ergo_PSG_1_Style_Black",
  "SM_M4_Pistolgrip_Magpul_MIAD_FDE",
  "SM_M4_Pistolgrip_Naroh_Arms_GRAL_S_Black",
  "SM_M4_Pistolgrip_Tactical_Dynamics_Hexgrip_Black",
  "SM_M4_Pistolgrip_Tactical_Dynamics_Skeletonized_Grip_Black",
  "SM_Pistolgrip_TT_33_NoName_Hogue_Like_Black",
  "SM_Pistolgrip_TT_33_PM_Laser_TT_206_Black",
  "SM_Pistolgrip_TT_33_Razor_Arms_Rubber_Grip_Black",
  "SM_Pistolgrip_TT_33_TOZ_TT_Gold",
  "SM_Pistolgrip_TT_33_TOZ_TT_STD_Black",
];

export const FOREGRIPS = [
  "SM_Foregrip_BCM_Mod_Black",
  "SM_Foregrip_CKIB_Std_Black",
  "SM_Foregrip_Fortis_Shift_Black",
  "SM_Foregrip_Hera_Arms_CQR_Black",
  "SM_Foregrip_HK_Sturmgriff_Desert",
  "SM_Foregrip_KAC_Vertical_Black",
  "SM_Foregrip_Magpul_AFG_Black",
  "SM_Foregrip_Magpul_AFG_Desert",
  "SM_Foregrip_Magpul_AFG_Forest_Green",
  "SM_Foregrip_Magpul_AFG_Olive",
  "SM_Foregrip_Magpul_RVG_Black",
  "SM_Foregrip_Magpul_RVG_Desert",
  "SM_Foregrip_RTM_Osovets_P2_Black",
  "SM_Foregrip_RTM_Osovets_P2_Desert",
  "SM_Foregrip_RTM_Pillau_Black",
  "SM_Foregrip_RTM_Pillau_Desert",
  "SM_Foregrip_RTM_Pillau_P2_Red",
  "SM_Foregrip_Stark_SE_5_Express_Forward_Black",
  "SM_Foregrip_Stark_SE_5_Express_Forward_Desert",
  "SM_Foregrip_Strike_Industries_Cobra_Tactical_Black",
  "SM_Foregrip_Strike_Industries_Cobra_Tactical_Desert",
  "SM_Foregrip_TangoDown_Stubby_BGV_MK46K_Black",
  "SM_Foregrip_TangoDown_Stubby_BGV_MK46K_Desert",
  "SM_Foregrip_TangoDown_Stubby_BGV_MK46K_Gray",
  "SM_Foregrip_Tactical_Dynamics_Skeletonized_Black",
  "SM_Foregrip_Viking_Tactics_UVG_Black",
  "SM_Foregrip_Zenit_PK1_B25u_Black",
  "SM_Foregrip_Zenit_PK0_Black",
  "SM_Foregrip_Zenit_PK1_Black",
  "SM_Foregrip_Zenit_PK2_Black",
  "SM_Foregrip_Zenit_PK4_Black",
  "SM_Foregrip_Zenit_PK5_Black",
  "SM_Foregrip_Zenit_PK6_Black",
];

export const FLASHLIGHTS = [
  "SM_Flashlight_Zenit_2u",
  "SM_Flashlight_Steiner_LAS_TAC_2",
  "SM_Flashlight_Insight_WMX_200",
];

export const RECEIVERS = [
  "Sobr_AK74_Reciever_Black",
  "Sobr_AK_Akademia_Bastion_Black",
  "SM_RD_704_Reciever_Black",
];

export const OPTICS = ["Sobr_SVT_40_Optic"];

export const OTHERS = [
  "SM_Stock_Remington700_promag_archangel_Black",
  "SM_Glock_Mount_Aimtech_Tiger_Shark_Black",
  "SM_AKS74u_Reciever_Izhmash_std",
  "SM_AK_Tube_Adapter",
  "SM_AKS74u_Tube_Adapter",
  "SM_SVD_Tube_Adapter",
];

export const KNIVES = [
  "SM_Melee_Bars_Hammer",
  "SM_Melee_Samurai_Katana_White",
  "SM_Melee_Samurai_Katana_Pouch",
  "SM_Melee_Shashka_Gold",
  "SM_Melee_Shashka_Pouch",
  "SM_Melee_SVT_40_Bayonet",
  "SM_Melee_Antique_Axe",
  "SM_Melee_Crash_Axe",
  "SM_Melee_Hiking_Axe",
  "SM_Melee_Ice_Axe_Red_Rebel",
  "SM_Melee_Kiba_Arms_Tactical_Tomahawk",
  "SM_Melee_Knife_Bars_A_2607_95x18",
  "SM_Melee_Knife_Bars_A_2607_Damask",
  "SM_Melee_Miller_Bros_Blades_M2_Tactical_Sword",
  "SM_Melee_Old_Hand_Scythe",
];

// Standard-issue rifles/carbines/shotguns/SMGs - common enough among the
// "SOBR"/special-forces roster that they're the Rare, not Legendary, tier
// (see marketGapFill.json's routing of this array).
export const RIFLES_STANDARD = [
  "Sobr_9A_91",
  "Sobr_M4A1",
  "Sobr_M4A1_Black",
  "Sobr_M4A1_Green",
  "Sobr_M4A1_Snow",
  "Sobr_M4A1_Desert",
  "Sobr_Heckler_and_Koch_MP5A4_Black",
  "Sobr_Heckler_and_Koch_MP5A4_Green",
  "Sobr_Heckler_and_Koch_MP5A4_Beige",
  "Sobr_Heckler_and_Koch_MP5A4_White",
  "Sobr_Heckler_and_Koch_MP5A4_Haki",
  "Sobr_PPSh_41",
  "Sobr_Remington_870",
  "Sobr_Remington_870_Black",
  "Sobr_Shotgun_Spas_12",
  "Sobr_SS2V5_Black",
  "SM_AK74",
  "SM_Rifle_MDR_556x45_BLK",
  "SM_Rifle_MDR_556x45_FDE",
  "SM_Rifle_MDR_762x51_BLK",
  "SM_Rifle_MDR_762x51_FDE",
  "SM_Rifle_VPO_215",
  "SM_Rifle_AK_Alpha_Black",
  "SM_Rifle_AK_Alpha_White",
  "SM_Rifle_Kar98k",
  "SM_Rifle_VPO_205_Black",
  "SM_AKM",
  "SM_AK101",
  "SM_FN2000_Black",
  "SM_FN2000_Tan",
  "SM_FN2000_White",
  "SM_FN2000_Camo_1",
  "SM_FN2000_Camo_2",
  "SM_FN2000_Camo_3",
  "SM_FN2000_Camo_4",
  "SM_AKS74U",
  "SM_AK102",
  "SM_AK103",
  "SM_AK104",
  "SM_AK105",
  "SM_Shotguns_Origin_12",
  "SM_Shotguns_Origin_12_Short",
  "SM_Shotguns_Pancor_JackHammer",
  "SM_Shotguns_VRBP_100",
];

// Heavy/exotic/precision weapons - machine guns, dedicated sniper rifles,
// the DMR/EBR variants - Legendary tier, the hardest-to-get weapons this
// mod offers.
export const RIFLES_HEAVY_AND_SNIPER = [
  "Sobr_M14_DMR",
  "Sobr_M14_EBR_Black",
  "Sobr_RPD",
  "Sobr_RPK",
  "Sobr_SVT_40",
  "SM_Rifle_HK417_G28",
  "SM_Rifle_MK18_Mjolnir",
  "SM_Weapon_Remington_700_Black",
  "SM_M2010_Snow_Owl",
  "SM_T5000_Orsis_Black",
  "SM_Rifle_RD_704_Black",
  "SM_Rifle_MK47_Mutant_Black",
  "SM_Rifle_SVD_S_Black",
  "SM_Sniper_Rifle_DVL_10_Diversant_Black",
  "SM_Sniper_Rifle_DVL_10_Diversant_Green",
  "SM_Submachine_Gun_PKP",
  "SM_Automatic_Rifle_Snow_Bars",
  "SM_Machine_Gun_Agram_2000",
  "SM_Automatic_Rifle_Killo_141",
];

export const PISTOLS = [
  "Sobr_Colt_1911",
  "SobrMods_Desert_Eagle_Japan_Edition",
  "SM_Glock_18c",
  "SM_Pistols_TT_33_Black",
  "SM_Pistols_TT_33_Gold",
  "SM_Pistol_CZ_Shadow_2_Compact_Blue",
  "SM_Pistol_CZ_Shadow_2_Compact_Red",
  "SM_Pistol_Beretta_M9A3_BLK",
  "SM_Pistol_Beretta_M9A3_FDE",
];

export const GRENADE_LAUNCHERS = ["SM_Grenade_Launcher_Milkor_M32A1_MSGL_40mm_FDE"];

// category/tag applied to every classname above, matching vanilla's own
// convention for the same item families (see e.g. db/types.xml's
// Ammo_762x39/Mag_STANAG_30Rnd/M4_Suppressor/M4A1/KitchenKnife entries -
// all real weapons/attachments use category="weapons", real melee tools
// use category="tools").
const WEAPON_GROUPS: string[][] = [
  AMMUNITION,
  AMMUNITION_BOXES,
  AMMUNITION_CRATES,
  MAGAZINES,
  SUPPRESSORS_AND_MUZZLES,
  HANDGUARDS,
  BUTTSTOCKS,
  PISTOLGRIPS,
  FOREGRIPS,
  FLASHLIGHTS,
  RECEIVERS,
  OPTICS,
  OTHERS,
  RIFLES_STANDARD,
  RIFLES_HEAVY_AND_SNIPER,
  PISTOLS,
  GRENADE_LAUNCHERS,
];

const TOOL_GROUPS: string[][] = [KNIVES];

function typeBlock(classname: string, category: "weapons" | "tools"): string {
  return `    <type name="${classname}">
        <nominal>0</nominal>
        <lifetime>14400</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="${category}"/>
    </type>`;
}

const TYPE_NAME = /<type name="([^"]+)">/g;

export async function ensureTgkWeaponPackWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(`${ECONOMY_TYPES_FILE} not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));

  let added = 0;
  for (const group of WEAPON_GROUPS) {
    for (const classname of group) {
      if (existingTypes.has(classname)) continue;
      typesText = typesText.replace("</types>", `${typeBlock(classname, "weapons")}\n</types>`);
      existingTypes.add(classname);
      added++;
    }
  }
  for (const group of TOOL_GROUPS) {
    for (const classname of group) {
      if (existingTypes.has(classname)) continue;
      typesText = typesText.replace("</types>", `${typeBlock(classname, "tools")}\n</types>`);
      existingTypes.add(classname);
      added++;
    }
  }

  if (added === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  ok(`Wired up ${MOD_NAME} (${added} classname(s))`);
}

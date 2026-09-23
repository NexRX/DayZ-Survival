import { MAIN_QUESTS } from "./quests/questsMain.ts";
import { SIDE_QUESTS } from "./quests/questsSide.ts";
import type {
  BookSettings,
  CraftingCategory,
  DescriptionCategory,
  RuleCategory,
} from "./types/book.d.ts";
import { FALSE, TRUE } from "./types/common.ts";
import changelog from "../../changelog.json" with { type: "json" };
import { ClassNameModded } from "./types/classNames.ts";

function descriptions(...texts: string[]) {
  return texts.map((DescriptionText) => {
    return { DescriptionText };
  });
}

function rules(sectionName: string, section: number, ...rules: string[]) {
  return {
    CategoryName: `${section}. ${sectionName}`,
    Rules: rules.map((RuleText, i) => {
      return {
        RuleParagraph: `${section}.${i}.`,
        RuleText,
      };
    }),
  };
}

function crafting(CategoryName: string, ...Results: ClassNameModded[]) {
  return {
    CategoryName,
    Results,
  };
}

const LINKS = [
  // {
  //   Name: "Discord",
  //   URL: "https://www.google.com/",
  //   IconName: "Discord",
  //   IconColor: -9270822,
  // },
  {
    Name: "Home - GitHub",
    URL: "https://github.com/NexRX/DayZ-Survival",
    IconName: "GitHub",
    IconColor: -16777216,
  },
  {
    Name: "Report An Issue",
    URL: "https://github.com/NexRX/DayZ-Survival/issues",
    IconName: "GitHub",
    IconColor: -65536,
  },
];

const DESCRIPTIONS: DescriptionCategory[] = [
  {
    CategoryName: "General Info",
    Descriptions: descriptions(
      "This is a project in progress. Please note that server content, settings, and configurations are subject to change at any time and may break unexpectedly. Thank you for your understanding!",
      "The goal of this server is to provide a hard survival environment to endure. There is the opportunity to do more than just survive (helis, base building, etc), but these are more like player dreams than goals.",
    ),
  },
  {
    CategoryName: "Experimental & Known Issues",
    Descriptions: descriptions(
      "The main story line has only been playtested up to the ACT I",
    ),
  },
  {
    CategoryName: "Headline Features",
    Descriptions: descriptions(
      "A fullmain questline with objectives, NPCs, and rewards",
      "Hardcore survival: Terje skills, medicine, radiation + Inedia stamina & hunger",
      "Full base building with expansion, custom keycards, code locks & fortifications",
      "Dynamic helicopters, 3rd person vehicles, and a fuel system",
      "Modded AI: custom zombies, bandits, moving convoys, AI warzones & dynamic missions",
      "Expansion traders, P2P trading board, and a custom economy",
      "NCPR crafting: armor, metalworking, sewing, quiver, nail gun & hunter bow",
      "OFG nuclear radiation zones with decontamination mechanics",
      "Chernarus overhaul, atmospheric lighting, skybox & early winter visuals",
      "Random events: air raids, mine fields, and ambient wildlife",
      "Horses, ravens, rats, creatures, and custom ambient animals",
      "Extended tourist map, caves, and 3D in-game map",
    ),
  },
  {
    CategoryName: "Changelog",
    Descriptions: changelog.Descriptions.map((c) => {
      return { DescriptionText: `${c.Date.split("T")[0]}: ${c.DescriptionText}` };
    }),
  },
  {
    CategoryName: "Main Quests (Spoilers)",
    Descriptions: MAIN_QUESTS.map((q) => {
      return {
        DescriptionText: `${q.Title}: ${q.Descriptions} <===> Rewards: ${
          q.Rewards?.map((r) => `${r.ClassName} (${r.Amount})`).join(", ")
        }`,
      };
    }),
  },
  {
    CategoryName: "Side Quests (Spoilers)",
    Descriptions: !SIDE_QUESTS.length
      ? [{ DescriptionText: "Coming Soon" }]
      : SIDE_QUESTS.map((q) => {
        return {
          DescriptionText: `${q.Title}: ${q.Descriptions} <===> Rewards: ${
            q.Rewards?.map((r) => `${r.ClassName} (${r.Amount})`).join(", ")
          }`,
        };
      }),
  },
];

const CRAFTING: CraftingCategory[] = [
  crafting("Accessories", "Armband_White", "EyePatch_Improvised"),
  crafting(
    "Backpacks",
    "CourierBag",
    "FurCourierBag",
    "FurImprovisedBag",
    "ImprovisedBag",
    "LeatherSack_Brown",
  ),
  crafting(
    "Base-Building",
    "ExpansionBarbedWireKit",
    "FenceKit",
    "ExpansionFloorKit",
    "ExpansionHeliPadKit",
    "ExpansionHescoKit",
    "ExpansionRampKit",
    "ShelterKit",
    "ExpansionStairKit",
    "TerritoryFlagKit",
    "ExpansionWallKit",
    "WatchTowerKit",
  ),
  crafting(
    "Camouflage",
    "Camonet",
    "GhillieAtt_Tan",
    "GhillieAtt_Mossy",
    "GhillieAtt_Woodland",
    "GhillieBushrag_Tan",
    "GhillieBushrag_Mossy",
    "GhillieBushrag_Woodland",
    "GhillieHood_Tan",
    "GhillieHood_Mossy",
    "GhillieHood_Woodland",
    "GhillieSuit_Tan",
    "GhillieSuit_Mossy",
    "GhillieSuit_Woodland",
    "GhillieTop_Tan",
    "GhillieTop_Mossy",
    "GhillieTop_Woodland",
  ),
  crafting("Cooking", "Fireplace", "Firewood", "HandDrillKit"),
  crafting("Fishing", "Bait", "BoneBait", "BoneHook", "ImprovisedFishingRod"),
  crafting(
    "Food",
    "CarpFilletMeat",
    "MackerelFilletMeat",
    "ExpansionMilkBottle",
    "Potato",
    "SlicedPumpkin",
  ),
  crafting(
    "Horticulture",
    "PepperSeeds",
    "PumpkinSeeds",
    "TomatoSeeds",
    "ZucchiniSeeds",
  ),
  crafting("Lights", "LongTorch", "Torch"),
  crafting("Medical Supplies", "BloodBagIV", "SalineBagIV", "Splint"),
  crafting("Melee Weapons", "NailedBaseballBat", "StoneKnife"),
  crafting("Storage", "WoodenCrate"),
  crafting(
    "Supplies",
    "BoarPelt",
    "BurlapSack",
    "BurlapStrip",
    "LongWoodenStick",
    "ExpansionLumber1",
    "ExpansionLumber1_5",
    "ExpansionLumber3",
    "Nail", // was nails
    "Netting",
    "Rag",
    "Rope",
    "SharpWoodenStick",
    "SmallStone",
    "TannedLeather",
    "WoodenPlank",
    "WoodenStick",
  ),
  crafting("Weapon Modifications", "SawedoffIzh18"),
  crafting("Weapon Attachments", "ImprovisedSuppressor"),
] as const;

const RULES: RuleCategory[] = [
  rules(
    "General",
    1,
    "Discrimination, extremist and racist statements or texts are taboo. [Kick, Repeat Ban]",
    "Repeat toxic behavior will not be tolerated. [Kick/Ban]",
    "The use of external programs, scripts and cheats is not tolerated [Ban].",
    "No base building within 500m of a military building or special POI (Point Of Interest) i.e. Rad Zones. [Base Deletion, Repeat Ban]",
    "Abusing unintended gameplay mechanics like trader buy/sell pricing, collision or anything that gives you a meta advantage. [Ban]",
  ),
];

export const BOOK_SETTINGS: BookSettings = {
  m_Version: 5,
  EnableStatusTab: TRUE,
  EnablePartyTab: TRUE,
  EnableServerInfoTab: TRUE,
  EnableServerRulesTab: TRUE,
  EnableTerritoryTab: TRUE,
  EnableBookMenu: TRUE,
  CreateBookmarks: FALSE,
  ShowHaBStats: TRUE,
  ShowPlayerFaction: FALSE,
  RuleCategories: RULES,
  DisplayServerSettingsInServerInfoTab: TRUE,
  SettingCategories: [],
  Links: LINKS,
  Descriptions: DESCRIPTIONS,
  CraftingCategories: CRAFTING,
  EnableCraftingRecipesTab: TRUE,
};

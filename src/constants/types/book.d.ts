import type { BoolNum } from "./common.ts";

export interface BookSettings {
  m_Version: number;
  EnableStatusTab: BoolNum;
  EnablePartyTab: BoolNum;
  EnableServerInfoTab: BoolNum;
  EnableServerRulesTab: BoolNum;
  EnableTerritoryTab: BoolNum;
  EnableBookMenu: BoolNum;
  CreateBookmarks: BoolNum;
  ShowHaBStats: BoolNum;
  ShowPlayerFaction: BoolNum;
  RuleCategories: RuleCategory[];
  DisplayServerSettingsInServerInfoTab: BoolNum;
  SettingCategories: SettingCategory[];
  Links: Link[];
  Descriptions: DescriptionCategory[];
  CraftingCategories: CraftingCategory[];
  EnableCraftingRecipesTab: BoolNum;
}

export interface RuleCategory {
  CategoryName: string;
  Rules: Rule[];
}

export interface Rule {
  RuleParagraph: string;
  RuleText: string;
}

export interface SettingCategory {
  CategoryName: string;
  Settings: Setting[];
}

export interface Setting {
  SettingTitle: string;
  SettingText: string;
  SettingValue: string;
}

export interface Link {
  Name: string;
  URL: string;
  IconName: string;
  IconColor: number;
}

export interface DescriptionCategory {
  CategoryName: string;
  Descriptions: Description[];
}

export interface Description {
  DescriptionText: string;
}

export interface CraftingCategory {
  CategoryName: string;
  Results: string[];
}

class CfgPatches {
  class DZSurvivalTraderRestock {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    requiredAddons[] = {"DZ_Data", "DZ_Scripts", "DayZExpansion_Core_Scripts",
                        "DayZExpansion_Market_Scripts", "JM_COT_Scripts"};
  };
};
class CfgMods {
  class DZSurvivalTraderRestock {
    dir = "DZSurvivalTraderRestock";
    picture = "";
    action = "";
    hideName = 1;
    hidePicture = 1;
    name = "DZSurvivalTraderRestock";
    credits = "DayZ-Survival project";
    author = "DayZ-Survival";
    authorID = "0";
    version = "1.0.0";
    extra = 0;
    type = "mod";
    dependencies[] = {"Game", "World", "Mission"};
    class defs {
      class worldScriptModule {
        value = "";
        files[] = {"DZSurvivalTraderRestock/scripts/4_world"};
      };
      class missionScriptModule {
        value = "";
        files[] = {"DZSurvivalTraderRestock/scripts/5_mission"};
      };
    };
  };
};

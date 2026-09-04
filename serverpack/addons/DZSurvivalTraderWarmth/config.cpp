class CfgPatches {
  class DZSurvivalTraderWarmth {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    // Pure vanilla mechanic (PlayerBase.GetStatHeatComfort(), confirmed via
    // DZ's own scripts.pbo) - no Expansion/other mod dependency needed.
    requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
  };
};
class CfgMods {
  class DZSurvivalTraderWarmth {
    dir = "DZSurvivalTraderWarmth";
    picture = "";
    action = "";
    hideName = 1;
    hidePicture = 1;
    name = "DZSurvivalTraderWarmth";
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
        files[] = {"DZSurvivalTraderWarmth/scripts/4_world"};
      };
      class missionScriptModule {
        value = "";
        files[] = {"DZSurvivalTraderWarmth/scripts/5_mission"};
      };
    };
  };
};

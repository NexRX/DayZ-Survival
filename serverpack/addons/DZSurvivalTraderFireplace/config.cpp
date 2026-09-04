class CfgPatches {
  class DZSurvivalTraderFireplace {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    // Forever_Burning_Campfire: the real CfgPatches name @Forever_Burning_
    // Campfire registers itself under (confirmed by derapifying its own
    // config.bin, 2026-09) - guarantees FBF_Fireplace is defined before this
    // addon's script classes reference it.
    requiredAddons[] = {"DZ_Data", "DZ_Scripts", "Forever_Burning_Campfire"};
  };
};
class CfgMods {
  class DZSurvivalTraderFireplace {
    dir = "DZSurvivalTraderFireplace";
    picture = "";
    action = "";
    hideName = 1;
    hidePicture = 1;
    name = "DZSurvivalTraderFireplace";
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
        files[] = {"DZSurvivalTraderFireplace/scripts/4_world"};
      };
      class missionScriptModule {
        value = "";
        files[] = {"DZSurvivalTraderFireplace/scripts/5_mission"};
      };
    };
  };
};

class CfgPatches {
  class DZSurvivalBaseDecay {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    requiredAddons[] = {"DZ_Data", "DZ_Scripts", "CodeLock", "JM_COT_Scripts"};
  };
};
class CfgMods {
  class DZSurvivalBaseDecay {
    dir = "DZSurvivalBaseDecay";
    picture = "";
    action = "";
    hideName = 1;
    hidePicture = 1;
    name = "DZSurvivalBaseDecay";
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
        files[] = {"DZSurvivalBaseDecay/scripts/4_world"};
      };
      class missionScriptModule {
        value = "";
        files[] = {"DZSurvivalBaseDecay/scripts/5_mission"};
      };
    };
  };
};

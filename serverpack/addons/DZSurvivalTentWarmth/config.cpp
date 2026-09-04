class CfgPatches {
  class DZSurvivalTentWarmth {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    // Pure vanilla mechanics (PlayerBase.GetStatHeatComfort(), TentBase's own
    // IsItemTent()/GetState(), GetGame().GetObjectsAtPosition() - all
    // confirmed via DZ's own scripts.pbo) - no Expansion/other mod
    // dependency needed.
    requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
  };
};
class CfgMods {
  class DZSurvivalTentWarmth {
    dir = "DZSurvivalTentWarmth";
    picture = "";
    action = "";
    hideName = 1;
    hidePicture = 1;
    name = "DZSurvivalTentWarmth";
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
        files[] = {"DZSurvivalTentWarmth/scripts/4_world"};
      };
      class missionScriptModule {
        value = "";
        files[] = {"DZSurvivalTentWarmth/scripts/5_mission"};
      };
    };
  };
};

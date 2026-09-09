class CfgPatches {
  class DZSurvivalReliableFire {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
  };
};

// Registers this addon's own scripts/4_world/ folder as its world script
// module - same pattern as DZSurvivalFindStone (see its config.cpp for the
// full rationale on $PBOPREFIX$/dir naming).
class CfgMods {
  class DZSurvivalReliableFire {
    dir = "DZSurvivalReliableFire";
    picture = "";
    action = "";
    hideName = 1;
    hidePicture = 1;
    name = "DZSurvivalReliableFire";
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
        files[] = {"DZSurvivalReliableFire/scripts/4_world"};
      };
    };
  };
};

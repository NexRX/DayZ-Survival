class CfgPatches {
  class DZSurvivalFindStone {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
  };
};

class CfgVehicles {
  class StoneKnife;
  class SharpStone : StoneKnife {
    scope = 2;
    displayName = "Sharp Stone";
    descriptionShort = "A stone chipped to a sharp edge - crude, but it cuts.";
  };
};

class CfgMods {
  class DZSurvivalFindStone {
    dir = "DZSurvivalFindStone";
    picture = "";
    action = "";
    hideName = 1;
    hidePicture = 1;
    name = "DZSurvivalFindStone";
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
        files[] = {"DZSurvivalFindStone/scripts/4_world"};
      };
    };
  };
};

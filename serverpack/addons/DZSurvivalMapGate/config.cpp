class CfgPatches {
  class DZSurvivalMapGate {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    // DZ_Data/DZ_Scripts: same base-game dependency as DZSurvivalFindStone
    // (we override vanilla's own MissionGameplay, defined there).
    // DayZExpansion_Core_Scripts: guarantees @DayZ-Expansion-Core's own
    // modded PlayerBase (which defines Expansion_GetInventoryCount(), used
    // below) is loaded before this addon.
    requiredAddons[] = {"DZ_Data", "DZ_Scripts", "DayZExpansion_Core_Scripts"};
  };
};

// Registers this addon's own scripts/5_mission/ folder as its *mission*
// script module (5_Mission scope - needed to modify MissionGameplay, which
// vanilla itself defines under 5_Mission/mission/missionGameplay.c).
// Confirmed against @DayZ-Expansion's own real config.bin
// (DayZExpansion/Scripts/5_Mission -> class missionScriptModule), the
// mission-scope sibling of the worldScriptModule (4_World) pattern already
// used by DZSurvivalFindStone.
class CfgMods {
  class DZSurvivalMapGate {
    dir = "DZSurvivalMapGate";
    picture = "";
    action = "";
    hideName = 1;
    hidePicture = 1;
    name = "DZSurvivalMapGate";
    credits = "DayZ-Survival project";
    author = "DayZ-Survival";
    authorID = "0";
    version = "1.0.0";
    extra = 0;
    type = "mod";
    dependencies[] = {"Game", "World", "Mission"};
    class defs {
      class missionScriptModule {
        value = "";
        files[] = {"DZSurvivalMapGate/scripts/5_mission"};
      };
    };
  };
};

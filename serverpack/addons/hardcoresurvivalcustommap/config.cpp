class CfgPatches {
  class DZSurvivalCustomMap {
    requiredVersion = 0.1;
    requiredAddons[] = {"DZ_Data", "DZ_Worlds_Chernarusplus"};
  };
};

class CfgWorlds {
  class DefaultWorld;

  class CAWorld : DefaultWorld {
    class Grid;
  };

  class ChernarusPlus : CAWorld {
    mapTextureOpened = "hardcoresurvivalcustommap\data\karta_co.paa";
    mapTextureLegend = "hardcoresurvivalcustommap\data\karta_side_co.paa";
  };
};

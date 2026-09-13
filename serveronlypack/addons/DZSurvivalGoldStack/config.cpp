class CfgPatches {
  class DZSurvivalGoldStack {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    requiredAddons[] = {"DayZExpansion_Core_Objects_Currencies"};
  };
};
class CfgVehicles {
  class ExpansionGoldNugget;
  class ExpansionGoldNugget : ExpansionGoldNugget {
    varQuantityMax = 50000;
    varStackMax = 50000;
  };
};

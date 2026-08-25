class CfgPatches {
  class DZSurvivalFindStone {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
  };
};

// SharpStone: a crude cutting tool crafted by sharpening one SmallStone
// against another (see SharpenSmallStone.c). Inherits from vanilla's own
// StoneKnife so it reuses its model/textures/knife behaviour wholesale -
// this project has no custom 3D assets, and "a stone knapped into an
// edge" is StoneKnife's own real-world basis anyway. Only cosmetic
// properties are overridden; scope = 2 keeps it out of vanilla loot
// tables/central economy so it's obtainable only via the new recipe.
class CfgVehicles {
  class StoneKnife;
  class SharpStone : StoneKnife {
    scope = 2;
    displayName = "Sharp Stone";
    descriptionShort = "A stone chipped to a sharp edge - crude, but it cuts.";
  };
};

// Registers this addon's own scripts/4_world/ folder as its world script
// module. Cross-checked against several real, working Workshop mods'
// unpacked config.bin (@Dynamic-Scavenging, @Search-For-Charcoal's
// bvp_charcoal.pbo): all of them use their own unique mod namespace as
// $PBOPREFIX$ (matching `dir` below) and nest their actual Enforce Script
// under `<namespace>/scripts/4_world` (or `Scripts/4_World` - engine paths
// are case-insensitive) - never claiming the bare `4_World` path directly
// as their own $PBOPREFIX$, which is vanilla's own reserved namespace (see
// server/dta/scripts.pbo, prefix="scripts", whose own internal paths are
// `4_World\...` etc., i.e. vanilla's real mount path is `scripts\4_World`,
// not bare `4_World`). An earlier draft of this addon used $PBOPREFIX$ =
// "4_World" directly, colliding with that reserved namespace - this may
// have been why the client-side "Client has a PBO which is not part of the
// server" kick persisted even after every signature/case/script-compile
// bug was independently fixed and verified. Restructured to follow the
// proven-working convention instead.
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

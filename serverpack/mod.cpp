class CfgMods {
  class DZSurvivalServerPack {
    dir = "DZSurvivalServerPack";
    picture = "";
    action = "";
    hideName = 0;
    hidePicture = 0;
    name = "DayZ Survival - Server Pack";
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
        // One entry per addons/<Name>/ folder. This is DayZ's own
        // bookkeeping of which folders contain world scripts - it does not
        // affect which PBOs get built (src/modBuild.ts packs every addon
        // folder automatically), but keep it in sync when you add one.
        files[] = {"DZSurvivalServerPack/DZSurvivalFindStone"};
      };
    };
  };
};

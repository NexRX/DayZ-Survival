class CfgPatches {
  class InediaTerjeCompatibility {
    requiredAddons[] = {"DZ_Data", "DZ_Characters", "DZ_Scripts",
                        "TerjeSkills"};
  };
};

class CfgMods {
  class InediaTerjeCompatibility {
    type = "mod";
    name = "InediaTerjeCompatibility";
    author = "Yauhen Saroka yauhen.saroka@gmail.com";
    authorID = "0";
    defines[] = {INEDIA_TERJE_COMPATIBILITY};
    dependencies[] = {"Game", "World", "Mission"};

    class defs {
      class gameScriptModule {
        value = "";
        files[] = {"InediaTerjeCompatibility/scripts/3_Game"};
      };

      class worldScriptModule {
        value = "";
        files[] = {"InediaTerjeCompatibility/scripts/4_World"};
      };

      class missionScriptModule {
        value = "";
        files[] = {"InediaTerjeCompatibility/scripts/5_mission"};
      };
    };
  };
};

class CfgTerjeSkills {
  class SkillsBase;

  class Athletic : SkillsBase {
    class Perks {
      class StrongBones {
        values[] = {-0.05, -0.1, -0.2, -0.3, -0.4, -0.5};
      };
    };
  };

  class Hunting : SkillsBase {
    class Perks {
      class ExperiencedHunter {
        values[] = {0.05, 0.1, 0.25, 0.5, 0.75, 1};
      };

      class KnowledgeAnatomy {
        values[] = {0.05, 0.1, 0.25, 0.5, 0.75, 1};
      };
    };
  };

  class Strength : SkillsBase {
    class Modifiers {
      class MaxWeightModifier {
        value = 0.005;
      };
    };

    class Perks {
      class HeavyWeight {
        values[] = {0.05, 0.1, 0.15, 0.2, 0.25};
      };

      class LightAttacksForce {
        values[] = {0.1, 0.25, 0.5, 0.75, 1};
      };

      class HeavyAttacksForce {
        values[] = {0.1, 0.25, 0.5, 0.75, 1};
      };
    };
  };
};

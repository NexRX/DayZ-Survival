class CfgPatches {
    class ZenShootingStars {
        units[] = {};
        weapons[] = {};
        requiredVersion = 0.1;
        requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
    };
};
class CfgMods {
    class ZenShootingStars {
        dir = "ZenShootingStars";
        name = "Shooting Stars";
        author = "Zenarchist";
        type = "mod";
        dependencies[] = {"Game", "World", "Mission"};
        class defs {
            class gameScriptModule {
                value = "";
                files[] = {"ZenShootingStars/Scripts/3_Game"};
            };
            class missionScriptModule {
                value = "";
                files[] = {"ZenShootingStars/Scripts/5_Mission"};
            };
        };
    };
};

class CfgPatches {
    class ZenFireplaceStick {
        requiredVersion = 0.1;
        requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
    };
};
class CfgMods {
    class ZenFireplaceStick {
        dir = "ZenFireplaceStick";
        name = "";
        author = "Zenarchist";
        credits = "y";
        version = "1.0";
        type = "mod";
        dependencies[] = {"Game", "World", "Mission"};
        class defs {
            class gameScriptModule {
                files[] = {"ZenFireplaceStick/scripts/3_Game"};
            };
            class worldScriptModule {
                files[] = {"ZenFireplaceStick/scripts/4_World"};
            };
            class missionScriptModule {
                files[] = {"ZenFireplaceStick/scripts/5_mission"};
            };
        };
    };
};

class CfgPatches {
    class ZombieHorde {
        units[] = {};
        weapons[] = {};
        requiredVersion = 0.1;
        requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
    };
};
class CfgMods {
    class ZombieHorde {
        dir = "ZombieHorde";
        picture = "";
        action = "";
        hideName = 0;
        hidePicture = 1;
        name = "Zombie Horde";
        author = "Dinngz";
        authorID = "0";
        version = "1.2";
        extra = 0;
        type = "mod";
        dependencies[] = {"Game", "World", "Mission"};
        class defs {
            class gameScriptModule {
                value = "";
                files[] = {"ZombieHorde/Scripts/3_Game"};
            };
            class worldScriptModule {
                value = "";
                files[] = {"ZombieHorde/Scripts/4_World"};
            };
            class missionScriptModule {
                value = "";
                files[] = {"ZombieHorde/Scripts/5_Mission"};
            };
        };
    };
};

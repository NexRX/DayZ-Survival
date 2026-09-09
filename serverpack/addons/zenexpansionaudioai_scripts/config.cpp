class CfgPatches {
    class ZenExpansionAudioAI_Scripts {
        requiredVersion = 0.1;
        units[] = {};
        requiredAddons[] = {"DZ_Data", "DZ_Scripts", "DayZExpansion_Core_Scripts", "ZenExpansionAudioAI_SoundSets"};
    };
};
class CfgMods {
    class ZenExpansionAudioAI_Scripts {
        dir = "ZenExpansionAudioAI_Scripts";
        picture = "";
        action = "";
        hideName = 1;
        hidePicture = 1;
        name = "ZenExpansionAudioAI_Scripts";
        credits = "";
        author = "Zenarchist";
        authorID = "0";
        version = "1.0";
        extra = 0;
        type = "mod";
        dependencies[] = {"Game", "World", "Mission"};
        class defs {
            class gameScriptModule {
                value = "";
                files[] = {"ZenExpansionAudioAI_Scripts/scripts/3_game", "ZenExpansionAudioAI_Scripts/scripts/Common"};
            };
            class worldScriptModule {
                value = "";
                files[] = {"ZenExpansionAudioAI_Scripts/scripts/4_World", "ZenExpansionAudioAI_Scripts/scripts/Common"};
            };
            class missionScriptModule {
                value = "";
                files[] = {"ZenExpansionAudioAI_Scripts/scripts/5_mission", "ZenExpansionAudioAI_Scripts/scripts/Common"};
            };
        };
    };
};

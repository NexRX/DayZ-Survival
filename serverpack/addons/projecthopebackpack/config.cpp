class CfgMods {
    class ProjectHopeBackpack {
        dir = "ProjectHopeBackpack";
        picture = "";
        action = "";
        hideName = 1;
        hidePicture = 1;
        name = "ProjectHopeBackpack";
        credits = "quadley";
        author = "quadley";
        authorID = "0";
        version = "0.1";
        extra = 0;
        type = "mod";
        dependencies[] = {"World"};
        class defs {
            class worldScriptModule {
                value = "";
                files[] = {"ProjectHopeBackpack\Scripts\4_World"};
            };
        };
    };
};
class CfgPatches {
    class CamelBackpack {
        units[] = {};
        weapons[] = {};
        requiredVersion = 0.1;
        requiredAddons[] = {"DZ_Data", "DZ_Scripts", "DZ_Characters_Backpacks"};
    };
};
class CfgSlots {
    class Slot_Shoulder1 {
        name = "Shoulder1";
        displayName = "Shoulder1";
        ghostIcon = "shoulderleft";
    };
    class Slot_Shoulder2 {
        name = "Shoulder2";
        displayName = "Shoulder2";
        ghostIcon = "shoulderleft";
    };
    class Slot_FirstAidKit1 {
        name = "FirstAidKit1";
        displayName = "FirstAidKit1";
        ghostIcon = "medicalbandage";
    };
};
class CfgVehicles {
    class Inventory_Base;
    class Container_Base;
    class Clothing_Base;
    class Clothing: Clothing_Base {};
    class FirstAidKit: Container_Base {
        inventorySlot[] += {"FirstAidKit", "FirstAidKit1", "FirstAidKit2"};
    };
    class PH_Backpack_01_ColorBase: Clothing {
        scope = 0;
        displayName = "Hiking Backpack";
        descriptionShort = "Hiking Backpack";
        model = "ProjectHopeBackpack\backpack_01_g.p3d";
        inventorySlot[] += {"Back"};
        attachments[] = {"Chemlight", "WalkieTalkie", "Shoulder", "Melee", "FirstAidKit1", "Belt_Left", "Belt_Right", "Belt_Back", "CookingEquipment", "Rope", "Gloves", "CookingTripod"};
        itemInfo[] = {"Clothing", "Back"};
        rotationFlags = 16;
        itemSize[] = {6, 7};
        itemsCargoSize[] = {10, 12};
        weight = 1600;
        varWetMax = 0.79;
        heatIsolation = 0.8;
        repairableWithKits[] = {5, 2};
        repairCosts[] = {30, 25};
        soundAttType = "Military";
        randomQuantity = 4;
        simpleHiddenSelections[] = {"slot_melee_rifle", "slot_melee_melee", "slot_shoulder_rifle", "slot_shoulder_melee"};
        hiddenSelections[] = {"camo"};
        class ClothingTypes {
            male = "ProjectHopeBackpack\backpack_01_m.p3d";
            female = "ProjectHopeBackpack\backpack_01_f.p3d";
        };
        class DamageSystem {
            class GlobalHealth {
                class Health {
                    hitpoints = 130;
                    transferToAttachmentsCoef = 0.5;
                    healthLevels[] = {{1, {"ProjectHopeBackpack\data\backpack_01.rvmat"}}, {0.7, {"ProjectHopeBackpack\data\backpack_01.rvmat"}}, {0.5, {"ProjectHopeBackpack\data\backpack_01_damage.rvmat"}}, {0.3, {"ProjectHopeBackpack\data\backpack_01_damage.rvmat"}}, {0, {"ProjectHopeBackpack\data\backpack_01_destruct.rvmat"}}};
                };
            };
        };
        class AnimEvents {
            class SoundWeapon {
                class pickUpItem_Light {
                    soundSet = "pickUpBackPack_Metal_Light_SoundSet";
                    id = 796;
                };
                class pickUpItem {
                    soundSet = "pickUpBackPack_Metal_SoundSet";
                    id = 797;
                };
                class drop {
                    soundset = "taloonbag_drop_SoundSet";
                    id = 898;
                };
            };
        };
    };
    class SurvivorBackpack_Black: PH_Backpack_01_ColorBase {
        scope = 2;
        displayName = "Survivor Backpack";
        descriptionShort = "Designed to hold the essentials for outdoor survival and emergency situations. The goal is to provide a compact and portable kit for surviving in the wilderness.";
        hiddenSelectionsTextures[] = {"ProjectHopeBackpack\data\backpack_01_black_co.paa"};
    };
    class SurvivorBackpack_Blue: PH_Backpack_01_ColorBase {
        scope = 2;
        displayName = "Survivor Backpack";
        descriptionShort = "Designed to hold the essentials for outdoor survival and emergency situations. The goal is to provide a compact and portable kit for surviving in the wilderness.";
        hiddenSelectionsTextures[] = {"ProjectHopeBackpack\data\backpack_01_blue_co.paa"};
    };
    class SurvivorBackpack_Green: PH_Backpack_01_ColorBase {
        scope = 2;
        displayName = "Survivor Backpack";
        descriptionShort = "Designed to hold the essentials for outdoor survival and emergency situations. The goal is to provide a compact and portable kit for surviving in the wilderness.";
        hiddenSelectionsTextures[] = {"ProjectHopeBackpack\data\backpack_01_green_co.paa"};
    };
    class SurvivorBackpack_Pink: PH_Backpack_01_ColorBase {
        scope = 2;
        displayName = "Survivor Backpack";
        descriptionShort = "Designed to hold the essentials for outdoor survival and emergency situations. The goal is to provide a compact and portable kit for surviving in the wilderness.";
        hiddenSelectionsTextures[] = {"ProjectHopeBackpack\data\backpack_01_pink_co.paa"};
    };
    class SurvivorBackpack_Red: PH_Backpack_01_ColorBase {
        scope = 2;
        displayName = "Survivor Backpack";
        descriptionShort = "Designed to hold the essentials for outdoor survival and emergency situations. The goal is to provide a compact and portable kit for surviving in the wilderness.";
        hiddenSelectionsTextures[] = {"ProjectHopeBackpack\data\backpack_01_red_co.paa"};
    };
    class SurvivorBackpack_Yellow: PH_Backpack_01_ColorBase {
        scope = 2;
        displayName = "Survivor Backpack";
        descriptionShort = "Designed to hold the essentials for outdoor survival and emergency situations. The goal is to provide a compact and portable kit for surviving in the wilderness.";
        hiddenSelectionsTextures[] = {"ProjectHopeBackpack\data\backpack_01_yellow_co.paa"};
    };
};
class CfgWeapons {
    class RifleCore;
    class Rifle_Base: RifleCore {
        inventorySlot[] += {"Shoulder", "Melee", "Shoulder1", "Shoulder2", "Shoulder3", "Shoulder4", "Shoulder5", "Shoulder6", "Shoulder7", "Shoulder8", "Shoulder9", "Shoulder10", "Shoulder11", "Shoulder12", "Shoulder13", "Shoulder14", "Shoulder15", "Shoulder16", "Shoulder17", "Shoulder18", "Shoulder19", "Shoulder20", "Shoulder21", "Shoulder22", "Shoulder23", "Shoulder24", "Shoulder25", "Shoulder26", "Shoulder27", "Shoulder28", "Shoulder29", "Shoulder30"};
    };
};
class CfgNonAIVehicles {
    class ProxyAttachment;
    class Proxybackpackfirstaidkit: ProxyAttachment {
        scope = 2;
        inventorySlot[] = {"FirstAidKit1"};
        model = "ProjectHopeBackpack\proxies\backpackfirstaidkit.p3d";
    };
    class Proxybackpackpot: ProxyAttachment {
        scope = 2;
        inventorySlot[] = {"CookingEquipment"};
        model = "ProjectHopeBackpack\proxies\backpackpot.p3d";
    };
    class Proxybackpackrope: ProxyAttachment {
        scope = 2;
        inventorySlot[] = {"Rope"};
        model = "ProjectHopeBackpack\proxies\backpackrope.p3d";
    };
    class Proxymelee_melee: ProxyAttachment {
        scope = 2;
        inventorySlot[] = {"Melee"};
        model = "ProjectHopeBackpack\proxies\melee_melee.p3d";
    };
    class Proxymelee_rifle: ProxyAttachment {
        scope = 2;
        inventorySlot[] = {"Melee"};
        model = "ProjectHopeBackpack\proxies\melee_rifle.p3d";
    };
    class Proxyshoulder_rifle: ProxyAttachment {
        scope = 2;
        inventorySlot[] = {"Shoulder"};
        model = "ProjectHopeBackpack\proxies\shoulder_rifle.p3d";
    };
    class Proxyshoulder_melee: ProxyAttachment {
        scope = 2;
        inventorySlot[] = {"Shoulder"};
        model = "ProjectHopeBackpack\proxies\shoulder_melee.p3d";
    };
    class Proxybackpacktripod: ProxyAttachment {
        scope = 2;
        inventorySlot[] = {"CookingTripod"};
        model = "ProjectHopeBackpack\proxies\backpacktripod.p3d";
    };
};

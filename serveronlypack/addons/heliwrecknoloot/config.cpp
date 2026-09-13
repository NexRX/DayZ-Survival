class CfgPatches {
    class HeliWreckNoLoot {
        units[] = {};
        weapons[] = {};
        requiredVersion = 0.1;
        requiredAddons[] = {"DZ_Structures_Residential", "DZ_Structures_Industrial", "DZ_Structures_Furniture", "DZ_Structures_Military", "DZ_Structures_Specific", "DZ_Structures_Wrecks", "DZ_Structures_Ruins", "DZ_Structures_Roads", "DZ_Structures_Walls", "DZ_Structures_Signs", "DZ_Structures_Rail", "DZ_Plants", "DZ_Rocks", "DZ_Water", "DZ_Data"};
    };
};
class CfgVehicles {
    class HouseNoDestruct;
    class Nitrix_Wreck_UH1Y: HouseNoDestruct {
        scope = 1;
        model = "\DZ\structures\Wrecks\Aircraft\Wreck_UH1Y.p3d";
    };
    class Nitrix_Wreck_Mi8: HouseNoDestruct {
        scope = 1;
        model = "\DZ\structures\Wrecks\Aircraft\Wreck_Mi8.p3d";
    };
    class Nitrix_Train_Wagon_Tanker: HouseNoDestruct {
        scope = 1;
        model = "\DZ\structures\Wrecks\trains\Train_Wagon_Tanker.p3d";
    };
    class Nitrix_Train_Wagon_Flat: HouseNoDestruct {
        scope = 1;
        model = "\DZ\structures\Wrecks\trains\Train_Wagon_Flat.p3d";
    };
    class Nitrix_TransitBus_big: HouseNoDestruct {
        scope = 1;
        model = "\DZ\vehicles\wheeled\TransitBus\TransitBus_big.p3d";
    };
    class Nitrix_ikarusWheel_destroyed: HouseNoDestruct {
        scope = 1;
        model = "\DZ\vehicles\wheeled\TransitBus\proxy_big\ikarusWheel_destroyed.p3d";
    };
    class Nitrix_TransitBus: HouseNoDestruct {
        scope = 1;
        model = "\DZ\vehicles\wheeled\TransitBus\TransitBus.p3d";
    };
    class Nitrix_FirefighterAxe: HouseNoDestruct {
        scope = 1;
        model = "\dz\weapons\melee\blade\FirefighterAxe.p3d";
    };
    class Nitrix_Machete: HouseNoDestruct {
        scope = 1;
        model = "\dz\weapons\melee\blade\machete.p3d";
    };
    class Nitrix_Pitchfork: HouseNoDestruct {
        scope = 1;
        model = "\dz\weapons\melee\blade\Hay_Fork.p3d";
    };
    class Nitrix_Pickaxe: HouseNoDestruct {
        scope = 1;
        model = "\dz\weapons\melee\blade\Pickaxe.p3d";
    };
    class Nitrix_Sword: HouseNoDestruct {
        scope = 1;
        model = "\dz\weapons\melee\blade\medieval_sword.p3d";
    };
    class Nitrix_Chainsaw: HouseNoDestruct {
        scope = 1;
        model = "\dz\weapons\melee\powered\chainsaw.p3d";
    };
};

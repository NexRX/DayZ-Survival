class CfgPatches {
    class CS_Modular_Cave {
        units[] = {};
        weapons[] = {};
        requiredAddons[] = {"DZ_Data"};
    };
};
class CfgMods {
    class CS_Modular_Cave {
        dir = "CS_Modular_Cave";
        picture = "";
        action = "";
        hideName = 1;
        hidePicture = 1;
        name = "CS_Modular_Cave";
        author = "CanadianSniper";
        authorID = "2039448058";
        version = "1.0";
        extra = 0;
        type = "mod";
        dependencies[] = {"Game", "World"};
        class defs {
            class gameScriptModule {
                value = "";
                files[] = {"CS_Modular_Cave/Scripts/3_Game"};
            };
            class worldScriptModule {
                value = "";
                files[] = {"CS_Modular_Cave/Scripts/4_World"};
            };
        };
    };
};
class CfgVehicles {
    class HouseNoDestruct;
    class Land_Cave_Straight: HouseNoDestruct {
        scope = 1;
        model = "CS_Modular_Cave\Cave_Straight.p3d";
    };
    class Land_Cave_Corner: HouseNoDestruct {
        scope = 1;
        model = "CS_Modular_Cave\Cave_Corner.p3d";
    };
    class Land_Cave_T: HouseNoDestruct {
        scope = 1;
        model = "CS_Modular_Cave\Cave_T.p3d";
    };
    class Land_Cave_Entrance: HouseNoDestruct {
        scope = 1;
        model = "CS_Modular_Cave\Cave_Entrance.p3d";
    };
    class Land_Cave_Collapse: HouseNoDestruct {
        scope = 1;
        model = "CS_Modular_Cave\Cave_Collapse.p3d";
    };
    class Land_Cave_Junction: HouseNoDestruct {
        scope = 1;
        model = "CS_Modular_Cave\Cave_Junction.p3d";
    };
    class Land_Cave_End: HouseNoDestruct {
        scope = 1;
        model = "CS_Modular_Cave\Cave_End.p3d";
    };
    class Land_Cave_Ramp: HouseNoDestruct {
        scope = 1;
        model = "CS_Modular_Cave\Cave_Ramp.p3d";
    };
};

class CfgPatches {
    class InediaInfectedAI_zmb_not_walk_underwater_FIX {
        requiredAddons[] = {"InediaInfectedAI"};
    };
};
class PathGraphFilters {
    class ZombieAlerted {
        class Flags {
            include[] = {"walk", "door", "inside", "jump", "climb"};
            exclude[] = {"disabled", "crawl", "crouch"};
        };
    };
};

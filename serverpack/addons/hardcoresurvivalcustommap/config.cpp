// Pure asset-override addon: replaces the vanilla physical map's texture
// (dz\structures\signs\tourist\data\karta_co.paa /
// karta_side_co.paa - shared by the handheld map item AND the world's
// tourist map signposts, both reuse this same texture) with a custom
// server-branded version.
//
// No scripts here - drop the edited, re-encoded .paa file(s) into
// tourist/data/ (same filenames as vanilla: karta_co.paa is the main
// topographic map face, karta_side_co.paa is the legend/cover face) and
// this addon's own path prefix below makes them override the vanilla
// files at load time. Must stay DXT1 / no alpha / with mipmaps, same as
// the originals, or the engine may reject/mishandle the texture.
class CfgPatches {
  class DZSurvivalCustomMap {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    requiredAddons[] = {"DZ_Data", "DZ_Structures_Signs"};
  };
};

// DayZ-Expansion-Market tuning: reshapes trader stock across every category
// the custom trader city sells into a deliberate, hand-classified rarity
// system - "not everything can be bought" / "earned power" per this
// project's design goals (see README.md).
//
// Confirmed live (profiles/ExpansionMod/Market/*.json, self-generated on
// first server start): every single category ships the exact same blanket
// defaults regardless of what it sells - InitStockPercent: 75.0 and
// MaxStockThreshold: 100 per item (500 for Ammo, 250 for Ammo_Boxes - still
// just as generous). This file replaces that flat default with:
//
//   1. Category consolidation/reorganization: DayZ-Expansion-Market ships
//      ~50 narrow categories (Assault_Rifles, Submachine_Guns, Helmets,
//      Caps, ...). This merges/splits them into a curated, trader-menu-
//      friendly set (see MERGED_CATEGORIES below): guns/ammo/attachments
//      split Military vs Civilian, clothing split by BOTH body slot (Head/
//      Top/Bottom/Back/Misc) AND Military vs Civilian, and a dedicated
//      Base_Building category carved back out of general Utility.
//   2. Per-item rarity tiers (Common/Uncommon/Rare/Legendary), hand-assigned
//      per classname based on how "coveted" that specific item actually is
//      (see TIER_MAX_STOCK) - not a flat cap for the whole category. A
//      plate carrier vest or NVG head strap is far more of a power spike
//      than a baseball cap, even though both are "Clothing".
//   3. Tier -> MaxStockThreshold is also how the companion EnforceScript
//      addon (serverpack/addons/DZSurvivalTraderRestock) infers an item's
//      rarity at runtime, without needing its own duplicated classname
//      lookup table: it just buckets by the item's own live
//      MaxStockThreshold (<=1 Legendary, <=4 Rare, <=10 Uncommon, else
//      Common - see that addon's TierForCap()). Keep TIER_MAX_STOCK below
//      and that addon's thresholds in sync if either ever changes.
//
// Merging is done by reading each source category's still-pristine,
// Expansion-generated JSON (Assault_Rifles.json, Helmets.json, etc. - these
// are never themselves modified by this file) and writing a brand new
// category file (Guns_Military.json, Clothing_Head_Military.json, etc.)
// built from their Items[], with each item's own price fields
// (MinPriceThreshold/MaxPriceThreshold/SellPricePercent/Variants/
// SpawnAttachments/...) copied verbatim - only MaxStockThreshold is ever
// overwritten, based on this file's tier assignment. This is naturally
// idempotent: since the source files are never touched (just quarantined -
// see quarantineConsumedSourceCategories()), re-running this on every
// server start always regenerates the exact same merged output.
//
// IMPORTANT (root-caused 2026-08, via the missing Cars/Helis restock board
// bug): the old, now-unreferenced source category files (Assault_Rifles.json,
// etc.) can NOT just be "left in place, unused" as this comment used to
// claim. DayZ-Expansion-Market's LoadCategories() (ExpansionMarketSettings.c)
// scans its whole folder for every "*.json" file and loads ALL of them
// unconditionally into one shared global classname->item map
// (ExpansionMarketCategory's s_GlobalItems) - completely independent of
// whether any trader identity references that category. Whichever category
// loads a given classname *second* has that item silently REJECTED
// (CheckDuplicate()), not merged/overwritten. So a raw source file left
// behind under its original name after being merged into one of the
// MERGED_CATEGORIES below was quietly stealing its own items back out of
// the real, live merged category on every single server boot - confirmed
// live: Guns_Military/Guns_Civilian were only showing 59 of their real 85
// on-disk items, and Vehicles_Cars/Vehicles_Helicopters (both 100%-
// overlapping 1:1 copies of a single raw source, no only/exclude split)
// were losing literally every item, which is why "Cars"/"Helis" silently
// never appeared on the DZSurvivalTraderRestock board at all. Fixed by
// quarantineConsumedSourceCategories() below, called at the end of
// tuneExpansionMarket() - renames every raw source file this merge (or
// marketGapFill.ts's own DEAD_MARKET_FILES) has fully absorbed away from a
// ".json" extension so DayZ-Expansion-Market's folder scan skips it, while
// readCategory() below still reads the very same (renamed) file as this
// merge's own data source, keeping everything idempotent.
//
// IMPORTANT: like before, this only ever edits the category *template*
// files here (profiles/ExpansionMod/Market/<Category>.json) - used to seed
// a brand new trader zone's starting stock. It never touches the live,
// per-zone running stock (that lives in
// expansion/traderzones/<Zone>.json's own Stock map, written only by the
// game itself via ExpansionMarketTraderZone.Save() - see
// src/traders.ts's ensureCustomZone()), so re-running this never resets or
// lowers anything a player has actually sold in. The Stock map is keyed
// purely by (lowercased) classname, independent of which category file
// that classname happens to live in - so merging/renaming/re-tiering
// categories here has zero effect on already-running stock.
//
// Two categories are deliberately left OUT of the merge/tier system, kept
// exactly as before:
//   - Ghillies: sale-only (0% init stock, low cap, never auto-restocked -
//     see ensureRareCategories() below and the restock addon's exclusion
//     of it). The only way this ever has stock is a player selling one in.
//   - Vehicle_Parts/Batteries: buying a whole vehicle also spawns its
//     default attachments (wheels, doors, battery, etc.), each drawing
//     from these categories' own per-classname stock. This needs to stay
//     generously stocked so a vehicle purchase doesn't fail for lack of
//     parts - it's a functional necessity, not a "coveted power" category,
//     so it deliberately sits outside the rarity-tier system (see
//     ensureVehiclePartsCategories() below).

import { EXPANSION_MARKET_DIR } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import { DEAD_MARKET_FILES } from "./marketGapFill.ts";

type Tier = "Common" | "Uncommon" | "Rare" | "Legendary";

// Absolute stock cap per tier. Also what the companion restock addon
// reverse-engineers an item's tier from at runtime (see this file's header
// comment) - keep these thresholds and that addon's TierForCap() in sync.
export const TIER_MAX_STOCK: Record<Tier, number> = {
  Common: 25,
  Uncommon: 10,
  Rare: 4,
  Legendary: 1,
};

interface SourceGroup {
  source: string;
  tier: Tier;
  only?: string[];
  exclude?: string[];
  overrides?: Record<string, Tier>;
  // Per-classname price correction, for the rare case where a raw item's
  // DayZ-Expansion-Market default price (never otherwise touched by this
  // merge - see buildMergedItems()'s own "clone verbatim" comment) doesn't
  // match the rarity tier it landed in here (e.g. a color-variant reskin
  // that kept some old/generic default price instead of its base item's
  // actual price). Found via a peer-price comparison audit, 2026-08 - see
  // serverpack/README.md's "whatever is most balanced" follow-up session.
  priceOverrides?: Record<string, { min: number; max: number }>;
}

interface MergedCategory {
  fileName: string;
  displayName: string;
  icon: string;
  initStockPercent: number;
  groups: SourceGroup[];
}

// ---------------------------------------------------------------------
// Military/Civilian classname splits - hand-classified by actually
// reading profiles/ExpansionMod/Market/<Category>.json. Anything NOT
// listed here for a given source category falls through to the Civilian
// side of that same body-slot/attachment-type category.
// ---------------------------------------------------------------------

const RIFLES_MIL_DMR = ["svd_wooden", "m14"];
const SNIPER_RIFLES_CIVILIAN = ["b95", "scout_chernarus"];
// cz61 (CR-61 Skorpion) is a deliberate exception to the otherwise-blanket
// "every Submachine_Guns item is Military" rule - explicitly requested by
// the project owner despite it being a genuine submachine gun.
const SUBMACHINE_GUNS_CIVILIAN = ["cz61"];

const MIL_HELMETS = [
  "tankerhelmet",
  "zsh3pilothelmet",
  "zsh3pilothelmet_green",
  "zsh3pilothelmet_black",
  "mich2001helmet",
  "gorkahelmetvisor",
  "gorkahelmet",
  "ssh68helmet",
  "ballistichelmet_un",
  "ballistichelmet_navy",
  "ballistichelmet_winter",
];
const MIL_CAPS = ["pilotkacap"];
const MIL_HATS = [
  "militaryberet_chdkz",
  "militaryberet_un",
  "militaryberet_nz",
  "booniehat_dpm",
  "booniehat_dubok",
  "booniehat_flecktran",
  "budenovkahat_gray",
  "officerhat",
  "nbchoodgray",
  "okzkcap_beige",
];
const MIL_MASKS = ["shemag_brown", "balaclavamask_bdu", "gasmask", "gp5gasmask", "airbornemask"];
const MIL_EYEWEAR = ["tacticalgoggles", "nvgheadstrap"];
const MIL_COATS = [
  "ttskojacket_camo",
  "bdujacket",
  "m65jacket_black",
  "m65jacket_olive",
  "gorkaejacket_summer",
  "usmcjacket_desert",
  "nbcjacketgray",
  "omkjacket_navy",
  "navyuniformjacket",
  "pilotjacket_black",
  "wintermilitarycoat_brown",
];
const MIL_SHIRTS = ["telnyashkashirt", "tacticalshirt_grey", "tacticalshirt_black"];
const MIL_SWEATERS = ["militarysweater_chernarus"];
const MIL_VESTS = [
  "ukassvest_black",
  "ukassvest_camo",
  "ukassvest_winter",
  "smershvest",
  "highcapacityvest_black",
  "highcapacityvest_olive",
  "platecarriervest",
  "platecarriervest_camo",
  "platecarriervest_winter",
  "chestplate",
];
const MIL_PANTS = [
  "ttskopants",
  "bdupants",
  "usmcpants_desert",
  "gorkapants_summer",
  "nbcpantsgray",
  "omkpants_navy",
  "navyuniformpants",
];
const MIL_BOOTS = [
  "combatboots_beige",
  "jungleboots_beige",
  "ttskoboots",
  "militaryboots_redpunk",
  "militaryboots_bluerock",
  "militaryboots_beige",
  "militaryboots_black",
  "militaryboots_brown",
  "nbcbootsgray",
  "coldoperationboots_camo",
];
const MIL_BACKPACKS = [
  "smershbag",
  "assaultbag_black",
  "assaultbag_winter",
  "coyotebag_brown",
  "coyotebag_winter",
  "alicebag_green",
  "duffelbagsmall_camo",
  "armypouch_beige",
  "attack2bag_black",
];
const MIL_GLOVES = ["tacticalgloves_black", "nbcglovesgray"];
const MIL_ARMBANDS = ["armband_apa"];
const MIL_BELTS = ["militarybelt"];
const MIL_HOLSTERS = [
  "platecarrierholster",
  "platecarrierholster_camo",
  "platecarrierholster_winter",
  "platecarrierpouches",
  "platecarrierpouches_camo",
  "platecarrierpouches_winter",
];

const MAGAZINES_MIL = [
  "mag_cz61_20rnd",
  "mag_pp19_64rnd",
  "mag_ump_25rnd",
  "mag_mp5_15rnd",
  "mag_mp5_30rnd",
  "mag_fal_20rnd",
  "mag_akm_30rnd",
  "mag_akm_palm30rnd",
  "mag_akm_drum75rnd",
  "mag_ak101_30rnd",
  "mag_ak74_30rnd",
  "mag_ak74_45rnd",
  "mag_stanag_30rnd",
  "mag_stanagcoupled_30rnd",
  "mag_stanag_60rnd",
  "mag_cmag_10rnd",
  "mag_cmag_20rnd",
  "mag_cmag_30rnd",
  "mag_cmag_40rnd",
  "mag_vss_10rnd",
  "mag_val_20rnd",
  "mag_vikhr_30rnd",
  "mag_svd_10rnd",
  "mag_sv98_10rnd",
  "mag_famas_25rnd",
  "mag_aug_30rnd",
  "mag_m14_10rnd",
  "mag_m14_20rnd",
];
const MUZZLES_MIL = ["mp5_compensator", "m4_suppressor", "ak_suppressor"];
const HANDGUARDS_MIL = [
  "mp5_plastichndgrd",
  "mp5_railhndgrd",
  "ak74_hndgrd",
  "ak_woodhndgrd",
  "ak_railhndgrd",
  "ak_plastichndgrd",
  "m4_plastichndgrd",
  "m4_rishndgrd",
  "m4_mphndgrd",
];
const BUTTSTOCKS_MIL = [
  "mp5k_stockbttstck",
  "fal_oebttstck",
  "fal_foldingbttstck",
  "aks74u_bttstck",
  "ak74_woodbttstck",
  "ak_plasticbttstck",
  "ak_woodbttstck",
  "ak_foldingbttstck",
  "m4_oebttstck",
  "m4_mpbttstck",
  "m4_cqbbttstck",
  "pp19_bttstck",
];
const BAYONETS_MIL = ["m9a1_bayonet", "ak_bayonet"];
const OPTICS_MIL = [
  "m4_carryhandleoptic",
  "buisoptic",
  "m4_t3nrdsoptic",
  "m68optic",
  "acogoptic",
  "acogoptic_6x",
  "kobraoptic",
  "kashtanoptic",
  "pso1optic",
  "pso11optic",
  "pso6optic",
  "kazuaroptic",
  "mk4optic_black",
  "starlightoptic",
];

const SUPPLIES_BASE_BUILDING = [
  "rope",
  "metalwire",
  "epoxyputty",
  "ducttape",
  "woodenplank",
  "metalplate",
  "nailbox",
  "nail",
  "barbedwire",
  "camonet",
  "hescobox",
  "powergenerator",
  "tripod",
];

// ---------------------------------------------------------------------
// Merged/reorganized categories. src/traders.ts's CUSTOM_TRADER_IDENTITIES
// should reference these fileNames (not the ~50 original source
// categories).
// ---------------------------------------------------------------------
const MERGED_CATEGORIES: MergedCategory[] = [
  {
    fileName: "Guns_Military",
    displayName: "Guns - Military",
    icon: "Deliver",
    // Guns start with zero stock, no exceptions - the trader should never
    // be a free/repeatable source of weapons after a death; everything a
    // player buys here has to first be restocked (slowly, capped low - see
    // DZSurvivalTraderRestock_Module.c) or sold in by another player.
    initStockPercent: 0,
    groups: [
      { source: "Assault_Rifles", tier: "Rare" },
      { source: "Submachine_Guns", tier: "Uncommon", exclude: SUBMACHINE_GUNS_CIVILIAN },
      { source: "Sniper_Rifles", tier: "Legendary", exclude: SNIPER_RIFLES_CIVILIAN },
      { source: "Rifles", tier: "Rare", only: RIFLES_MIL_DMR },
    ],
  },
  {
    fileName: "Guns_Civilian",
    displayName: "Guns - Civilian",
    icon: "Deliver",
    // See Guns_Military's own comment - zero starting stock applies to
    // every gun, civilian or military.
    initStockPercent: 0,
    groups: [
      { source: "Rifles", tier: "Uncommon", exclude: RIFLES_MIL_DMR },
      // Common tier deliberately removed from guns entirely (was 25 here,
      // by far the highest cap any weapon had) - even the most basic
      // civilian shotgun can kill a player, so no gun should regenerate as
      // freely as a t-shirt. Every gun in the trader now caps out at 10
      // (Uncommon) at most.
      { source: "Shotguns", tier: "Uncommon" },
      { source: "Crossbows", tier: "Uncommon" },
      { source: "Pistols", tier: "Uncommon" },
      { source: "Sniper_Rifles", tier: "Uncommon", only: SNIPER_RIFLES_CIVILIAN },
      { source: "Submachine_Guns", tier: "Uncommon", only: SUBMACHINE_GUNS_CIVILIAN },
    ],
  },
  {
    fileName: "Gun_Ammo",
    displayName: "Gun Ammo",
    icon: "Deliver",
    initStockPercent: 40,
    groups: [
      {
        source: "Ammo",
        tier: "Common",
        // 40mm underslung grenade launcher rounds are far more dangerous
        // than any other Common-tier ammo (priced 4490-7480 vs a ~65-990
        // range for every rifle/pistol round here) - Rare matches both
        // their real-world lethality and their existing default price.
        overrides: { ammo_40mm_explosive: "Rare", Ammo_40mm_Chemgas: "Rare" },
      },
      { source: "Ammo_Boxes", tier: "Uncommon" },
    ],
  },
  {
    fileName: "Gun_Attachments_Military",
    displayName: "Gun Attachments - Military",
    icon: "Deliver",
    initStockPercent: 20,
    groups: [
      { source: "Magazines", tier: "Uncommon", only: MAGAZINES_MIL },
      { source: "Muzzles", tier: "Uncommon", only: MUZZLES_MIL },
      { source: "Handguards", tier: "Uncommon", only: HANDGUARDS_MIL },
      { source: "Buttstocks", tier: "Uncommon", only: BUTTSTOCKS_MIL },
      { source: "Bayonets", tier: "Uncommon", only: BAYONETS_MIL },
      {
        source: "Optics",
        tier: "Uncommon",
        only: OPTICS_MIL,
        overrides: {
          acogoptic: "Rare",
          acogoptic_6x: "Rare",
          pso1optic: "Rare",
          pso11optic: "Rare",
          pso6optic: "Rare",
          kashtanoptic: "Rare",
          kazuaroptic: "Rare",
          mk4optic_black: "Rare",
          starlightoptic: "Legendary",
        },
      },
    ],
  },
  {
    fileName: "Gun_Attachments_Civilian",
    displayName: "Gun Attachments - Civilian",
    icon: "Deliver",
    initStockPercent: 30,
    groups: [
      { source: "Magazines", tier: "Uncommon", exclude: MAGAZINES_MIL },
      { source: "Muzzles", tier: "Uncommon", exclude: MUZZLES_MIL },
      { source: "Buttstocks", tier: "Uncommon", exclude: BUTTSTOCKS_MIL },
      { source: "Bayonets", tier: "Uncommon", exclude: BAYONETS_MIL },
      { source: "Optics", tier: "Uncommon", exclude: OPTICS_MIL },
    ],
  },
  {
    fileName: "Explosives",
    displayName: "Explosives",
    icon: "Deliver",
    initStockPercent: 10,
    groups: [{ source: "Explosives_And_Grenades", tier: "Rare" }],
  },
  {
    fileName: "Clothing_Head_Military",
    displayName: "Clothing Head - Military",
    icon: "Deliver",
    initStockPercent: 15,
    groups: [
      {
        source: "Helmets",
        tier: "Rare",
        only: MIL_HELMETS,
        overrides: {
          mich2001helmet: "Legendary",
          ballistichelmet_un: "Legendary",
          ballistichelmet_navy: "Legendary",
          ballistichelmet_winter: "Legendary",
        },
        // Color variants of the base zsh3pilothelmet kept a stray old/
        // generic default price (135-270) instead of matching their own
        // base item (6925-11545) - same helmet, same rarity, same value.
        priceOverrides: {
          zsh3pilothelmet_green: { min: 6925, max: 11545 },
          zsh3pilothelmet_black: { min: 6925, max: 11545 },
        },
      },
      {
        source: "Caps",
        tier: "Uncommon",
        only: MIL_CAPS,
      },
      {
        source: "Hats_And_Hoods",
        tier: "Uncommon",
        only: MIL_HATS,
        // Underpriced (145-240) relative to every other Uncommon-tier
        // military hat here - repriced to match militaryberet_un/nz, a
        // comparable plain-cloth military headwear item in the same tier.
        priceOverrides: { budenovkahat_gray: { min: 1060, max: 1770 } },
      },
      {
        source: "Masks",
        tier: "Uncommon",
        only: MIL_MASKS,
        overrides: { gasmask: "Legendary", gp5gasmask: "Legendary" },
        // Underpriced (70-115) relative to every other Uncommon-tier face
        // covering - repriced to match airbornemask, a comparable cloth/
        // fabric face covering in the same tier.
        priceOverrides: { shemag_brown: { min: 460, max: 765 } },
      },
      {
        source: "Eyewear",
        tier: "Uncommon",
        only: MIL_EYEWEAR,
        overrides: { nvgheadstrap: "Legendary" },
      },
    ],
  },
  {
    fileName: "Clothing_Head_Civilian",
    displayName: "Clothing Head - Civilian",
    icon: "Deliver",
    initStockPercent: 35,
    groups: [
      { source: "Helmets", tier: "Common", exclude: MIL_HELMETS },
      { source: "Caps", tier: "Common", exclude: MIL_CAPS },
      { source: "Hats_And_Hoods", tier: "Common", exclude: MIL_HATS },
      { source: "Masks", tier: "Common", exclude: MIL_MASKS },
      { source: "Eyewear", tier: "Common", exclude: MIL_EYEWEAR },
    ],
  },
  {
    fileName: "Clothing_Top_Military",
    displayName: "Clothing Top - Military",
    icon: "Deliver",
    initStockPercent: 15,
    groups: [
      { source: "Coats_And_Jackets", tier: "Rare", only: MIL_COATS },
      { source: "Shirts_And_TShirts", tier: "Uncommon", only: MIL_SHIRTS },
      { source: "Sweaters_And_Hoodies", tier: "Uncommon", only: MIL_SWEATERS },
      {
        source: "Vests",
        tier: "Rare",
        only: MIL_VESTS,
        overrides: {
          platecarriervest: "Legendary",
          platecarriervest_camo: "Legendary",
          platecarriervest_winter: "Legendary",
          chestplate: "Legendary",
        },
      },
    ],
  },
  {
    fileName: "Clothing_Top_Civilian",
    displayName: "Clothing Top - Civilian",
    icon: "Deliver",
    initStockPercent: 35,
    groups: [
      { source: "Coats_And_Jackets", tier: "Common", exclude: MIL_COATS },
      { source: "Shirts_And_TShirts", tier: "Common", exclude: MIL_SHIRTS },
      { source: "Sweaters_And_Hoodies", tier: "Common", exclude: MIL_SWEATERS },
      { source: "Vests", tier: "Common", exclude: MIL_VESTS },
      { source: "Blouses_And_Suits", tier: "Common" },
    ],
  },
  {
    fileName: "Clothing_Bottom_Military",
    displayName: "Clothing Bottom - Military",
    icon: "Deliver",
    initStockPercent: 15,
    groups: [
      { source: "Pants_And_Shorts", tier: "Rare", only: MIL_PANTS },
      { source: "Boots_And_Shoes", tier: "Uncommon", only: MIL_BOOTS },
    ],
  },
  {
    fileName: "Clothing_Bottom_Civilian",
    displayName: "Clothing Bottom - Civilian",
    icon: "Deliver",
    initStockPercent: 35,
    groups: [
      { source: "Pants_And_Shorts", tier: "Common", exclude: MIL_PANTS },
      { source: "Boots_And_Shoes", tier: "Common", exclude: MIL_BOOTS },
      { source: "Skirts_And_Dresses", tier: "Common" },
    ],
  },
  {
    fileName: "Clothing_Back_Military",
    displayName: "Clothing Back - Military",
    icon: "Deliver",
    initStockPercent: 15,
    groups: [
      {
        source: "Backpacks",
        tier: "Rare",
        only: MIL_BACKPACKS,
        overrides: { alicebag_green: "Legendary", attack2bag_black: "Legendary" },
      },
    ],
  },
  {
    fileName: "Clothing_Back_Civilian",
    displayName: "Clothing Back - Civilian",
    icon: "Deliver",
    initStockPercent: 30,
    groups: [{ source: "Backpacks", tier: "Uncommon", exclude: MIL_BACKPACKS }],
  },
  {
    fileName: "Clothing_Misc_Military",
    displayName: "Clothing Misc - Military",
    icon: "Deliver",
    initStockPercent: 20,
    groups: [
      { source: "Gloves", tier: "Uncommon", only: MIL_GLOVES },
      { source: "Armbands", tier: "Uncommon", only: MIL_ARMBANDS },
      { source: "Belts", tier: "Common", only: MIL_BELTS },
      { source: "Holsters_And_Pouches", tier: "Rare", only: MIL_HOLSTERS },
    ],
  },
  {
    fileName: "Clothing_Misc_Civilian",
    displayName: "Clothing Misc - Civilian",
    icon: "Deliver",
    initStockPercent: 35,
    groups: [
      { source: "Gloves", tier: "Common", exclude: MIL_GLOVES },
      { source: "Armbands", tier: "Common", exclude: MIL_ARMBANDS },
      { source: "Bandanas", tier: "Common" },
      { source: "Belts", tier: "Common", exclude: MIL_BELTS },
      { source: "Holsters_And_Pouches", tier: "Common", exclude: MIL_HOLSTERS },
    ],
  },
  {
    fileName: "Consumables",
    displayName: "Food & Drink",
    icon: "Deliver",
    initStockPercent: 35,
    groups: [
      { source: "Food", tier: "Common" },
      { source: "Drinks", tier: "Common" },
      { source: "Fruit_And_Vegetables", tier: "Common" },
      { source: "Meat", tier: "Common" },
      { source: "Fish", tier: "Common" },
    ],
  },
  {
    fileName: "Medical",
    displayName: "Medical",
    icon: "Deliver",
    initStockPercent: 25,
    groups: [
      {
        source: "Medical",
        tier: "Common",
        overrides: {
          charcoaltablets: "Uncommon",
          purificationtablets: "Uncommon",
          chelatingtablets: "Uncommon",
          disinfectantspray: "Uncommon",
          iodinetincture: "Uncommon",
          gasmask_filter: "Uncommon",
          tetracyclineantibiotics: "Uncommon",
          anticheminjector: "Uncommon",
          bloodtestkit: "Uncommon",
          salinebag: "Rare",
          bloodbagempty: "Rare",
          epinephrine: "Rare",
          morphine: "Rare",
          startkitiv: "Rare",
        },
      },
    ],
  },
  {
    fileName: "Base_Building",
    displayName: "Base Building",
    icon: "Deliver",
    initStockPercent: 25,
    groups: [
      { source: "Tents", tier: "Uncommon" },
      { source: "Locks", tier: "Uncommon" },
      { source: "Containers", tier: "Uncommon" },
      { source: "Flags", tier: "Uncommon" },
      { source: "Furnishings", tier: "Uncommon" },
      {
        source: "Supplies",
        tier: "Uncommon",
        only: SUPPLIES_BASE_BUILDING,
        // Plain bulk crafting materials (as opposed to the more
        // substantial defense/utility items left at Uncommon: barbedwire,
        // camonet, hescobox, powergenerator, tripod) - a hardcore survival
        // server still needs base building to be achievable without
        // trickling in one nail at a time from a 10-cap Uncommon stock.
        overrides: {
          rope: "Common",
          metalwire: "Common",
          epoxyputty: "Common",
          ducttape: "Common",
          woodenplank: "Common",
          metalplate: "Common",
          nailbox: "Common",
          nail: "Common",
        },
      },
    ],
  },
  {
    fileName: "Utility",
    displayName: "Utility",
    icon: "Deliver",
    initStockPercent: 30,
    groups: [
      { source: "Gardening", tier: "Uncommon" },
      { source: "Kits", tier: "Uncommon" },
      { source: "Navigation", tier: "Uncommon" },
      { source: "Electronics", tier: "Uncommon" },
      { source: "Lights", tier: "Uncommon" },
      { source: "Fishing", tier: "Uncommon" },
      { source: "Spraycans", tier: "Uncommon" },
      { source: "Liquids", tier: "Uncommon" },
      { source: "Supplies", tier: "Uncommon", exclude: SUPPLIES_BASE_BUILDING },
    ],
  },
  {
    fileName: "Tools_And_Melee",
    displayName: "Tools & Melee",
    icon: "Deliver",
    initStockPercent: 30,
    groups: [
      { source: "Tools", tier: "Uncommon" },
      { source: "Knifes", tier: "Uncommon" },
      { source: "Melee_Weapons", tier: "Common" },
    ],
  },
  {
    fileName: "Vehicles_Cars",
    displayName: "Vehicles - Cars",
    icon: "Car",
    initStockPercent: 10,
    groups: [{ source: "Cars", tier: "Rare" }],
  },
  {
    fileName: "Vehicles_Helicopters",
    displayName: "Vehicles - Helicopters",
    icon: "Car",
    initStockPercent: 10,
    groups: [{ source: "Helicopters", tier: "Legendary" }],
  },
  {
    // Deliberately NOT referenced by any CUSTOM_TRADER_IDENTITIES category
    // list yet (see traders.ts) - the project owner is theming a spot in
    // the trader city for boats but there's no navigable water anywhere
    // near it yet (same reason Boats was never merged into Vehicles in
    // the first place, and why it's excluded from the Vehicle Dealer's
    // own comment about Boats being deliberately left out). This category
    // is built and tuned (so it's ready to hand to a trader identity the
    // moment there's water access) but stays invisible/unpurchasable
    // until then. Also deliberately left out of
    // DZSurvivalTraderRestock_Module.c's s_ManagedCategories for the same
    // reason - no point auto-restocking stock nobody can buy yet.
    fileName: "Boats",
    displayName: "Vehicles - Boats",
    icon: "Car",
    initStockPercent: 10,
    groups: [
      {
        source: "Boats",
        tier: "Rare",
        // expansionlhd is a massive naval landing craft (DayZ-Expansion's
        // own default price is 300-600 million, dwarfing every other boat
        // here by 4+ orders of magnitude) - Legendary tier (cap 1) fits it
        // far better than Rare (cap 4).
        overrides: { expansionlhd: "Legendary" },
      },
    ],
  },
];

export const RARE_CATEGORIES = ["Ghillies"];
export const RARE_MAX_STOCK_CAP = 3;
const RARE_INIT_STOCK_PERCENT_TARGET = 0.0;

export const VEHICLE_PARTS_CATEGORIES = ["Vehicle_Parts", "Batteries"];
export const VEHICLE_PARTS_MAX_STOCK_CAP = 40;
const VEHICLE_PARTS_INIT_STOCK_PERCENT_TARGET = 50.0;

interface MarketItem {
  ClassName?: string;
  MaxStockThreshold?: number;
  [key: string]: unknown;
}

interface MarketCategory {
  InitStockPercent?: number;
  Items?: MarketItem[];
  [key: string]: unknown;
}

// Extension a raw source category file is renamed to once fully absorbed
// into a MERGED_CATEGORIES entry (or dead per DEAD_MARKET_FILES) - see this
// file's header comment and quarantineConsumedSourceCategories() below for
// why this can't just stay ".json". Deliberately does NOT end in ".json" -
// DayZ-Expansion-Market's folder scan filters strictly by that suffix.
const ORPHAN_SUFFIX = ".orphaned-source";

async function readCategory(name: string): Promise<MarketCategory | null> {
  const orphanPath = `${EXPANSION_MARKET_DIR}/${name}${ORPHAN_SUFFIX}`;
  const path = (await exists(orphanPath))
    ? orphanPath
    : `${EXPANSION_MARKET_DIR}/${name}.json`;
  if (!(await exists(path))) return null;
  return JSON.parse(await Deno.readTextFile(path));
}

async function buildMergedItems(def: MergedCategory): Promise<MarketItem[] | null> {
  const items: MarketItem[] = [];
  const seen = new Set<string>();

  for (const group of def.groups) {
    const source = await readCategory(group.source);
    if (!source) continue;

    for (const item of source.Items ?? []) {
      const className = item.ClassName;
      if (!className) continue;
      if (group.only && !group.only.includes(className)) continue;
      if (group.exclude && group.exclude.includes(className)) continue;
      if (seen.has(className)) continue;
      seen.add(className);

      const tier = group.overrides?.[className] ?? group.tier;
      const priceOverride = group.priceOverrides?.[className];
      items.push({
        ...item,
        MaxStockThreshold: TIER_MAX_STOCK[tier],
        ...(priceOverride
          ? { MinPriceThreshold: priceOverride.min, MaxPriceThreshold: priceOverride.max }
          : {}),
      });
    }
  }

  return items.length > 0 ? items : null;
}

async function writeMergedCategory(def: MergedCategory): Promise<boolean> {
  const items = await buildMergedItems(def);
  if (!items) return false;

  const body: MarketCategory = {
    m_Version: 12,
    DisplayName: def.displayName,
    Icon: def.icon,
    Color: "FBFCFEFF",
    IsExchange: 0,
    InitStockPercent: def.initStockPercent,
    Items: items,
  };

  const path = `${EXPANSION_MARKET_DIR}/${def.fileName}.json`;
  await Deno.writeTextFile(path, JSON.stringify(body, null, 4));
  return true;
}

async function tuneCategory(
  name: string,
  maxStockCap: number,
  initStockPercentTarget: number,
  exact = false,
): Promise<boolean> {
  const path = `${EXPANSION_MARKET_DIR}/${name}.json`;
  if (!(await exists(path))) return false;

  const data: MarketCategory = JSON.parse(await Deno.readTextFile(path));
  let changed = false;

  if (
    typeof data.InitStockPercent === "number" &&
    (exact
      ? data.InitStockPercent !== initStockPercentTarget
      : data.InitStockPercent > initStockPercentTarget)
  ) {
    data.InitStockPercent = initStockPercentTarget;
    changed = true;
  }

  for (const item of data.Items ?? []) {
    if (
      typeof item.MaxStockThreshold === "number" &&
      (exact ? item.MaxStockThreshold !== maxStockCap : item.MaxStockThreshold > maxStockCap)
    ) {
      item.MaxStockThreshold = maxStockCap;
      changed = true;
    }
  }

  if (!changed) return false;
  await Deno.writeTextFile(path, JSON.stringify(data, null, 4));
  return true;
}

// The 21 real, live merged categories (as opposed to the ~50 raw per-slot
// source files and the 3 confirmed-dead catch-all files they get merged
// from/alongside - see marketGapFill.ts's DEAD_MARKET_FILES) - exported so
// anything else that needs to know an item's *current, authoritative*
// MaxStockThreshold (e.g. traders.ts's clampTraderStockToMarketCaps()) only
// ever looks at these, never a stale/irrelevant raw source file's own
// snapshot value for the same classname.
export const MANAGED_MARKET_CATEGORIES: readonly string[] = MERGED_CATEGORIES.map((c) =>
  c.fileName
);

// Renames every raw source category file this merge has fully absorbed (see
// this file's header comment) away from ".json", so DayZ-Expansion-Market's
// folder scan (LoadCategories()) stops double-loading it alongside the real
// merged category it feeds - fixing the silent classname-duplicate-rejection
// data loss that caused. Self-merging entries (Medical, Boats - source name
// equals their own fileName) are deliberately excluded: they read/write the
// exact same file in place, so there's no separate orphaned copy to hide.
// Must run AFTER the merge loop, since readCategory() needs the plain
// ".json" source to still exist the first time a category is merged -
// subsequent runs then transparently read the quarantined copy instead (see
// readCategory()'s own ORPHAN_SUFFIX check).
async function quarantineConsumedSourceCategories(): Promise<number> {
  const consumedSources = new Set<string>();
  for (const def of MERGED_CATEGORIES) {
    for (const group of def.groups) {
      if (MANAGED_MARKET_CATEGORIES.includes(group.source)) continue;
      consumedSources.add(group.source);
    }
  }
  for (const deadFile of DEAD_MARKET_FILES) consumedSources.add(deadFile);

  let quarantined = 0;
  for (const name of consumedSources) {
    const rawPath = EXPANSION_MARKET_DIR + "/" + name + ".json";
    const orphanPath = EXPANSION_MARKET_DIR + "/" + name + ORPHAN_SUFFIX;

    if (await exists(orphanPath)) {
      if (await exists(rawPath)) await Deno.remove(rawPath);
      continue;
    }

    if (await exists(rawPath)) {
      await Deno.rename(rawPath, orphanPath);
      quarantined++;
    }
  }

  return quarantined;
}

export async function tuneExpansionMarket(): Promise<void> {
  if (!(await exists(EXPANSION_MARKET_DIR))) {
    log(
      `${EXPANSION_MARKET_DIR} not generated yet - DayZ-Expansion-Market will create it ` +
        "(with its own defaults) on first server start",
    );
    return;
  }

  let mergedCount = 0;
  for (const def of MERGED_CATEGORIES) {
    if (await writeMergedCategory(def)) mergedCount++;
  }

  let tunedCount = 0;
  for (const name of RARE_CATEGORIES) {
    if (await tuneCategory(name, RARE_MAX_STOCK_CAP, RARE_INIT_STOCK_PERCENT_TARGET, true)) {
      tunedCount++;
    }
  }
  for (const name of VEHICLE_PARTS_CATEGORIES) {
    if (
      await tuneCategory(
        name,
        VEHICLE_PARTS_MAX_STOCK_CAP,
        VEHICLE_PARTS_INIT_STOCK_PERCENT_TARGET,
        true,
      )
    ) {
      tunedCount++;
    }
  }

  const quarantinedCount = await quarantineConsumedSourceCategories();

  if (mergedCount === 0 && tunedCount === 0 && quarantinedCount === 0) return;
  const quarantineNote = quarantinedCount > 0
    ? ", quarantined " + quarantinedCount + " orphaned raw source categor" +
      (quarantinedCount === 1 ? "y" : "ies") + " so DayZ-Expansion-Market stops double-loading them"
    : "";
  ok(
    `Rebuilt ${mergedCount} merged DayZ-Expansion-Market categor${mergedCount === 1 ? "y" : "ies"} ` +
      `and tuned ${tunedCount} other categor${tunedCount === 1 ? "y" : "ies"} in ${EXPANSION_MARKET_DIR}` +
      quarantineNote,
  );
}

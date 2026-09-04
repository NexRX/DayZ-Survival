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
//   4. Same tier assignment also drives BUY_PRICE_MULTIPLIER (buying rarer
//      tiers costs proportionally more) and SELL_PRICE_PERCENT_OVERRIDE
//      (rarer tiers pay out a higher percentage on sale than the 20%
//      global default - a per-item override DayZ-Expansion-Market itself
//      supports, see that constant's own comment for how the fallback
//      chain works).
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
// Tightened 2026-08 for the hardcore-survival pass (was 25/10/4/1) - see
// serverpack/README.md's "hardcore economy rebalance" section.
export const TIER_MAX_STOCK: Record<Tier, number> = {
  Common: 20,
  Uncommon: 8,
  Rare: 3,
  Legendary: 1,
};

// Buy-price multiplier applied on top of whatever price
// (DayZ-Expansion-Market's own shipped default, or this file's own
// priceOverride) an item would otherwise land on - part of the same
// 2026-08 hardcore-survival pass as TIER_MAX_STOCK above. Buying is
// completely unaffected by MarketSettings.json's SellPricePercent
// (confirmed via ExpansionMarketItem.CalculatePrice() - the buy path
// always uses modifier=1.0), so this is the only lever for "buying stuff
// should be hard even with money" as opposed to "earning money should be
// hard) - that side is MarketSettings.json's SellPricePercent - see
// traders.ts's ensureHardcoreSellPricePercent()). Common stays at 1.0x
// since that tier covers the baseline survival loop (ammo/food/meds/basic
// clothes) - deliberately not penalized. Rare/Legendary bumped further
// (2.0->2.5, 2.5->3.5) in a later hardcore pass - the whole point of those
// tiers is that money alone shouldn't buy real power; Common/Uncommon left
// untouched so the basic survival loop doesn't get harder too.
export const BUY_PRICE_MULTIPLIER: Record<Tier, number> = {
  Common: 1.0,
  Uncommon: 1.5,
  Rare: 2.5,
  Legendary: 3.5,
};

// Per-item sell-price-percent override, layered on top of the global
// SellPricePercent (MarketSettings.json, see traders.ts's
// HARDCORE_SELL_PRICE_PERCENT). Confirmed via unpacking market_scripts.pbo
// (ExpansionMarketTrader.GetSellPricePercent()): each item's own
// SellPricePercent takes priority over the trader zone's own
// SellPricePercent, which takes priority over the global setting - all
// three use -1 as an "inherit the next level up" sentinel. This project's
// custom zone already leaves its own SellPricePercent at -1 (see
// ensureCustomZone() in traders.ts), so setting a real value here is the
// only thing that can make one item sell for a different percentage than
// another.
//
// Every tier used to inherit the 20 global default except Rare/Legendary,
// which were bumped to 40/60 so a lucky rare/legendary find was worth
// cashing in without going anywhere near DayZ-Expansion-Market's own 75
// default. Briefly replaced with a single flat 66% across the whole trader
// (see traders.ts's HARDCORE_SELL_PRICE_PERCENT) at the project owner's
// request; reverted 2026-09 ("I think sell percentage was fine at 20
// actually and rarer items should sell for more percentage if possible but
// not up to 75") back to this exact original scheme - global 20%, Common/
// Uncommon inherit it via -1, Rare/Legendary get their own explicit bump.
export const SELL_PRICE_PERCENT_OVERRIDE: Record<Tier, number> = {
  Common: -1,
  Uncommon: -1,
  Rare: 40,
  Legendary: 60,
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
  /**
   * Flat SellPricePercent applied to every item in THIS group only, taking
   * priority over both the category-wide MergedCategory.sellPricePercent
   * and the normal per-tier SELL_PRICE_PERCENT_OVERRIDE lookup. Use for a
   * rule that only applies to one source within an otherwise-mixed
   * category (e.g. Consumables' Meat/Fish groups selling for a flat 75%
   * while its Food/Drinks/Fruit_And_Vegetables groups keep the normal 20%
   * global rate - a category-wide sellPricePercent can't express that
   * since they all share one MergedCategory).
   */
  sellPricePercent?: number;
}

interface MergedCategory {
  fileName: string;
  displayName: string;
  icon: string;
  initStockPercent: number;
  groups: SourceGroup[];
  /**
   * Flat SellPricePercent applied to every item in this merged category,
   * overriding the normal per-tier SELL_PRICE_PERCENT_OVERRIDE lookup
   * entirely. Use for a whole-category rule that isn't tier-dependent
   * (e.g. Gun_Attachments_Military/Civilian's own "attachments should
   * only ever sell for half their buy price" rule below) - a per-tier
   * override can't express that since these categories are entirely
   * Uncommon-tier, which would otherwise just inherit the 20% global
   * default like everything else.
   */
  sellPricePercent?: number;
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

// Found via a project-owner report ("a KA mag for almost 8K!!!!") and a
// full deep-dive, 2026-09: every real vanilla magazine's own DayZ-
// Expansion-Market default price (the base this project's tier multiplier
// then scales) tracks its COMPATIBLE WEAPON'S price, not the magazine's
// own value - confirmed exactly: mag_ssg82_5rnd (5940-9900) is IDENTICAL
// to the ssg82 rifle itself (5940-9900); mag_cz550_10rnd (4988-8310) is
// ~89% of the cz550 rifle (5588-9315); mag_akm_drum75rnd (17625-29370)
// actually costs MORE than the entire akm rifle it belongs to
// (16788-27975). The result was wildly inconsistent, weapon-tier-driven
// magazine prices (180 for a pm73 mag up to 29370 for an akm drum) with
// zero relationship to the magazine's own real differentiator - capacity.
// Re-priced below purely by round count, independent of which weapon it
// feeds or that weapon's own price/rarity - a magazine is a cheap
// accessory, never a fraction of buying a whole extra gun.
// NOTE: these bands are pre-multiplier BASE prices (like every other
// priceOverride in this file) - this group's tier is Uncommon, whose
// BUY_PRICE_MULTIPLIER is 1.5x, so the real in-trader price is 1.5x each
// number below (e.g. TINY's 200-367 base becomes a real 300-550).
const MAGAZINE_BAND_TINY = { min: 200, max: 367 }; // <=10rnd -> real 300-550
const MAGAZINE_BAND_SMALL = { min: 300, max: 500 }; // 11-20rnd -> real 450-750
const MAGAZINE_BAND_MEDIUM = { min: 400, max: 667 }; // 21-30rnd -> real 600-1000
const MAGAZINE_BAND_LARGE = { min: 533, max: 867 }; // 31-45rnd -> real 800-1300
const MAGAZINE_BAND_XLARGE = { min: 733, max: 1200 }; // 46-64rnd -> real 1100-1800
const MAGAZINE_BAND_DRUM = { min: 1000, max: 1667 }; // 65rnd+ -> real 1500-2500
// Note: TGK-WeaponPack's own Sobr_Mag_*/SM_Magazine_*/SM_Mag_* reskins are
// deliberately NOT included here - those are already flat-priced by
// marketGapFill.ts's TGK_MAGAZINE_PRICE (300-600), a separate "cosmetic
// reskin pack" pricing decision that predates this fix and is unrelated to
// the real per-weapon clone bug above.
const MAGAZINE_PRICE_OVERRIDES: Record<string, { min: number; max: number }> = {
  // Military
  mag_cz61_20rnd: MAGAZINE_BAND_SMALL,
  mag_pp19_64rnd: MAGAZINE_BAND_XLARGE,
  mag_ump_25rnd: MAGAZINE_BAND_MEDIUM,
  mag_mp5_15rnd: MAGAZINE_BAND_SMALL,
  mag_mp5_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_fal_20rnd: MAGAZINE_BAND_SMALL,
  mag_akm_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_akm_palm30rnd: MAGAZINE_BAND_MEDIUM,
  mag_akm_drum75rnd: MAGAZINE_BAND_DRUM,
  mag_ak101_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_ak74_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_ak74_45rnd: MAGAZINE_BAND_LARGE,
  mag_stanag_30rnd: MAGAZINE_BAND_MEDIUM,
  // "coupled" (two mags taped together for a fast reload) - priced as its
  // stated 30rnd capacity, same as every other single 30rnd STANAG mag;
  // the fast-reload convenience isn't worth double the price.
  mag_stanagcoupled_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_stanag_60rnd: MAGAZINE_BAND_XLARGE,
  mag_cmag_10rnd: MAGAZINE_BAND_TINY,
  mag_cmag_20rnd: MAGAZINE_BAND_SMALL,
  mag_cmag_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_cmag_40rnd: MAGAZINE_BAND_LARGE,
  mag_vss_10rnd: MAGAZINE_BAND_TINY,
  mag_val_20rnd: MAGAZINE_BAND_SMALL,
  mag_vikhr_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_svd_10rnd: MAGAZINE_BAND_TINY,
  mag_sv98_10rnd: MAGAZINE_BAND_TINY,
  mag_famas_25rnd: MAGAZINE_BAND_MEDIUM,
  mag_aug_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_m14_10rnd: MAGAZINE_BAND_TINY,
  mag_m14_20rnd: MAGAZINE_BAND_SMALL,
  // Civilian
  mag_pm73_15rnd: MAGAZINE_BAND_SMALL,
  mag_pm73_25rnd: MAGAZINE_BAND_MEDIUM,
  mag_deagle_9rnd: MAGAZINE_BAND_TINY,
  mag_ruger1022_30rnd: MAGAZINE_BAND_MEDIUM,
  mag_p1_8rnd: MAGAZINE_BAND_TINY,
  mag_ij70_8rnd: MAGAZINE_BAND_TINY,
  mag_ruger1022_15rnd: MAGAZINE_BAND_SMALL,
  mag_mkii_10rnd: MAGAZINE_BAND_TINY,
  mag_glock_15rnd: MAGAZINE_BAND_SMALL,
  mag_cz75_15rnd: MAGAZINE_BAND_SMALL,
  mag_cz527_5rnd: MAGAZINE_BAND_TINY,
  mag_scout_5rnd: MAGAZINE_BAND_TINY,
  mag_1911_7rnd: MAGAZINE_BAND_TINY,
  mag_cz550_10rnd: MAGAZINE_BAND_TINY,
  mag_saiga_5rnd: MAGAZINE_BAND_TINY,
  mag_saiga_8rnd: MAGAZINE_BAND_TINY,
  mag_ssg82_5rnd: MAGAZINE_BAND_TINY,
  mag_fnx45_15rnd: MAGAZINE_BAND_SMALL,
  // Actual capacity is 20rnd despite the "drum" name - priced by real
  // capacity, not the name.
  mag_saiga_drum20rnd: MAGAZINE_BAND_SMALL,
};

// m4_suppressor/ak_suppressor (the plain vanilla suppressors) were priced
// at 7283-12135 - MORE than every one of their own TGK-WeaponPack reskinned
// variants (M4_Suppressor_Black/Beige/Camo, AK_Suppressor_Black/Beige/Camo,
// all already 3500-6000 via marketGapFill.ts's TGK price fixes). A plain
// item costing more than every skin of itself makes no sense - re-priced to
// match. Base 2334-4000 (this group is also Uncommon/1.5x) -> real
// 3500-6000, same as the skinned variants.
const MUZZLE_PRICE_OVERRIDES: Record<string, { min: number; max: number }> = {
  m4_suppressor: { min: 2334, max: 4000 },
  ak_suppressor: { min: 2334, max: 4000 },
};
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
      {
        source: "Assault_Rifles",
        tier: "Rare",
        // Found via a full pistol-vs-rifle price audit (2026-09, project
        // owner: "some pistols are worth more than assault rifles"):
        // ak101/m16a2/famas/augshort all shared one accidental DayZ-
        // Expansion-Market default (2730-4550 base -> 6825-11375 final at
        // this group's Rare 2.5x), and m4a1/aug shared another, even lower
        // one (1225-2040 base -> 3062-5100 final) - both bands sat BELOW
        // several real civilian pistols (fnx45 alone: 7058-11768). Re-based
        // to sit solidly above every pistol/SMG in the trader, in line with
        // this same group's own ak74/akm/fal (14850-24750/16788-27975/
        // 15050-25075). sawedofffamas is deliberately left untouched - every
        // other "sawed off" variant in this trader (sawedoffb95,
        // sawedoffizh18, sawedoffmosin9130, sawedoffmagnum) is intentionally
        // its family's cheapest, junk-tier novelty, and this is no
        // different.
        priceOverrides: {
          ak101: { min: 5500, max: 9200 },
          m16a2: { min: 5500, max: 9200 },
          famas: { min: 5500, max: 9200 },
          augshort: { min: 5500, max: 9200 },
          m4a1: { min: 5300, max: 8800 },
          aug: { min: 5300, max: 8800 },
        },
      },
      { source: "Submachine_Guns", tier: "Uncommon", exclude: SUBMACHINE_GUNS_CIVILIAN },
      { source: "Sniper_Rifles", tier: "Legendary", exclude: SNIPER_RIFLES_CIVILIAN },
      { source: "Rifles", tier: "Rare", only: RIFLES_MIL_DMR },
      // deagle and saiga moved here from Guns_Civilian (project owner:
      // "make the Vaiga and the deagle military not civilian") - relocated
      // via only/exclude on the shared Pistols/Shotguns source groups
      // rather than duplicating those groups' full item lists. deagle also
      // gets an explicit priceOverride (10000 base * this group's Rare 2.5x
      // multiplier = a flat 25000, "make the deagle 25K") - its real
      // DayZ-Expansion-Market default (225-375) made it the single cheapest
      // civilian pistol in the whole trader, nowhere near a 25K sidearm's
      // actual value. saiga is a separate group at its own original
      // Uncommon tier (4165-6940 base -> 6248-10410 final, unchanged) -
      // only its category changes, per "leave its price, just relocate it".
      {
        source: "Pistols",
        tier: "Rare",
        only: ["deagle"],
        priceOverrides: { deagle: { min: 10000, max: 10000 } },
      },
      { source: "Shotguns", tier: "Uncommon", only: ["saiga"] },
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
      // saiga excluded - moved to Guns_Military (see that category's own
      // comment on the project owner's "Vaiga...military not civilian"
      // request).
      { source: "Shotguns", tier: "Uncommon", exclude: ["saiga"] },
      { source: "Crossbows", tier: "Uncommon" },
      // deagle excluded - moved to Guns_Military (see that category's own
      // comment). engraved1911 ("engraved Kolt") re-priced: its real
      // default (3235-5390 base) put it above several rifles at this tier's
      // 1.5x multiplier (4853-8085) - project owner asked for "~5000-ish"
      // instead; 3333 base * 1.5 rounds to a flat 5000.
      {
        source: "Pistols",
        tier: "Uncommon",
        exclude: ["deagle"],
        priceOverrides: { engraved1911: { min: 3333, max: 3333 } },
      },
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
    // Project owner (2026-09 economy pass): "make attachments only sell
    // for half of their buy price" - a flat category-wide rule, not tied
    // to tier (this category is entirely Uncommon/Rare/Legendary already,
    // whose per-tier sell percents would otherwise be 20/40/60 - all
    // overridden to a flat 50 here instead).
    sellPricePercent: 50,
    groups: [
      {
        source: "Magazines",
        tier: "Uncommon",
        only: MAGAZINES_MIL,
        priceOverrides: MAGAZINE_PRICE_OVERRIDES,
      },
      {
        source: "Muzzles",
        tier: "Uncommon",
        only: MUZZLES_MIL,
        priceOverrides: MUZZLE_PRICE_OVERRIDES,
      },
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
      // "There are some gun flashlights in the Utility category" - moved
      // from Utility's own Lights group (see that category's own comment).
      // universallight/tlrlight are real weapon rail-mounted flashlight/
      // laser combos, priced/tiered like every other Uncommon attachment
      // here (and covered by this category's flat 50% sell rule above).
      { source: "Lights", tier: "Uncommon", only: ["universallight", "tlrlight"] },
    ],
  },
  {
    fileName: "Gun_Attachments_Civilian",
    displayName: "Gun Attachments - Civilian",
    icon: "Deliver",
    initStockPercent: 30,
    // Same flat "sell for half of buy price" rule as Gun_Attachments_
    // Military above.
    sellPricePercent: 50,
    groups: [
      {
        source: "Magazines",
        tier: "Uncommon",
        exclude: MAGAZINES_MIL,
        priceOverrides: MAGAZINE_PRICE_OVERRIDES,
      },
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
      // "NVG in utility but want it in military top with helmets" - moved
      // from Utility's own Electronics group (see that category's own
      // comment) to sit alongside its sibling nvgheadstrap above - same
      // Legendary tier, since standalone NVG goggles are at least as
      // capable a night-vision item as the head-strap version.
      { source: "Electronics", tier: "Legendary", only: ["nvgoggles"] },
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
      {
        source: "Drinks",
        tier: "Common",
        // "filteringbottle" (Canteen with built-in filter) and
        // "expansionmilkbottle" (Milk Bottle) were still at DayZ-
        // Expansion-Market's own defaults (145-240 and 130-220) - the
        // project owner: "filtering bottle is too cheap, should be 1K" and
        // "milk bottle should also be about 500".
        priceOverrides: {
          filteringbottle: { min: 1000, max: 1000 },
          expansionmilkbottle: { min: 500, max: 500 },
        },
      },
      { source: "Fruit_And_Vegetables", tier: "Common" },
      {
        source: "Meat",
        tier: "Common",
        // DayZ-Expansion-Market's own shipped default priced every raw
        // butchered steak/leg cut at 8-16 - barely above a wild apple
        // (7-9), despite requiring an actual kill + successful butchering
        // to obtain (found via a full food-price audit, 2026-09). First
        // bumped to 30-55, then doubled twice more (to 180-280, then
        // 360-560) per the project owner's explicit follow-up requests:
        // hunting should double as a genuine, if modest, income source.
        //
        // UPDATE (2026-09, later pass): project owner asked for steaks to
        // sell for a flat 75% of buy price (same ask as Fish below) with
        // progressively higher prices for harder-to-kill animals, instead
        // of one flat band for every species regardless of difficulty.
        // `sellPricePercent: 75` below applies to every item in this group
        // (steaks only - Food/Drinks/Fruit_And_Vegetables above are
        // unaffected, still the normal 20% global rate). Difficulty
        // ranking (common-sense DayZ hunting knowledge, not a precise
        // simulation): Tier 1 is small game/livestock that's easy to find
        // and safely kill (rabbit, chicken, goat, sheep); Tier 2 is bigger
        // livestock/common wild game that still needs a real weapon (pig,
        // cow, deer, fox); Tier 3 is genuinely dangerous or scarce wild
        // game (boar, mouflon, reindeer); Tier 4 is the two apex predators
        // that can kill you back (bear, wolf). Bands chosen so Tier 1's
        // sell price floors at exactly 400 (534 * 0.75 = 400.5) and each
        // tier steps up from there - a full animal's worth of cuts still
        // funds a meaningful chunk of gear without trivializing the
        // trader's own gun/gear economy.
        sellPricePercent: 75,
        priceOverrides: {
          // Tier 1 - easy/common (buy 534-700, sell 400-525)
          rabbitlegmeat: { min: 534, max: 700 },
          chickenbreastmeat: { min: 534, max: 700 },
          goatsteakmeat: { min: 534, max: 700 },
          sheepsteakmeat: { min: 534, max: 700 },
          // Tier 2 - moderate (buy 700-900, sell 525-675)
          pigsteakmeat: { min: 700, max: 900 },
          cowsteakmeat: { min: 700, max: 900 },
          deersteakmeat: { min: 700, max: 900 },
          foxsteakmeat: { min: 700, max: 900 },
          // Tier 3 - hard/dangerous wild game (buy 900-1150, sell 675-863)
          boarsteakmeat: { min: 900, max: 1150 },
          mouflonsteakmeat: { min: 900, max: 1150 },
          reindeersteakmeat: { min: 900, max: 1150 },
          // Tier 4 - apex predators (buy 1150-1450, sell 863-1088)
          bearsteakmeat: { min: 1150, max: 1450 },
          wolfsteakmeat: { min: 1150, max: 1450 },
        },
      },
      {
        source: "Fish",
        tier: "Common",
        // Same "hunting/fishing should be a subtle income source" pass as
        // the Meat group above, and the same 2026-09 follow-up request:
        // fish sell for a flat 75% of buy price, with progressively higher
        // prices for harder-to-catch species instead of one flat band for
        // everything. Difficulty ranking (common-sense DayZ fishing
        // knowledge): Tier 1 is the smallest/most common catches needing
        // the least effort (sardines, trap-caught shrimp); Tier 2 is common
        // coastal/freshwater fish (mackerel, carp); Tier 3 is larger/
        // less common catches (steelhead trout, walleye pollock); Tier 4 is
        // caviar - a processed byproduct, not a whole fish, priced above
        // every whole fish. Bands chosen so Tier 1's sell price floors at
        // exactly 400 (534 * 0.75 = 400.5), matching the Meat group's own
        // Tier 1 floor. Fillets (cleaned cuts, real butchering effort) are
        // priced above their species' whole-fish tier, same relationship
        // the Meat group's steaks already have over a raw carcass.
        sellPricePercent: 75,
        priceOverrides: {
          // Tier 1 - easiest/most common (buy 534-700, sell 400-525)
          sardines: { min: 534, max: 700 },
          shrimp: { min: 534, max: 700 },
          // Tier 2 - common (buy 700-900, sell 525-675)
          mackerel: { min: 700, max: 900 },
          carp: { min: 700, max: 900 },
          // Tier 3 - larger/less common (buy 900-1150, sell 675-863)
          steelheadtrout: { min: 900, max: 1150 },
          walleyepollock: { min: 900, max: 1150 },
          // Tier 4 - processed byproduct, rarest (buy 1150-1450, sell 863-1088)
          redcaviar: { min: 1150, max: 1450 },
          // Fillets - cleaned cuts, priced above their species' whole-fish
          // tier (carp/mackerel are Tier 2, steelheadtrout is Tier 3)
          carpfilletmeat: { min: 1000, max: 1300 },
          mackerelfilletmeat: { min: 1000, max: 1300 },
          steelheadtroutfilletmeat: { min: 1250, max: 1600 },
        },
      },
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
      // Project owner (2026-09 follow-up): "NVG in utility but want it in
      // military top with helmets" - nvgoggles (standalone night vision
      // goggles) moved to Clothing_Head_Military instead, alongside the
      // other military headgear/eyewear (see that category's own Eyewear
      // group below, matching its sibling nvgheadstrap).
      { source: "Electronics", tier: "Uncommon", exclude: ["nvgoggles"] },
      // "There are some gun flashlights in the Utility category" -
      // universallight/tlrlight are real weapon rail-mounted flashlight/
      // laser attachments, not handheld tools - moved to
      // Gun_Attachments_Military below (flashlight/headtorch/spotlight/
      // chemlights/lighters etc. all stay here, they're genuinely handheld).
      { source: "Lights", tier: "Uncommon", exclude: ["universallight", "tlrlight"] },
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
    groups: [
      {
        source: "Cars",
        tier: "Rare",
        // Project owner (2026-09 follow-up): "some better vehicles are the
        // same price as lower tier cars" - every car/truck/SUV/pickup here
        // (85 classnames total) was sitting within one narrow 36000-96000
        // buy band regardless of real capability, except the two already
        // confirmed correct: expansiontractor (25000-50000 base, lowest
        // tier, untouched - no override below) and expansionvodnik
        // (250000-500000 base, top tier, untouched). Every other family
        // below gets its own priceOverride (pre-multiplier base - this
        // group is Rare tier, 2.5x - see BUY_PRICE_MULTIPLIER) so the whole
        // lineup climbs smoothly from the tractor up to the Vodnik: basic
        // hatchback -> sedan -> civilian sedan -> offroad hatchback ->
        // Offroad_02 -> covered cargo truck -> Apoc pickup/SUV -> UAZ ->
        // M1025 Humvee ("should probably be 150K - a humvee but an
        // apocalyptic scrappy version") -> bus -> Landrover -> Vodnik.
        // Every reskin/color variant of a base vehicle gets the same price
        // as its base (same physical vehicle, cosmetic-only difference).
        priceOverrides: {
          ...Object.fromEntries(
            [
              "hatchback_02",
              "Hatchback_02_Black",
              "Hatchback_02_Blue",
              "Hatchback_02_Cab",
              "Hatchback_02_Pizzapresto",
              "Hatchback_02_cat",
              "Hatchback_02_fat",
              "Hatchback_02_icegem",
              "Hatchback_02_mtconstruction",
              "Hatchback_02_purplebomb",
              "Hatchback_02_purplesmoke",
              "Hatchback_02_rustbeige",
              "Hatchback_02_stripes1",
            ].map((c) => [c, { min: 12800, max: 22400 }] as const), // final 32000-56000
          ),
          ...Object.fromEntries(
            [
              "sedan_02",
              "Sedan_02_Grey",
              "Sedan_02_Medic01",
              "Sedan_02_Red",
              "Sedan_02_peacebird",
            ].map((c) => [c, { min: 15200, max: 25600 }] as const), // final 38000-64000
          ),
          ...Object.fromEntries(
            ["civiliansedan", "CivilianSedan_Black", "CivilianSedan_Wine"].map(
              (c) => [c, { min: 18400, max: 30400 }] as const, // final 46000-76000
            ),
          ),
          ...Object.fromEntries(
            [
              "offroadhatchback",
              "OffroadHatchback_5000ca",
              "OffroadHatchback_Blue",
              "OffroadHatchback_Cab",
              "OffroadHatchback_Firefighter",
              "OffroadHatchback_PoliceRus",
              "OffroadHatchback_White",
              "OffroadHatchback_chernarusarmy",
              "OffroadHatchback_wineblue",
            ].map((c) => [c, { min: 22000, max: 36000 }] as const), // final 55000-90000
          ),
          offroad_02: { min: 24000, max: 38000 }, // final 60000-95000
          ...Object.fromEntries(
            ["truck_01_covered", "Truck_01_Covered_Blue", "Truck_01_Covered_Orange"].map(
              (c) => [c, { min: 28000, max: 44000 }] as const, // final 70000-110000
            ),
          ),
          // NOTE: TP_Apoc_Suv/TP_ApocPickup_Truck/TP_Apoc_M1025 (the Apoc
          // SUV/pickup/Humvee families) deliberately have NO priceOverride
          // here - they don't exist in the raw "Cars" source file at all
          // (confirmed via src/data/marketGapFill.json: each is its own
          // "category": "Vehicles_Cars" manifest group, cloned entirely by
          // marketGapFill.ts from whatever this category's first item
          // happens to be, tier-only via manifest, never touched by this
          // group's own priceOverrides). Their prices are instead fixed
          // directly in marketGapFill.ts's VEHICLE_MANIFEST_CAR_PRICE_FIXES
          // (same "inherited an unrelated gap-fill template price" pattern
          // as TGK_PRICE_FIXES/BOW_PRICE_FIXES) - see that file.
          expansionuaz: { min: 46000, max: 62000 }, // final 115000-155000
          expansionbus: { min: 66000, max: 90000 }, // final 165000-225000
          expansion_landrover: { min: 70000, max: 94000 }, // final 175000-235000
        },
      },
    ],
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
// Project owner (2026-09 follow-up): "the stock for most vehicle parts is
// 20, want a default of 1". Cap dropped from 40 straight to 1 - every
// classname in these two categories is now individually scarce, matching
// every other Legendary-tier item's cap elsewhere in this economy.
export const VEHICLE_PARTS_MAX_STOCK_CAP = 1;
// Init stock kept at 100% (full, i.e. exactly the new cap of 1) rather than
// dropping to 0% alongside RARE_CATEGORIES above: this category is still a
// functional necessity, not a "coveted power" one (see this file's own
// header comment) - a vehicle purchase spawns its default attachments
// (wheels, doors, battery, ...) drawing from these same per-classname stock
// pools, and starting every part at 0 would make the very first vehicle
// purchase after this change fail outright for lack of parts. With a cap
// of only 1, "start full" is already exactly the scarcity level asked for -
// it just means the FIRST unit of each part is available immediately, and
// every purchase after that has to wait on DZSurvivalTraderRestock_Module.c's
// own dedicated daily vehicle-parts trickle (see that file's
// VehiclePartsTick(), "restock 1 empty vehicle part a day max") or a
// player selling one in.
const VEHICLE_PARTS_INIT_STOCK_PERCENT_TARGET = 100.0;

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
  const path = (await exists(orphanPath)) ? orphanPath : `${EXPANSION_MARKET_DIR}/${name}.json`;
  if (!(await exists(path))) return null;
  return JSON.parse(await Deno.readTextFile(path));
}

// Defense-in-depth hard ceiling on any computed price. The Enforce script
// engine's JSON loader parses MinPriceThreshold/MaxPriceThreshold as int32
// (max ~2.147 billion) - anything above that hard-crashes the whole server
// on next load with "Cannot convert to int", not just a bad price for one
// item (confirmed live, 2026-09 - see buildMergedItems()'s own comment on
// the Boats self-merge compounding bug that first triggered this). Kept
// comfortably below the true int32 ceiling.
const MAX_SAFE_PRICE = 2_000_000_000;

function clampPrice(value: number): number {
  return Math.min(value, MAX_SAFE_PRICE);
}

async function buildMergedItems(def: MergedCategory): Promise<MarketItem[] | null> {
  const items: MarketItem[] = [];
  const seen = new Set<string>();

  for (const group of def.groups) {
    const source = await readCategory(group.source);
    if (!source) continue;

    // Self-merging categories (Boats, Medical - source name equals their
    // own fileName) read AND write the exact same live file, unlike every
    // other group here which reads an untouched, quarantined-away pristine
    // copy (see quarantineConsumedSourceCategories()). Applying the price
    // multiplier here would re-multiply an already-multiplied price on
    // every single server boot, compounding forever - confirmed live
    // (2026-09): Boats' Legendary-tier expansionlhd went 600M -> 58.59
    // BILLION after 5 boots (2.5^5), overflowing the Enforce script
    // engine's int32 and hard-crashing the server on every subsequent
    // start ("File Boats.json: JSON ERROR ... Cannot convert to int").
    // Self-merging groups therefore never re-price - tier assignment still
    // fully controls MaxStockThreshold (the actual reason Boats/Medical use
    // tiers at all: capping expansionlhd to 1 in stock, etc.), just never
    // touches price again after whatever's already on disk.
    const selfMerging = group.source === def.fileName;

    for (const item of source.Items ?? []) {
      const className = item.ClassName;
      if (!className) continue;
      if (group.only && !group.only.includes(className)) continue;
      if (group.exclude && group.exclude.includes(className)) continue;
      if (seen.has(className)) continue;
      seen.add(className);

      const tier = group.overrides?.[className] ?? group.tier;

      if (selfMerging) {
        const clamped: MarketItem = {
          ...item,
          MaxStockThreshold: TIER_MAX_STOCK[tier],
          // See this function's own header comment on the "static stock"
          // bug (found via a full economy audit, 2026-09, triggered by a
          // player noticing SM_Rifle_MK47_Mutant_Black - Legendary tier,
          // cap 1 - was always buyable no matter how many they bought).
          // DayZ-Expansion-Market's ExpansionMarketItem.IsStaticStock()
          // (confirmed via unpacking market_scripts.pbo) returns true
          // whenever MinStockThreshold == MaxStockThreshold, and a static-
          // stock item's stock is NEVER decremented on purchase
          // (ExpansionMarketModule.c/ExpansionMarketTraderZone.c both
          // explicitly skip the stock-removal call for it) - it's meant for
          // deliberately-unlimited items, not a real cap. Every Legendary-
          // tier item (cap 1) shipped with DayZ-Expansion-Market's own
          // default MinStockThreshold of 1 already, so ALL 126 of them
          // (every gun, vehicle, safe, etc. this project set to cap 1) were
          // silently always-in-stock regardless of their real cap. Forcing
          // MinStockThreshold to 0 here guarantees it's never equal to a
          // non-zero MaxStockThreshold, so real scarcity actually applies.
          MinStockThreshold: 0,
          SellPricePercent: group.sellPricePercent ?? def.sellPricePercent ??
            SELL_PRICE_PERCENT_OVERRIDE[tier],
        };
        if (typeof clamped.MinPriceThreshold === "number") {
          clamped.MinPriceThreshold = clampPrice(clamped.MinPriceThreshold);
        }
        if (typeof clamped.MaxPriceThreshold === "number") {
          clamped.MaxPriceThreshold = clampPrice(clamped.MaxPriceThreshold);
        }
        items.push(clamped);
        continue;
      }

      const priceOverride = group.priceOverrides?.[className];
      const multiplier = BUY_PRICE_MULTIPLIER[tier];
      const baseMin = priceOverride ? priceOverride.min : Number(item.MinPriceThreshold);
      const baseMax = priceOverride ? priceOverride.max : Number(item.MaxPriceThreshold);
      items.push({
        ...item,
        MaxStockThreshold: TIER_MAX_STOCK[tier],
        // See the selfMerging branch above for the full "static stock"
        // bug writeup - same fix applies here for every non-self-merging
        // item.
        MinStockThreshold: 0,
        MinPriceThreshold: clampPrice(Math.round(baseMin * multiplier)),
        MaxPriceThreshold: clampPrice(Math.round(baseMax * multiplier)),
        SellPricePercent: group.sellPricePercent ?? def.sellPricePercent ??
          SELL_PRICE_PERCENT_OVERRIDE[tier],
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
    `Rebuilt ${mergedCount} merged DayZ-Expansion-Market categor${
      mergedCount === 1 ? "y" : "ies"
    } ` +
      `and tuned ${tunedCount} other categor${
        tunedCount === 1 ? "y" : "ies"
      } in ${EXPANSION_MARKET_DIR}` +
      quarantineNote,
  );
}

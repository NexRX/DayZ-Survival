// Closes the "player finds an item but can't sell it anywhere" gap.
//
// DayZ-Expansion-Market's per-category files under profiles/ExpansionMod/
// Market/ are generated once when the mission first loads and never
// re-scanned against the mod list afterwards, so a classname added by a
// later mod update (or a reskin the snapshot never included) has nowhere to
// sell no matter how many times market.ts's merge re-runs. This module
// cross-references every <type> in the merged economy against every
// classname currently sellable and gap-fills anything missing - see
// src/data/marketGapFill.json for the full, hand-reviewed list (excludes
// creatures, zombies, vehicle wrecks, and world-decor props).
//
// Two ways an entry closes the gap, both by cloning a full existing item
// record (price/spawn fields verbatim) rather than inventing prices:
//   - `template`: an exact sibling classname already sellable somewhere
//     (e.g. "Armband_Bear" -> template "armband_apa"), found by matching on
//     the classname with its trailing color/variant segment stripped.
//   - `category` + `tier`: no sibling exists, so clone the first existing
//     item in the destination category and set MaxStockThreshold from this
//     file's own tier (kept in sync with market.ts's TIER_MAX_STOCK).
//
// Idempotent and additive only: never touches an item once already present,
// so it never resets a category a player has already been trading in. Must
// run after tuneExpansionMarket() (which creates/repopulates the merged
// category files this reads from).

import { EXPANSION_MARKET_DIR } from "./paths.ts";
import { log, ok, warn } from "./ui.ts";
import { exists } from "./steam.ts";
import manifest from "./data/marketGapFill.json" with { type: "json" };
// Vehicle_Parts/Batteries absolute price targets - see VEHICLE_PARTS_PRICE_FIXES
// below. Kept as a separate JSON file purely for size/readability.
import vehiclePartsPriceFixesData from "./data/vehiclePartsPriceFixes.json" with {
  type: "json",
};
import {
  AMMUNITION as TGK_AMMUNITION,
  AMMUNITION_BOXES as TGK_AMMUNITION_BOXES,
  AMMUNITION_CRATES as TGK_AMMUNITION_CRATES,
  BUTTSTOCKS as TGK_BUTTSTOCKS,
  FLASHLIGHTS as TGK_FLASHLIGHTS,
  FOREGRIPS as TGK_FOREGRIPS,
  GRENADE_LAUNCHERS as TGK_GRENADE_LAUNCHERS,
  HANDGUARDS as TGK_HANDGUARDS,
  KNIVES as TGK_KNIVES,
  MAGAZINES as TGK_MAGAZINES,
  OPTICS as TGK_OPTICS,
  OTHERS as TGK_OTHERS,
  PISTOLGRIPS as TGK_PISTOLGRIPS,
  PISTOLS as TGK_PISTOLS,
  RECEIVERS as TGK_RECEIVERS,
  RIFLES_HEAVY_AND_SNIPER as TGK_RIFLES_HEAVY_AND_SNIPER,
  RIFLES_STANDARD as TGK_RIFLES_STANDARD,
  SUPPRESSORS_AND_MUZZLES as TGK_SUPPRESSORS_AND_MUZZLES,
} from "./tgkWeaponPack.ts";

type Tier = "Common" | "Uncommon" | "Rare" | "Legendary";

// Keep in sync with market.ts's own TIER_MAX_STOCK - see
// OLD_TO_NEW_TIER_MAX_STOCK below for the one-time correction applied to
// items added while this constant had drifted out of sync.
const TIER_MAX_STOCK: Record<Tier, number> = {
  Common: 20,
  Uncommon: 8,
  Rare: 3,
  Legendary: 1,
};

// Remaps any item still sitting at an old (pre-2026-09) tier cap to today's
// TIER_MAX_STOCK value. Safe as a blanket rule since tuneExpansionMarket()
// always rewrites every ordinary source-derived item first.
const OLD_TO_NEW_TIER_MAX_STOCK: Record<number, number> = {
  25: TIER_MAX_STOCK.Common,
  10: TIER_MAX_STOCK.Uncommon,
  4: TIER_MAX_STOCK.Rare,
};

// Ghillies/Vehicle_Parts/Batteries sit outside the tier system (see
// market.ts's RARE_CATEGORIES/VEHICLE_PARTS_CATEGORIES) - any item this
// module adds to one of them needs the same fixed cap applied directly,
// since tuneCategory() already ran before this module. Keep in sync with
// market.ts's RARE_MAX_STOCK_CAP/VEHICLE_PARTS_MAX_STOCK_CAP.
const FIXED_CATEGORY_STOCK_CAP: Record<string, number> = {
  Ghillies: 3,
  Vehicle_Parts: 40,
  Batteries: 40,
};

interface MarketItem {
  ClassName?: string;
  MaxStockThreshold?: number;
  MinPriceThreshold?: number;
  MaxPriceThreshold?: number;
  Variants?: string[];
  [key: string]: unknown;
}

interface MarketCategory {
  Items?: MarketItem[];
  [key: string]: unknown;
}

type ManifestGroup =
  | { classNames: string[]; template: string }
  | { classNames: string[]; category: string; tier: Tier };

const MANIFEST = manifest as ManifestGroup[];

// DayZ-Expansion-Market ships a few fatter "catch-all" files (Clothing_
// Military/Clothing_Civilian, Weapon_Attachments, Event) that duplicate
// content already covered by the granular per-slot files market.ts's merge
// actually reads from. No trader identity references them, so they're dead
// weight - but this module's own "already sellable somewhere" check can't
// tell a dead file from a live one, so their contents must be treated as
// invisible for ownership-tracking purposes here. Exported so market.ts's
// quarantineConsumedSourceCategories() can rename them away from ".json"
// alongside every other orphaned raw source file it consumes.
export const DEAD_MARKET_FILES = new Set<string>([
  "Clothing_Military",
  "Clothing_Civilian",
  "Weapon_Attachments",
  "Event",
]);

// Classnames that must never be sellable, checked/enforced on every run -
// each is a valid, spawnable inventory item, but listing it in the trader
// is actively wrong.
//
//   - @NCPR's entire nm_ prefixed item family is blanket-denylisted by
//     prefix (see isExcluded() below), not a hand-picked list - none of
//     this mod's items should be sellable at the trader.
//   - BoomLays-Things' bl_ pallet-furniture RAW built-object classnames
//     (e.g. bl_pallet_table_l) are the deployed WORLD OBJECT form, not a
//     normal inventory item - only the `_Kit` sibling is the real
//     carryable/purchasable item that deploys into the built form. Buying
//     the raw classname directly breaks it. (bl_deposit_container is not
//     included - it's created directly, no Kit involved - see
//     DEPOSIT_CONTAINER_CLASSNAME handling below instead.)
const MANUAL_EXCLUSIONS = new Set<string>(
  [
    // BoomLays-Things (bl_) raw non-Kit forms - superseded by their _Kit
    // sibling, which stays purchasable.
    "bl_anatolian_carpet_1",
    "bl_anatolian_carpet_2",
    "bl_coffee_machine",
    "bl_firewoodstorage",
    "bl_greenhouse",
    "bl_logstorage",
    "bl_old_fridge",
    "bl_painting_1",
    "bl_painting_2",
    "bl_painting_3",
    "bl_painting_4",
    "bl_painting_5",
    "bl_painting_6",
    "bl_painting_7",
    "bl_painting_8",
    "bl_painting_9",
    "bl_pallet_bed_m",
    "bl_pallet_bed_s",
    "bl_pallet_box_1",
    "bl_pallet_box_2",
    "bl_pallet_box_3",
    "bl_pallet_box_4",
    "bl_pallet_cabinet_l",
    "bl_pallet_cabinet_m",
    "bl_pallet_cabinet_s",
    "bl_pallet_cabinet_xs",
    "bl_pallet_table_l",
    "bl_pallet_table_m",
    "bl_pallet_table_s",
    "bl_rain_collector",
    "bl_repairbench",
    "bl_solar_panel",
    "bl_stove_barrel",
    "bl_trashcan",
    "bl_workbench",

    // World-only markers/decor - never cargo- or player-carryable in the
    // first place (types.xml has count_in_cargo="0" count_in_player="0"
    // for every one of these), so there's no way to actually hand one to a
    // player at a trader even if it were added to a Market category.
    "contaminatedarea_dynamic", // dynamic contaminated-zone marker object
    "crookednose", // Halloween decor prop (witch's nose), not a wearable/held item
    "witchhat", // Halloween decor prop - the real wearable version is WitchHood_Black/Brown/Red (already sellable)
    "deadfox", // decor/animal-carcass prop, not a real skinned-meat item
    "easteregg", // Farm-usage decor/spawn marker, not a real item
    "gold", // world-decor gold pile/prop, not a real handoutable item
    "undergroundstashsnow", // the dug-out stash hole itself, not a portable container

    // Built/placed base-building structures - these are the FINAL,
    // already-assembled classnames, not the portable kit a player actually
    // buys and deploys (e.g. WatchtowerKit, already sellable, is the real
    // purchasable form of Watchtower below).
    "bonfire",
    "cauldron",
    "christmastree",
    "fence",
    "watchtower",

    // Deer Isle ("_DE" suffix) static map decor - decals, roadblocks, train
    // wagons/containers, supply crates. A "StaticObj_" name is
    // DayZ-Expansion's own convention for a static, non-interactive prop,
    // trusted here even where types.xml's cargo/player flags disagree.
    "land_boat_small9_de",
    "land_container_1aoh_de",
    "land_container_1bo_de",
    "land_container_1mo_de",
    "land_container_1moh_de",
    "land_train_wagon_box_de",
    "land_train_wagon_box_mil_de",
    "staticobj_decal_damage_long2_de",
    "staticobj_decal_damage_long3_de",
    "staticobj_misc_supplybox1_de",
    "staticobj_misc_supplybox2_de",
    "staticobj_misc_supplybox3_de",
    "staticobj_patrolboat_military_de",
    "staticobj_roadblock_wood_long_de",
    "staticobj_roadblock_wood_small_de",
    "staticobj_train_wagon_flat_industrial_barrels_de",
    "staticobj_train_wagon_flat_industrial_planks_de",
    "static_frozenscientist_de",

    // @CJ187-MoreMoney: not currently in mods.txt (its 50-stack-cap "Coin"
    // currency was considered, then dropped in favor of Expansion Core's own
    // ExpansionGoldNugget - see traders.ts's GOLD_CURRENCY_CLASSNAME, which
    // has a 50,000 stack cap). Kept denylisted as defense-in-depth in case
    // the mod is ever reinstalled.
    "coin",
    "bitcoin",
    "ring_ruby",
    "ring_emerald",
    "ring_saphire",
    "wallet_clip",
    "wallet_large_red",
    "wallet_large_green",
    "wallet_large_blue",
    "wallet_large_black",
    "wallet_large_grey",
    "wallet_large_white",
    "wallet_large_leather",
    "wallet_large_dayz",
    "wallet_large_dragonballz",
    "wallet_medium_red",
    "wallet_medium_green",
    "wallet_medium_blue",
    "wallet_medium_black",
    "wallet_medium_grey",
    "wallet_medium_white",
    "wallet_small_red",
    "wallet_small_green",
    "wallet_small_blue",
    "wallet_small_black",
    "wallet_small_grey",
    "wallet_small_white",
    "wallet_small_leather",
    "wallet_women_blue",
    "wallet_women_brown",
    "wallet_women_green",
    "wallet_women_pink",
    "money_dmark1",
    "money_dmark2",
    "money_dmark5",
    "money_dmark10",
    "money_dmark20",
    "money_dmark50",
    "money_dmark100",
    "money_dmark200",
    "money_dmark500",
    "money_dmark1000",
    "money_dollar1",
    "money_dollar2",
    "money_dollar5",
    "money_dollar10",
    "money_dollar20",
    "money_dollar50",
    "money_dollar100",
    "money_euro1",
    "money_euro2",
    "money_euro5",
    "money_euro10",
    "money_euro20",
    "money_euro50",
    "money_euro100",
    "money_euro200",
    "money_euro500",
    "money_ruble1",
    "money_ruble2",
    "money_ruble5",
    "money_ruble10",
    "money_ruble50",
    "money_ruble100",
    "money_ruble200",
    "money_ruble500",
    "money_ruble1000",
    "money_ruble2000",
    "money_ruble5000",
    "money_wad_ruble50",

    // Flag pole (built object) - only its kit (TerritoryFlagKit, already
    // sellable) is the real purchasable form; buying/spawning the raw pole
    // directly bypasses the actual building process, same _Kit-only
    // pattern as the BoomLays-Things bl_ exclusions above.
    "territoryflag",

    // "Lumber Pile" (PileOfWoodenPlanks) - a lootable resource-pile prop,
    // not a real portable item. Its individual materials (WoodenLog/
    // WoodenPlank) stay sellable - see WOOD_SELL_ONLY_CLASSNAMES/
    // BASE_BUILDING_PRICE_FIXES.
    "pileofwoodenplanks",

    // Growing-stage garden plant props (the crop actually planted in the
    // ground) - only the seed packet (already sellable) is a real portable/
    // purchasable item; these Plant_* classnames are the planted, immobile
    // growth-stage object a trader could never actually hand a player.
    "plant_pepper",
    "plant_potato",
    "plant_pumpkin",
    "plant_tomato",
    "plant_zucchini",

    // Raw, zero-effort foraged materials (littered all over the map, no
    // skill or tool needed) - too easy a cash source for a hardcore server.
    // Their crafted end-products (e.g. StoneKnife) stay sellable.
    "woodenstick",
    "longwoodenstick",
    "sharpwoodenstick",
    "stone",
    "smallstone",
    "spearstone",

    // The built/placed stable structure itself - only Stable_dayz_Kit
    // (still sellable) is the real purchasable form, same _Kit-only
    // pattern as above.
    "stable_dayz",

    // Real built/placed world objects, event-only novelty props, or
    // otherwise-uncarryable state markers found sitting in the generic
    // gap-fill price bucket - none of these should ever be purchasable:
    //   - Dart-Board-Game's *_KIT_PLACED classnames are the DEPLOYED props
    //     (the portable DARTS_PlacingKit_* items stay sellable).
    //   - dog_shed_big/small(_static) are the deployed doghouse forms
    //     (only the _kit siblings are portable).
    //   - AnniversaryBox and every GiftBox_Large/Medium/Small_* are free
    //     one-time event novelties, not real trade goods.
    //   - GardenPlot*/ShelterSite/ShelterFabric/ShelterLeather/ShelterStick
    //     are BUILT/placed world objects, not portable items.
    //   - UndergroundStash ("Mound") is the dug-hole world object.
    //   - Fireplace/FireplaceIndoor/FireplaceFireBarrel/OvenIndoor are
    //     built/found cooking structures, never carried as inventory.
    //   - HandcuffsLocked is a live player-restraint state marker.
    //   - ShippingContainerKeys_Blue/Orange/Yellow are each tied to one
    //     specific, already-placed container instance.
    "darts_dartboard_lamp_kit_placed",
    "darts_dartboard_no_lamp_kit_placed",
    "darts_floorlamp_kit_placed",
    "darts_neon_darts_kit_placed",
    "darts_neon_darts_2_kit_placed",
    "dog_shed_big",
    "dog_shed_big_static",
    "dog_shed_small",
    "dog_shed_small_static",
    "anniversarybox",
    "giftbox_large_1",
    "giftbox_large_2",
    "giftbox_large_3",
    "giftbox_large_4",
    "giftbox_medium_1",
    "giftbox_medium_2",
    "giftbox_medium_3",
    "giftbox_medium_4",
    "giftbox_small_1",
    "giftbox_small_2",
    "giftbox_small_3",
    "giftbox_small_4",
    "gardenplot",
    "gardenplotgreenhouse",
    "gardenplotpolytunnel",
    "sheltersite",
    "shelterfabric",
    "shelterleather",
    "shelterstick",
    "undergroundstash",
    "fireplace",
    "fireplaceindoor",
    "fireplacefirebarrel",
    "ovenindoor",
    "handcuffslocked",
    "shippingcontainerkeys_blue",
    "shippingcontainerkeys_orange",
    "shippingcontainerkeys_yellow",

    // AirRaid's own scripted helicopter-crash/supply-drop/transport event
    // markers - not a real player-usable throwable, just a reskinned M18
    // smoke grenade with a confusing name.
    "ammo_40mm_smoke_airstrike",
    "m18smokegrenade_airstrike",
    "m18smokegrenade_ch_47_helicopter_supply",
    "m18smokegrenade_ch_47_helicopter_transport",
    "m18smokegrenade_ch_47_helicopter_vehicle",
    "m18smokegrenade_mi_8_helicopter_crash",
    "m18smokegrenade_uh_1_helicopter_crash",

    // TGK-WeaponPack's empty ammo crate prop (post-use, no ammo left).
    "sm_ammo_empty_crate",
  ].map((s) => s.toLowerCase()),
);

// Single source of truth for "must never be sellable" - the nm_/paragon_
// prefix rules plus the hand-picked MANUAL_EXCLUSIONS set above. `key` must
// already be lowercased. @Paragon-Storage's raw Paragon_* classnames are the
// already-deployed prop form; the separate StorageBox_* kit is the real
// purchasable item (priced by BASE_BUILDING_PRICE_FIXES below).
export function isExcluded(key: string): boolean {
  return key.startsWith("nm_") || key.startsWith("paragon_") || MANUAL_EXCLUSIONS.has(key);
}

// BoomLays-Things' bl_deposit_container ("Your personal box") is a
// legitimate, self-contained purchasable placeable (see MANUAL_EXCLUSIONS -
// no Kit dependency), but the generic gap-fill clone logic priced it like a
// tent. Force it to its actual intent - an extremely expensive,
// effectively-unique personal safe - every run.
const DEPOSIT_CONTAINER_CLASSNAME = "bl_deposit_container";
const DEPOSIT_CONTAINER_MIN_PRICE = 9_000_000;
const DEPOSIT_CONTAINER_MAX_PRICE = 11_000_000;

// Consumables' "category"-based manifest group (Bitterlings/DeadChicken_*/
// HorseSteakMeat/Lard/every Old_* moldy can/SkinnedRat/
// WalleyePollockFilletMeat - see marketGapFill.json) all cloned whatever
// happened to be Consumables.json's Items[0] at gap-fill time as their price
// template - a pure accident of array order, not a real reflection of
// value (e.g. moldy Old_ cans ended up priced at or above their fresh
// equivalent, and raw uncleaned carcasses landed in the top tier). Re-priced
// into deliberate bands below, independent of whatever Items[0] happens to
// be on any given run:
//   - FOOD_OLD_CAN_PRICE: every Old_ (moldy/expired) canned good, a flat
//     fraction of a fresh can's price - still tradeable in a pinch, never
//     as good as fresh. These are find-only (never buyable) - see
//     traders.ts's OLD_FOOD_BUYSELL_OVERRIDES - so this band is only the
//     sell-side value.
// HorseSteakMeat/HumanSteakMeat (taboo/exotic meat) each get their own
// explicit band. WalleyePollockFilletMeat is a genuine fillet cut re-priced
// to match market.ts's fillet override so it doesn't stick out from every
// other fillet at the trader.
//
// A hard floor applies to every plain wild-foraged/trapped food item in this
// category (previously left at DayZ-Expansion-Market's own defaults, some as
// low as 7-9 for a raw apple), split into bands by effort/rarity:
//   - FOOD_WILD_FORAGE_PRICE (300-450): every raw fruit/vegetable/
//     mushroom, small trapped vermin (Bitterlings/rats), a raw whole
//     pumpkin, a full waterbottle, and Lard.
//   - FOOD_BAKED_GOODS_PRICE (320-520): the @Expansion bread/cheese loaves.
//   - FOOD_WHOLE_GAME_PRICE (1000-1500): DeadChicken_*/DeadRooster/
//     DeadRabbit - a full uncleaned carcass.
//   - crabcan/CrabCan_Opened were priced far below every other fresh
//     canned good in this category - corrected to match that sibling tier.
const FOOD_WILD_FORAGE_PRICE = { min: 300, max: 450 };
const FOOD_BAKED_GOODS_PRICE = { min: 320, max: 520 };
const FOOD_WHOLE_GAME_PRICE = { min: 1000, max: 1500 };
const FOOD_CANNED_CRAB_PRICE = { min: 700, max: 1200 };
const FOOD_OLD_CAN_PRICE = { min: 120, max: 250 };
const FOOD_EXOTIC_MEAT_PRICE = { min: 320, max: 450 };
const FOOD_FILLET_PRICE = { min: 360, max: 560 };

// Every Old_ (moldy/expired) canned good in Consumables.json - exported so
// traders.ts can mark them CanOnlySell (find-only, never purchasable). Kept
// as a single shared list so the price-fix map above and the buy/sell
// override in traders.ts can never drift out of sync.
export const OLD_FOOD_CLASSNAMES = [
  "old_bakedbeanscan",
  "old_bakedbeanscan_opened",
  "old_bakedbeanscan_opened_unsafe",
  "old_boxcerealcrunchin",
  "old_boxcerealcrunchin_unsafe",
  "old_brisketspread",
  "old_brisketspread_opened",
  "old_brisketspread_opened_unsafe",
  "old_catfoodcan",
  "old_catfoodcan_opened",
  "old_catfoodcan_opened_unsafe",
  "old_dogfoodcan",
  "old_dogfoodcan_opened",
  "old_dogfoodcan_opened_unsafe",
  "old_lunchmeat",
  "old_lunchmeat_opened",
  "old_lunchmeat_opened_unsafe",
  "old_pajka",
  "old_pajka_opened",
  "old_pajka_opened_unsafe",
  "old_pate",
  "old_pate_opened",
  "old_pate_opened_unsafe",
  "old_peachescan",
  "old_peachescan_opened",
  "old_peachescan_opened_unsafe",
  "old_porkcan",
  "old_porkcan_opened",
  "old_porkcan_opened_unsafe",
  "old_powderedmilk",
  "old_powderedmilk_unsafe",
  "old_sardinescan",
  "old_sardinescan_opened",
  "old_sardinescan_opened_unsafe",
  "old_spaghettican",
  "old_spaghettican_opened",
  "old_spaghettican_opened_unsafe",
  "old_tacticalbaconcan",
  "old_tacticalbaconcan_opened",
  "old_tacticalbaconcan_opened_unsafe",
  "old_unknownfoodcan",
  "old_unknownfoodcan_opened_unsafe",
];

// Chicken/hare whole carcasses (DeadChicken_Brown/Spotted/White, DeadRooster,
// DeadRabbit - the FOOD_WHOLE_GAME_PRICE band above) sell for a flat 75% of
// buy price, matching market.ts's Meat/Fish groups' own sellPricePercent -
// these carcasses aren't managed by a market.ts group, so they need their
// own direct-write fix here. Deliberately excludes SkinnedRat/DeadRat_Grey/
// DeadRat_White (still the normal 20% global rate).
const FOOD_SELL_PERCENT_FIXES: Record<string, number> = {
  deadchicken_brown: 75,
  deadchicken_spotted: 75,
  deadchicken_white: 75,
  deadrooster: 75,
  deadrabbit: 75,
};

const FOOD_PRICE_FIXES: Record<string, { min: number; max: number }> = Object.fromEntries(
  [
    ...[
      "apple",
      "slicedpumpkin",
      "potato",
      "sambucusberry",
      "caninaberry",
      "plum",
      "pear",
      "pumpkin",
      "agaricusmushroom",
      "amanitamushroom",
      "macrolepiotamushroom",
      "lactariusmushroom",
      "psilocybemushroom",
      "auriculariamushroom",
      "boletusmushroom",
      "pleurotusmushroom",
      "craterellusmushroom",
      "waterbottle",
      "lard",
      "bitterlings",
      "skinnedrat",
      "deadrat_grey",
      "deadrat_white",
    ].map((c) => [c, FOOD_WILD_FORAGE_PRICE] as const),
    ...[
      "expansionbread1",
      "expansionbread2",
      "expansionbread3",
      "expansioncheese1",
      "expansioncheese2",
      "expansioncheese3",
      "expansioncheese4",
    ].map((c) => [c, FOOD_BAKED_GOODS_PRICE] as const),
    ...["crabcan", "crabcan_opened"].map((c) => [c, FOOD_CANNED_CRAB_PRICE] as const),
    ...[
      "deadchicken_brown",
      "deadchicken_spotted",
      "deadchicken_white",
      "deadrabbit",
      "deadrooster",
    ].map(
      (c) => [c, FOOD_WHOLE_GAME_PRICE] as const,
    ),
    ...OLD_FOOD_CLASSNAMES.map((c) => [c, FOOD_OLD_CAN_PRICE] as const),
    ...["horsesteakmeat", "humansteakmeat"].map((c) => [c, FOOD_EXOTIC_MEAT_PRICE] as const),
    ["walleyepollockfilletmeat", FOOD_FILLET_PRICE] as const,
  ],
);

// TGK-WeaponPack's ~280 classnames are gap-filled purely by "category"
// (no `template:` sibling), so every one of them cloned `cat.Items[0]` as
// its price template regardless of tier - e.g. every Guns_Military TGK item
// (pistols through Legendary-tier heavy/sniper rifles) shared one identical
// flat band, same for attachments and ammo.
//
// Re-priced below into deliberate bands per functional group, loosely
// calibrated against this project's existing vanilla-gun tiering (see
// market.ts's BUY_PRICE_MULTIPLIER/TIER_MAX_STOCK) and Gun_Ammo.json's own
// real vanilla per-round/box prices:
//   - Guns: pistols cheapest, standard rifles/shotguns/SMGs above them,
//     heavy/sniper (Legendary) above those, the grenade launcher highest.
//   - Attachments: magazines/flashlights/grips cheap and mostly cosmetic,
//     suppressors and receivers meaningfully more valuable.
//   - Ammo: boxes cost substantially more than loose rounds, crates more
//     again - proportional to how many rounds each actually contains.
const TGK_PISTOL_PRICE = { min: 8000, max: 14000 };
const TGK_RIFLE_STANDARD_PRICE = { min: 14000, max: 22000 };
const TGK_RIFLE_HEAVY_PRICE = { min: 30000, max: 45000 };
const TGK_GRENADE_LAUNCHER_PRICE = { min: 50000, max: 70000 };
const TGK_MAGAZINE_PRICE = { min: 300, max: 600 };
const TGK_SUPPRESSOR_PRICE = { min: 3500, max: 6000 };
const TGK_HANDGUARD_PRICE = { min: 400, max: 800 };
const TGK_BUTTSTOCK_PRICE = { min: 400, max: 800 };
const TGK_PISTOLGRIP_PRICE = { min: 200, max: 400 };
const TGK_FOREGRIP_PRICE = { min: 200, max: 400 };
const TGK_FLASHLIGHT_PRICE = { min: 150, max: 300 };
const TGK_RECEIVER_PRICE = { min: 1500, max: 3000 };
const TGK_OPTIC_PRICE = { min: 1500, max: 3000 };
const TGK_OTHER_ATTACHMENT_PRICE = { min: 300, max: 600 };
const TGK_KNIFE_PRICE = { min: 1500, max: 3000 };
const TGK_AMMO_ROUND_PRICE = { min: 250, max: 400 };
const TGK_AMMO_BOX_PRICE = { min: 4000, max: 7000 };
const TGK_AMMO_CRATE_PRICE = { min: 14000, max: 22000 };

const TGK_PRICE_FIXES: Record<string, { min: number; max: number }> = Object.fromEntries([
  ...TGK_PISTOLS.map((c) => [c.toLowerCase(), TGK_PISTOL_PRICE] as const),
  ...TGK_RIFLES_STANDARD.map((c) => [c.toLowerCase(), TGK_RIFLE_STANDARD_PRICE] as const),
  ...TGK_RIFLES_HEAVY_AND_SNIPER.map((c) => [c.toLowerCase(), TGK_RIFLE_HEAVY_PRICE] as const),
  ...TGK_GRENADE_LAUNCHERS.map((c) => [c.toLowerCase(), TGK_GRENADE_LAUNCHER_PRICE] as const),
  ...TGK_MAGAZINES.map((c) => [c.toLowerCase(), TGK_MAGAZINE_PRICE] as const),
  ...TGK_SUPPRESSORS_AND_MUZZLES.map((c) => [c.toLowerCase(), TGK_SUPPRESSOR_PRICE] as const),
  ...TGK_HANDGUARDS.map((c) => [c.toLowerCase(), TGK_HANDGUARD_PRICE] as const),
  ...TGK_BUTTSTOCKS.map((c) => [c.toLowerCase(), TGK_BUTTSTOCK_PRICE] as const),
  ...TGK_PISTOLGRIPS.map((c) => [c.toLowerCase(), TGK_PISTOLGRIP_PRICE] as const),
  ...TGK_FOREGRIPS.map((c) => [c.toLowerCase(), TGK_FOREGRIP_PRICE] as const),
  ...TGK_FLASHLIGHTS.map((c) => [c.toLowerCase(), TGK_FLASHLIGHT_PRICE] as const),
  ...TGK_RECEIVERS.map((c) => [c.toLowerCase(), TGK_RECEIVER_PRICE] as const),
  ...TGK_OPTICS.map((c) => [c.toLowerCase(), TGK_OPTIC_PRICE] as const),
  ...TGK_OTHERS.map((c) => [c.toLowerCase(), TGK_OTHER_ATTACHMENT_PRICE] as const),
  ...TGK_KNIVES.map((c) => [c.toLowerCase(), TGK_KNIFE_PRICE] as const),
  ...TGK_AMMUNITION.map((c) => [c.toLowerCase(), TGK_AMMO_ROUND_PRICE] as const),
  ...TGK_AMMUNITION_BOXES.map((c) => [c.toLowerCase(), TGK_AMMO_BOX_PRICE] as const),
  // SM_Ammo_Empty_Crate is a cosmetic byproduct, never actually sellable
  // (see tgkWeaponPack.ts's own comment) - harmless to include here too,
  // the repair loop below skips any classname with no owner/item.
  ...TGK_AMMUNITION_CRATES.map((c) => [c.toLowerCase(), TGK_AMMO_CRATE_PRICE] as const),
]);

// hnt_Bow/hnt_BowRecurve are also gap-filled by category (Guns_Civilian),
// same accidental-shared-price issue as the TGK weapons above.
const BOW_PRICE_FIXES: Record<string, { min: number; max: number }> = {
  hnt_bow: { min: 300, max: 300 },
  hnt_bowrecurve: { min: 600, max: 600 },
};

// Clothing_Head_Military's MilitaryCap_BDU/Desert/Woodland (category-based
// gap-fill group, no `template`) cloned a full ballistic/tanker helmet's
// price, not a plain cap's - T56TankerHelmet is fine as-is (it really is a
// helmet), but MilitaryCap needed its own flat price instead.
const MILITARY_CAP_PRICE = { min: 6000, max: 6000 };

// Chainmail armor pieces sit in the correct Civilian categories already,
// just priced at the Common-tier gap-fill floor despite being real crafted
// armor with meaningful protection value.
const CHAINMAIL_PRICE = { min: 2800, max: 4500 };

// WasteLandZ Survival Clothing's civilian pieces (pants/hoodies/waist packs
// - backpacks handled separately by BACKPACK_PRICE_FIXES below) all cloned
// the same Common-tier gap-fill floor.
const WASTELANDZ_CLOTHING_PRICE = { min: 1300, max: 2100 };
const WASTELANDZ_WAISTPACK_PRICE = { min: 1250, max: 2050 };

// One-off headgear/armor/clothing price corrections - each item is
// otherwise correctly categorized, only its price needed fixing. Merged
// into the same repair loop as BACKPACK_PRICE_FIXES/BASE_BUILDING_PRICE_
// FIXES/EXPLOSIVES_PRICE_FIXES/MEDICAL_PRICE_FIXES below (see
// hardcorePricesFixed).
const HEADGEAR_AND_ARMOR_PRICE_FIXES: Record<string, { min: number; max: number }> = {
  militarycap_bdu: MILITARY_CAP_PRICE,
  militarycap_desert: MILITARY_CAP_PRICE,
  militarycap_woodland: MILITARY_CAP_PRICE,
  chainmail: CHAINMAIL_PRICE,
  chainmail_coif: CHAINMAIL_PRICE,
  chainmail_leggings: CHAINMAIL_PRICE,
  wastelandz_mountaineering_boots: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_mountaineering_pants: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_pants_camo: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_pants_cream: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_pants_denim: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_pants_winter: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_mountaineering_hoodie: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_hoodie_camo: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_hoodie_cream: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_hoodie_denim: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_hoodie_grey: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_hoodie_winter: WASTELANDZ_CLOTHING_PRICE,
  wastelandz_waist_pack_camo: WASTELANDZ_WAISTPACK_PRICE,
  wastelandz_waist_pack_tan: WASTELANDZ_WAISTPACK_PRICE,
  wastelandz_waist_pack_winter: WASTELANDZ_WAISTPACK_PRICE,
  // Gas masks: buy price pinned flat (was sitting at Legendary-tier
  // computed price - see market.ts's Masks group override). The matching
  // sell price is a separate SellPricePercent-only fix (see
  // GASMASK_SELL_PERCENT_FIXES below - Min==Max here already fixes the buy
  // price, so the sell side can't also be an absolute value).
  gasmask: { min: 15000, max: 15000 },
  gp5gasmask: { min: 15000, max: 15000 },
};

// See HEADGEAR_AND_ARMOR_PRICE_FIXES' gasmask/gp5gasmask comment above -
// 2000 / 15000 = 13.33%, applied as SellPricePercent so a full-stock sale
// always pays out exactly 2000 regardless of the flat 15000 buy price.
const GASMASK_SELL_PERCENT_FIXES: Record<string, number> = {
  gasmask: 13.33,
  gp5gasmask: 13.33,
};

// Backpacks needed an across-the-board price bump. Most Clothing_Back_
// Civilian entries were sitting at one shared Common-tier gap-fill floor
// regardless of actual bag size/quality - SurvivorBackpack_*/WasteLandZ_
// backpack* (genuinely large/good packs) got their own higher band,
// everything else in that floor got a flat ~2.2x bump. Every already-
// differentiated Civilian/Military backpack got a uniform ~1.5x bump on top
// of its own existing price, preserving relative ordering. Also fixes a
// real pricing bug: some color-variant siblings of the same physical
// backpack were sitting at a separate, much cheaper standalone gap-fill
// price - re-aligned to match their canonical sibling before the bump (see
// each one's own inline comment below). Absolute target values (not a
// runtime multiplier) so this stays idempotent across restarts.
const BACKPACK_PRICE_FIXES: Record<string, { min: number; max: number }> = {
  // Clothing_Back_Civilian.json
  childbag_red: { min: 2525, max: 4225 },
  drybag_orange: { min: 4570, max: 7615 },
  drybag_black: { min: 4610, max: 7685 },
  drybag_green: { min: 4645, max: 7750 },
  taloonbag_blue: { min: 2835, max: 4725 },
  // orange/green are the same physical Taloon Bag as blue (listed in its
  // own Variants[]) but had been sitting at a cheaper standalone price -
  // re-aligned to match.
  taloonbag_orange: { min: 2835, max: 4725 },
  taloonbag_green: { min: 2835, max: 4725 },
  huntingbag: { min: 8235, max: 13725 },
  waterproofbag_green: { min: 820, max: 1360 },
  tortillabag: { min: 2630, max: 4375 },
  mountainbag_red: { min: 2305, max: 3835 },
  slingbag_black: { min: 2080, max: 3475 },
  canvasbag_medical: { min: 7480, max: 12465 },
  courierbag: { min: 1800, max: 3600 },
  furcourierbag: { min: 1800, max: 3600 },
  // The next 6 families had the same bug as taloonbag above: same physical
  // backpack, different color, but a cheaper standalone gap-fill price -
  // re-aligned to match their canonical, full-price sibling.
  alicebag_black: { min: 18400, max: 30660 }, // = alicebag_green
  alicebag_camo: { min: 18400, max: 30660 }, // = alicebag_green
  armypouch_black: { min: 9675, max: 16145 }, // = armypouch_beige
  armypouch_camo: { min: 9675, max: 16145 }, // = armypouch_beige
  armypouch_green: { min: 9675, max: 16145 }, // = armypouch_beige
  assaultbag_green: { min: 23230, max: 38740 }, // = assaultbag_black/winter
  assaultbag_ttsko: { min: 23230, max: 38740 }, // = assaultbag_black/winter
  attack2bag_green: { min: 4200, max: 8400 }, // = attack2bag_black
  attack2bag_ttsko: { min: 4200, max: 8400 }, // = attack2bag_black
  attack2bag_yeger: { min: 4200, max: 8400 }, // = attack2bag_black
  coyotebag_green: { min: 29325, max: 48860 }, // = coyotebag_brown/winter
  duffelbagsmall_green: { min: 20210, max: 33675 }, // = duffelbagsmall_camo
  duffelbagsmall_medical: { min: 20210, max: 33675 }, // = duffelbagsmall_camo
  canvasbag_olive: { min: 7480, max: 12465 },
  childbag_blue: { min: 2525, max: 4225 },
  childbag_green: { min: 2525, max: 4225 },
  drybag_blue: { min: 4570, max: 7615 },
  drybag_red: { min: 4570, max: 7615 },
  drybag_yellow: { min: 4570, max: 7615 },
  huntingbag_hannah: { min: 8235, max: 13725 },
  mountainbag_blue: { min: 2305, max: 3835 },
  mountainbag_green: { min: 2305, max: 3835 },
  mountainbag_orange: { min: 2305, max: 3835 },
  slingbag_brown: { min: 2080, max: 3475 },
  slingbag_gray: { min: 2080, max: 3475 },
  taloonbag_violet: { min: 2835, max: 4725 },
  tortillabag_desert: { min: 2630, max: 4375 },
  tortillabag_winter: { min: 2630, max: 4375 },
  waterproofbag_orange: { min: 820, max: 1360 },
  waterproofbag_yellow: { min: 820, max: 1360 },
  alv_canvasbag_black: { min: 2525, max: 4225 },
  alv_canvasbag_blue: { min: 2525, max: 4225 },
  alv_canvasbag_green: { min: 2525, max: 4225 },
  alv_canvasbag_yellow: { min: 2525, max: 4225 },
  alv_dufflebag_grey: { min: 2525, max: 4225 },
  alv_hipsterbag_black: { min: 2525, max: 4225 },
  alv_hipsterbag_blue: { min: 2525, max: 4225 },
  alv_hipsterbag_green: { min: 2525, max: 4225 },
  alv_rolltopbag_brown: { min: 2525, max: 4225 },
  alv_satchel_tan: { min: 2525, max: 4225 },
  canvas_backpack_base: { min: 2525, max: 4225 },
  canvas_backpack_black: { min: 2525, max: 4225 },
  canvas_backpack_blue: { min: 2525, max: 4225 },
  canvas_backpack_purple: { min: 2525, max: 4225 },
  canvas_backpack_red: { min: 2525, max: 4225 },
  canvas_backpack_white: { min: 2525, max: 4225 },
  drysackbag_green: { min: 2525, max: 4225 },
  drysackbag_orange: { min: 2525, max: 4225 },
  drysackbag_yellow: { min: 2525, max: 4225 },
  furimprovisedbag: { min: 2525, max: 4225 },
  improvisedbag: { min: 2525, max: 4225 },
  leathersack_beige: { min: 2525, max: 4225 },
  leathersack_black: { min: 2525, max: 4225 },
  leathersack_brown: { min: 2525, max: 4225 },
  leathersack_natural: { min: 2525, max: 4225 },
  survivorbackpack_black: { min: 4500, max: 7000 },
  survivorbackpack_blue: { min: 4500, max: 7000 },
  survivorbackpack_green: { min: 4500, max: 7000 },
  survivorbackpack_pink: { min: 4500, max: 7000 },
  survivorbackpack_red: { min: 4500, max: 7000 },
  survivorbackpack_yellow: { min: 4500, max: 7000 },
  wastelandz_mountaineering_bag: { min: 4500, max: 7000 },
  wastelandz_backpack: { min: 4500, max: 7000 },
  wastelandz_backpack_black: { min: 4500, max: 7000 },
  wastelandz_backpack_camo2: { min: 4500, max: 7000 },
  wastelandz_backpack_winter: { min: 4500, max: 7000 },
  wastelandz_backpack_camo: { min: 4500, max: 7000 },
  // Clothing_Back_Military.json
  smershbag: { min: 12805, max: 21355 },
  assaultbag_black: { min: 23230, max: 38740 },
  assaultbag_winter: { min: 23230, max: 38740 },
  coyotebag_brown: { min: 29325, max: 48860 },
  coyotebag_winter: { min: 29325, max: 48860 },
  alicebag_green: { min: 18400, max: 30660 },
  duffelbagsmall_camo: { min: 20210, max: 33675 },
  armypouch_beige: { min: 9675, max: 16145 },
  attack2bag_black: { min: 4200, max: 8400 },
  alv_militarybag_black: { min: 12805, max: 21355 },
  alv_militarybag_tan: { min: 12805, max: 21355 },
};

// Base_Building narrow, standalone price corrections - nothing else in
// this category was touched.
//   - Code locks were priced far too low for a real security item; a
//     4-dial CombinationLock4 is priced ~50% above the 3-dial one.
//   - Big safes needed a moderate bump (small/regular safes left alone).
//   - A cluster of unmistakably military-themed storage props (gun racks/
//     cases/walls/crates/lockers, the compound gate/wall, the helipad kit)
//     shared the same generic gap-fill floor as everything else - bumped.
//   - "ammobox" (a small lootable storage prop, NOT gun ammunition) had
//     accidentally cloned a price meant for a much larger storage prop -
//     corrected down.
//   - bl_coffee_mug was sitting at the generic gap-fill floor for a
//     literal mug - corrected down to a trivial price.
//   - TerritoryFlag (the raw, already-built flag pole) is now excluded
//     entirely (see MANUAL_EXCLUSIONS) - only TerritoryFlagKit is
//     purchasable, priced flat at 10,000.
//   - Nail was wildly cheap relative to NailBox (a full box of many
//     nails) - bumped modestly.
//   - WoodenPlank and the generic junk material band were both sitting at
//     the very bottom of the price range - nudged up together.
const BASE_BUILDING_LOCK3_PRICE = { min: 2500, max: 4000 };
const BASE_BUILDING_LOCK4_PRICE = { min: 5500, max: 8000 };
const BASE_BUILDING_BIG_SAFE_PRICE = { min: 12000, max: 18000 };
const BASE_BUILDING_MILITARY_STORAGE_PRICE = { min: 8500, max: 13500 };
const BASE_BUILDING_PRICE_FIXES: Record<string, { min: number; max: number }> = {
  combinationlock: BASE_BUILDING_LOCK3_PRICE,
  combinationlock4: BASE_BUILDING_LOCK4_PRICE,
  nail: { min: 40, max: 70 },
  woodenplank: { min: 120, max: 220 },
  storagebox_bigsafe_black: BASE_BUILDING_BIG_SAFE_PRICE,
  storagebox_bigsafe_grey: BASE_BUILDING_BIG_SAFE_PRICE,
  storagebox_bigsafe_rainbow: BASE_BUILDING_BIG_SAFE_PRICE,
  ammobox: { min: 700, max: 1100 },
  bl_coffee_mug: { min: 80, max: 150 },
  territoryflagkit: { min: 10000, max: 10000 },
  ...Object.fromEntries(
    [
      "storagebox_compound_gate",
      "storagebox_compound_wall",
      "storagebox_dguncase_brown",
      "storagebox_dguncase_cherry",
      "storagebox_dguncase_grey",
      "storagebox_dgunrack_black",
      "storagebox_dgunrack_green",
      "storagebox_dgunrack_tan",
      "storagebox_guncase_brown",
      "storagebox_guncase_cherry",
      "storagebox_guncase_grey",
      "storagebox_gunrack_black",
      "storagebox_gunrack_green",
      "storagebox_gunrack_tan",
      "storagebox_gunwall_black",
      "storagebox_gunwall_green",
      "storagebox_gunwall_tan",
      "storagebox_helipad",
      "storagebox_milicrate_black",
      "storagebox_milicrate_blue",
      "storagebox_milicrate_green",
      "storagebox_milicrate_grey",
      "storagebox_milicrate_tan",
      "storagebox_mlocker_black",
      "storagebox_mlocker_blue",
      "storagebox_mlocker_green",
      "storagebox_mlocker_grey",
      "storagebox_mlocker_tan",
      "storagebox_weapons_rack_black",
      "storagebox_weapons_rack_green",
      "storagebox_weapons_rack_tan",
    ].map((c) => [c, BASE_BUILDING_MILITARY_STORAGE_PRICE] as const),
  ),
};

// Second wave of Base_Building.json fixes - ~150 more items found sitting
// at the same generic gap-fill floor, mostly @Paragon-Storage's
// StorageBox_* kits (the portable forms of the Paragon_* raw props
// excluded above) plus real vanilla base-building/farming items and
// @BoomLays-Things crafted furniture. Tiered by real-world value/function
// rather than one flat band - a safe is worth more than a crate, a
// functional workbench more than a decorative painting.
const BASE_BUILDING_SAFE_PRICE = { min: 8000, max: 12000 };
const BASE_BUILDING_SMALL_SAFE_PRICE = { min: 5000, max: 8000 };
const BASE_BUILDING_LOCKABLE_DOOR_PRICE = { min: 6000, max: 9000 };
const BASE_BUILDING_BASIC_DOOR_PRICE = { min: 3000, max: 5000 };
const BASE_BUILDING_CONTAINER_PRICE = { min: 4000, max: 6500 };
const BASE_BUILDING_FRIDGE_PRICE = { min: 1500, max: 2500 };
const BASE_BUILDING_INDUSTRIAL_FREEZER_PRICE = { min: 2200, max: 3400 };
const BASE_BUILDING_GREENHOUSE_PRICE = { min: 1500, max: 2500 };
const BASE_BUILDING_LARGE_GREENHOUSE_PRICE = { min: 2500, max: 4000 };
const BASE_BUILDING_GEARSTAND_PRICE = { min: 500, max: 900 };
const BASE_BUILDING_TRASH_PRICE = { min: 200, max: 400 };
const BASE_BUILDING_WALLRACK_PRICE = { min: 600, max: 1000 };
const BASE_BUILDING_TINY_CRATE_PRICE = { min: 300, max: 500 };
const BASE_BUILDING_SMALL_CRATE_PRICE = { min: 500, max: 800 };
const BASE_BUILDING_MEDIUM_CRATE_PRICE = { min: 800, max: 1300 };
const BASE_BUILDING_PALLET_PRICE = { min: 400, max: 700 };
const BASE_BUILDING_METAL_RACK_PRICE = { min: 600, max: 1000 };
const BASE_BUILDING_CABINET_PRICE = { min: 700, max: 1100 };
const BASE_BUILDING_TOOLBOX_PRICE = { min: 600, max: 1000 };
const BASE_BUILDING_LOCKER_PRICE = { min: 1200, max: 2000 };
const BASE_BUILDING_BIG_TENT_PRICE = { min: 6000, max: 9500 };
const BASE_BUILDING_CANOPY_TENT_PRICE = { min: 2500, max: 4000 };
const BASE_BUILDING_PLOT_KIT_PRICE = { min: 150, max: 300 };
const BASE_BUILDING_SEED_PRICE = { min: 50, max: 120 };
const BASE_BUILDING_DECOR_PLANT_PRICE = { min: 100, max: 250 };
const BASE_BUILDING_DECOR_LIGHT_PRICE = { min: 150, max: 350 };
const BASE_BUILDING_JUNK_MATERIAL_PRICE = { min: 90, max: 180 };
const BASE_BUILDING_DECOR_KIT_PRICE = { min: 150, max: 350 };
const BASE_BUILDING_CRAFT_COMPONENT_PRICE = { min: 300, max: 600 };
const BASE_BUILDING_SMALL_FURNITURE_KIT_PRICE = { min: 300, max: 600 };
const BASE_BUILDING_MEDIUM_FURNITURE_KIT_PRICE = { min: 400, max: 900 };
const BASE_BUILDING_APPLIANCE_KIT_PRICE = { min: 800, max: 1400 };
const BASE_BUILDING_CRAFTING_STATION_PRICE = { min: 1500, max: 2500 };
const BASE_BUILDING_UTILITY_UPGRADE_PRICE = { min: 2000, max: 3200 };
// A wooden gun cabinet kit was too cheap under the shared
// BASE_BUILDING_MEDIUM_FURNITURE_KIT_PRICE band (which stays as-is for the
// two stove kits) - split into its own, noticeably higher band, but still
// well below the dedicated military gun-storage cluster since this is just
// a plain wooden cabinet, not a proper gun safe.
const BASE_BUILDING_GUN_CABINET_KIT_PRICE = { min: 1500, max: 2400 };
const BASE_BUILDING_STRUCTURES_PRICE_FIXES: Record<string, { min: number; max: number }> = {
  fencekit: { min: 150, max: 300 },
  watchtowerkit: { min: 2000, max: 3500 },
  partytent_blue: BASE_BUILDING_CANOPY_TENT_PRICE,
  partytent_brown: BASE_BUILDING_CANOPY_TENT_PRICE,
  partytent: BASE_BUILDING_CANOPY_TENT_PRICE,
  pepperseeds: BASE_BUILDING_SEED_PRICE,
  pumpkinseeds: BASE_BUILDING_SEED_PRICE,
  tomatoseeds: BASE_BUILDING_SEED_PRICE,
  zucchiniseeds: BASE_BUILDING_SEED_PRICE,
  shelterkit: BASE_BUILDING_PLOT_KIT_PRICE,
  bl_repair_anvil: { min: 800, max: 1500 },
  bl_special_item_kit: BASE_BUILDING_CRAFT_COMPONENT_PRICE,
  bl_coffee_machine_kit: { min: 600, max: 1000 },
  bl_firewoodstorage_kit: BASE_BUILDING_MEDIUM_FURNITURE_KIT_PRICE,
  bl_logstorage_kit: BASE_BUILDING_MEDIUM_FURNITURE_KIT_PRICE,
  bl_greenhouse_kit: BASE_BUILDING_GREENHOUSE_PRICE,
  bl_old_fridge_kit: BASE_BUILDING_APPLIANCE_KIT_PRICE,
  bl_rain_collector_kit: BASE_BUILDING_APPLIANCE_KIT_PRICE,
  bl_rain_collector_prefab_kit: BASE_BUILDING_APPLIANCE_KIT_PRICE,
  bl_repairbench_kit: BASE_BUILDING_CRAFTING_STATION_PRICE,
  bl_solar_panel_kit: BASE_BUILDING_UTILITY_UPGRADE_PRICE,
  bl_workbench_kit: BASE_BUILDING_CRAFTING_STATION_PRICE,
  bl_trashcan_kit: { min: 150, max: 300 },
  dog_shed_big_kit: { min: 1000, max: 1800 },
  dog_shed_small_kit: { min: 600, max: 1100 },
  ...Object.fromEntries(
    [
      "darts_placingkit_dartboard_lamp",
      "darts_placingkit_dartboard_no_lamp",
      "darts_placingkit_floor_lamp",
      "darts_placingkit_neon_darts",
      "darts_placingkit_neon_darts_2",
    ].map((c) => [c, { min: 400, max: 700 }] as const),
  ),
  ...Object.fromEntries(
    ["bl_cercestis_mirabilis", "bl_dieffenbachia", "bl_monstera", "bl_ficus_bonsai"].map(
      (c) => [c, BASE_BUILDING_DECOR_PLANT_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["bl_desk_lamp", "bl_floor_lamp", "bl_small_spot"].map(
      (c) => [c, BASE_BUILDING_DECOR_LIGHT_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "bl_paint_tube",
      "bl_extension_cable_reel",
      "bl_old_crate",
      "bl_pallet",
      "bl_pallet_frame_solo",
    ].map((c) => [c, BASE_BUILDING_JUNK_MATERIAL_PRICE] as const),
  ),
  ...Object.fromEntries(
    [
      "bl_anatolian_carpet_1_kit",
      "bl_anatolian_carpet_2_kit",
      "bl_painting_1_kit",
      "bl_painting_2_kit",
      "bl_painting_3_kit",
      "bl_painting_4_kit",
      "bl_painting_5_kit",
      "bl_painting_6_kit",
      "bl_painting_7_kit",
      "bl_painting_8_kit",
      "bl_painting_9_kit",
    ].map(
      (c) => [c, BASE_BUILDING_DECOR_KIT_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "bl_pallet_bed_kit",
      "bl_pallet_bed_m_kit",
      "bl_pallet_bed_s_kit",
      "bl_pallet_box_kit",
      "bl_pallet_box_1_kit",
      "bl_pallet_box_2_kit",
      "bl_pallet_box_3_kit",
      "bl_pallet_box_4_kit",
      "bl_pallet_table_kit",
      "bl_pallet_table_l_kit",
      "bl_pallet_table_m_kit",
      "bl_pallet_table_s_kit",
    ].map((c) => [c, BASE_BUILDING_SMALL_FURNITURE_KIT_PRICE] as const),
  ),
  ...Object.fromEntries(
    [
      "bl_stove_barrel_kit",
      "bl_stove_prefab_kit",
    ].map((c) => [c, BASE_BUILDING_MEDIUM_FURNITURE_KIT_PRICE] as const),
  ),
  ...Object.fromEntries(
    [
      "bl_pallet_cabinet_kit",
      "bl_pallet_cabinet_l_kit",
      "bl_pallet_cabinet_m_kit",
      "bl_pallet_cabinet_s_kit",
      "bl_pallet_cabinet_xs_kit",
    ].map((c) => [c, BASE_BUILDING_GUN_CABINET_KIT_PRICE] as const),
  ),
  ...Object.fromEntries(
    [
      "storagebox_safe_black",
      "storagebox_safe_blue",
      "storagebox_safe_gold",
      "storagebox_safe_green",
      "storagebox_safe_grey",
      "storagebox_safe_rainbow",
      "storagebox_safe_white",
    ].map((c) => [c, BASE_BUILDING_SAFE_PRICE] as const),
  ),
  ...Object.fromEntries(
    [
      "storagebox_smallsafe_black",
      "storagebox_smallsafe_blue",
      "storagebox_smallsafe_gold",
      "storagebox_smallsafe_green",
      "storagebox_smallsafe_grey",
      "storagebox_smallsafe_rainbow",
      "storagebox_smallsafe_white",
    ].map((c) => [c, BASE_BUILDING_SMALL_SAFE_PRICE] as const),
  ),
  ...Object.fromEntries(
    [
      "storagebox_adoor_black",
      "storagebox_adoor_blue",
      "storagebox_adoor_gold",
      "storagebox_adoor_green",
      "storagebox_adoor_rainbow",
    ].map(
      (c) => [c, BASE_BUILDING_LOCKABLE_DOOR_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["storagebox_bdoor", "storagebox_rdoor_black", "storagebox_rdoor_green"].map(
      (c) => [c, BASE_BUILDING_BASIC_DOOR_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "storagebox_container_black",
      "storagebox_container_blue",
      "storagebox_container_green",
      "storagebox_container_grey",
      "storagebox_container_red",
      "storagebox_container_tan",
    ].map(
      (c) => [c, BASE_BUILDING_CONTAINER_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "storagebox_fridge_black",
      "storagebox_fridge_white",
      "storagebox_icebox",
      "storagebox_hotdog_cart",
    ].map((c) => [c, BASE_BUILDING_FRIDGE_PRICE] as const),
  ),
  storagebox_ic_freezer: BASE_BUILDING_INDUSTRIAL_FREEZER_PRICE,
  storagebox_p_greenhouse: BASE_BUILDING_GREENHOUSE_PRICE,
  storagebox_largegreenhouse: BASE_BUILDING_LARGE_GREENHOUSE_PRICE,
  ...Object.fromEntries(
    ["storagebox_gearstandc_b", "storagebox_gearstandc_c", "storagebox_gearstandc_g"].map(
      (c) => [c, BASE_BUILDING_GEARSTAND_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["storagebox_dumpster", "storagebox_graffitican", "storagebox_trashcan"].map(
      (c) => [c, BASE_BUILDING_TRASH_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["storagebox_wallrack_black", "storagebox_wallrack_green", "storagebox_wallrack_tan"].map(
      (c) => [c, BASE_BUILDING_WALLRACK_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "storagebox_tcrate_black",
      "storagebox_tcrate_blue",
      "storagebox_tcrate_green",
      "storagebox_tcrate_grey",
      "storagebox_tcrate_tan",
    ].map(
      (c) => [c, BASE_BUILDING_TINY_CRATE_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "storagebox_scrate_black",
      "storagebox_scrate_blue",
      "storagebox_scrate_green",
      "storagebox_scrate_grey",
      "storagebox_scrate_tan",
    ].map(
      (c) => [c, BASE_BUILDING_SMALL_CRATE_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "storagebox_mcrate_black",
      "storagebox_mcrate_blue",
      "storagebox_mcrate_green",
      "storagebox_mcrate_grey",
      "storagebox_mcrate_tan",
    ].map(
      (c) => [c, BASE_BUILDING_MEDIUM_CRATE_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "storagebox_pallet_black",
      "storagebox_pallet_green",
      "storagebox_pallet_tan",
      "storagebox_wood_crate",
    ].map((c) => [c, BASE_BUILDING_PALLET_PRICE] as const),
  ),
  ...Object.fromEntries(
    ["storagebox_metalrack_black", "storagebox_metalrack_green", "storagebox_metalrack_tan"].map(
      (c) => [c, BASE_BUILDING_METAL_RACK_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["storagebox_mcabinet_black", "storagebox_mcabinet_green", "storagebox_mcabinet_tan"].map(
      (c) => [c, BASE_BUILDING_CABINET_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "storagebox_toolb_black",
      "storagebox_toolb_blue",
      "storagebox_toolb_red",
      "storagebox_toolb_white",
      "storagebox_toolb_yellow",
    ].map(
      (c) => [c, BASE_BUILDING_TOOLBOX_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    [
      "storagebox_locker_black",
      "storagebox_locker_blue",
      "storagebox_locker_green",
      "storagebox_locker_purple",
      "storagebox_locker_red",
      "storagebox_locker_white",
      "storagebox_locker_yellow",
    ].map((c) => [c, BASE_BUILDING_LOCKER_PRICE] as const),
  ),
  ...Object.fromEntries(
    ["storagebox_bigtent_black", "storagebox_bigtent_green", "storagebox_bigtent_white"].map(
      (c) => [c, BASE_BUILDING_BIG_TENT_PRICE] as const,
    ),
  ),
};

// Utility.json: pelts plus a full sweep of the same generic gap-fill floor
// they'd been cloned into, which turned out to hold ~90 other never-
// individually-reviewed items - real crafting materials/tools/trophies,
// tiered by real value rather than left flat.
const UTILITY_SMALL_PELT_PRICE = { min: 800, max: 950 };
const UTILITY_STANDARD_PELT_PRICE = { min: 900, max: 1050 };
const UTILITY_PREDATOR_PELT_PRICE = { min: 1000, max: 1200 };
const UTILITY_SCRAP_MATERIAL_PRICE = { min: 30, max: 80 };
const UTILITY_BASIC_MATERIAL_PRICE = { min: 80, max: 180 };
const UTILITY_CRAFTED_TOOL_PRICE = { min: 150, max: 350 };
const UTILITY_CRAFTED_WEAPON_PRICE = { min: 400, max: 700 };
const UTILITY_ANIMAL_GEAR_PRICE = { min: 800, max: 1400 };
const UTILITY_RARE_LORE_ITEM_PRICE = { min: 2000, max: 3500 };
const UTILITY_PRICE_FIXES: Record<string, { min: number; max: number }> = {
  stable_dayz_kit: { min: 2500, max: 4000 },
  stoneknife: { min: 150, max: 300 },
  humanskull: { min: 400, max: 700 },
  scientificbriefcase: UTILITY_RARE_LORE_ITEM_PRICE,
  scientificbriefcasekeys: UTILITY_RARE_LORE_ITEM_PRICE,
  // Flat exact-value fixes for items that had inherited an unrelated
  // Uncommon-tier gap-fill multiplier.
  burlapsack: { min: 1271, max: 1271 },
  gpsreceiver: { min: 2566, max: 4276 },
  // Lives in Tools_And_Melee.json (Tools source group), not Utility, but
  // this repair loop's absolute fixes apply regardless of category.
  fryingpan: { min: 2000, max: 2000 },
  ...Object.fromEntries(
    ["rabbitpelt", "foxpelt", "goatpelt", "sheeppelt"].map(
      (c) => [c, UTILITY_SMALL_PELT_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["pigpelt", "deerpelt", "cowpelt", "wildboarpelt", "reindeerpelt"].map(
      (c) => [c, UTILITY_STANDARD_PELT_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["wolfpelt", "bearpelt", "horsepelt"].map((c) => [c, UTILITY_PREDATOR_PELT_PRICE] as const),
  ),
  ...Object.fromEntries(
    [
      "bone",
      "bonebait",
      "bonehook",
      "bait",
      "guts",
      "smallguts",
      "chickenfeather",
      "plantmaterial",
      "rag",
      "woodenhook",
      "spearbone",
      "bark_birch",
      "bark_oak",
      "paperlabel",
      "gardenlime",
    ].map((c) => [c, UTILITY_SCRAP_MATERIAL_PRICE] as const),
  ),
  // pileofwoodenplanks is excluded entirely (see MANUAL_EXCLUSIONS).
  // woodenlog/firewood get their own sell-only flat price instead (see
  // WOOD_SELL_ONLY_PRICE_FIXES below), not this generic band.
  ...Object.fromEntries(
    [
      "burlapsackcover",
      "burlapstrip",
      "tannedleather",
    ].map((c) => [c, UTILITY_BASIC_MATERIAL_PRICE] as const),
  ),
  ...Object.fromEntries(
    [
      "torch",
      "longtorch",
      "handdrillkit",
      "antipestsspray",
      "cookingstand",
      "fishnettrap",
      "smallfishtrap",
      "rabbitsnaretrap",
      "tripwiretrap",
      "improvisedfishingrod",
      "cw_boltfinsmold",
      "cw_boltshaft",
      "cw_broadhead",
      "cw_carbonroll",
      "cw_carbonsheet",
      "cw_crossbowincomplete",
      "cw_crossbowstock",
      "cw_crossbowupper",
      "cw_glue",
      "zenpetrollighter",
      "zenpetrollighter_green",
      "zenpetrollighter_purple",
      "zenpetrollighter_red",
      "zenpetrollighter_yellow",
      "zenzippolighter",
      "zenzippolighter_anarchy",
      "zenzippolighter_peace",
      "zenzippolighter_zenarchist",
      "morsecodeleaflet_blood",
      "morsecodeleaflet_coffee",
      "morsecodeleaflet_fire",
    ].map(
      (c) => [c, UTILITY_CRAFTED_TOOL_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["nailedbaseballbat", "barbedbaseballbat"].map(
      (c) => [c, UTILITY_CRAFTED_WEAPON_PRICE] as const,
    ),
  ),
  ...Object.fromEntries(
    ["bridle", "saddle", "horsebags"].map((c) => [c, UTILITY_ANIMAL_GEAR_PRICE] as const),
  ),
};

// Wood is find-only, never purchasable, but still sellable - same
// CanOnlySell pattern as the keycards/old food (see traders.ts's WOOD_
// BUYSELL_OVERRIDES). SellPricePercent forced to 100 so the flat value
// below IS the exact sell payout.
export const WOOD_SELL_ONLY_CLASSNAMES = ["woodenlog", "firewood"];
const WOOD_SELL_ONLY_PRICE_FIXES: Record<string, number> = {
  woodenlog: 100,
  firewood: 50,
};

// Explosives.json: these six were left by DayZ-Expansion-Market's own
// default pricing at a level way too high for what should be a common,
// disposable throwable on a hardcore server. Every other explosive
// (flashbang, remote/tripwire charges, plastic explosive, chemgas,
// landmine, claymore) is untouched.
const EXPLOSIVES_GRENADE_PRICE = { min: 1500, max: 1500 };
const EXPLOSIVES_PRICE_FIXES: Record<string, { min: number; max: number }> = Object.fromEntries(
  [
    "m67grenade",
    "rgd5grenade",
    "m18smokegrenade_red",
    "m18smokegrenade_green",
    "m18smokegrenade_purple",
    "m18smokegrenade_white",
    "m18smokegrenade_yellow",
    "rdg2smokegrenade_black",
    "rdg2smokegrenade_white",
  ].map((c) => [c, EXPLOSIVES_GRENADE_PRICE] as const),
);

// Medical.json price corrections - display names confirmed via
// dta/languagecore.pbo's stringtable:
//   - "bloodbagfull" ("Blood Bag") was far too cheap for the actual
//     transfusable blood itself.
//   - "bloodbagempty" ("Blood Collection Kit") was priced like a rare
//     auto-injector; now half of the real Blood Bag's price.
//   - "bloodtestkit" ("Blood Test Kit") was priced far above the
//     disposable single-use test strip it actually is.
//   - "painkillertablets" ("Codeine Pills") was bumped from its default.
//
// Medical is a self-merging category (see buildMergedItems()'s
// "selfMerging" comment) - market.ts's tier overrides there only ever touch
// SellPricePercent/MaxStockThreshold, never price, so these items were
// still sitting at DayZ-Expansion-Market's own defaults and needed a direct
// fix too:
//   - "vitaminbottle" ("Multivitamins") and "disinfectantalcohol"
//     ("Alcohol Tincture") were both too cheap.
//   - "morphine"/"startkitiv"/"salinebag"/"epinephrine" (Morphine
//     Auto-Injector, IV Starter Kit, Saline Bag, Epinephrine Auto-Injector)
//     were all priced far above their intended flat value.
const MEDICAL_PRICE_FIXES: Record<string, { min: number; max: number }> = {
  bloodbagfull: { min: 5000, max: 5000 },
  bloodbagempty: { min: 1250, max: 1250 },
  bloodtestkit: { min: 500, max: 500 },
  painkillertablets: { min: 1000, max: 1000 },
  vitaminbottle: { min: 600, max: 600 },
  disinfectantalcohol: { min: 210, max: 340 },
  morphine: { min: 9000, max: 9000 },
  startkitiv: { min: 1200, max: 1200 },
  salinebag: { min: 9000, max: 9000 },
  epinephrine: { min: 9000, max: 9000 },
  // BloodBagIV is a genuine vanilla classname (distinct from the
  // Terje-Medicine mod's own lowercase salinebag/startkitiv/etc. above),
  // left at DayZ-Expansion-Market's own untouched (too-cheap) default.
  bloodbagiv: { min: 7300, max: 7300 },
};

// Vehicle_Parts.json/Batteries.json were the last category still sitting at
// DayZ-Expansion-Market's own untouched defaults - deliberately excluded
// from every price fix pass until now (see market.ts's VEHICLE_PARTS_
// CATEGORIES comment: kept generously stocked/cheap purely as a functional
// necessity, not tuned as a "coveted power" category). Generated by
// applying a flat 2.5x multiplier to every item's own pristine default
// price, then flooring the result at 1000 (never lowers an already-pricier
// part) - see src/data/vehiclePartsPriceFixes.json. Absolute target values,
// same idempotency reasoning as every other price fix in this file.
const VEHICLE_PARTS_PRICE_FIXES = vehiclePartsPriceFixesData as Record<
  string,
  { min: number; max: number }
>;

// TP_Apoc_Suv/TP_ApocPickup_Truck/TP_Apoc_M1025 (the Apoc SUV/pickup/Humvee
// vehicle families) don't exist in market.ts's raw "Cars" source file at
// all - each is its own "category": "Vehicles_Cars" manifest group, so
// ensureMarketGapFill()'s clone loop creates them fresh from whatever
// Vehicles_Cars.json's own first item happens to be, the same "inherited an
// unrelated gap-fill template price" issue TGK_PRICE_FIXES/BOW_PRICE_FIXES
// fix for guns. Absolute final values (already tier-multiplied, unlike
// market.ts's priceOverrides) matching this project's tractor -> Vodnik
// vehicle price ladder: Apoc SUV/pickup sit between the covered truck and
// the UAZ, M1025 Humvee sits near the top.
const VEHICLE_MANIFEST_CAR_PRICE_FIXES: Record<string, { min: number; max: number }> = {
  ...Object.fromEntries(
    [
      "tp_apoc_suv",
      "tp_apoc_black_suv",
      "tp_apoc_blue_suv",
      "tp_apoc_camo_suv",
      "tp_apoc_green_suv",
      "tp_apoc_grey_suv",
      "tp_apoc_red_suv",
      "tp_apoc_yellow_suv",
      "tp_apoc_suv_auto",
      "tp_apoc_suv_black_auto",
      "tp_apoc_suv_blue_auto",
      "tp_apoc_suv_camo_auto",
      "tp_apoc_suv_green_auto",
      "tp_apoc_suv_grey_auto",
      "tp_apoc_suv_red_auto",
      "tp_apoc_suv_yellow_auto",
    ].map((c) => [c, { min: 95000, max: 140000 }] as const),
  ),
  ...Object.fromEntries(
    [
      "tp_apocpickup_truck",
      "tp_apocpickup_truck_black",
      "tp_apocpickup_truck_red",
      "tp_apocpickup_truck_blue",
      "tp_apocpickup_truck_yellow",
      "tp_apocpickup_truck_green",
      "tp_apocpickup_truck_camo",
      "tp_apocpickup_truck_blackcamo",
      "tp_apocpickup_truck_bloody",
      "tp_apocpickup_truck_auto",
      "tp_apocpickup_truck_black_auto",
      "tp_apocpickup_truck_red_auto",
      "tp_apocpickup_truck_blue_auto",
      "tp_apocpickup_truck_yellow_auto",
      "tp_apocpickup_truck_green_auto",
      "tp_apocpickup_truck_camo_auto",
      "tp_apocpickup_truck_blackcamo_auto",
      "tp_apocpickup_truck_bloody_auto",
    ].map((c) => [c, { min: 90000, max: 135000 }] as const),
  ),
  ...Object.fromEntries(
    [
      "tp_apoc_m1025",
      "tp_apoc_m1025_black",
      "tp_apoc_m1025_camo",
      "tp_apoc_m1025_tan",
      "tp_apoc_m1025_nogun",
      "tp_apoc_m1025_nogun_black",
      "tp_apoc_m1025_nogun_camo",
      "tp_apoc_m1025_nogun_tan",
      "tp_apoc_m1025_staticgun",
      "tp_apoc_m1025_staticgun_black",
      "tp_apoc_m1025_staticgun_camo",
      "tp_apoc_m1025_staticgun_tan",
    ].map((c) => [c, { min: 150000, max: 190000 }] as const),
  ),
};

// Items that landed in the wrong Market category entirely (not just the
// wrong price), with no `template` sibling to auto-detect the drift the
// way staleTemplatePlacementsFixed does below - each of these needed a
// human to recognize the item and decide where it really belongs. Handled
// by its own repair loop (see categoryReassignmentsFixed below): moves the
// item to `toCategory` (if not already there) and applies `price`, every
// run.
const CATEGORY_REASSIGNMENTS: Record<
  string,
  { toCategory: string; price: { min: number; max: number } }
> = {
  // ALV_TacCap reskins landed in Clothing_Head_Civilian's generic ALV
  // gap-fill bucket - a "tactical cap" is unambiguously military gear.
  alv_taccap_black: { toCategory: "Clothing_Head_Military", price: { min: 3600, max: 6000 } },
  alv_taccap_snow: { toCategory: "Clothing_Head_Military", price: { min: 3600, max: 6000 } },
  alv_taccap_tan: { toCategory: "Clothing_Head_Military", price: { min: 3600, max: 6000 } },

  // BoomLays-Things candy/chips/coffee-bean-bag props are food, not base-
  // building materials - gap-filled into Base_Building purely because
  // that's the category their bl_ siblings live in. Re-homed into
  // Consumables, priced alongside this project's existing real snacks.
  bl_candy_toffee: { toCategory: "Consumables", price: { min: 700, max: 1300 } },
  bl_candy_dark: { toCategory: "Consumables", price: { min: 700, max: 1300 } },
  bl_candy_milk: { toCategory: "Consumables", price: { min: 700, max: 1300 } },
  bl_candy_nutty: { toCategory: "Consumables", price: { min: 700, max: 1300 } },
  bl_potatochips_bbq: { toCategory: "Consumables", price: { min: 700, max: 1300 } },
  bl_potatochips_classic: { toCategory: "Consumables", price: { min: 700, max: 1300 } },
  bl_potatochips_hot: { toCategory: "Consumables", price: { min: 700, max: 1300 } },
  bl_potatochips_onion: { toCategory: "Consumables", price: { min: 700, max: 1300 } },
  bl_coffee_bag: { toCategory: "Consumables", price: { min: 900, max: 1500 } },
};

// Deliberate exception to the "no gun should have infinite stock" rule
// below - arrows/flares are cheap, craftable/foraged ammo anyway, so
// letting the launcher itself stay a permanent, always-buyable convenience
// item doesn't undermine the trader's gun-scarcity design.
const UNLIMITED_STOCK_CLASSNAMES = new Set(["hnt_bow", "hnt_bowrecurve", "flaregun"]);

async function listCategoryFiles(): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of Deno.readDir(EXPANSION_MARKET_DIR)) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      names.push(entry.name.slice(0, -".json".length));
    }
  }
  return names;
}

export async function ensureMarketGapFill(): Promise<void> {
  if (!(await exists(EXPANSION_MARKET_DIR))) {
    log(`${EXPANSION_MARKET_DIR} not generated yet - skipping market gap-fill`);
    return;
  }

  const fileNames = await listCategoryFiles();
  const categories = new Map<string, MarketCategory>();
  const classNameOwner = new Map<string, string>(); // lowercased classname -> fileName it lives in
  const classNameItem = new Map<string, MarketItem>(); // lowercased classname -> its full record
  const dirty = new Set<string>();
  let removedTotal = 0;

  for (const fileName of fileNames) {
    const path = `${EXPANSION_MARKET_DIR}/${fileName}.json`;
    const data: MarketCategory = JSON.parse(await Deno.readTextFile(path));
    categories.set(fileName, data);

    // IsExchange files (Exchange.json) aren't a normal sellable category -
    // they're the currency-conversion definition traders.ts's
    // ensureGoldCoinCurrency() manages. Keeps the removal loop from
    // stripping a currency classname out of Exchange.json if it were ever
    // also added to MANUAL_EXCLUSIONS.
    const isExchangeFile = Boolean(data.IsExchange);

    const kept: MarketItem[] = [];
    for (const item of data.Items ?? []) {
      const key = item.ClassName?.toLowerCase();
      if (key && isExcluded(key) && !isExchangeFile) {
        // Permanently denylisted - drop it every run, even if it was added
        // by a previous run of this same module.
        removedTotal++;
        dirty.add(fileName);
        continue;
      }
      kept.push(item);
      // Dead catch-all files never back a live trader - don't let their
      // contents count as "already sellable" (see DEAD_MARKET_FILES above).
      if (key && !classNameOwner.has(key) && !DEAD_MARKET_FILES.has(fileName)) {
        classNameOwner.set(key, fileName);
        classNameItem.set(key, item);
      }
    }
    if (kept.length !== (data.Items?.length ?? 0)) {
      data.Items = kept;
    }
  }

  if (removedTotal > 0) {
    ok(
      `Market gap-fill: removed ${removedTotal} permanently-denylisted item(s) (see isExcluded())`,
    );
  }

  let addedTotal = 0;
  let skippedNoTemplate = 0;

  for (const group of MANIFEST) {
    let templateItem: MarketItem | undefined;
    let destFile: string | undefined;
    let maxStock: number;

    if ("template" in group) {
      const key = group.template.toLowerCase();
      templateItem = classNameItem.get(key);
      destFile = classNameOwner.get(key);
      maxStock = templateItem?.MaxStockThreshold as number ?? TIER_MAX_STOCK.Common;
    } else {
      destFile = group.category;
      const cat = categories.get(destFile);
      templateItem = cat?.Items?.[0];
      maxStock = FIXED_CATEGORY_STOCK_CAP[destFile] ?? TIER_MAX_STOCK[group.tier];
    }

    if (!templateItem || !destFile) {
      skippedNoTemplate += group.classNames.length;
      continue;
    }

    const cat = categories.get(destFile);
    if (!cat) {
      skippedNoTemplate += group.classNames.length;
      continue;
    }
    cat.Items ??= [];

    for (const className of group.classNames) {
      const key = className.toLowerCase();
      // already sellable somewhere, or permanently denylisted - never touch it again
      if (classNameOwner.has(key) || isExcluded(key)) continue;

      const clone: MarketItem = {
        ...templateItem,
        ClassName: className,
        MaxStockThreshold: maxStock,
        // Without this, a cloned Legendary-tier item (maxStock 1) inherits
        // the template's MinStockThreshold (almost always already 1 by
        // DayZ-Expansion-Market's own default), making it permanently
        // always-in-stock (IsStaticStock() == true) regardless of its cap -
        // same fix as market.ts's buildMergedItems().
        MinStockThreshold: 0,
        // Never inherit the template's own Variants - spreading
        // `...templateItem` would carry the template's real variant-family
        // membership onto every new clone verbatim, which is only correct
        // if the clone actually belongs to that same family (it doesn't - a
        // gap-filled item is added precisely because it was missing, not
        // because it's a newly-discovered variant-family root). See the
        // repair pass below this loop for the corresponding cleanup.
        Variants: [],
      };
      cat.Items.push(clone);
      classNameOwner.set(key, destFile);
      classNameItem.set(key, clone);
      dirty.add(destFile);
      addedTotal++;
    }
  }

  if (skippedNoTemplate > 0) {
    warn(
      `Market gap-fill: ${skippedNoTemplate} classname(s) had no usable template/destination ` +
        "category and were skipped (see src/data/marketGapFill.json)",
    );
  }

  // --- Stale template-placement repair ---
  //
  // Template-based manifest entries are additive-only by design (see the
  // main loop above) - once cloned, a clone is never revisited. That's fine
  // as long as its template's own category assignment never changes, but
  // market.ts's classname lists have been hand-tuned over time as new
  // civilian/military splits were found, so a clone made while its
  // template briefly lived in the wrong category is stuck there forever
  // otherwise, at that wrong category's price/tier too.
  //
  // Re-syncs any such clone: moves it out of its current (stale) owner file
  // into its template's CURRENT owner file, and refreshes every field from
  // the template's current (already-correctly-priced/tiered) data - the
  // same clone shape the main loop above builds for a brand new item, just
  // applied retroactively.
  let staleTemplatePlacementsFixed = 0;
  for (const group of MANIFEST) {
    if (!("template" in group)) continue;
    const templateKey = group.template.toLowerCase();
    const correctOwner = classNameOwner.get(templateKey);
    const templateItem = classNameItem.get(templateKey);
    if (!correctOwner || !templateItem) continue;

    for (const className of group.classNames) {
      const key = className.toLowerCase();
      if (key === templateKey) continue;
      const currentOwner = classNameOwner.get(key);
      if (!currentOwner || currentOwner === correctOwner) continue;

      const staleCat = categories.get(currentOwner);
      const destCat = categories.get(correctOwner);
      if (!staleCat?.Items || !destCat) continue;

      staleCat.Items = staleCat.Items.filter((it) => it.ClassName?.toLowerCase() !== key);
      destCat.Items ??= [];
      const fixedClone: MarketItem = { ...templateItem, ClassName: className, Variants: [] };
      destCat.Items.push(fixedClone);

      classNameOwner.set(key, correctOwner);
      classNameItem.set(key, fixedClone);
      dirty.add(currentOwner);
      dirty.add(correctOwner);
      staleTemplatePlacementsFixed++;
    }
  }
  if (staleTemplatePlacementsFixed > 0) {
    ok(
      `Market gap-fill: moved ${staleTemplatePlacementsFixed} item(s) out of a stale gap-fill category into their template's current (correct) category`,
    );
  }

  // --- Variant integrity repair ---
  //
  // DayZ-Expansion-Market enforces a hard invariant across the whole
  // economy, not just within one category: a classname can be claimed as a
  // "variant" (see MarketItem.Variants above) by at most one parent item,
  // and a classname already claimed as somebody else's variant must never
  // itself act as a parent. Any violation throws a scripted exception on
  // every server boot - harmless to gameplay but spams thousands of log
  // lines.
  //
  // Root cause: the clone created above for a MANIFEST group used to spread
  // `...templateItem` with no override, carrying the TEMPLATE's own real
  // Variants list onto every new clone verbatim (fixed above, but that only
  // stops *new* clones from reintroducing it). Some raw per-slot source
  // files this project treats as pristine/untouched input ship with this
  // same bug already baked in upstream, so it comes right back every time.
  //
  // Fix: every classname mentioned anywhere in MANIFEST is, by definition,
  // meant to be gap-filled *as a plain sellable leaf* if missing - never as
  // a family root - so its own top-level entry should never carry its own
  // Variants.
  const manifestClassNames = new Set(
    MANIFEST.flatMap((g) => g.classNames.map((c) => c.toLowerCase())),
  );
  let variantsCleared = 0;
  for (const key of manifestClassNames) {
    const item = classNameItem.get(key);
    const owner = classNameOwner.get(key);
    if (!item || !owner) continue;
    if ((item.Variants?.length ?? 0) === 0) continue;
    item.Variants = [];
    dirty.add(owner);
    variantsCleared++;
  }
  if (variantsCleared > 0) {
    ok(
      `Market gap-fill: cleared bogus inherited Variants on ${variantsCleared} item(s) that ` +
        "should only ever be a plain sellable leaf, never a variant-family root",
    );
  }

  // Defense-in-depth for anything the manifest doesn't cover: strip literal
  // self-references (an item listing its own classname as one of its own
  // variants) and, for any classname claimed by more than one distinct
  // parent, keep only the first claim and drop the rest - matching
  // DayZ-Expansion-Market's own "first registration wins, everything else
  // errors" behavior, but resolved here instead of spamming the log with it.
  // Runs after the manifest-based clearing above so those items' now-empty
  // Variants can't still be treated as a "parent" below.
  const claimedBy = new Map<string, MarketItem>(); // lowercased variant classname -> its one true parent
  let selfRefStripped = 0;
  let duplicateClaimsStripped = 0;
  for (const [key, item] of classNameItem) {
    const owner = classNameOwner.get(key);
    if (!owner || !item.Variants || item.Variants.length === 0) continue;

    const cnLower = item.ClassName?.toLowerCase();
    const next: string[] = [];
    for (const v of item.Variants) {
      const vKey = v.toLowerCase();
      if (vKey === cnLower) {
        selfRefStripped++;
        continue;
      }
      const existingParent = claimedBy.get(vKey);
      if (existingParent && existingParent !== item) {
        duplicateClaimsStripped++;
        continue;
      }
      claimedBy.set(vKey, item);
      next.push(v);
    }
    if (next.length !== item.Variants.length) {
      item.Variants = next;
      dirty.add(owner);
    }
  }
  if (selfRefStripped > 0 || duplicateClaimsStripped > 0) {
    ok(
      `Market gap-fill: stripped ${selfRefStripped} self-referencing and ` +
        `${duplicateClaimsStripped} duplicate-claim Variants entr${
          selfRefStripped + duplicateClaimsStripped === 1 ? "y" : "ies"
        }`,
    );
  }

  // Must run AFTER the manifest loop above, not before: tuneExpansionMarket()
  // fully regenerates the merged category files from their raw sources on
  // every run, so bl_deposit_container gets freshly re-cloned by its own
  // manifest group (with default, wrong-tier pricing) on every server start
  // before this override would get a chance to run.
  const depositContainer = classNameItem.get(DEPOSIT_CONTAINER_CLASSNAME);
  const depositContainerOwner = classNameOwner.get(DEPOSIT_CONTAINER_CLASSNAME);
  if (depositContainer && depositContainerOwner) {
    let touched = false;
    if (depositContainer.MinPriceThreshold !== DEPOSIT_CONTAINER_MIN_PRICE) {
      depositContainer.MinPriceThreshold = DEPOSIT_CONTAINER_MIN_PRICE;
      touched = true;
    }
    if (depositContainer.MaxPriceThreshold !== DEPOSIT_CONTAINER_MAX_PRICE) {
      depositContainer.MaxPriceThreshold = DEPOSIT_CONTAINER_MAX_PRICE;
      touched = true;
    }
    if (depositContainer.MaxStockThreshold !== 1) {
      depositContainer.MaxStockThreshold = 1;
      touched = true;
    }
    if (JSON.stringify(depositContainer.Variants ?? []) !== "[]") {
      depositContainer.Variants = [];
      touched = true;
    }
    if (touched) {
      dirty.add(depositContainerOwner);
      ok(
        `Market gap-fill: re-priced ${DEPOSIT_CONTAINER_CLASSNAME} to its 10M "personal box" tier`,
      );
    }
  }

  let foodPricesFixed = 0;
  for (const [key, priceBand] of Object.entries(FOOD_PRICE_FIXES)) {
    const item = classNameItem.get(key);
    const owner = classNameOwner.get(key);
    if (!item || !owner) continue;

    let touched = false;
    if (item.MinPriceThreshold !== priceBand.min) {
      item.MinPriceThreshold = priceBand.min;
      touched = true;
    }
    if (item.MaxPriceThreshold !== priceBand.max) {
      item.MaxPriceThreshold = priceBand.max;
      touched = true;
    }
    if (touched) {
      dirty.add(owner);
      foodPricesFixed++;
    }
  }
  if (foodPricesFixed > 0) {
    ok(
      `Market gap-fill: re-priced ${foodPricesFixed} food item(s) that had inherited an unrelated gap-fill template price (see FOOD_PRICE_FIXES)`,
    );
  }

  let foodSellPercentsFixed = 0;
  for (const [key, sellPercent] of Object.entries(FOOD_SELL_PERCENT_FIXES)) {
    const item = classNameItem.get(key);
    const owner = classNameOwner.get(key);
    if (!item || !owner) continue;

    if (item.SellPricePercent !== sellPercent) {
      item.SellPricePercent = sellPercent;
      dirty.add(owner);
      foodSellPercentsFixed++;
    }
  }
  if (foodSellPercentsFixed > 0) {
    ok(
      `Market gap-fill: set a flat 75% SellPricePercent on ${foodSellPercentsFixed} chicken/hare carcass item(s) (see FOOD_SELL_PERCENT_FIXES)`,
    );
  }

  let gunPricesFixed = 0;
  for (const [key, priceBand] of Object.entries({ ...TGK_PRICE_FIXES, ...BOW_PRICE_FIXES })) {
    const item = classNameItem.get(key);
    const owner = classNameOwner.get(key);
    if (!item || !owner) continue;

    let touched = false;
    if (item.MinPriceThreshold !== priceBand.min) {
      item.MinPriceThreshold = priceBand.min;
      touched = true;
    }
    if (item.MaxPriceThreshold !== priceBand.max) {
      item.MaxPriceThreshold = priceBand.max;
      touched = true;
    }
    if (touched) {
      dirty.add(owner);
      gunPricesFixed++;
    }
  }
  if (gunPricesFixed > 0) {
    ok(
      `Market gap-fill: re-priced ${gunPricesFixed} gun/attachment/ammo item(s) that had inherited an unrelated gap-fill template price (see TGK_PRICE_FIXES/BOW_PRICE_FIXES)`,
    );
  }

  let hardcorePricesFixed = 0;
  for (
    const [key, priceBand] of Object.entries({
      ...HEADGEAR_AND_ARMOR_PRICE_FIXES,
      ...BACKPACK_PRICE_FIXES,
      ...BASE_BUILDING_PRICE_FIXES,
      ...BASE_BUILDING_STRUCTURES_PRICE_FIXES,
      ...UTILITY_PRICE_FIXES,
      ...EXPLOSIVES_PRICE_FIXES,
      ...MEDICAL_PRICE_FIXES,
      ...VEHICLE_PARTS_PRICE_FIXES,
      ...VEHICLE_MANIFEST_CAR_PRICE_FIXES,
    })
  ) {
    const item = classNameItem.get(key);
    const owner = classNameOwner.get(key);
    if (!item || !owner) continue;

    let touched = false;
    if (item.MinPriceThreshold !== priceBand.min) {
      item.MinPriceThreshold = priceBand.min;
      touched = true;
    }
    if (item.MaxPriceThreshold !== priceBand.max) {
      item.MaxPriceThreshold = priceBand.max;
      touched = true;
    }
    if (touched) {
      dirty.add(owner);
      hardcorePricesFixed++;
    }
  }
  if (hardcorePricesFixed > 0) {
    ok(
      `Market gap-fill: re-priced ${hardcorePricesFixed} headgear/armor/backpack/base-building/utility/explosive/medical/vehicle-part item(s) from the 2026-09 deep economy audit`,
    );
  }

  // WoodenLog/Firewood: flat exact sell price AND SellPricePercent forced
  // to 100 (so the flat value itself is the exact payout) - needed as its
  // own pass since WOOD_SELL_ONLY_PRICE_FIXES stores one flat number per
  // classname, not a band like the shared hardcorePricesFixed loop above.
  let woodSellPercentsFixed = 0;
  for (const [key, exactPrice] of Object.entries(WOOD_SELL_ONLY_PRICE_FIXES)) {
    const item = classNameItem.get(key);
    const owner = classNameOwner.get(key);
    if (!item || !owner) continue;

    let touched = false;
    if (item.MinPriceThreshold !== exactPrice) {
      item.MinPriceThreshold = exactPrice;
      touched = true;
    }
    if (item.MaxPriceThreshold !== exactPrice) {
      item.MaxPriceThreshold = exactPrice;
      touched = true;
    }
    if (item.SellPricePercent !== 100) {
      item.SellPricePercent = 100;
      touched = true;
    }
    if (touched) {
      dirty.add(owner);
      woodSellPercentsFixed++;
    }
  }
  if (woodSellPercentsFixed > 0) {
    ok(
      `Market gap-fill: set an exact flat sell-only price on ${woodSellPercentsFixed} wood item(s) (see WOOD_SELL_ONLY_PRICE_FIXES)`,
    );
  }

  // Gas masks: buy price is pinned flat (via HEADGEAR_AND_ARMOR_PRICE_FIXES
  // above) but the sell side needs a specific percent-of-that-basis value
  // instead of a flat number (see GASMASK_SELL_PERCENT_FIXES' own comment).
  let gasmaskSellPercentsFixed = 0;
  for (const [key, sellPercent] of Object.entries(GASMASK_SELL_PERCENT_FIXES)) {
    const item = classNameItem.get(key);
    const owner = classNameOwner.get(key);
    if (!item || !owner) continue;
    if (item.SellPricePercent !== sellPercent) {
      item.SellPricePercent = sellPercent;
      dirty.add(owner);
      gasmaskSellPercentsFixed++;
    }
  }
  if (gasmaskSellPercentsFixed > 0) {
    ok(
      `Market gap-fill: set an exact ~2000 flat sell price on ${gasmaskSellPercentsFixed} gas mask(s) (see GASMASK_SELL_PERCENT_FIXES)`,
    );
  }

  // Backpacks don't get one flat SellPricePercent like Meat/Fish or
  // Gun_Attachments do (their buy prices span too wide a range for one flat
  // percent to make sense at both ends). Instead each item's own percent is
  // computed here from its own (already-fixed) final MaxPriceThreshold, so
  // a full-stock sale always caps out in the 1k-5k range - re-derived fresh
  // every run, so this stays idempotent.
  const BACKPACK_SELL_CATEGORIES = ["Clothing_Back_Military", "Clothing_Back_Civilian"];
  const BACKPACK_SELL_FLOOR = 1000;
  const BACKPACK_SELL_CEILING = 5000;
  const BACKPACK_SELL_TARGET_RATE = 0.15;

  let backpackSellCapsFixed = 0;
  for (const fileName of BACKPACK_SELL_CATEGORIES) {
    const cat = categories.get(fileName);
    if (!cat) continue;
    for (const item of cat.Items ?? []) {
      const maxPrice = Number(item.MaxPriceThreshold);
      if (!maxPrice || maxPrice <= 0) continue;
      const target = Math.max(
        BACKPACK_SELL_FLOOR,
        Math.min(BACKPACK_SELL_CEILING, Math.round(maxPrice * BACKPACK_SELL_TARGET_RATE)),
      );
      const percent = Math.max(1, Math.min(100, Math.round((target / maxPrice) * 100)));
      if (item.SellPricePercent !== percent) {
        item.SellPricePercent = percent;
        dirty.add(fileName);
        backpackSellCapsFixed++;
      }
    }
  }
  if (backpackSellCapsFixed > 0) {
    ok(
      `Market gap-fill: capped ${backpackSellCapsFixed} backpack sell price(s) to a computed ${BACKPACK_SELL_FLOOR}-${BACKPACK_SELL_CEILING} range (see BACKPACK_SELL_TARGET_RATE)`,
    );
  }

  let categoryReassignmentsFixed = 0;
  for (const [key, { toCategory, price }] of Object.entries(CATEGORY_REASSIGNMENTS)) {
    const currentOwner = classNameOwner.get(key);
    const item = classNameItem.get(key);
    if (!currentOwner || !item) continue;
    const destCat = categories.get(toCategory);
    if (!destCat) continue;

    let touched = false;
    if (currentOwner !== toCategory) {
      const staleCat = categories.get(currentOwner);
      if (staleCat?.Items) {
        staleCat.Items = staleCat.Items.filter((it) => it.ClassName?.toLowerCase() !== key);
        dirty.add(currentOwner);
      }
      destCat.Items ??= [];
      const moved: MarketItem = { ...item, Variants: [] };
      destCat.Items.push(moved);
      classNameOwner.set(key, toCategory);
      classNameItem.set(key, moved);
      dirty.add(toCategory);
      touched = true;
    }

    const movedItem = classNameItem.get(key)!;
    if (movedItem.MinPriceThreshold !== price.min) {
      movedItem.MinPriceThreshold = price.min;
      touched = true;
    }
    if (movedItem.MaxPriceThreshold !== price.max) {
      movedItem.MaxPriceThreshold = price.max;
      touched = true;
    }
    if (touched) {
      dirty.add(classNameOwner.get(key)!);
      categoryReassignmentsFixed++;
    }
  }
  if (categoryReassignmentsFixed > 0) {
    ok(
      `Market gap-fill: moved ${categoryReassignmentsFixed} item(s) into their correct category and price (see CATEGORY_REASSIGNMENTS)`,
    );
  }

  let staleTierCapsFixed = 0;
  for (const [key, item] of classNameItem) {
    const owner = classNameOwner.get(key);
    if (!owner || typeof item.MaxStockThreshold !== "number") continue;
    const corrected = OLD_TO_NEW_TIER_MAX_STOCK[item.MaxStockThreshold];
    if (corrected === undefined) continue;
    item.MaxStockThreshold = corrected;
    dirty.add(owner);
    staleTierCapsFixed++;
  }
  if (staleTierCapsFixed > 0) {
    ok(
      `Market gap-fill: corrected ${staleTierCapsFixed} item(s) still using the old 25/10/4 tier stock caps (now 20/8/3, matching market.ts's TIER_MAX_STOCK)`,
    );
  }

  // "Static stock" repair pass - see market.ts's buildMergedItems() header
  // comment for the full writeup on ExpansionMarketItem.IsStaticStock():
  // MinStockThreshold == MaxStockThreshold means the item's stock is NEVER
  // decremented on purchase, i.e. permanently always in stock regardless of
  // its real cap. DayZ-Expansion-Market's own shipped default
  // MinStockThreshold is 1 for nearly everything, colliding with a
  // Legendary-tier MaxStockThreshold of 1. market.ts's buildMergedItems()
  // and this file's own gap-fill clone above now both force
  // MinStockThreshold to 0 for every NEW item, but this pass fixes every
  // item this bug already affected - deliberately blanket (every
  // classNameItem entry, not just MANIFEST ones). Currency-exchange items
  // (Exchange.json's `IsExchange: true`) are excluded - their own
  // Min==Max==1 is intentional (a fixed conversion rate, not a real
  // purchasable stock; see traders.ts's ensureGoldCoinCurrency()).
  let staticStockFixed = 0;
  for (const [key, item] of classNameItem) {
    const owner = classNameOwner.get(key);
    if (!owner) continue;
    if (categories.get(owner)?.IsExchange) continue;
    if (UNLIMITED_STOCK_CLASSNAMES.has(key)) continue;
    if (typeof item.MaxStockThreshold !== "number" || item.MaxStockThreshold <= 0) continue;
    if (item.MinStockThreshold !== item.MaxStockThreshold) continue;

    item.MinStockThreshold = 0;
    dirty.add(owner);
    staticStockFixed++;
  }
  if (staticStockFixed > 0) {
    ok(
      `Market gap-fill: fixed ${staticStockFixed} item(s) stuck permanently "in stock" regardless of purchases (MinStockThreshold == MaxStockThreshold - see this file's own comment on ExpansionMarketItem.IsStaticStock())`,
    );
  }

  let unlimitedStockApplied = 0;
  for (const key of UNLIMITED_STOCK_CLASSNAMES) {
    const item = classNameItem.get(key);
    const owner = classNameOwner.get(key);
    if (!item || !owner) continue;
    if (typeof item.MaxStockThreshold !== "number" || item.MaxStockThreshold <= 0) continue;
    if (item.MinStockThreshold === item.MaxStockThreshold) continue;

    item.MinStockThreshold = item.MaxStockThreshold;
    dirty.add(owner);
    unlimitedStockApplied++;
  }
  if (unlimitedStockApplied > 0) {
    ok(
      `Market gap-fill: kept ${unlimitedStockApplied} item(s) permanently in stock (see UNLIMITED_STOCK_CLASSNAMES - bows/signal flare only)`,
    );
  }

  if (dirty.size === 0) return;

  for (const fileName of dirty) {
    const path = `${EXPANSION_MARKET_DIR}/${fileName}.json`;
    await Deno.writeTextFile(path, JSON.stringify(categories.get(fileName), null, 4));
  }

  ok(
    `Market gap-fill: added ${addedTotal} previously-unsellable item(s) across ` +
      `${dirty.size} categor${dirty.size === 1 ? "y" : "ies"}`,
  );
}

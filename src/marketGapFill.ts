// Closes the "player finds an item but can't sell it anywhere" gap.
//
// Root cause (found via a full audit, 2026-08): DayZ-Expansion-Market's
// per-category files under profiles/ExpansionMod/Market/ are generated ONCE,
// the first time the mission loads - they are a snapshot, never re-scanned
// against the mod list afterwards. A classname that wasn't present in the
// game's economy at that moment (a mod added/updated later, or a color/skin
// reskin the snapshot simply never included) never gets backfilled, no
// matter how many times market.ts's merge re-runs - that merge can only
// ever copy items that already exist in one of those source files.
//
// Cross-referencing every <type> in the mission's merged db/types.xml
// (ECONOMY_TYPES_FILE - itself already the union of vanilla + every mod's
// own types via modTypes.ts/ncpr.ts/moreCars.ts/wildlifeTerritories.ts) against
// every classname currently sellable across ALL profiles/ExpansionMod/Market/
// *.json files found 2,446 real, spawnable/craftable inventory items with
// nowhere to sell - everything from plain color reskins (most Armband_*/
// Poncho_*/Shemagh_* variants, whole AK74/AKS74U/SCAR-H color variants) to
// entire mods' worth of content that never had ANY category (Alevarics-
// Clothing-Overhaul's ~336 ALV_ items, @NCPR's ~400 nm_ items (note: never
// made sellable - see isExcluded() below, this mod's items are permanently
// denylisted per the project owner's own request),
// Risus-Bases' ~90 bl_ building kits, Gas-Mask-Overhaul's BVP_ masks, the
// Quiver mod's seis_ quiver variants, Custom-Keycards' evg_ keys, loose
// currency/wallet classnames, several MBM/UAZ vehicle-part color variants,
// and more). See src/data/marketGapFill.json for the full, hand-reviewed
// list (excludes creatures, zombies, vehicle wrecks, and world-decor props -
// those were never meant to be sellable).
//
// Two ways an entry closes the gap, both by cloning a full existing item
// record (all its price/spawn fields verbatim) rather than inventing prices
// from scratch - same "copy verbatim, only override MaxStockThreshold"
// philosophy as market.ts's own merge:
//   - `template`: an exact sibling classname already sellable somewhere
//     (e.g. "Armband_Bear" -> template "armband_apa") - found by matching on
//     the classname with its trailing color/variant segment stripped, so the
//     clone keeps the *exact* same tier/category/price as its sibling.
//   - `category` + `tier`: no real sibling exists (a whole new item family) -
//     clone the first existing item already in that destination category as
//     a reasonable in-family price template, and set MaxStockThreshold from
//     this file's own tier (kept in sync with market.ts's TIER_MAX_STOCK).
//
// Idempotent and additive only: every run re-derives from the current state
// of profiles/ExpansionMod/Market/*.json and only ever appends a classname
// that isn't sellable anywhere yet - never touches an item once present, so
// it never resets a category a player has already been trading in. Must run
// after tuneExpansionMarket() (which is what actually creates/repopulates
// the 21 merged category files this reads from).

import { EXPANSION_MARKET_DIR } from "./paths.ts";
import { log, ok, warn } from "./ui.ts";
import { exists } from "./steam.ts";
import manifest from "./data/marketGapFill.json" with { type: "json" };

type Tier = "Common" | "Uncommon" | "Rare" | "Legendary";

// Keep in sync with market.ts's own TIER_MAX_STOCK.
const TIER_MAX_STOCK: Record<Tier, number> = {
  Common: 25,
  Uncommon: 10,
  Rare: 4,
  Legendary: 1,
};

// Ghillies/Vehicle_Parts/Batteries sit outside the tier system entirely
// (see market.ts's RARE_CATEGORIES/VEHICLE_PARTS_CATEGORIES) - tuneCategory()
// force-caps every item in them to a fixed value regardless of tier, and
// since that runs *before* this module (as part of tuneExpansionMarket()),
// any item this module adds to one of them needs that same fixed cap
// applied directly - it won't get swept up by another tuneCategory() pass
// afterwards. Keep in sync with market.ts's RARE_MAX_STOCK_CAP/
// VEHICLE_PARTS_MAX_STOCK_CAP.
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

// DayZ-Expansion-Market ships its ~50 raw per-slot category files (Backpacks,
// Coats_And_Jackets, Armbands, ...) PLUS a few fatter "catch-all" files that
// duplicate much of the same content under a different grouping (Clothing_
// Military/Clothing_Civilian for gear, Weapon_Attachments for ammo/ammo
// boxes - despite the name - and Event for holiday/seasonal items like
// Candycane_*/GiftBox_Large_*/PaydayMask_*/ChristmasHeadband_*). This
// project's own merge (market.ts's MERGED_CATEGORIES) only ever reads from
// the granular per-slot files, so none of these four are referenced by any
// `source:` group and none of them back the "Everything"/"Vehicle" trader
// identities' Categories arrays (confirmed: profiles/ExpansionMod/Traders/
// Everything.json's Categories list has no Clothing_Military/Clothing_
// Civilian/Weapon_Attachments/Event entry, and profiles/ExpansionMod/
// traders/*.map only has one NPC file, CustomTrader.map - the 17 default
// trader identities that would reference these have no NPC at all). They
// are pure dead weight, self-generated once and never touched again by
// anything - EXCEPT this module's own "already sellable somewhere" check,
// which can't tell a dead file from a live one and was wrongly treating
// hundreds of classnames sitting only in these files (e.g. AliceBag_Black/
// AssaultBag_Green/Attack2Bag_Green/CoyoteBag_Green, dozens of faction
// Armband_* skins, and - found by marketAudit.ts, 2026-08 - every seasonal
// item in Event.json) as already covered, silently skipping them from ever
// being added to the real, live categories (Clothing_Back_Military/
// Clothing_Misc_Military/Consumables/Clothing_Head_Civilian/Base_Building/
// Tools_And_Melee/etc). Treat their contents as invisible for ownership-
// tracking purposes (but leave the files themselves alone - they're
// harmless, and DayZ-Expansion-Market may still expect them to exist).
//
// UPDATE (2026-08, root-caused via the missing Cars/Helis restock board
// bug): "leave the files themselves alone" above was wrong - these are
// exactly as loaded (and just as capable of silently stealing classnames
// out of a real merged category via ExpansionMarketCategory's global
// duplicate-rejection) as any other orphaned raw source file. Exported so
// market.ts's quarantineConsumedSourceCategories() can rename them away
// from ".json" alongside every raw per-slot source file its own merge
// consumes - see that function's own comment for the full mechanism. The
// in-loop skip below stays as a harmless defense-in-depth fallback in case
// one is ever exposed as ".json" again for any reason.
export const DEAD_MARKET_FILES = new Set<string>([
  "Clothing_Military",
  "Clothing_Civilian",
  "Weapon_Attachments",
  "Event",
]);

// Classnames that must never be sellable, checked/enforced on every run
// (independent of MANIFEST above) - so even though each is a valid,
// spawnable inventory item, listing it in the trader is actively wrong.
//
//   - @NCPR's (Nemesis Craftingpack Redux) entire nm_ prefixed item family
//     is blanket-denylisted by prefix (see isExcluded() below), not a
//     hand-picked list. CORRECTION (2026-08): earlier comments here
//     mistakenly attributed this prefix to Namalsk-Survival - confirmed
//     wrong by fetching Namalsk-Survival's own shipped types.xml, which has
//     zero nm_-prefixed entries and uses plain vanilla-style names instead.
//     The real source is @NCPR, confirmed via its NM_TYPES.xml (the same
//     file src/ncpr.ts merges into the economy). An earlier audit only
//     caught the sign/canvas/tent reskins that had been gap-filled into
//     Base_Building, but nm_ items turned out to be scattered across a
//     dozen+ other categories too (clothing, ammo, guns, medical, utility,
//     vehicle parts, ...) via MANIFEST above - most show with a missing/
//     wrong display name or icon in the trader UI, and the project owner
//     has explicitly confirmed none of this mod's items should be sellable
//     at the trader, so a prefix rule is both simpler and permanently
//     future-proof against any nm_ classname this file's own MANIFEST might
//     add later.
//   - BoomLays-Things' bl_ pallet-furniture RAW built-object classnames
//     (e.g. bl_pallet_table_l): confirmed via the mod's own script source
//     (unpacked from bl_pallet_table.pbo) that these are the deployed WORLD
//     OBJECT form (`class bl_pallet_table_l : bl_table`), not a normal
//     inventory item - only the `_Kit` sibling (`class bl_pallet_table_l_Kit
//     : bl_table_prefab_Kit`) is the real carryable/purchasable item that
//     deploys into the built form. Buying the raw classname directly
//     breaks it. The _Kit forms are deliberately left untouched/purchasable.
//     (bl_deposit_container is NOT included here - confirmed via bl_deposit
//     .pbo it's created directly via GetGame().CreateObject(), no Kit
//     involved - see DEPOSIT_CONTAINER_CLASSNAME handling below instead.)
//     Named MANUAL_EXCLUSIONS since, unlike the nm_ prefix rule, these
//     don't share a common prefix with anything else in the same mod that
//     should stay sellable (bl_deposit_container, bl_desk_lamp, etc.).
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
    "undergroundstashsnow", // the dug-out stash hole itself, not a portable container

    // Built/placed base-building structures - these are the FINAL,
    // already-assembled classnames, not the portable kit a player actually
    // buys and deploys (e.g. WatchtowerKit, already sellable, is the real
    // purchasable form of Watchtower below). Confirmed via types.xml: all
    // four share the same count_in_cargo="0" count_in_player="0" flags as
    // the world-only markers above.
    "bonfire",
    "cauldron",
    "christmastree",
    "fence",
    "watchtower",

    // Deer Isle (DayZ-Expansion map assets, "_DE" suffix) static map decor -
    // decals, roadblocks, train wagons/containers, supply crates - all
    // confirmed via types.xml count_in_cargo="0" count_in_player="0", EXCEPT
    // StaticObj_PatrolBoat_Military_DE (flagged count_in_cargo="1"
    // count_in_player="1", technically "cargo capable") - excluded anyway
    // on the project owner's call: a "StaticObj_" name is DayZ-Expansion's
    // own convention for a static, non-interactive map decoration prop, and
    // that convention is trusted here over one possibly-stale config flag.
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
  ].map((s) => s.toLowerCase()),
);

// Single source of truth for "must never be sellable" - the nm_ prefix rule
// plus the hand-picked MANUAL_EXCLUSIONS set above. `key` must already be
// lowercased (both call sites below already lowercase every ClassName
// before checking).
export function isExcluded(key: string): boolean {
  return key.startsWith("nm_") || MANUAL_EXCLUSIONS.has(key);
}

// "Your personal box" (BoomLays-Things' bl_deposit_container - confirmed via
// bl_shared_data.pbo's STR_CfgDepositContainer0 string) is a legitimate,
// self-contained purchasable placeable (see MANUAL_EXCLUSIONS comment - no
// Kit dependency). The generic gap-fill clone logic priced it like a tent
// (its category's first item at the time) and left it with that tent's
// bogus color Variants array. Force it to reflect its actual intent instead
// - an extremely expensive, effectively-unique personal safe - every run.
const DEPOSIT_CONTAINER_CLASSNAME = "bl_deposit_container";
const DEPOSIT_CONTAINER_MIN_PRICE = 9_000_000;
const DEPOSIT_CONTAINER_MAX_PRICE = 11_000_000;

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

    const kept: MarketItem[] = [];
    for (const item of data.Items ?? []) {
      const key = item.ClassName?.toLowerCase();
      if (key && isExcluded(key)) {
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

  // Must run AFTER the manifest loop above, not before: tuneExpansionMarket()
  // fully regenerates the merged category files from their raw sources on
  // every run (see this file's own header comment), so bl_deposit_container
  // gets freshly re-cloned by its own manifest group (with default,
  // wrong-tier pricing) on every server start before this override ever
  // gets a chance to run - fixing it up first (as this used to do) would
  // silently miss every restart's fresh clone.
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

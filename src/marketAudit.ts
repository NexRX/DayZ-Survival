// Permanent, re-runnable sanity check for the whole trader economy - answers
// "did we miss anything, and is anything mispriced?" without a manual
// eyeball pass. Complements marketGapFill.ts (which *fixes* known gaps by
// classname) rather than replacing it: this module only reads and reports,
// it never writes to any market file, so it's always safe to run.
//
// Three checks, cross-referencing the mission's merged economy
// (ECONOMY_TYPES_FILE - vanilla + every mod's own types, see modTypes.ts/
// ncpr.ts/moreCars.ts/wildlifeTerritories.ts) against what's actually
// sellable (every classname in every category file either custom trader
// identity references - see traders.ts's CUSTOM_TRADER_IDENTITIES, the
// authoritative "can a player buy/sell this anywhere" list):
//
//   Bucket A (high confidence): has a real <category name="..."/> tag in
//     types.xml (weapons/tools/clothes/food/containers/explosives/
//     vehiclesparts/lootdispatch - all confirmed genuine inventory items,
//     not vehicles/animals/decor), not sellable, not excluded/never-
//     sellable - near-certain a real gap that should be added to
//     src/data/marketGapFill.json.
//   Bucket B (needs review): no <category> tag at all - a mixed bag that
//     includes real vehicles, animals, zombies, wrecks, physical currency,
//     and decor props alongside the occasional genuine gap (confirmed via
//     Broom_Birch, which has no <category> tag yet is correctly sellable) -
//     too noisy to auto-flag as a gap, so this bucket is filtered down to
//     "never sellable" patterns first and whatever's left is for a human to
//     eyeball, not something this tool fixes itself.
//   Bucket C (price/stock sanity): every currently-sellable item, checked
//     for missing/non-positive price thresholds, Min > Max, and a
//     MaxStockThreshold that doesn't match any valid cap for its category
//     (catches stray manual edits that bypassed the tier system in
//     market.ts/marketGapFill.ts).
//
// Never modifies anything - prints a summary to the console and writes the
// full itemized report under profiles/ (already gitignored wholesale, and
// this data is transient/regeneratable, so it doesn't need its own
// .gitignore entry).

import { ECONOMY_TYPES_FILE, EXPANSION_MARKET_DIR, PROFILE_DIR } from "./paths.ts";
import { log, ok, warn } from "./ui.ts";
import { exists } from "./steam.ts";
import {
  MANAGED_MARKET_CATEGORIES,
  RARE_CATEGORIES,
  RARE_MAX_STOCK_CAP,
  TIER_MAX_STOCK,
  VEHICLE_PARTS_CATEGORIES,
  VEHICLE_PARTS_MAX_STOCK_CAP,
} from "./market.ts";
import { isExcluded } from "./marketGapFill.ts";
import { CUSTOM_TRADER_IDENTITIES } from "./traders.ts";

const REPORT_FILE = `${PROFILE_DIR}/market-audit-report.txt`;

// Same convention as economy.ts's own TYPE_BLOCK - a regex scan rather than
// a full XML parser, kept consistent with the rest of the codebase's
// approach to this specific file (even though a read-only tool like this
// one has no round-tripping concerns that would otherwise justify it).
const TYPE_BLOCK = /<type name="([^"]+)">([\s\S]*?)<\/type>/g;
const CATEGORY_TAG = /<category name="([^"]+)"\s*\/>/;

// Patterns for inventory-adjacent XML entries that are never meant to be
// buyable/sellable at a trader at all - distinct from marketGapFill.ts's
// isExcluded() (which denylists items that ARE otherwise-normal inventory
// items, just ones this project's owner decided shouldn't be sold).
const NEVER_SELLABLE_PATTERNS: RegExp[] = [
  /^Animal_/i, // wildlife/creature
  /^Zmb/i, // zombie skin/loot
  /^(Land_[Ww]reck|StaticObj_Wreck|Wreck_)/i, // vehicle wreck/decor prop
  /^(Money_|Wallet_)/i, // physical currency prop (Expansion traders use their own virtual currency)
  /^YRTSK_ZMB/i, // YRTSK mod's zombie skin family (same idea as ^Zmb, different mod's naming)
  /^Doggo_Wild/i, // @DayZ-Dog's wild/feral dog creature variants
  /^BMM_Chimical/i, // @BMM-Chemical-Zombie's creature + body-part loot family
  /^TCHC/i, // @Custom-Zombies' creature family (TCHCAI_TheAstronaut_Zombie_*/TCHC_TheButcher_Zombie/TCHC_ZombieBear)
];

function isNeverSellable(className: string): boolean {
  return NEVER_SELLABLE_PATTERNS.some((p) => p.test(className));
}

interface EconomyType {
  name: string;
  category: string | null;
}

async function readEconomyTypes(): Promise<EconomyType[]> {
  const text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const types: EconomyType[] = [];
  for (const m of text.matchAll(TYPE_BLOCK)) {
    const name = m[1];
    const body = m[2];
    const catMatch = body.match(CATEGORY_TAG);
    types.push({ name, category: catMatch ? catMatch[1] : null });
  }
  return types;
}

interface MarketItem {
  ClassName?: string;
  MaxStockThreshold?: number;
  MinPriceThreshold?: number;
  MaxPriceThreshold?: number;
  [key: string]: unknown;
}

interface MarketCategory {
  Items?: MarketItem[];
  [key: string]: unknown;
}

interface SellableEntry {
  category: string;
  item: MarketItem;
}

async function readSellableCategories(
  categoryNames: Iterable<string>,
): Promise<Map<string, SellableEntry>> {
  const sellable = new Map<string, SellableEntry>(); // lowercased classname -> where it lives
  for (const name of categoryNames) {
    const path = `${EXPANSION_MARKET_DIR}/${name}.json`;
    if (!(await exists(path))) continue;
    const data: MarketCategory = JSON.parse(await Deno.readTextFile(path));
    for (const item of data.Items ?? []) {
      const key = item.ClassName?.toLowerCase();
      if (!key) continue;
      if (!sellable.has(key)) sellable.set(key, { category: name, item });
    }
  }
  return sellable;
}

function validStockCaps(category: string): Set<number> {
  if (RARE_CATEGORIES.includes(category)) return new Set([RARE_MAX_STOCK_CAP]);
  if (VEHICLE_PARTS_CATEGORIES.includes(category)) {
    return new Set([VEHICLE_PARTS_MAX_STOCK_CAP]);
  }
  return new Set(Object.values(TIER_MAX_STOCK));
}

export async function auditMarket(): Promise<void> {
  if (!(await exists(EXPANSION_MARKET_DIR))) {
    log(`${EXPANSION_MARKET_DIR} not generated yet - nothing to audit`);
    return;
  }
  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(`${ECONOMY_TYPES_FILE} not found yet - nothing to audit`);
    return;
  }

  // Every category name either custom trader identity actually references -
  // the true "can a player buy/sell this anywhere" list. Used for Bucket C
  // (price/stock sanity is only meaningful for what's actually reachable by
  // a real trader today).
  const traderCategories = new Set<string>();
  for (const identity of CUSTOM_TRADER_IDENTITIES) {
    for (const cat of identity.categories) traderCategories.add(cat);
  }

  const sellable = await readSellableCategories(traderCategories);

  // Broader than `sellable` above: every managed category this project
  // tracks, whether or not a trader identity references it yet (e.g.
  // "Boats" - built/tuned and staged for a future trader, deliberately not
  // wired up until there's navigable water near the trader city). Once
  // something has a real, generated category entry it's been reviewed and
  // accounted for - it shouldn't keep cluttering Bucket A/B as if it were
  // an unknown gap just because nobody's attached its category to a
  // trader yet. Bucket C stays scoped to `sellable` only (see above).
  const trackedAnywhere = await readSellableCategories(
    new Set([...traderCategories, ...MANAGED_MARKET_CATEGORIES]),
  );

  const types = await readEconomyTypes();

  const bucketA: string[] = [];
  const bucketB: string[] = [];
  const seenNames = new Set<string>(); // avoid double-reporting duplicate <type> blocks

  for (const t of types) {
    const key = t.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    if (trackedAnywhere.has(key)) continue;
    if (isExcluded(key)) continue;
    if (isNeverSellable(t.name)) continue;

    if (t.category) {
      bucketA.push(`${t.name}  (category: ${t.category})`);
    } else {
      bucketB.push(t.name);
    }
  }
  bucketA.sort();
  bucketB.sort();

  // Bucket C: price/stock sanity across everything that IS sellable.
  const bucketC: string[] = [];
  const classNameOwners = new Map<string, string[]>(); // duplicate-across-categories check
  for (const [key, { category, item }] of sellable) {
    const label = item.ClassName ?? key;
    if (
      item.MinPriceThreshold === undefined || item.MinPriceThreshold <= 0 ||
      item.MaxPriceThreshold === undefined || item.MaxPriceThreshold <= 0
    ) {
      bucketC.push(`${label} [${category}]: missing/non-positive price threshold`);
    } else if (item.MinPriceThreshold > item.MaxPriceThreshold) {
      bucketC.push(
        `${label} [${category}]: MinPriceThreshold (${item.MinPriceThreshold}) > ` +
          `MaxPriceThreshold (${item.MaxPriceThreshold})`,
      );
    }

    const caps = validStockCaps(category);
    if (item.MaxStockThreshold === undefined || !caps.has(item.MaxStockThreshold)) {
      bucketC.push(
        `${label} [${category}]: MaxStockThreshold ${item.MaxStockThreshold} doesn't match ` +
          `a valid cap for this category (expected one of: ${[...caps].join(", ")})`,
      );
    }

    const owners = classNameOwners.get(key) ?? [];
    owners.push(category);
    classNameOwners.set(key, owners);
  }
  for (const [key, owners] of classNameOwners) {
    if (owners.length > 1) {
      bucketC.push(`${key}: sellable in multiple categories at once (${owners.join(", ")})`);
    }
  }
  bucketC.sort();

  const lines: string[] = [];
  lines.push(`Market audit - ${new Date().toISOString()}`);
  lines.push("");
  lines.push(
    `Bucket A - high-confidence gaps (has a real <category> tag, not sellable): ${bucketA.length}`,
  );
  lines.push(...bucketA.map((s) => `  ${s}`));
  lines.push("");
  lines.push(
    `Bucket B - needs review (no <category> tag, not sellable, not an obvious non-item): ${bucketB.length}`,
  );
  lines.push(...bucketB.map((s) => `  ${s}`));
  lines.push("");
  lines.push(`Bucket C - price/stock anomalies on currently-sellable items: ${bucketC.length}`);
  lines.push(...bucketC.map((s) => `  ${s}`));
  lines.push("");

  await Deno.writeTextFile(REPORT_FILE, lines.join("\n"));

  log(
    `Market audit: ${bucketA.length} high-confidence gap(s), ${bucketB.length} item(s) ` +
      `needing manual review, ${bucketC.length} price/stock anomal${
        bucketC.length === 1 ? "y" : "ies"
      }`,
  );
  if (bucketA.length > 0) {
    warn(`${bucketA.length} likely-missing sellable item(s) - see ${REPORT_FILE} (Bucket A)`);
  }
  if (bucketC.length > 0) {
    warn(
      `${bucketC.length} price/stock anomaly(ies) on existing items - see ${REPORT_FILE} (Bucket C)`,
    );
  }
  ok(`Full report written to ${REPORT_FILE}`);
}

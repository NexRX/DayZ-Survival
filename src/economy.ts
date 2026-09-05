// Rebalances the vanilla loot economy so ready-to-eat food is scarcer while
// huntable game animals are more common, encouraging hunting over pure
// scavenging.
//
// Unlike ai.ts/spatial.ts/dynamicMissions.ts (additive merge only), this
// deliberately *overwrites* specific <nominal>/<min>/<restock> values inside
// the mission's own vanilla economy files (db/types.xml, db/events.xml) - an
// explicit tuning pass, not a merge.
//
// These files ship as part of the mission itself, so a plain
// `deno task install` re-validating the server's Steam depot can silently
// reset them back to vanilla. Each function stamps a marker comment once
// it's tuned a fresh file, so `doStart()` calling these on every start is
// both idempotent and self-healing if a Steam update wipes the file (and
// its marker) back to vanilla.
//
// Both files are huge and hand-authored by Bohemia's own tooling, so rather
// than round-trip them through a generic XML parser/serializer (which would
// reformat the entire file into an unreviewable diff), this uses scoped
// regex substitution that only touches the matched tag text, leaving
// everything else byte-for-byte untouched.

import { ECONOMY_EVENTS_FILE, ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

// --- Food scarcity (types.xml, category="food") ---
const FOOD_NOMINAL_MULTIPLIER = 0.5; // half as much ready-to-eat food spawns
const FOOD_MIN_MULTIPLIER = 0.5;
const FOOD_RESTOCK_FLOOR = 3600; // a picked-clean spot can't refill in under an hour

const FOOD_MARKER = "<!-- dayz-survival:food-scarcity-tuned -->";
const TYPE_BLOCK = /<type name="([^"]+)">([\s\S]*?)<\/type>/g;

function tuneFoodBlock(body: string): string | null {
  if (!/<category name="food"\s*\/>/.test(body)) return null;

  const nominalMatch = body.match(/<nominal>(\d+)<\/nominal>/);
  if (!nominalMatch) return null;
  const nominal = Number(nominalMatch[1]);
  if (nominal === 0) return null; // not naturally spawned (e.g. opened/cooked variants)

  const minMatch = body.match(/<min>(\d+)<\/min>/);
  const restockMatch = body.match(/<restock>(\d+)<\/restock>/);
  const min = minMatch ? Number(minMatch[1]) : 0;
  const restock = restockMatch ? Number(restockMatch[1]) : 0;

  const newNominal = Math.max(1, Math.round(nominal * FOOD_NOMINAL_MULTIPLIER));
  const newMin = Math.min(newNominal, Math.max(0, Math.round(min * FOOD_MIN_MULTIPLIER)));
  const newRestock = Math.max(restock, FOOD_RESTOCK_FLOOR);

  let out = body;
  out = out.replace(/<nominal>\d+<\/nominal>/, `<nominal>${newNominal}</nominal>`);
  out = out.replace(/<min>\d+<\/min>/, `<min>${newMin}</min>`);
  out = out.replace(/<restock>\d+<\/restock>/, `<restock>${newRestock}</restock>`);
  return out;
}

export async function tuneFoodScarcity(): Promise<void> {
  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(
      `${ECONOMY_TYPES_FILE} not found yet - it ships with the mission and ` +
        "should exist once the server has been installed",
    );
    return;
  }

  const text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  if (text.includes(FOOD_MARKER)) return; // already tuned, and not reset by a Steam update

  let changedCount = 0;
  let result = text.replace(TYPE_BLOCK, (whole, name: string, body: string) => {
    if (/seed/i.test(name)) return whole; // leave farming seeds alone
    const tuned = tuneFoodBlock(body);
    if (tuned === null) return whole;
    changedCount++;
    return `<type name="${name}">${tuned}</type>`;
  });

  if (changedCount === 0) return;
  result = result.replace("?>", `?>\n${FOOD_MARKER}`);
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, result);
  ok(`Reduced natural spawn rates for ${changedCount} food item(s) in ${ECONOMY_TYPES_FILE}`);
}

// --- Animal populations (events.xml, Animal* events) ---
const ANIMAL_NOMINAL_MULTIPLIER = 1.75;

const ANIMAL_MARKER = "<!-- dayz-survival:animal-spawns-tuned -->";
const EVENT_BLOCK = /<event name="(Animal[^"]*)">([\s\S]*?)<\/event>/g;

export async function tuneAnimalSpawns(): Promise<void> {
  if (!(await exists(ECONOMY_EVENTS_FILE))) {
    log(
      `${ECONOMY_EVENTS_FILE} not found yet - it ships with the mission and ` +
        "should exist once the server has been installed",
    );
    return;
  }

  const text = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  if (text.includes(ANIMAL_MARKER)) return; // already tuned, and not reset by a Steam update

  let changedCount = 0;
  let result = text.replace(EVENT_BLOCK, (whole, name: string, body: string) => {
    const nominalMatch = body.match(/<nominal>(\d+)<\/nominal>/);
    if (!nominalMatch) return whole;
    const nominal = Number(nominalMatch[1]);
    if (nominal === 0) return whole; // e.g. AnimalBear - left at its (rare-by-design) vanilla value

    const newNominal = Math.round(nominal * ANIMAL_NOMINAL_MULTIPLIER);
    if (newNominal === nominal) return whole;

    changedCount++;
    const newBody = body.replace(/<nominal>\d+<\/nominal>/, `<nominal>${newNominal}</nominal>`);
    return `<event name="${name}">${newBody}</event>`;
  });

  if (changedCount === 0) return;
  result = result.replace("?>", `?>\n${ANIMAL_MARKER}`);
  await Deno.writeTextFile(ECONOMY_EVENTS_FILE, result);
  ok(`Raised population targets for ${changedCount} animal species in ${ECONOMY_EVENTS_FILE}`);
}

// --- Currency scarcity (types.xml, CJ187-Money-Euros-Only / CJ187-MoreMoney) ---
//
// These mods only add currency items (banknotes, coins, gold bars, wallets)
// - the only lever for scarcity is each item's own <nominal>/<min>/<restock>
// once its types.xml is merged in by modTypes.ts. Matched by name keyword
// (not category, unlike food) since we don't have the mods' real classnames
// yet - harmless if this over/under-matches: worst case is a no-op until
// the mods are downloaded and the keyword list can be checked against real
// names.
const MONEY_NAME_PATTERN = /ruble|dollar|euro|deutschemark|goldbar|goldcoin|bitcoin/i;
const MONEY_NOMINAL_MULTIPLIER = 0.4;
const MONEY_MIN_MULTIPLIER = 0.4;
const MONEY_RESTOCK_FLOOR = 3600;

const MONEY_MARKER = "<!-- dayz-survival:money-scarcity-tuned -->";

function tuneMoneyBlock(body: string): string | null {
  const nominalMatch = body.match(/<nominal>(\d+)<\/nominal>/);
  if (!nominalMatch) return null;
  const nominal = Number(nominalMatch[1]);
  if (nominal === 0) return null; // not naturally spawned

  const minMatch = body.match(/<min>(\d+)<\/min>/);
  const restockMatch = body.match(/<restock>(\d+)<\/restock>/);
  const min = minMatch ? Number(minMatch[1]) : 0;
  const restock = restockMatch ? Number(restockMatch[1]) : 0;

  const newNominal = Math.max(1, Math.round(nominal * MONEY_NOMINAL_MULTIPLIER));
  const newMin = Math.min(newNominal, Math.max(0, Math.round(min * MONEY_MIN_MULTIPLIER)));
  const newRestock = Math.max(restock, MONEY_RESTOCK_FLOOR);

  let out = body;
  out = out.replace(/<nominal>\d+<\/nominal>/, `<nominal>${newNominal}</nominal>`);
  out = out.replace(/<min>\d+<\/min>/, `<min>${newMin}</min>`);
  out = out.replace(/<restock>\d+<\/restock>/, `<restock>${newRestock}</restock>`);
  return out;
}

export async function tuneMoneyScarcity(): Promise<void> {
  // tuneFoodScarcity()/ensureModTypesMerged() already log the missing-file case.
  if (!(await exists(ECONOMY_TYPES_FILE))) return;

  const text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  if (text.includes(MONEY_MARKER)) return; // already tuned, and not reset by a Steam update

  let changedCount = 0;
  let result = text.replace(TYPE_BLOCK, (whole, name: string, body: string) => {
    if (!MONEY_NAME_PATTERN.test(name)) return whole;
    const tuned = tuneMoneyBlock(body);
    if (tuned === null) return whole;
    changedCount++;
    return `<type name="${name}">${tuned}</type>`;
  });

  if (changedCount === 0) return;
  result = result.replace("?>", `?>\n${MONEY_MARKER}`);
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, result);
  ok(`Reduced natural spawn rates for ${changedCount} currency item(s) in ${ECONOMY_TYPES_FILE}`);
}

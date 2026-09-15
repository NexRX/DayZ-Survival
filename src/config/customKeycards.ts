// Custom-Keycards (@Custom-Keycards, id 2810212624): keycard-gated doors/
// gates + loot crates. Previously removed from this project after a real
// boot test hung the server indefinitely at mission/script compile (see
// mods.txt's history) - retested clean (twice) after the mod's own 8 Apr
// update, so it's back.
//
// Item types: the mod ships its keycards/holders as real placeable items
// but (like @Optics/@TGK-WeaponPack) doesn't bake economy spawn data into
// its .pbo - it expects an admin to merge its own reference types.xml by
// hand. Both ground-loot spawn chance AND trader stock/price are now scaled
// to a hand-agreed rarity ladder (common -> rarest): White < Yellow < Green
// < Blue < Tisy01 < NWAF01 < Violet < Red < NWAF02 < Tisy02 < NWAF03 <
// Tisy03 < Tisy04 < Tisy05. The two NWAF/Tisy-numbered families
// additionally use vanilla usage="Military" (+ value Tier3/Tier4 for the
// rarer ones) so they're geographically restricted toward military spawn
// tables, same mechanism as decoyGrenades.ts's TRQ_DecoyGrenade.
// evg_keycards_All (the master key) is deliberately excluded from the
// ladder entirely - kept as an inert nominal=0 admin-only stub, never a
// ground-loot find or trader item. Trader prices for every classname here
// live in marketGapFill.ts's KEYCARD_PRICE_FIXES +
// src/data/marketGapFill.json's manifest entries.
//
// Loot tables + secured building locations are now static overrides in
// overrides_profile/CustomKeycards/ (see keycard-rooms/LOCATIONS.md for
// the full rarity ladder + in-game capture source data).

import { ECONOMY_TYPES_FILE } from "../constants/paths.ts";
import { log, ok } from "../ui.ts";
import { exists } from "../steam.ts";
import type { Mod } from "../server/mods.ts";
import { CUSTOM_KEYCARDS_ITEM_TYPES } from "./modTypes.ts";

const MOD_NAME = "@Custom-Keycards";

interface KeycardEconomy {
  nominal: number;
  min: number;
  category: "tools" | "clothes";
  /** Vanilla generic spawn-location tag (e.g. "shelves") - mutually exclusive with usage/value. */
  tag?: string;
  /** Vanilla usage restriction (e.g. "Military") - geographically limits which spawn tables roll this item. */
  usage?: string;
  /** Vanilla tier restriction(s) (e.g. "Tier3"/"Tier4") - only meaningful alongside usage. */
  value?: string[];
}

// Rarity ladder (common -> rarest), hand-agreed with the admin:
//   White < Yellow < Green < Blue < Tisy01 < NWAF01 < Violet < Red <
//   NWAF02 < Tisy02 < NWAF03 < Tisy03 < Tisy04 < Tisy05
// Color-named cards are treated as general-access badges (vanilla
// tag="shelves" - the mod's own default spawn location, offices/shelving
// found all over town) with nominal/min falling as they climb the ladder.
// NWAF/Tisy-numbered cards are lore-appropriate military installation
// passes, so they use vanilla usage="Military" instead (restricting them to
// military spawn tables), stacking on value="Tier3"/"Tier4" for the rarer
// half to push them toward the very hottest military spawns only - same
// mechanism as decoyGrenades.ts's TRQ_DecoyGrenade. evg_keycards_All (master
// key) stays an inert nominal=0 admin-only stub, excluded from the ladder.
const KEYCARD_ECONOMY: Record<string, KeycardEconomy> = {
  evg_keycard_holder_camo: { nominal: 10, min: 4, category: "clothes", tag: "shelves" },
  evg_keycard_holder_leather: { nominal: 10, min: 4, category: "clothes", tag: "shelves" },
  evg_keycards_All: { nominal: 0, min: 0, category: "tools" },
  evg_keycards_White: { nominal: 8, min: 3, category: "tools", tag: "shelves" },
  evg_keycards_Yellow: { nominal: 8, min: 3, category: "tools", tag: "shelves" },
  evg_keycards_Green: { nominal: 8, min: 3, category: "tools", tag: "shelves" },
  evg_keycards_Blue: { nominal: 4, min: 1, category: "tools", tag: "shelves" },
  evg_keycards_Tisy01: { nominal: 4, min: 1, category: "tools", usage: "Military" },
  evg_keycards_NWAF01: { nominal: 4, min: 1, category: "tools", usage: "Military" },
  evg_keycards_Violet: { nominal: 4, min: 1, category: "tools", tag: "shelves" },
  evg_keycards_Red: { nominal: 2, min: 0, category: "tools", tag: "shelves" },
  evg_keycards_NWAF02: {
    nominal: 2,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier3"],
  },
  evg_keycards_Tisy02: {
    nominal: 2,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier3"],
  },
  evg_keycards_NWAF03: {
    nominal: 2,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier3", "Tier4"],
  },
  evg_keycards_Tisy03: {
    nominal: 1,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier3", "Tier4"],
  },
  evg_keycards_Tisy04: {
    nominal: 1,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier4"],
  },
  evg_keycards_Tisy05: {
    nominal: 1,
    min: 0,
    category: "tools",
    usage: "Military",
    value: ["Tier4"],
  },
};

function typeBlock(classname: string): string {
  const cfg = KEYCARD_ECONOMY[classname];
  const lines = [
    `    <type name="${classname}">`,
    `        <nominal>${cfg.nominal}</nominal>`,
    `        <lifetime>14400</lifetime>`,
    `        <restock>0</restock>`,
    `        <min>${cfg.min}</min>`,
    `        <quantmin>-1</quantmin>`,
    `        <quantmax>-1</quantmax>`,
    `        <cost>100</cost>`,
    `        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>`,
    `        <category name="${cfg.category}"/>`,
  ];
  if (cfg.usage) lines.push(`        <usage name="${cfg.usage}"/>`);
  for (const v of cfg.value ?? []) lines.push(`        <value name="${v}"/>`);
  if (!cfg.usage && cfg.tag) lines.push(`        <tag name="${cfg.tag}"/>`);
  lines.push(`    </type>`);
  return lines.join("\n");
}

export async function ensureCustomKeycardsTypesWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(`${ECONOMY_TYPES_FILE} not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);

  // Sync (not just additive) for these specific, fully-generated classnames:
  // an already-wired stub (e.g. an old nominal=0 trader-only entry from
  // before rarity-scaled loot spawns existed) gets rewritten in place to the
  // current KEYCARD_ECONOMY value every run. Safe because every byte of
  // these blocks is generated here - never hand-edited by an admin the way
  // a real economy.ts source <type> might be.
  let added = 0;
  let updated = 0;
  for (const classname of CUSTOM_KEYCARDS_ITEM_TYPES) {
    const desired = typeBlock(classname);
    const re = new RegExp(`[ \\t]*<type name="${classname}">[\\s\\S]*?<\\/type>`);
    const match = typesText.match(re);
    if (match) {
      if (match[0].trim() !== desired.trim()) {
        typesText = typesText.replace(re, desired);
        updated++;
      }
      continue;
    }
    typesText = typesText.replace("</types>", `${desired}\n</types>`);
    added++;
  }

  if (added === 0 && updated === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  if (added > 0) ok(`Wired up ${MOD_NAME} (${added} new classname(s))`);
  if (updated > 0) {
    ok(
      `Updated ${updated} ${MOD_NAME} classname(s) in ${ECONOMY_TYPES_FILE} to reflect rarity-scaled loot spawns`,
    );
  }
}

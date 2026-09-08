// @DecoyGrenades (3788373552) ships TRQ_DecoyGrenade as a real placeable
// item but (like @Optics/@TGK-WeaponPack/@Custom-Keycards) bakes no economy
// spawn data into its .pbo - it expects an admin to merge a types.xml entry
// by hand. Unlike Custom-Keycards' trader-only stubs, this one is meant to
// turn up as normal ground loot too (see loot.ts's starting-kit entry for
// the guaranteed one every player spawns with), so nominal/min are non-zero
// here - modeled on vanilla M67Grenade's own <type> block (same category/
// usage/value tags, at roughly half the density since a decoy is a rarer,
// more specialized find than a plain frag).
//
// Trader pricing (2000, template "m67grenade") lives in
// src/data/marketGapFill.json + marketGapFill.ts's TRQ_DECOY_GRENADE_PRICE_FIXES.

import { ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@DecoyGrenades";
const CLASSNAME = "TRQ_DecoyGrenade";

const TYPE_BLOCK = `    <type name="${CLASSNAME}">
        <nominal>8</nominal>
        <lifetime>14400</lifetime>
        <restock>0</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="explosives"/>
        <usage name="Military"/>
        <value name="Tier3"/>
        <value name="Tier4"/>
    </type>`;

const TYPE_NAME = /<type name="([^"]+)">/g;

export async function ensureDecoyGrenadeTypeWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(`${ECONOMY_TYPES_FILE} not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  const typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));
  if (existingTypes.has(CLASSNAME)) return;

  const result = typesText.replace("</types>", `${TYPE_BLOCK}\n</types>`);
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, result);
  ok(`Added ${CLASSNAME} to the loot economy (${ECONOMY_TYPES_FILE})`);
}

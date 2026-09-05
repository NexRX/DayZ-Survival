// Optics (@Optics, aka "BC ServerPack") adds 8 high-end scope attachments:
// BC_Accupower_Optic, BC_ACOG_ACSS_Optic, BC_EoTechVuduOptic,
// BC_HAMROptic, BC_HolosunHS507C_Optic, BC_LeupoldHoloDEvoOptic,
// BC_VortexAMG_UH1_Optic, BC_Vortex_RazorHD_Optic.
//
// The mod ships no reference types.xml, so this wires up nominal=0 stub
// entries (never naturally spawns) exactly like the trader-only guns
// already handled by marketGapFill.ts - these are meant to be earned via
// the trader's stock/restock system. Actual availability/pricing is handled
// by marketGapFillManifest.ts, routing them into the Gun Attachments -
// Military tier.

import { ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@Optics";

const CLASSNAMES = [
  "BC_Accupower_Optic",
  "BC_ACOG_ACSS_Optic",
  "BC_EoTechVuduOptic",
  "BC_HAMROptic",
  "BC_HolosunHS507C_Optic",
  "BC_LeupoldHoloDEvoOptic",
  "BC_VortexAMG_UH1_Optic",
  "BC_Vortex_RazorHD_Optic",
];

function typeBlock(classname: string): string {
  return `    <type name="${classname}">
        <nominal>0</nominal>
        <lifetime>14400</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="weapons"/>
    </type>`;
}

const TYPE_NAME = /<type name="([^"]+)">/g;

export async function ensureOpticsWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(`${ECONOMY_TYPES_FILE} not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));

  let typesChanged = false;
  for (const classname of CLASSNAMES) {
    if (existingTypes.has(classname)) continue;
    typesText = typesText.replace("</types>", `${typeBlock(classname)}\n</types>`);
    existingTypes.add(classname);
    typesChanged = true;
  }

  if (typesChanged) {
    await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
    ok(`Wired up ${MOD_NAME} (${CLASSNAMES.length} classnames)`);
  }
}

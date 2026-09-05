// Cherry-picks new-to-us clothing items out of Namalsk-Survival's own
// hardcore mission economy (server/@Namalsk-Survival/extras/hardcore/
// hardcore.namalsk/db/types.xml).
//
// That file is a *complete* alternate mission economy for the separate
// Namalsk map, so it isn't merged wholesale (risks pulling in
// Namalsk-map-only items or environmental-hazard flags) - only genuinely
// new clothing <type> blocks are lifted out, after confirming they don't
// already exist in our own db/types.xml. Of ~500 clothing types Namalsk
// ships, only the 12 below aren't already vanilla DayZ items.
//
// Namalsk ships each of these 12 with an empty `<usage />` tag, which in
// vanilla DayZ's CE schema means the item would never spawn via normal
// loot economy. That's an artifact of Namalsk's own spawn-flag
// conventions, not intentional, so each block below fills in real
// `<usage>` tags derived from that item's own (unmodified) `<tag>` hints.

import { ECONOMY_TYPES_FILE } from "./paths.ts";
import { ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const NAMALSK_MOD_NAME = "@Namalsk-Survival";

const NAMALSK_CLOTHING_TYPES: string[] = [
  `    <type name="BDUpants">
        <nominal>5</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>2</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="military"/>
        <usage name="Military"/>
    </type>`,
  `    <type name="GorkaHelmet_Black">
        <nominal>4</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="military"/>
        <tag name="police"/>
        <usage name="Military"/>
        <usage name="Police"/>
        <value name="Tier2"/>
        <value name="Tier3"/>
        <value name="Tier4"/>
    </type>`,
  `    <type name="Headtorch_Black">
        <nominal>15</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>12</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="civilian"/>
        <tag name="industrial"/>
        <tag name="military"/>
        <tag name="hunting"/>
        <usage name="Town"/>
        <usage name="Industrial"/>
        <usage name="Military"/>
        <usage name="Hunting"/>
    </type>`,
  `    <type name="Headtorch_Grey">
        <nominal>15</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>12</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="civilian"/>
        <tag name="industrial"/>
        <tag name="military"/>
        <tag name="hunting"/>
        <usage name="Town"/>
        <usage name="Industrial"/>
        <usage name="Military"/>
        <usage name="Hunting"/>
    </type>`,
  `    <type name="HipPack_Black">
        <nominal>10</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>8</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="civilian"/>
        <tag name="industrial"/>
        <tag name="hunting"/>
        <usage name="Town"/>
        <usage name="Industrial"/>
        <usage name="Hunting"/>
    </type>`,
  `    <type name="HipPack_Green">
        <nominal>10</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>8</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="civilian"/>
        <tag name="industrial"/>
        <tag name="hunting"/>
        <usage name="Town"/>
        <usage name="Industrial"/>
        <usage name="Hunting"/>
    </type>`,
  `    <type name="HipPack_Medical">
        <nominal>6</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>4</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="medical"/>
        <usage name="Medic"/>
    </type>`,
  `    <type name="HipPack_Party">
        <nominal>1</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>1</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <usage name="Town"/>
    </type>`,
  `    <type name="NVGHeadstrap">
        <nominal>7</nominal>
        <lifetime>3600</lifetime>
        <restock>1800</restock>
        <min>5</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="military"/>
        <usage name="Military"/>
    </type>`,
  `    <type name="NylonKnifeSheath">
        <nominal>15</nominal>
        <lifetime>5400</lifetime>
        <restock>0</restock>
        <min>12</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="military"/>
        <tag name="civilian"/>
        <tag name="industrial"/>
        <tag name="hunting"/>
        <usage name="Military"/>
        <usage name="Town"/>
        <usage name="Industrial"/>
        <usage name="Hunting"/>
    </type>`,
  `    <type name="OMKJacket_Navy">
        <nominal>2</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>1</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="military"/>
        <usage name="Military"/>
        <value name="Tier2"/>
        <value name="Tier3"/>
    </type>`,
  `    <type name="OMKPants_Navy">
        <nominal>3</nominal>
        <lifetime>3600</lifetime>
        <restock>0</restock>
        <min>2</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <tag name="military"/>
        <usage name="Military"/>
    </type>`,
];

const TYPE_NAME = /<type name="([^"]+)">/g;

export async function ensureNamalskClothingMerged(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === NAMALSK_MOD_NAME)) return;
  if (!(await exists(ECONOMY_TYPES_FILE))) return;

  let text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingNames = new Set([...text.matchAll(TYPE_NAME)].map((m) => m[1]));

  let added = 0;
  for (const block of NAMALSK_CLOTHING_TYPES) {
    const name = /<type name="([^"]+)">/.exec(block)?.[1] ?? "";
    if (!name || existingNames.has(name)) continue;
    existingNames.add(name);
    text = text.replace("</types>", `${block}\n</types>`);
    added++;
  }

  if (added === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, text);
  ok(`Cherry-picked ${added} new Namalsk-Survival clothing item(s) into ${ECONOMY_TYPES_FILE}`);
}

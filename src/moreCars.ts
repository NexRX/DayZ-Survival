// MoreCars (@MoreCars) ships no classname reference file or types.xml of
// its own (only a compiled .pbo) - real classnames come straight from the
// mod author's own pinned Steam Discussions thread on the mod's Workshop
// page (id 1931069341, ".XML Files / Trader / Classnames"), never guessed.
// See TODO.md for that source.
//
// Every reskin is a texture variant of a vanilla vehicle body
// (Ada 4x4 -> OffroadHatchback, Gunter2 -> Hatchback_02, Sarka 120 ->
// Sedan_02), and every door/hood/trunk spare part follows the exact same
// part-naming convention vanilla already uses for those bodies (confirmed
// by direct comparison against db/types.xml, e.g. HatchbackDoors_Driver_*,
// Hatchback_02_Door_1_1_*, Sedan_02_Door_1_1_*). So the <type> blocks below
// reuse vanilla's own templates verbatim (body: nominal 0/lifetime 3/
// restock 1800/no category; part: nominal 0/lifetime 28800/restock 0/
// category=lootdispatch/usage=Industrial) rather than guessing values.
//
// Livonia-only variants (OffroadHatchback_lvparamedic, Sedan_02_sk_policja)
// are deliberately excluded - we run Chernarus. Olga 24
// (CivilianSedan_ChernarusPolice) is excluded entirely - the author's own
// thread marks it broken/WIP (texture bug), never fixed.
//
// Like modTypes.ts/wildlifeTerritories.ts, this is an additive-only merge:
// a <type> already present (by name) is never touched or duplicated. This
// intentionally only adds nominal=0 type entries - actual in-world spawning
// needs new events.xml/cfgeventspawns.xml entries with real map
// coordinates, which is a world-placement decision tracked separately in
// TODO.md's world-crafting checklist, matching how UAZ-31514/MBM trucks
// already work (typed and tradeable, but admin/event-spawn-only until
// spawn points are chosen).

import { ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@MoreCars";

interface Variant {
  body: string;
  parts: string[];
}

function bodyBlock(name: string): string {
  return `    <type name="${name}">
        <nominal>0</nominal>
        <lifetime>3</lifetime>
        <restock>1800</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`;
}

function partBlock(name: string): string {
  return `    <type name="${name}">
        <nominal>0</nominal>
        <lifetime>28800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="lootdispatch"/>
        <usage name="Industrial"/>
    </type>`;
}

// Ada 4x4 (Lada Niva) - base OffroadHatchback. chernarusarmy/5000ca variants
// genuinely have no driver-door part listed by the author - not an omission.
const ADA_4X4: Variant[] = [
  {
    body: "OffroadHatchback_Firefighter",
    parts: [
      "HatchbackDoors_Driver_Firefighter",
      "HatchbackDoors_CoDriver_Firefighter",
      "HatchbackHood_Firefighter",
      "HatchbackTrunk_Firefighter",
    ],
  },
  {
    body: "OffroadHatchback_Cab",
    parts: [
      "HatchbackDoors_Driver_Cab",
      "HatchbackDoors_CoDriver_Cab",
      "HatchbackHood_Cab",
      "HatchbackTrunk_Cab",
    ],
  },
  {
    body: "OffroadHatchback_PoliceRus",
    parts: [
      "HatchbackDoors_Driver_PoliceRus",
      "HatchbackDoors_CoDriver_PoliceRus",
      "HatchbackHood_PoliceRus",
      "HatchbackTrunk_PoliceRus",
    ],
  },
  {
    body: "OffroadHatchback_wineblue",
    parts: [
      "HatchbackDoors_Driver_wineblue",
      "HatchbackDoors_CoDriver_wineblue",
      "HatchbackHood_wineblue",
      "HatchbackTrunk_wineblue",
    ],
  },
  {
    body: "OffroadHatchback_wineblue_rust",
    parts: [
      "HatchbackDoors_Driver_wineblue_rust",
      "HatchbackDoors_CoDriver_wineblue_rust",
      "HatchbackHood_wineblue_rust",
      "HatchbackTrunk_wineblue_rust",
    ],
  },
  {
    body: "OffroadHatchback_chernarusarmy",
    parts: [
      "HatchbackDoors_CoDriver_chernarusarmy",
      "HatchbackHood_chernarusarmy",
      "HatchbackTrunk_chernarusarmy",
    ],
  },
  {
    body: "OffroadHatchback_chernarusarmy_rust",
    parts: [
      "HatchbackDoors_CoDriver_chernarusarmy_rust",
      "HatchbackHood_chernarusarmy_rust",
      "HatchbackTrunk_chernarusarmy_rust",
    ],
  },
  {
    body: "OffroadHatchback_5000ca",
    parts: [
      "HatchbackDoors_CoDriver_5000ca",
      "HatchbackHood_5000ca",
      "HatchbackTrunk_5000ca",
    ],
  },
  {
    body: "OffroadHatchback_5000ca_rust",
    parts: [
      "HatchbackDoors_CoDriver_5000ca_rust",
      "HatchbackHood_5000ca_rust",
      "HatchbackTrunk_5000ca_rust",
    ],
  },
];

// Gunter2 (VW Golf 2) - base Hatchback_02. "cat" ships an extra spare hood
// (Hood_cat2) alongside its own matching Hood_cat - both confirmed, kept.
const GUNTER2: Variant[] = [
  {
    body: "Hatchback_02_Cab",
    parts: [
      "Hatchback_02_Door_1_1_Cab",
      "Hatchback_02_Door_2_1_Cab",
      "Hatchback_02_Door_1_2_Cab",
      "Hatchback_02_Door_2_2_Cab",
      "Hatchback_02_Hood_Cab",
      "Hatchback_02_Trunk_Cab",
    ],
  },
  {
    body: "Hatchback_02_Cab_rust",
    parts: [
      "Hatchback_02_Door_1_1_Cab_rust",
      "Hatchback_02_Door_2_1_Cab_rust",
      "Hatchback_02_Door_1_2_Cab_rust",
      "Hatchback_02_Door_2_2_Cab_rust",
      "Hatchback_02_Hood_Cab_rust",
      "Hatchback_02_Trunk_Cab_rust",
    ],
  },
  {
    body: "Hatchback_02_cat",
    parts: [
      "Hatchback_02_Door_1_1_cat",
      "Hatchback_02_Door_2_1_cat",
      "Hatchback_02_Door_1_2_cat",
      "Hatchback_02_Door_2_2_cat",
      "Hatchback_02_Hood_cat",
      "Hatchback_02_Hood_cat2",
      "Hatchback_02_Trunk_cat",
    ],
  },
  {
    body: "Hatchback_02_Pizzapresto",
    parts: [
      "Hatchback_02_Door_1_1_Pizzapresto",
      "Hatchback_02_Door_2_1_Pizzapresto",
      "Hatchback_02_Door_1_2_Pizzapresto",
      "Hatchback_02_Door_2_2_Pizzapresto",
      "Hatchback_02_Hood_Pizzapresto",
      "Hatchback_02_Trunk_Pizzapresto",
    ],
  },
  {
    body: "Hatchback_02_rustbeige",
    parts: [
      "Hatchback_02_Door_1_1_rustbeige",
      "Hatchback_02_Door_2_1_rustbeige",
      "Hatchback_02_Door_1_2_rustbeige",
      "Hatchback_02_Door_2_2_rustbeige",
      "Hatchback_02_Hood_rustbeige",
      "Hatchback_02_Trunk_rustbeige",
    ],
  },
  {
    body: "Hatchback_02_stripes1",
    parts: [
      "Hatchback_02_Door_1_1_stripes1",
      "Hatchback_02_Door_2_1_stripes1",
      "Hatchback_02_Door_1_2_stripes1",
      "Hatchback_02_Door_2_2_stripes1",
      "Hatchback_02_Hood_stripes1",
      "Hatchback_02_Trunk_stripes1",
    ],
  },
  {
    body: "Hatchback_02_stripes1_rust",
    parts: [
      "Hatchback_02_Door_1_1_stripes1_rust",
      "Hatchback_02_Door_2_1_stripes1_rust",
      "Hatchback_02_Door_1_2_stripes1_rust",
      "Hatchback_02_Door_2_2_stripes1_rust",
      "Hatchback_02_Hood_stripes1_rust",
      "Hatchback_02_Trunk_stripes1_rust",
    ],
  },
  {
    body: "Hatchback_02_mtconstruction",
    parts: [
      "Hatchback_02_Door_1_1_mtconstruction",
      "Hatchback_02_Door_2_1_mtconstruction",
      "Hatchback_02_Door_1_2_mtconstruction",
      "Hatchback_02_Door_2_2_mtconstruction",
      "Hatchback_02_Hood_mtconstruction",
      "Hatchback_02_Trunk_mtconstruction",
    ],
  },
  {
    body: "Hatchback_02_mtconstruction_rust",
    parts: [
      "Hatchback_02_Door_1_1_mtconstruction_rust",
      "Hatchback_02_Door_2_1_mtconstruction_rust",
      "Hatchback_02_Door_1_2_mtconstruction_rust",
      "Hatchback_02_Door_2_2_mtconstruction_rust",
      "Hatchback_02_Hood_mtconstruction_rust",
      "Hatchback_02_Trunk_mtconstruction_rust",
    ],
  },
  {
    body: "Hatchback_02_fat",
    parts: [
      "Hatchback_02_Door_1_1_fat",
      "Hatchback_02_Door_2_1_fat",
      "Hatchback_02_Door_1_2_fat",
      "Hatchback_02_Door_2_2_fat",
      "Hatchback_02_Hood_fat",
      "Hatchback_02_Trunk_fat",
    ],
  },
  {
    body: "Hatchback_02_fat_rust",
    parts: [
      "Hatchback_02_Door_1_1_fat_rust",
      "Hatchback_02_Door_2_1_fat_rust",
      "Hatchback_02_Door_1_2_fat_rust",
      "Hatchback_02_Door_2_2_fat_rust",
      "Hatchback_02_Hood_fat_rust",
      "Hatchback_02_Trunk_fat_rust",
    ],
  },
  {
    body: "Hatchback_02_purplesmoke",
    parts: [
      "Hatchback_02_Door_1_1_purplesmoke",
      "Hatchback_02_Door_2_1_purplesmoke",
      "Hatchback_02_Door_1_2_purplesmoke",
      "Hatchback_02_Door_2_2_purplesmoke",
      "Hatchback_02_Hood_purplesmoke",
      "Hatchback_02_Trunk_purplesmoke",
    ],
  },
  {
    body: "Hatchback_02_icegem",
    parts: [
      "Hatchback_02_Door_1_1_icegem",
      "Hatchback_02_Door_2_1_icegem",
      "Hatchback_02_Door_1_2_icegem",
      "Hatchback_02_Door_2_2_icegem",
      "Hatchback_02_Hood_icegem",
      "Hatchback_02_Trunk_icegem",
    ],
  },
  {
    body: "Hatchback_02_purplebomb",
    parts: [
      "Hatchback_02_Door_1_1_purplebomb",
      "Hatchback_02_Door_2_1_purplebomb",
      "Hatchback_02_Door_1_2_purplebomb",
      "Hatchback_02_Door_2_2_purplebomb",
      "Hatchback_02_Hood_purplebomb",
      "Hatchback_02_Trunk_purplebomb",
    ],
  },
];

// Gunter2 spare hoods sold/looted with no matching full-body variant.
const GUNTER2_SPARE_PARTS = [
  "Hatchback_02_Hood_vw",
  "Hatchback_02_Hood_cupcake",
  "Hatchback_02_Hood_crack",
  "Hatchback_02_Hood_kindchoc",
];

// Sarka 120 (Skoda 120) - base Sedan_02.
const SARKA_120: Variant[] = [
  {
    body: "Sedan_02_Medic01",
    parts: [
      "Sedan_02_Door_1_1_Medic01",
      "Sedan_02_Door_2_1_Medic01",
      "Sedan_02_Door_1_2_Medic01",
      "Sedan_02_Door_2_2_Medic01",
      "Sedan_02_Hood_Medic01",
      "Sedan_02_Trunk_Medic01",
    ],
  },
  {
    body: "Sedan_02_peacebird",
    parts: [
      "Sedan_02_Door_1_1_peacebird",
      "Sedan_02_Door_2_1_peacebird",
      "Sedan_02_Door_1_2_peacebird",
      "Sedan_02_Door_2_2_peacebird",
      "Sedan_02_Hood_peacebird",
      "Sedan_02_Trunk_peacebird",
    ],
  },
];

// Sarka 120 spare parts sold/looted with no matching full-body variant.
const SARKA_120_SPARE_PARTS = [
  "Sedan_02_Hood_chdkz",
  "Sedan_02_Door_1_2_chdkz",
  "Sedan_02_Hood_graffiti1",
  "Sedan_02_Hood_graffiti2",
  "Sedan_02_Door_1_1_graffiti1",
  "Sedan_02_Trunk_graffiti1",
  "Sedan_02_Trunk_graffiti2",
];

function allTypeBlocks(): string[] {
  const blocks: string[] = [];
  for (const family of [ADA_4X4, GUNTER2, SARKA_120]) {
    for (const variant of family) {
      blocks.push(bodyBlock(variant.body));
      for (const part of variant.parts) blocks.push(partBlock(part));
    }
  }
  for (const part of [...GUNTER2_SPARE_PARTS, ...SARKA_120_SPARE_PARTS]) {
    blocks.push(partBlock(part));
  }
  return blocks;
}

const TYPE_BLOCK = /<type name="([^"]+)">[\s\S]*?<\/type>/g;

export async function ensureMoreCarsTypesMerged(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(
      `${ECONOMY_TYPES_FILE} not found yet - it ships with the mission and ` +
        "should exist once the server has been installed",
    );
    return;
  }

  let text = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingNames = new Set([...text.matchAll(TYPE_BLOCK)].map((m) => m[1]));

  let added = 0;
  for (const block of allTypeBlocks()) {
    const name = /<type name="([^"]+)">/.exec(block)?.[1] ?? "";
    if (!name || existingNames.has(name)) continue;
    existingNames.add(name);
    text = text.replace("</types>", `${block}\n</types>`);
    added++;
  }

  if (added === 0) return;
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, text);
  ok(`Merged ${added} ${MOD_NAME} type(s) into ${ECONOMY_TYPES_FILE}`);
}

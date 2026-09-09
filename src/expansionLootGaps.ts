// A handful of real, in-game item classnames from already-installed mods
// ship with no types.xml economy entry at all, so they can never spawn as
// natural loot even though they're fully playable items (some are even
// sellable at the trader). Verified against each mod's actual .pbo config
// (not just Expansion-Market's generic price database, which lists many
// classnames regardless of whether the item is really installed - see the
// commit history / prior investigation for the full audit).
//
// Each block below is modeled on the closest vanilla/mod sibling already in
// db/types.xml (noted per item), scaled down for scarcity where the sibling
// is far more common than these should be. This runs before economy.ts's
// tuneFoodScarcity(), but that pass is a one-shot gated on a marker that's
// already been stamped on this mission's types.xml, so the food items here
// are hand-tuned to roughly the same density that pass would have produced
// rather than relying on it to catch these new entries.

import { ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

interface GapItem {
  /** Mod that must be present for this item to actually exist. */
  modName: string;
  block: string;
}

const ITEMS: GapItem[] = [
  // @DayZ-Expansion - objects_gear_consumables.pbo (Expansion_FoodBase / WaterBottle-alike)
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionMilkBottle">
        <nominal>10</nominal>
        <lifetime>14400</lifetime>
        <restock>3600</restock>
        <min>5</min>
        <quantmin>20</quantmin>
        <quantmax>70</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="food"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
    </type>`,
  },
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionBread1">
        <nominal>5</nominal>
        <lifetime>14400</lifetime>
        <restock>3600</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="food"/>
        <tag name="shelves"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
    </type>`,
  },
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionBread2">
        <nominal>5</nominal>
        <lifetime>14400</lifetime>
        <restock>3600</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="food"/>
        <tag name="shelves"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
    </type>`,
  },
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionBread3">
        <nominal>5</nominal>
        <lifetime>14400</lifetime>
        <restock>3600</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="food"/>
        <tag name="shelves"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
    </type>`,
  },
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionCheese1">
        <nominal>4</nominal>
        <lifetime>14400</lifetime>
        <restock>3600</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="food"/>
        <tag name="shelves"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
    </type>`,
  },
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionCheese2">
        <nominal>4</nominal>
        <lifetime>14400</lifetime>
        <restock>3600</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="food"/>
        <tag name="shelves"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
    </type>`,
  },
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionCheese3">
        <nominal>4</nominal>
        <lifetime>14400</lifetime>
        <restock>3600</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="food"/>
        <tag name="shelves"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
    </type>`,
  },
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionCheese4">
        <nominal>4</nominal>
        <lifetime>14400</lifetime>
        <restock>3600</restock>
        <min>3</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="food"/>
        <tag name="shelves"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
    </type>`,
  },
  // @DayZ-Expansion - data_characters_tops.pbo (TShirt_ColorBase), modeled on
  // vanilla TShirt_Red's own block.
  {
    modName: "@DayZ-Expansion",
    block: `    <type name="ExpansionTee">
        <nominal>3</nominal>
        <lifetime>900</lifetime>
        <restock>0</restock>
        <min>1</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="clothes"/>
        <usage name="Village"/>
        <value name="Tier1"/>
    </type>`,
  },
  // @DayZ-Expansion-Core - core_objects_briefcase.pbo (Container_Base).
  // Vanilla-adjacent ScientificBriefcase is trader/event-only (nominal 0),
  // but this one's a generic storage container so it gets real spawn odds
  // in office/police-flavored buildings instead.
  {
    modName: "@DayZ-Expansion-Core",
    block: `    <type name="ExpansionBriefcase">
        <nominal>4</nominal>
        <lifetime>14400</lifetime>
        <restock>0</restock>
        <min>2</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="tools"/>
        <usage name="Office"/>
        <usage name="Police"/>
        <value name="Tier2"/>
        <value name="Tier3"/>
    </type>`,
  },
  // @DayZ-Expansion-Vehicles - vehicles_objects_gear.pbo. Direct copy of
  // vanilla CarBattery's own block (same weight class of vehicle part).
  {
    modName: "@DayZ-Expansion-Vehicles",
    block: `    <type name="ExpansionHelicopterBattery">
        <nominal>60</nominal>
        <lifetime>28800</lifetime>
        <restock>360</restock>
        <min>40</min>
        <quantmin>20</quantmin>
        <quantmax>100</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="tools"/>
        <usage name="Industrial"/>
    </type>`,
  },
  // @Namalsk-Survival ships this exact classname in its own reference
  // types_dzn.xml with nominal/min at 0 (server admins are expected to
  // raise it themselves to enable spawning) - category/tag broadened here
  // to real usage/value tags instead of that file's bare, nameless
  // <usage/>/<value/> placeholders.
  {
    modName: "@Namalsk-Survival",
    block: `    <type name="dzn_tool_watch">
        <nominal>3</nominal>
        <min>2</min>
        <lifetime>300</lifetime>
        <restock>0</restock>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
        <category name="tools"/>
        <usage name="Military"/>
        <usage name="Police"/>
        <usage name="Hunting"/>
        <usage name="Town"/>
        <usage name="Village"/>
        <value name="Tier1"/>
        <value name="Tier2"/>
        <tag name="civilian"/>
        <tag name="hunting"/>
        <tag name="police"/>
        <tag name="military"/>
    </type>`,
  },
];

const TYPE_NAME = /<type name="([^"]+)">/g;
const SINGLE_TYPE_NAME = /<type name="([^"]+)">/;

export async function ensureExpansionLootGapsWired(mods: Mod[]): Promise<void> {
  const installedModNames = new Set(mods.map((m) => m.name));

  if (!(await exists(ECONOMY_TYPES_FILE))) {
    log(`${ECONOMY_TYPES_FILE} not found yet - skipping expansion loot gap fill`);
    return;
  }

  const typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));

  const toAdd = ITEMS.filter((item) => {
    if (!installedModNames.has(item.modName)) return false;
    const name = item.block.match(SINGLE_TYPE_NAME)?.[1];
    return name !== undefined && !existingTypes.has(name);
  });
  if (toAdd.length === 0) return;

  const blocks = toAdd.map((item) => item.block).join("\n");
  const result = typesText.replace("</types>", `${blocks}\n</types>`);
  await Deno.writeTextFile(ECONOMY_TYPES_FILE, result);
  ok(`Added ${toAdd.length} missing item(s) to the loot economy (${ECONOMY_TYPES_FILE})`);
}

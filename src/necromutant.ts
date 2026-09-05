// Necromutant (@Necromutant) adds a rare readable book ("Book darkness")
// that, once read, triggers a boss-style event: the mod's own script spawns
// a wave of zombies followed by the JVDS_Necromutant mutant, then drops a
// JVDS_cross_gravestone reward on its death (see profiles/Necromutant/
// Config.json for wave size/loot table - shipped defaults left untouched).
//
// Real classnames confirmed via strings on the mod's own pbo:
//   - JVDS_Book_darkness : ItemBase - the trigger book, a real lootable item
//   - JVDS_Necromutant : JVDS_mutants_base - `CreateObject()`'d directly by
//     the mod's own script, never placed by a CE event
//   - JVDS_cross_gravestone : ItemBase - the reward, also `CreateObject()`'d
//     directly
//
// Only the book needs an economy entry: the mutant and its reward are
// entirely script-controlled and would never be touched by the CE even if
// registered.
//
// An earlier version of this file also added a `position=player` <event> to
// spawn the book near a random player. That doesn't work: DayZ's
// DynamicEvent engine can only resolve a spawner "kind" from a real
// CfgVehicles creature inheritance chain, and JVDS_Book_darkness is a plain
// ItemBase, so the event silently fails at CE load
// (`[CE][DE] DynamicEvent "NecromutantBook" setup is invalid`). Fixed by
// dropping the event and letting the book spawn through the ordinary
// nominal-based CE loot economy instead (its `<type>` block just needed
// `<usage>` tags added).

import { ECONOMY_EVENTS_FILE, ECONOMY_TYPES_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const MOD_NAME = "@Necromutant";
// Only kept around to clean up a stale broken event from earlier deploys -
// see the header comment above. No longer written.
const STALE_EVENT_NAME = "NecromutantBook";
const CLASSNAME = "JVDS_Book_darkness";

function typeBlock(): string {
  return `    <type name="${CLASSNAME}">
        <nominal>2</nominal>
        <lifetime>10800</lifetime>
        <restock>0</restock>
        <min>1</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="1" count_in_hoarder="0" count_in_map="1" count_in_player="1" crafted="0" deloot="0"/>
        <category name="tools"/>
        <usage name="Historical"/>
        <usage name="Village"/>
    </type>`;
}

const TYPE_BLOCK_RE = (name: string) => new RegExp(`    <type name="${name}">[\\s\\S]*?</type>`);
const TYPE_NAME = /<type name="([^"]+)">/g;
const EVENT_BLOCK_RE = (name: string) =>
  new RegExp(`    <event name="${name}">[\\s\\S]*?</event>\\n?`);

export async function ensureNecromutantWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  if (!(await exists(ECONOMY_TYPES_FILE)) || !(await exists(ECONOMY_EVENTS_FILE))) {
    log(`${ECONOMY_TYPES_FILE}/${ECONOMY_EVENTS_FILE} not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));

  let typesChanged = false;
  let eventsChanged = false;

  if (!existingTypes.has(CLASSNAME)) {
    typesText = typesText.replace("</types>", `${typeBlock()}\n</types>`);
    typesChanged = true;
  } else {
    // One-time repair: an earlier deploy may have written this type without
    // <usage> tags (it would never actually spawn as a result). Replace it
    // in place if it's missing them.
    const existingBlockMatch = TYPE_BLOCK_RE(CLASSNAME).exec(typesText);
    if (existingBlockMatch && !existingBlockMatch[0].includes("<usage")) {
      typesText = typesText.replace(existingBlockMatch[0], typeBlock());
      typesChanged = true;
    }
  }

  // One-time cleanup: remove the broken position=player event from an
  // earlier deploy, if present - see this file's header comment for why it
  // never worked (a plain ItemBase can't be a DynamicEvent spawner target).
  if (eventsText.includes(`<event name="${STALE_EVENT_NAME}">`)) {
    eventsText = eventsText.replace(EVENT_BLOCK_RE(STALE_EVENT_NAME), "");
    eventsChanged = true;
  }

  if (typesChanged) await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  if (eventsChanged) await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  if (typesChanged || eventsChanged) {
    ok(`Wired up ${MOD_NAME} (${CLASSNAME}, ordinary loot spawn - no event)`);
  }
}

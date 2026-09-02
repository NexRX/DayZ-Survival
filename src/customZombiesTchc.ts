// Custom Zombies - The Astronaut, The Butcher & The Zombie Bear
// (@Custom-Zombies, author OldGuyFrags, id 3557687387) adds 3 custom
// creature models. Real classnames + base classes confirmed via `strings`
// on the mod's own server/@Custom-Zombies/addons/tchczombies.pbo (no
// shipped types.xml, so everything below is authored from scratch, same
// treatment as necromutant.ts/bmmChemicalZombie.ts):
//   - TCHCAI_TheAstronaut_Zombie_1 : TCHCAI1_CitizenASkinny_Base -> ZombieMaleBase -> ZombieBase
//   - TCHCAI_TheAstronaut_Zombie_2 : same chain as _1 (a second skin variant)
//   - TCHC_TheButcher_Zombie       : TCHCAI_CitizenASkinny_Base -> ZombieMaleBase -> ZombieBase
//   - TCHC_ZombieBear              : Animal_UrsusArctos -> AnimalBase (an ANIMAL, not Infected)
//
// The two Astronaut variants + the Butcher are folded into one dedicated
// ambient event (ammunition Infected-style, ~same shape as
// bmmChemicalZombie.ts's own InfectedBMMChemical event) rather than the
// real vanilla InfectedCity/InfectedVillage events, so this project's
// existing zombie balance is never touched and this stays independently
// tunable.
//
// --- Bug found and fixed (twice) getting the Zombie Bear working ---
// Round 1: an earlier version gave a bear event named plain
// "TCHCZombieBear" the same `position=player` DynamicEvent shape as the
// zombie event above. Confirmed live via `deno task verify-serverpack`'s
// RPT log that this doesn't work: `[DynEvent] "TCHCZombieBear" will be
// ignored :: failed to determine spawner type!`. Switching only `position`
// from `player` to `fixed` reproduced the exact same error, which ruled out
// "Animal-kind creatures can't use position=player" and pointed at the real
// cause: DayZ's DynamicEvent engine resolves which internal spawner handler
// to use purely from the event NAME's prefix (confirmed exhaustively: every
// single one of the ~65 other event names in db/events.xml starts with one
// of exactly 8 prefixes - Animal/Infected/Ambient/Static/Vehicle/Item/Loot/
// Trajectory - with zero exceptions). Renaming to `AnimalTCHCZombieBear`
// (plus switching to a `position=fixed` "territory" - see below, required
// separately for any Animal-kind creature) got past that error.
//
// Round 2: with the naming fixed, a NEW error appeared instead:
// `[CE][AnimalRespawner] :: !!! Missing AI Template "HerdTCHCZombieBear" for
// DE: "AnimalTCHCZombieBear"`. Animal-kind "Herd" territories need a
// matching AI behavior template (named "Herd" + the territory's own bare
// name, e.g. vanilla's "Bear" territory pairs with a "HerdBear" template)
// that isn't defined anywhere in the mission's own files - it must be baked
// into the base game's core data, with no documented way to register a
// brand new one from mission-level XML alone. Rather than fighting
// undocumented core-engine plumbing further, this instead REACTIVATES
// vanilla Chernarus' own dormant "Bear"/"AnimalBear" territory+event pair
// (already confirmed, via this same RPT, to load with zero errors - its
// "HerdBear" template genuinely exists) by patching it in place:
//   - `env/bear_territories.xml` is real, already-shipped bear habitat data
//     (forest/wilderness zones), already registered and referenced by the
//     "Bear" territory in cfgenvironment.xml - but that territory ships
//     with NO <agent>/<spawn> block at all, so it's 100% inert out of the
//     box (confirmed: no cfgeventspawns.xml stub for "Bear" either, and the
//     paired "AnimalBear" event ships with `nominal=0` and no way to ever
//     actually place one). Since nothing has ever spawned from this pair,
//     patching it is not "touching a real population budget" the way this
//     project normally avoids - there's no existing behavior to disrupt.
//   - This adds the missing `<agent><spawn configName="TCHC_ZombieBear">`
//     to the "Bear" territory, and adds `TCHC_ZombieBear` as an additional
//     `<child>` of the "AnimalBear" event (alongside the untouched, still
//     unused `Animal_UrsusArctos` child), bumping `nominal` 0->1 so it can
//     actually be placed - capped at 1 total, a rare "boss" encounter, not
//     a routine spawn. `min`/`max` are left at vanilla's own 2/2 (a fixed
//     ceiling the engine enforces per-territory regardless, so with
//     zoneCountMax staying implicit/default this doesn't meaningfully raise
//     how many can ever exist beyond what `nominal` actually drives).
//   - No new cfgeventspawns.xml stub or new territory name needed - reusing
//     vanilla's existing, already-correctly-wired pair sidesteps the
//     missing-template problem entirely instead of solving it.
//
// Known live bug reports on the mod's own Comments tab, unconfirmed either
// way as of this wiring (see TESTS.md): "the astronauts are invincible"
// and "Client has pbo that is not part of the server". Added anyway per
// the project owner's own request to playtest live.

import {
  ECONOMY_EVENTS_FILE,
  ECONOMY_TYPES_FILE,
  MISSION_DIR,
  MISSION_EVENT_SPAWNS_FILE,
} from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

const CFG_ENVIRONMENT_FILE = `${MISSION_DIR}/cfgenvironment.xml`;

const MOD_NAME = "@Custom-Zombies";

const ZOMBIE_EVENT_NAME = "InfectedTCHCCustom";
const ZOMBIE_CLASSNAMES = [
  "TCHCAI_TheAstronaut_Zombie_1",
  "TCHCAI_TheAstronaut_Zombie_2",
  "TCHC_TheButcher_Zombie",
];

// Vanilla's own dormant names, reused rather than inventing new ones - see
// this file's header comment ("Round 2").
const BEAR_TERRITORY_NAME = "Bear";
const BEAR_EVENT_NAME = "AnimalBear";
const BEAR_CLASSNAME = "TCHC_ZombieBear";

// Stale names from the two earlier broken attempts - cleaned up below, see
// this file's header comment.
const STALE_BEAR_NAMES = ["TCHCZombieBear", "AnimalTCHCZombieBear"];

// Matches vanilla's own Animal_UrsusArctos/ZmbM_SoldierNormal <type> shape
// (db/types.xml) - no <category> tag, nominal=0 since population is
// entirely event-driven below.
function typeBlock(classname: string): string {
  return `    <type name="${classname}">
        <nominal>0</nominal>
        <lifetime>1800</lifetime>
        <restock>0</restock>
        <min>0</min>
        <quantmin>-1</quantmin>
        <quantmax>-1</quantmax>
        <cost>100</cost>
        <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>
    </type>`;
}

// Same event shape as bmmChemicalZombie.ts's own InfectedBMMChemical
// (ambient, rare, position=player) - the closest existing precedent in
// this project for "a hostile custom creature that should feel like an
// occasional surprise, not a population to grind". Valid here because all
// 3 children are real ZombieBase-derived Infected, unlike the bear below.
function zombieEventBlock(): string {
  const children = ZOMBIE_CLASSNAMES.map((c) =>
    `            <child lootmax="1" lootmin="0" max="1" min="0" type="${c}"/>`
  ).join("\n");
  return `    <event name="${ZOMBIE_EVENT_NAME}">
        <nominal>2</nominal>
        <min>1</min>
        <max>3</max>
        <lifetime>3</lifetime>
        <restock>0</restock>
        <saferadius>100</saferadius>
        <distanceradius>50</distanceradius>
        <cleanupradius>100</cleanupradius>
        <flags deletable="0" init_random="0" remove_damaged="1"/>
        <position>player</position>
        <limit>custom</limit>
        <active>1</active>
        <children>
${children}
        </children>
    </event>`;
}

const TYPE_NAME = /<type name="([^"]+)">/g;
const EVENT_NAME_RE = /<event name="([^"]+)"/g;
const EVENT_BLOCK_RE = (name: string) =>
  new RegExp(`    <event name="${name}">[\\s\\S]*?</event>\\n?`);
const TERRITORY_BLOCK_RE = (name: string) =>
  new RegExp(`\\t\\t<territory[^>]*\\sname="${name}"[\\s\\S]*?</territory>\\n?`);

export async function ensureCustomZombiesTchcWired(mods: Mod[]): Promise<void> {
  if (!mods.some((m) => m.name === MOD_NAME)) return;

  const haveMissionFiles = await Promise.all([
    exists(ECONOMY_TYPES_FILE),
    exists(ECONOMY_EVENTS_FILE),
    exists(CFG_ENVIRONMENT_FILE),
    exists(MISSION_EVENT_SPAWNS_FILE),
  ]);
  if (haveMissionFiles.some((v) => !v)) {
    log(`Mission types/events/env/eventspawns files not found yet - skipping ${MOD_NAME} setup`);
    return;
  }

  let typesText = await Deno.readTextFile(ECONOMY_TYPES_FILE);
  let eventsText = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let envText = await Deno.readTextFile(CFG_ENVIRONMENT_FILE);
  let eventSpawnsText = await Deno.readTextFile(MISSION_EVENT_SPAWNS_FILE);

  const existingTypes = new Set([...typesText.matchAll(TYPE_NAME)].map((m) => m[1]));
  const existingEvents = new Set([...eventsText.matchAll(EVENT_NAME_RE)].map((m) => m[1]));
  const existingEventSpawns = new Set(
    [...eventSpawnsText.matchAll(EVENT_NAME_RE)].map((m) => m[1]),
  );

  let typesChanged = false;
  let eventsChanged = false;
  let envChanged = false;
  let eventSpawnsChanged = false;

  for (const classname of [...ZOMBIE_CLASSNAMES, BEAR_CLASSNAME]) {
    if (existingTypes.has(classname)) continue;
    typesText = typesText.replace("</types>", `${typeBlock(classname)}\n</types>`);
    existingTypes.add(classname);
    typesChanged = true;
  }

  if (!existingEvents.has(ZOMBIE_EVENT_NAME)) {
    eventsText = eventsText.replace("</events>", `${zombieEventBlock()}\n</events>`);
    existingEvents.add(ZOMBIE_EVENT_NAME);
    eventsChanged = true;
  }

  // One-time cleanup: remove every artifact from the two earlier broken
  // attempts (see this file's header comment) - both used names that never
  // actually worked, so nothing should legitimately exist under them.
  for (const staleName of STALE_BEAR_NAMES) {
    if (eventsText.includes(`<event name="${staleName}">`)) {
      const match = EVENT_BLOCK_RE(staleName).exec(eventsText);
      if (match) {
        eventsText = eventsText.replace(match[0], "");
        eventsChanged = true;
      }
    }
    if (envText.includes(`name="${staleName}"`)) {
      const match = TERRITORY_BLOCK_RE(staleName).exec(envText);
      if (match) {
        envText = envText.replace(match[0], "");
        envChanged = true;
      }
    }
    if (existingEventSpawns.has(staleName)) {
      eventSpawnsText = eventSpawnsText.replace(`    <event name="${staleName}" />\n`, "");
      existingEventSpawns.delete(staleName);
      eventSpawnsChanged = true;
    }
  }

  // Reactivate vanilla's own dormant "Bear" territory - add the missing
  // <agent>/<spawn> block if it's not there yet (idempotent: if a future
  // change ever adds one first, this leaves it alone).
  const territoryMatch = TERRITORY_BLOCK_RE(BEAR_TERRITORY_NAME).exec(envText);
  if (territoryMatch && !territoryMatch[0].includes(BEAR_CLASSNAME)) {
    const withAgent = territoryMatch[0].replace(
      "</territory>",
      `\t\t\t<agent type="Male" chance="1">\n\t\t\t\t<spawn configName="${BEAR_CLASSNAME}" chance="1" />\n\t\t\t</agent>\n\n\t\t\t<item name="globalCountMax" val="1" />\n\t\t\t<item name="zoneCountMin" val="1" />\n\t\t\t<item name="zoneCountMax" val="1" />\n\t\t\t<item name="playerSpawnRadiusNear" val="100" />\n\t\t\t<item name="playerSpawnRadiusFar" val="300" />\n\t\t</territory>`,
    );
    envText = envText.replace(territoryMatch[0], withAgent);
    envChanged = true;
  }

  // Reactivate vanilla's own dormant "AnimalBear" event - add TCHC_ZombieBear
  // as an additional child (leaving the existing, still-unused
  // Animal_UrsusArctos child untouched) and bump nominal 0->1 so it can
  // actually be placed.
  const eventMatch = EVENT_BLOCK_RE(BEAR_EVENT_NAME).exec(eventsText);
  if (eventMatch && !eventMatch[0].includes(BEAR_CLASSNAME)) {
    const withChild = eventMatch[0]
      .replace("<nominal>0</nominal>", "<nominal>1</nominal>")
      .replace(
        "</children>",
        `            <child lootmax="0" lootmin="0" max="1" min="0" type="${BEAR_CLASSNAME}"/>\n        </children>`,
      );
    eventsText = eventsText.replace(eventMatch[0], withChild);
    eventsChanged = true;
  }

  if (typesChanged) await Deno.writeTextFile(ECONOMY_TYPES_FILE, typesText);
  if (eventsChanged) await Deno.writeTextFile(ECONOMY_EVENTS_FILE, eventsText);
  if (envChanged) await Deno.writeTextFile(CFG_ENVIRONMENT_FILE, envText);
  if (eventSpawnsChanged) await Deno.writeTextFile(MISSION_EVENT_SPAWNS_FILE, eventSpawnsText);

  if (typesChanged || eventsChanged || envChanged || eventSpawnsChanged) {
    ok(
      `Wired up ${MOD_NAME} (${ZOMBIE_CLASSNAMES.length} zombie variant(s), ` +
        `1 zombie bear via vanilla's own "${BEAR_TERRITORY_NAME}"/"${BEAR_EVENT_NAME}" pair, event "${ZOMBIE_EVENT_NAME}")`,
    );
  }
}

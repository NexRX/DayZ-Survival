// Wires UAZ-31514, the MBM trucks, and MoreCars' body variants into the
// actual live world - until now they were typed (nominal=0, admin/trader-
// spawnable) but never placed anywhere (see TODO.md's old item 1).
//
// Rather than hand-picking ~165 brand new Chernarus coordinates blind (the
// original reason this was deferred - none of these mods ship a ready-made
// spawn-position example to copy, unlike AI-Bandits/DayZ-Dog/etc.), this
// adds each new vehicle as an extra <child> of the closest matching
// *existing* vanilla vehicle event in db/events.xml, reusing that event's
// own already-shipped, already-safe, already-on-road <pos> list in
// cfgeventspawns.xml untouched. This mirrors how vanilla itself already
// lists multiple colour variants under one event (e.g. Hatchback_02/
// Hatchback_02_Black/Hatchback_02_Blue all under VehicleHatchback02), and
// the "closest counterpart" mapping itself is not a new guess - it's the
// same one fuelSystem.ts already uses (UAZ-31514 -> OffroadHatchback, MBM
// trucks -> Truck_01_Base, each MoreCars reskin -> whichever vanilla body
// it's a texture variant of).
//
// No cfgeventspawns.xml changes needed at all. db/events.xml gains new
// <child> lines plus a modest one-time bump to that event's own
// nominal/min/max (sized to the number of new variants added, via the
// nominalPerVariant/minPerVariant/maxPerVariant fields below) so the added
// variety doesn't just cannibalize the existing vanilla population's spawn
// budget - kept deliberately small per this project's hardcore-scarcity
// design (see economy.ts), not a 1:1 population increase per new variant.
//
// Additive merge only, same rule as modTypes.ts/moreCars.ts: a
// <child type="..."/> already present is never touched or duplicated. Each
// event gets its own marker (not one file-wide marker like economy.ts uses)
// so adding one of these vehicle mods later, without the others, still
// gets wired up correctly on a later start.
//
// MoreCars' spare parts (doors/hoods/trunks) are deliberately excluded here
// - they're loot items, not full vehicles, and already spawn via their own
// category="lootdispatch"/usage="Industrial" typing (see moreCars.ts).

import { ECONOMY_EVENTS_FILE } from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";
import type { Mod } from "./mods.ts";

interface EventSource {
  modName: string;
  classnames: string[];
}

interface EventSpec {
  event: string;
  sources: EventSource[];
  // Fraction of one <nominal>/<min>/<max> unit added per new variant, chosen
  // so that (variantCount * fraction) rounds to the intended total bump when
  // every source mod for this event is installed - see the comment above
  // each spec for the resulting before/after numbers.
  nominalPerVariant: number;
  minPerVariant: number;
  maxPerVariant: number;
}

const UAZ_31514 = [
  "UAZ_31514",
  "UAZ_31514_blue",
  "UAZ_31514_yellow",
  "UAZ_31514_tdc",
  "UAZ_31514_cargo2",
  "UAZ_31514_cargo2_blue",
  "UAZ_31514_cargo2_yellow",
  "UAZ_31514_cargo2_tdc",
  "UAZ_31514_hunter",
  "UAZ_31514_hunter_camos",
  "UAZ_31514_hunter_camow",
];

const MBM_APOCALYPSE_TRUCK = ["MBM_Apocalypse_Truck"];

const MBM_APOCALYPTIC_PAZ = [
  "MBM_ApocalypticPAZ_White",
  "MBM_ApocalypticPAZ_Black",
  "MBM_ApocalypticPAZ_Blue",
  "MBM_ApocalypticPAZ_Green",
  "MBM_ApocalypticPAZ_Yellow",
  "MBM_ApocalypticPAZ_Camo",
];

// MoreCars body variants, grouped by which vanilla body they reskin -
// matching moreCars.ts's own ADA_4X4/GUNTER2/SARKA_120 grouping exactly.
const MORECARS_ADA_4X4 = [
  "OffroadHatchback_Firefighter",
  "OffroadHatchback_Cab",
  "OffroadHatchback_PoliceRus",
  "OffroadHatchback_wineblue",
  "OffroadHatchback_wineblue_rust",
  "OffroadHatchback_chernarusarmy",
  "OffroadHatchback_chernarusarmy_rust",
  "OffroadHatchback_5000ca",
  "OffroadHatchback_5000ca_rust",
];

const MORECARS_GUNTER2 = [
  "Hatchback_02_Cab",
  "Hatchback_02_Cab_rust",
  "Hatchback_02_cat",
  "Hatchback_02_Pizzapresto",
  "Hatchback_02_rustbeige",
  "Hatchback_02_stripes1",
  "Hatchback_02_stripes1_rust",
  "Hatchback_02_mtconstruction",
  "Hatchback_02_mtconstruction_rust",
  "Hatchback_02_fat",
  "Hatchback_02_fat_rust",
  "Hatchback_02_purplesmoke",
  "Hatchback_02_icegem",
  "Hatchback_02_purplebomb",
];

const MORECARS_SARKA_120 = ["Sedan_02_Medic01", "Sedan_02_peacebird"];

// TP-Apoc-SUV/Pickup - confirmed closest counterpart is Offroad_02 (see
// modTypes.ts's comment: TP-Apoc-M1025's own shipped trader JSON lists
// "Offroad_02_Wheel" as its spare wheel part). TP-Apoc-M1025 (armed
// Humvee) is deliberately EXCLUDED from world spawn - it's priced as a
// Legendary-tier trader item (src/data/marketGapFill.json) specifically so
// it stays hard to get; spawning it for free in the wild on a civilian
// vanilla event would undercut that scarcity by design, and there's no
// close *military* vanilla vehicle event to attach it to instead.
const TP_APOC_SUV = [
  "TP_Apoc_Suv",
  "TP_Apoc_Black_Suv",
  "TP_Apoc_Blue_Suv",
  "TP_Apoc_Camo_Suv",
  "TP_Apoc_Green_Suv",
  "TP_Apoc_Grey_Suv",
  "TP_Apoc_Red_Suv",
  "TP_Apoc_Yellow_Suv",
  "TP_Apoc_Suv_Auto",
  "TP_Apoc_Suv_Black_Auto",
  "TP_Apoc_Suv_Blue_Auto",
  "TP_Apoc_Suv_Camo_Auto",
  "TP_Apoc_Suv_Green_Auto",
  "TP_Apoc_Suv_Grey_Auto",
  "TP_Apoc_Suv_Red_Auto",
  "TP_Apoc_Suv_Yellow_Auto",
];

const TP_APOC_PICKUP = [
  "TP_ApocPickup_Truck",
  "TP_ApocPickup_Truck_Black",
  "TP_ApocPickup_Truck_Red",
  "TP_ApocPickup_Truck_Blue",
  "TP_ApocPickup_Truck_Yellow",
  "TP_ApocPickup_Truck_Green",
  "TP_ApocPickup_Truck_Camo",
  "TP_ApocPickup_Truck_BlackCamo",
  "TP_ApocPickup_Truck_Bloody",
  "TP_ApocPickup_Truck_Auto",
  "TP_ApocPickup_Truck_Black_Auto",
  "TP_ApocPickup_Truck_Red_Auto",
  "TP_ApocPickup_Truck_Blue_Auto",
  "TP_ApocPickup_Truck_Yellow_Auto",
  "TP_ApocPickup_Truck_Green_Auto",
  "TP_ApocPickup_Truck_Camo_Auto",
  "TP_ApocPickup_Truck_BlackCamo_Auto",
  "TP_ApocPickup_Truck_Bloody_Auto",
];

const EVENT_SPECS: EventSpec[] = [
  // 9 Ada 4x4 (MoreCars) + 11 UAZ-31514 = 20 new variants.
  // nominal 8->14, min 5->7, max 11->16.
  {
    event: "VehicleOffroadHatchback",
    sources: [
      { modName: "@UAZ-31514", classnames: UAZ_31514 },
      { modName: "@MoreCars", classnames: MORECARS_ADA_4X4 },
    ],
    nominalPerVariant: 6 / 20,
    minPerVariant: 2 / 20,
    maxPerVariant: 5 / 20,
  },
  // 14 Gunter2 (MoreCars) variants. nominal 8->14, min 5->6, max 11->15.
  {
    event: "VehicleHatchback02",
    sources: [{ modName: "@MoreCars", classnames: MORECARS_GUNTER2 }],
    nominalPerVariant: 6 / 14,
    minPerVariant: 1 / 14,
    maxPerVariant: 4 / 14,
  },
  // 2 Sarka 120 (MoreCars) variants. nominal 8->9, min unchanged, max 11->12.
  {
    event: "VehicleSedan02",
    sources: [{ modName: "@MoreCars", classnames: MORECARS_SARKA_120 }],
    nominalPerVariant: 1 / 2,
    minPerVariant: 0,
    maxPerVariant: 1 / 2,
  },
  // 1 MBM-ApocalypseTruck + 6 MBM-ApocalypticPAZ = 7 new variants.
  // nominal 8->12, min 5->6, max 11->14.
  {
    event: "VehicleTruck01",
    sources: [
      { modName: "@MBM-ApocalypseTruck", classnames: MBM_APOCALYPSE_TRUCK },
      { modName: "@MBM-ApocalypticPAZ", classnames: MBM_APOCALYPTIC_PAZ },
    ],
    nominalPerVariant: 4 / 7,
    minPerVariant: 1 / 7,
    maxPerVariant: 3 / 7,
  },
  // 16 TP-Apoc-SUV + 18 TP-Apoc-Pickup = 34 new variants. Offroad_02 is
  // already one of the rarest vanilla vehicle events (nominal 3/min 2/max
  // 3) - kept the bump modest on purpose (hardcore-scarcity design, see
  // economy.ts) rather than scaling 1:1 with variant count.
  // nominal 3->6, min 2->3, max 3->5.
  {
    event: "VehicleOffroad02",
    sources: [
      { modName: "@TP-Apoc-SUV", classnames: TP_APOC_SUV },
      { modName: "@TP-Apoc-Pickup", classnames: TP_APOC_PICKUP },
    ],
    nominalPerVariant: 3 / 34,
    minPerVariant: 1 / 34,
    maxPerVariant: 2 / 34,
  },
];

function markerFor(event: string): string {
  return `<!-- dayz-survival:vehicle-event-${event}-tuned -->`;
}

export async function ensureCustomVehicleSpawns(mods: Mod[]): Promise<void> {
  if (!(await exists(ECONOMY_EVENTS_FILE))) {
    log(
      `${ECONOMY_EVENTS_FILE} not found yet - it ships with the mission and ` +
        "should exist once the server has been installed",
    );
    return;
  }

  const modNames = new Set(mods.map((m) => m.name));
  let text = await Deno.readTextFile(ECONOMY_EVENTS_FILE);
  let changed = false;

  for (const spec of EVENT_SPECS) {
    const marker = markerFor(spec.event);
    if (text.includes(marker)) continue; // already wired, and not reset by a Steam update

    const classnames = spec.sources
      .filter((s) => modNames.has(s.modName))
      .flatMap((s) => s.classnames);
    if (classnames.length === 0) continue; // none of this event's mods are installed

    const eventRegex = new RegExp(`<event name="${spec.event}">([\\s\\S]*?)<\\/event>`);
    const match = eventRegex.exec(text);
    if (!match) {
      log(`${ECONOMY_EVENTS_FILE} has no "${spec.event}" event to extend - skipping`);
      continue;
    }
    let body = match[1];

    const existingChildren = new Set(
      [...body.matchAll(/<child[^>]*type="([^"]+)"/g)].map((m) => m[1]),
    );
    const newClassnames = classnames.filter((c) => !existingChildren.has(c));
    if (newClassnames.length === 0) continue;

    const nominal = Number(body.match(/<nominal>(\d+)<\/nominal>/)?.[1] ?? 0);
    const min = Number(body.match(/<min>(\d+)<\/min>/)?.[1] ?? 0);
    const max = Number(body.match(/<max>(\d+)<\/max>/)?.[1] ?? 0);

    const newNominal = nominal + Math.round(newClassnames.length * spec.nominalPerVariant);
    const newMin = min + Math.round(newClassnames.length * spec.minPerVariant);
    const newMax = max + Math.round(newClassnames.length * spec.maxPerVariant);

    const childLines = newClassnames
      .map((c) => `            <child lootmax="0" lootmin="0" max="1" min="0" type="${c}"/>`)
      .join("\n");
    body = body.replace(/\s*<\/children>/, `\n${childLines}\n        </children>`);
    body = body.replace(/<nominal>\d+<\/nominal>/, `<nominal>${newNominal}</nominal>`);
    body = body.replace(/<min>\d+<\/min>/, `<min>${newMin}</min>`);
    body = body.replace(/<max>\d+<\/max>/, `<max>${newMax}</max>`);

    text = text.replace(eventRegex, `<event name="${spec.event}">${body}</event>`);
    text = text.replace("?>", `?>\n${marker}`);
    changed = true;

    ok(
      `Added ${newClassnames.length} vehicle variant(s) to "${spec.event}" in ` +
        `${ECONOMY_EVENTS_FILE} (nominal ${nominal}->${newNominal}, min ${min}->${newMin}, ` +
        `max ${max}->${newMax})`,
    );
  }

  if (!changed) return;
  await Deno.writeTextFile(ECONOMY_EVENTS_FILE, text);
}

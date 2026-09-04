// Tones down mission/airdrop loot rewards so a single crate isn't a full
// arsenal, and trims an overly generous demo starting loadout so your first
// gun still has to be found, not picked from a menu.
//
// Unlike ai.ts/spatial.ts/dynamicMissions.ts (which only ever *add* curated
// entries and never touch an admin's existing tuning), this module
// deliberately *overwrites*/removes a handful of reward fields/entries every
// time it runs. The defaults shipped by these mods hand out far more loot
// per reward than we want (e.g. 50 items drawn per DayZ-Expansion-AI airdrop
// crate). This is an explicit, opinionated override — not an additive merge
// — so edit the constants below (and re-run `deno task up`/`start`) if you
// want different numbers, rather than hand-editing the generated JSON/XML,
// since these values get re-applied on every start.

import {
  AIRDROP_SETTINGS,
  DYNAMIC_MISSIONS_SETTINGS,
  TERJE_LOADOUTS,
  TERJE_RESPAWNS,
  TERJE_START_SCREEN_CFG,
} from "./paths.ts";
import { log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

// DayZ-Expansion-AI airdrop missions: max items drawn into each crate.
const AIRDROP_ITEM_COUNT = 2;

// @Dynamic-AI-Missions: max items rolled into a mission's reward container.
const MISSION_WEAPONS_MAX = 1;
const MISSION_ARMOUR_MAX = 1;
const MISSION_MISC_MAX = 2;

interface AirdropContainer {
  ItemCount?: number;
  [key: string]: unknown;
}

interface AirdropSettings {
  ItemCount?: number;
  Containers?: AirdropContainer[];
  [key: string]: unknown;
}

export async function tuneAirdropLoot(): Promise<void> {
  if (!(await exists(AIRDROP_SETTINGS))) {
    log(
      "AirdropSettings.json not generated yet — DayZ-Expansion-AI will create it " +
        "(with its own defaults) on first server start",
    );
    return;
  }

  const settings: AirdropSettings = JSON.parse(
    await Deno.readTextFile(AIRDROP_SETTINGS),
  );

  let changed = false;
  if (settings.ItemCount !== AIRDROP_ITEM_COUNT) {
    settings.ItemCount = AIRDROP_ITEM_COUNT;
    changed = true;
  }
  for (const container of settings.Containers ?? []) {
    if (container.ItemCount !== AIRDROP_ITEM_COUNT) {
      container.ItemCount = AIRDROP_ITEM_COUNT;
      changed = true;
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(AIRDROP_SETTINGS, JSON.stringify(settings, null, 4));
  ok(`Capped airdrop crates at ${AIRDROP_ITEM_COUNT} item(s) in ${AIRDROP_SETTINGS}`);
}

interface MissionSettings {
  Reward_Loot_Weapons_Maximum?: number;
  Reward_Loot_Armour_Maximum?: number;
  Reward_Loot_Misc_Maximum?: number;
  [key: string]: unknown;
}

interface MainConfig {
  Settings?: MissionSettings[];
  [key: string]: unknown;
}

export async function tuneMissionRewards(): Promise<void> {
  // ensureDynamicMissions() already logs the "not generated yet" case.
  if (!(await exists(DYNAMIC_MISSIONS_SETTINGS))) return;

  const settings: MainConfig = JSON.parse(
    await Deno.readTextFile(DYNAMIC_MISSIONS_SETTINGS),
  );
  const missionSettings = settings.Settings?.[0];
  if (!missionSettings) return;

  const targets: [keyof MissionSettings, number][] = [
    ["Reward_Loot_Weapons_Maximum", MISSION_WEAPONS_MAX],
    ["Reward_Loot_Armour_Maximum", MISSION_ARMOUR_MAX],
    ["Reward_Loot_Misc_Maximum", MISSION_MISC_MAX],
  ];

  let changed = false;
  for (const [key, value] of targets) {
    if (missionSettings[key] !== value) {
      missionSettings[key] = value;
      changed = true;
    }
  }

  if (!changed) return;
  await Deno.writeTextFile(
    DYNAMIC_MISSIONS_SETTINGS,
    JSON.stringify(settings, null, 4),
  );
  ok(`Capped Dynamic AI Mission rewards in ${DYNAMIC_MISSIONS_SETTINGS}`);
}

// --- Terje-Start-Screen starting loadouts (TerjeSettings/StartScreen/Loadouts.xml) ---
//
// The mod's own shipped template (github.com/TerjeBruoygard/TerjeMods) has a
// few loadouts we don't want on a straightforward hardcore-survival server:
// "multiselect" lets a fresh spawn trade all of their starting points for a
// shotgun + ammo with zero scavenging (undercuts "finding your first gun
// should be a tense scramble"), and "hunter" is a distinct starting-kit
// choice gated behind a Terje-Skills skill level - we don't want a
// skill-gated "character class" pick on spawn at all, independent of
// whether Terje-Skills is installed. The default "survivor" loadout
// (clothes, a chemlight, a piece of fruit, a bandage - no weapon) and the
// SteamGUID-gated "admin" loadout are left as-is. Each entry is removed
// independently and verbatim-matched, the first time it's seen; if an admin
// has already edited/removed all of them themselves, this is a no-op.
const TERJE_LOADOUTS_MARKER = "<!-- dayz-survival:loadouts-tuned -->";
const TERJE_REMOVED_LOADOUTS: [string, RegExp][] = [
  ["multiselect", /\s*<Loadout id="multiselect"[\s\S]*?<\/Loadout>/],
  ["hunter", /\s*<Loadout id="hunter"[\s\S]*?<\/Loadout>/],
];

export async function tuneStartingLoadouts(): Promise<void> {
  if (!(await exists(TERJE_LOADOUTS))) {
    log(
      "Terje-Start-Screen's Loadouts.xml not generated yet — the mod will copy its " +
        "template into the profile on first server start",
    );
    return;
  }

  let text = await Deno.readTextFile(TERJE_LOADOUTS);
  if (text.includes(TERJE_LOADOUTS_MARKER)) return; // already tuned, and not reset by a Steam update

  const removed: string[] = [];
  for (const [name, pattern] of TERJE_REMOVED_LOADOUTS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, "");
      removed.push(name);
    }
  }
  if (removed.length === 0) return; // already customized/pruned by an admin - leave it alone

  text = text.replace("<Loadouts>", `<Loadouts>\n${TERJE_LOADOUTS_MARKER}`);
  await Deno.writeTextFile(TERJE_LOADOUTS, text);
  ok(`Removed loadout(s) [${removed.join(", ")}] from ${TERJE_LOADOUTS}`);
}

// --- Terje-Start-Screen "survivor" starting kit (TerjeSettings/StartScreen/Loadouts.xml) ---
//
// The default "survivor" loadout ships with clothes, a chemlight, a piece of
// fruit, and a bandage - no way to defend yourself, navigate, or gather
// materials. We add a starting blunt weapon (found/improvised, not a proper
// firearm - still has to be scavenged/upgraded further), a handful of rags
// (early bandaging/crafting material), and a map (so a fresh spawn isn't
// totally lost). Deliberately no knife/blade here - butchering tools have to
// be found or crafted (see the DZSurvivalFindStone addon under serverpack/
// for the stone-gathering side of that). Each item/selector is inserted
// independently into the survivor loadout's <Items> block, the first time
// it's seen (matched verbatim, so already-added items are never duplicated
// and an admin's own edits/removals are respected).
const TERJE_SURVIVOR_ITEMS_CLOSE = /(<Loadout id="survivor"[\s\S]*?)(\s*<\/Items>\s*<\/Loadout>)/;

// The single guaranteed starting weapon. Project owner: "change the
// starting weapon from a shortstick to a Baseball bat".
//
// UPDATE (2026-09): this used to be a `Selector type="RANDOM"` between 4
// blunt weapons (WoodenStick/Pipe/BaseballBat/Crowbar) - see
// TERJE_LEGACY_BLUNT_WEAPON_SELECTOR below. Digging into why every spawn
// got a WoodenStick ("shortstick") no matter what, despite the RANDOM
// selector, found a second, unrelated bug: an even older version of this
// function (predating this file's own git history, no trace of it left in
// this codebase) had already baked its OWN unconditional
// `<Item classname="WoodenStick" position="@InHands" />` (tagged with a
// `dayz-survival:starting-kit-added` comment this file no longer
// recognizes or manages) directly into every already-materialized
// Loadouts.xml, positioned in the file BEFORE the RANDOM selector.
// Bohemia's loadout parser processes `<Item>`/`<Selector>` top-to-bottom,
// and the first thing to claim `position="@InHands"` wins - every later
// claim (the RANDOM selector's roll, whatever it picked) is silently
// discarded. That orphaned leftover line is why the "random" weapon never
// actually varied. TERJE_LEGACY_ORPHANED_STICK detects and strips it (if
// still present) below, and TERJE_LEGACY_BLUNT_WEAPON_SELECTOR detects and
// replaces the old RANDOM selector with this single deterministic item, so
// a live server converges to exactly one `@InHands` claim either way.
const TERJE_LEGACY_ORPHANED_STICK =
  /\s*<!-- dayz-survival:starting-kit-added -->\s*<Item classname="WoodenStick" position="@InHands" \/>/;
const TERJE_LEGACY_BLUNT_WEAPON_SELECTOR = `<Selector type="RANDOM">
				<Item classname="WoodenStick" position="@InHands" />
				<Item classname="Pipe" position="@InHands" />
				<Item classname="BaseballBat" position="@InHands" />
				<Item classname="Crowbar" position="@InHands" />
			</Selector>`;
const TERJE_STARTING_WEAPON_ITEM = '<Item classname="BaseballBat" position="@InHands" />';

const TERJE_STARTING_KIT_ITEMS: string[] = [
  '<Item classname="Rag" count="4" />',
  '<Item classname="Map" />',
];

export async function tuneStartingKit(): Promise<void> {
  if (!(await exists(TERJE_LOADOUTS))) {
    log(
      "Terje-Start-Screen's Loadouts.xml not generated yet — the mod will copy its " +
        "template into the profile on first server start",
    );
    return;
  }

  let text = await Deno.readTextFile(TERJE_LOADOUTS);
  if (!TERJE_SURVIVOR_ITEMS_CLOSE.test(text)) return; // survivor loadout renamed/removed by an admin - leave it alone

  const added: string[] = [];
  const removed: string[] = [];

  if (TERJE_LEGACY_ORPHANED_STICK.test(text)) {
    text = text.replace(TERJE_LEGACY_ORPHANED_STICK, "");
    removed.push("orphaned unconditional WoodenStick");
  }

  if (text.includes(TERJE_LEGACY_BLUNT_WEAPON_SELECTOR)) {
    text = text.replace(TERJE_LEGACY_BLUNT_WEAPON_SELECTOR, TERJE_STARTING_WEAPON_ITEM);
    removed.push("random blunt weapon selector");
  } else if (!text.includes(TERJE_STARTING_WEAPON_ITEM)) {
    text = text.replace(TERJE_SURVIVOR_ITEMS_CLOSE, `$1\n\t\t\t${TERJE_STARTING_WEAPON_ITEM}$2`);
    added.push("BaseballBat");
  }

  for (const itemXml of TERJE_STARTING_KIT_ITEMS) {
    if (text.includes(itemXml)) continue; // already present (this run or a previous one)
    text = text.replace(TERJE_SURVIVOR_ITEMS_CLOSE, `$1\n\t\t\t${itemXml}$2`);
    added.push(itemXml.match(/classname="([^"]+)"/)?.[1] ?? itemXml);
  }

  if (added.length === 0 && removed.length === 0) return;
  await Deno.writeTextFile(TERJE_LOADOUTS, text);
  const parts: string[] = [];
  if (added.length > 0) parts.push(`added [${added.join(", ")}]`);
  if (removed.length > 0) parts.push(`removed [${removed.join(", ")}]`);
  ok(`Starting kit: ${parts.join(", ")} in the survivor loadout (${TERJE_LOADOUTS})`);
}

// --- Terje-Start-Screen respawn points (TerjeSettings/StartScreen/Respawns.xml) ---
//
// Same idea as the loadouts above: prune the shipped template's respawn
// options that don't fit a straightforward hardcore-survival server -
// "hunting" is a skill-gated respawn zone tied to the "hunter" loadout we
// remove above, "sleepingbag" lets players respawn at a placed sleeping bag
// (too safe/convenient - death should cost you your position), and
// "deathpoint" respawns you at your own corpse. The regional map respawns
// and the SteamGUID-gated "admin" base are left as-is.
const TERJE_RESPAWNS_MARKER = "<!-- dayz-survival:respawns-tuned -->";
const TERJE_REMOVED_RESPAWNS: [string, RegExp][] = [
  ["hunting", /\s*<Respawn id="hunting"[\s\S]*?<\/Respawn>/],
  ["sleepingbag", /\s*<Respawn id="sleepingbag"[\s\S]*?<\/Respawn>/],
  ["deathpoint", /\s*<Respawn id="deathpoint"[\s\S]*?<\/Respawn>/],
];

export async function tuneRespawnPoints(): Promise<void> {
  if (!(await exists(TERJE_RESPAWNS))) {
    log(
      "Terje-Start-Screen's Respawns.xml not generated yet — the mod will copy its " +
        "template into the profile on first server start",
    );
    return;
  }

  let text = await Deno.readTextFile(TERJE_RESPAWNS);
  if (text.includes(TERJE_RESPAWNS_MARKER)) return; // already tuned, and not reset by a Steam update

  const removed: string[] = [];
  for (const [name, pattern] of TERJE_REMOVED_RESPAWNS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, "");
      removed.push(name);
    }
  }
  if (removed.length === 0) return; // already customized/pruned by an admin - leave it alone

  text = text.replace("<Respawns>", `<Respawns>\n${TERJE_RESPAWNS_MARKER}`);
  await Deno.writeTextFile(TERJE_RESPAWNS, text);
  ok(`Removed respawn option(s) [${removed.join(", ")}] from ${TERJE_RESPAWNS}`);
}

// --- Terje-Start-Screen settings (TerjeSettings/StartScreen.cfg) ---
//
// StartScreen.SkillsPageEnabled shows a page on character creation that lets
// a fresh spawn pre-allocate skill/perk levels from a pool of points
// (StartScreen.SkillsPagePoints) before ever playing - the opposite of
// "earned power": skills should only grow from actually butchering, making
// fires, etc. (Terje-Skills' own progression system, unaffected by this
// setting). This disables just that page, verbatim-matched, the first time
// it's seen; if an admin has already changed it themselves, this is a
// no-op.
const TERJE_START_SCREEN_MARKER = "// dayz-survival:startscreen-tuned";
const TERJE_SKILLS_PAGE_ENABLED = /StartScreen\.SkillsPageEnabled\s*=\s*true;/;

export async function tuneStartScreenSettings(): Promise<void> {
  if (!(await exists(TERJE_START_SCREEN_CFG))) {
    log(
      "Terje-Start-Screen's StartScreen.cfg not generated yet — the mod will write its " +
        "defaults into the profile on first server start",
    );
    return;
  }

  let text = await Deno.readTextFile(TERJE_START_SCREEN_CFG);
  if (text.includes(TERJE_START_SCREEN_MARKER)) return; // already tuned, and not reset by a Steam update

  if (!TERJE_SKILLS_PAGE_ENABLED.test(text)) return; // already customized by an admin - leave it alone

  text = text.replace(TERJE_SKILLS_PAGE_ENABLED, "StartScreen.SkillsPageEnabled = false;");
  text = `${TERJE_START_SCREEN_MARKER}\n${text}`;
  await Deno.writeTextFile(TERJE_START_SCREEN_CFG, text);
  ok(
    "Disabled the start-screen skill-point allocation page in " +
      `${TERJE_START_SCREEN_CFG} - skills are now purely earned through play`,
  );
}

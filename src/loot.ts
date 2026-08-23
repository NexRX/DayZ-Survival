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

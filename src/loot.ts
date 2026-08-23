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

import { AIRDROP_SETTINGS, DYNAMIC_MISSIONS_SETTINGS, TERJE_LOADOUTS } from "./paths.ts";
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
// The mod's own shipped template (github.com/TerjeBruoygard/TerjeMods) is
// mostly fine as-is: the default "survivor" loadout is already modest
// (clothes, a chemlight, a piece of fruit, a bandage - no weapon), "hunter"
// is gated behind a skill level the TerjeSkills mod (not in this pack)
// never grants, and "admin" is gated to specific SteamGUIDs. The one
// exception is the "multiselect" demo loadout, which lets a fresh spawn
// trade all of their starting points for a shotgun + ammo with zero
// scavenging - directly undercutting "finding your first gun should be a
// tense scramble". This removes just that one demo entry, verbatim-matched,
// the first time it's seen; if an admin has already edited/removed it
// themselves, this is a no-op.
const TERJE_MARKER = "<!-- dayz-survival:loadouts-tuned -->";
const TERJE_DEMO_LOADOUT = /\s*<Loadout id="multiselect"[\s\S]*?<\/Loadout>/;

export async function tuneStartingLoadouts(): Promise<void> {
  if (!(await exists(TERJE_LOADOUTS))) {
    log(
      "Terje-Start-Screen's Loadouts.xml not generated yet — the mod will copy its " +
        "template into the profile on first server start",
    );
    return;
  }

  let text = await Deno.readTextFile(TERJE_LOADOUTS);
  if (text.includes(TERJE_MARKER)) return; // already tuned, and not reset by a Steam update

  if (!TERJE_DEMO_LOADOUT.test(text)) return; // already customized/pruned by an admin - leave it alone

  text = text.replace(TERJE_DEMO_LOADOUT, "");
  text = text.replace("<Loadouts>", `<Loadouts>\n${TERJE_MARKER}`);
  await Deno.writeTextFile(TERJE_LOADOUTS, text);
  ok(`Removed the free-shotgun "multiselect" demo loadout from ${TERJE_LOADOUTS}`);
}

// Project layout and fixed identifiers. Everything is derived from this file's
// location (src/paths.ts -> project root is its parent's parent), so the CLI
// works regardless of the current working directory.

const SRC_DIR = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
export const ROOT = SRC_DIR.replace(/\/[^/]*$/, ""); // .../src -> project root

export const ENV_FILE = `${ROOT}/.env`;
export const MODS_FILE = `${ROOT}/mods.txt`;

export const SERVER_DIR = `${ROOT}/server`;
export const STEAMCMD_DIR = `${ROOT}/steamcmd`; // project-local Steam HOME
export const PROFILE_DIR = `${ROOT}/profiles`;
export const AI_TEMPLATE_DIR = `${ROOT}/ai`;

export const LOGIN_MARKER = `${STEAMCMD_DIR}/.dayz_login_ok`;
export const DD_LOGIN_MARKER = `${STEAMCMD_DIR}/.dd_login_ok`;

export const DAYZ_SERVER_APPID = "223350";
export const DAYZ_CLIENT_APPID = "221100";
export const WORKSHOP_SUBPATH = `steamapps/workshop/content/${DAYZ_CLIENT_APPID}`;

// Mission template referenced in serverDZ.cfg's `class Missions`; Expansion
// stores per-mission settings (e.g. AI patrols) under this mission's own
// `expansion/settings/` folder.
export const MISSION_TEMPLATE = "dayzOffline.chernarusplus";
export const MISSION_DIR = `${SERVER_DIR}/mpmissions/${MISSION_TEMPLATE}`;
export const AI_PATROL_SETTINGS = `${MISSION_DIR}/expansion/settings/AIPatrolSettings.json`;

// DayZ-Expansion-Core's SafeZone module config - self-generated (with
// Chernarus' default city safe zones) on first mission load. traders.ts's
// ensureCustomTraderSafeZone() adds one CircleZones entry for the custom
// trader city without touching the existing defaults.
export const SAFE_ZONE_SETTINGS = `${MISSION_DIR}/expansion/settings/SafeZoneSettings.json`;

// DayZ-Expansion-Market's own global config - self-generated (with default
// spawn-position entries near the vanilla trader city) on first mission
// load. traders.ts adds more entries near the custom trader's Vehicle
// Dealer; vehicle purchases can only spawn at a position listed here,
// within MaxVehicleDistanceToTrader of the buying trader's NPC.
export const MARKET_SETTINGS = `${MISSION_DIR}/expansion/settings/MarketSettings.json`;

// Vanilla loot economy, shipped as part of the mission itself (not
// mod-generated) - re-validated by steamcmd on every `install`, so any
// tuning here must be re-applied every start (see economy.ts).
export const ECONOMY_TYPES_FILE = `${MISSION_DIR}/db/types.xml`;
export const ECONOMY_EVENTS_FILE = `${MISSION_DIR}/db/events.xml`;

// Weather pattern config, shipped as part of the mission itself (same
// re-validation caveat as the economy files above - see weather.ts). Ships
// disabled (enable="0") by default, meaning none of its own values do
// anything until it's turned on.
export const CFG_WEATHER_FILE = `${MISSION_DIR}/cfgweather.xml`;

// Terje-Radiation self-generates this on first world load. Ships with one
// example zone, disabled (Active=0) by default - see hazards.ts.
export const TERJE_SCRIPTABLE_AREAS =
  `${PROFILE_DIR}/TerjeSettings/ScriptableAreas/ScriptableAreasSpawner.xml`;

// No-Build-Zones self-generates this flat profile-root JSON on first world
// load - see noBuildZones.ts.
export const NO_BUILD_ZONES_SETTINGS = `${PROFILE_DIR}/NoBuildZone.json`;

// Custom-Keycards self-generates this whole folder tree (with working
// 0_Default*.json examples in each subfolder) on first server start. See
// customKeycards.ts, which adds our own curated LootTables files alongside
// the shipped defaults, plus real (in-game-verified) Static_Locations
// entries retrofitting existing buildings into the Keycard system.
export const CUSTOM_KEYCARDS_DIR = `${PROFILE_DIR}/CustomKeycards`;
export const CUSTOM_KEYCARDS_LOOT_TABLES_DIR = `${CUSTOM_KEYCARDS_DIR}/LootTables`;
export const CUSTOM_KEYCARDS_STATIC_LOCATIONS_DIR = `${CUSTOM_KEYCARDS_DIR}/Static_Locations`;

// Fixed-position event spawn point registry, shipped as part of the mission
// itself. "Herd"-type animal territories (Wolf/Deer/WildBoar/...) each need
// a matching self-closing <event name="..." /> stub here even though their
// actual positions come from the territory/zone file. "Ambient"-type
// territories (Hen/Fox/Hare/Raven/Rat) do NOT need an entry here at all -
// see wildlifeTerritories.ts.
export const MISSION_EVENT_SPAWNS_FILE = `${MISSION_DIR}/cfgeventspawns.xml`;

// DayZ-Expansion-Market's per-category trader stock/price files, generated
// under PROFILE_DIR on first server start (see market.ts).
export const EXPANSION_MARKET_DIR = `${PROFILE_DIR}/ExpansionMod/Market`;

// DayZ-Expansion-Market's trader identity files (which categories/items
// each named trader sells) - ships 17 defaults, self-generated alongside
// EXPANSION_MARKET_DIR. traders.ts adds custom identities here (e.g. a
// single "Everything" trader) alongside the untouched defaults.
export const EXPANSION_TRADERS_DIR = `${PROFILE_DIR}/ExpansionMod/Traders`;

// DayZ-Expansion-Core's gear "loadout" preset files, referenced by name from
// the `loadout:<Name>` token in a trader NPC's `.map` Gear field (see
// traders.ts). Path per DayZ-Expansion-Core's ExpansionConstants.c
// (EXPANSION_LOADOUT_FOLDER). Unlike EXPANSION_TRADERS_DIR above, this
// directory is NOT pre-populated with defaults, so files here are safe to
// write unconditionally.
export const EXPANSION_LOADOUTS_DIR = `${PROFILE_DIR}/ExpansionMod/Loadouts`;

// DayZ-Expansion-Core's generic placed-object mapping folder (auto-created
// empty alongside traderzones/traders on first world load). Same
// pipe-delimited format as the trader `.map` files (see traders.ts's
// traderMapLine()) but for arbitrary decorative/static objects:
// `<ClassName>|<Position>|<Orientation>|<Special>|<Takeable>|<Attachments>`
// (per DayZ-Expansion-Core's ExpansionWorldObjectsModule.c GetObjectFromFile()).
// Used to place the trader restock status board (see traders.ts's
// ensureCustomTraderBoard()) without a manual DayZ-Editor placement step.
export const EXPANSION_OBJECTS_DIR = `${MISSION_DIR}/expansion/objects`;

// Search For Loot (Improved)'s persistent "area flags" cache: a binary index
// of loot-searchable areas/buildings, built once and reused across restarts.
// It is NOT part of storage_1, so a world wipe won't touch it - but it goes
// stale (crashing the mod's loader, AFR_AreaFlagsService) whenever the
// mission's type/spawn data changes underneath it. Deleting it is always
// safe; the mod regenerates it fresh on next mission load.
export const AREA_FLAGS_CACHE = `${MISSION_DIR}/areaflags.map`;

// DayZ-Dynamic-AI-Addon (Spatial AI) stores its config in the *server
// profile* (not the mission), regenerating it with defaults on first load.
export const SPATIAL_SETTINGS = `${PROFILE_DIR}/ExpansionMod/AI/Spatial/SpatialSettings.json`;

// @Dynamic-AI-Missions self-regenerates its MainConfig.json on first load.
export const DYNAMIC_MISSIONS_SETTINGS = `${PROFILE_DIR}/AIMissions/MainConfig.json`;

// DayZ-Expansion-Core's airdrop mission loot settings. Unlike the other
// PRIME_TARGETS-style configs, this is NOT written on plain world load -
// only once an actual airdrop mission fires - so prime.ts deliberately
// does not wait on it; loot.ts's tuneAirdropLoot() re-applies tuning
// lazily on every start once it does exist.
export const AIRDROP_SETTINGS = `${PROFILE_DIR}/ExpansionMod/Settings/AirdropSettings.json`;

// DayZ-Expansion-AI's in-game AI menu (T key: spawn companions, set
// waypoints, export patrols) is gated by SteamID64 entries in this file's
// `Admins` array, generated alongside AIPatrolSettings.json.
export const AI_SETTINGS = `${PROFILE_DIR}/ExpansionMod/Settings/AISettings.json`;

// InediaInfectedAI self-regenerates its config in the server profile (see
// the mod's wiki: github.com/ysaroka/InediaInfectedAI/wiki).
export const INEDIA_SETTINGS = `${PROFILE_DIR}/Inedia/InediaInfectedAIConfig.json`;

// AI-Bandits self-generates both configs in the server profile on first
// start - Dynamic covers patrols/snipers, Static covers stationary NPCs.
// Both share the same per-entry 0-100 "accuracy" field where applicable.
export const AI_BANDITS_DYNAMIC_SETTINGS = `${PROFILE_DIR}/AI_Bandits/DynamicAIB.json`;
export const AI_BANDITS_STATIC_SETTINGS = `${PROFILE_DIR}/AI_Bandits/StaticAIB.json`;

// Terje-Start-Screen copies its Templates/Loadouts.xml into the profile on
// first start - this drives the starting-gear selection screen.
export const TERJE_LOADOUTS = `${PROFILE_DIR}/TerjeSettings/StartScreen/Loadouts.xml`;

// Terje-Start-Screen's respawn-point selection screen (regional spawns,
// admin base, plus the skill-gated/sleeping-bag/dead-body respawn options),
// self-generated from the mod's template the same way as Loadouts.xml above.
export const TERJE_RESPAWNS = `${PROFILE_DIR}/TerjeSettings/StartScreen/Respawns.xml`;

// Terje-Start-Screen's own settings file (self-generated with defaults on
// first world load). Governs which pages of the character-creation/respawn
// flow are shown, including the skill-point allocation page
// (StartScreen.SkillsPageEnabled) - separate from Terje-Skills' actual
// skill-progression system in TerjeSettings/Skills.cfg.
export const TERJE_START_SCREEN_CFG = `${PROFILE_DIR}/TerjeSettings/StartScreen.cfg`;

// Community Online Tools (COT) grants its teleport/freecam/spawn admin menu
// per-player via one JSON file per player in this directory, named after
// their internal identity id (a base64 hash, NOT their SteamID64). That id
// is printed in the server's `.ADM` admin log (`-adminlog`) the first time
// each player connects, e.g.:
//   Player "Nex" (id=XZ3FQuGVspzzW43W9S3B5Bmm0NSRqFosQwmYTk5kdnY=) is connecting
export const COT_PLAYERS_DIR = `${PROFILE_DIR}/PermissionsFramework/Players`;

// Vehicle3PP self-generates this flat classname whitelist on first world
// load. Ships with only 5 vanilla classnames; any modded vehicle not listed
// here doesn't get forced/allowed 3rd-person camera treatment by the mod.
export const VEHICLE_3PP_WHITELIST = `${PROFILE_DIR}/3PPVehicleWhitelist.json`;

// Vanilla mission file (shipped as part of the mission itself, not
// mod-generated) that Lads-Lighting-Overhaul hooks into via
// WorldsData.lightingConfig (ships with lightingConfig: 0, i.e. vanilla
// lighting, until set to one of the mod's preset values). See lighting.ts.
export const CFG_GAMEPLAY_FILE = `${MISSION_DIR}/cfggameplay.json`;

// Knock Knock Zombies self-generates this on first world load. See
// aiWorldEvents.ts.
export const KNOCK_KNOCK_ZOMBIES_SETTINGS =
  `${PROFILE_DIR}/KnockKnockZombies/KnockKnockZombies_Settings.json`;

// Airborne AI self-generates this on first world load. See aiWorldEvents.ts.
export const AIRBORNE_AI_SETTINGS = `${PROFILE_DIR}/AirborneAI/AirborneAI_Settings.json`;

// AI War Zones self-generates this on first world load, with a few example
// zones already pre-populated. See aiWorldEvents.ts.
export const AI_WARZONES_SETTINGS = `${PROFILE_DIR}/AIWarZones/AIWarZones_Settings.json`;

// hSF Zombie Horde Event self-generates these on first world load. See
// aiWorldEvents.ts.
export const ZOMBIE_HORDE_GENERAL_SETTINGS =
  `${PROFILE_DIR}/ZombieHorde/Settings/GeneralSettings.json`;

// DDP Server Climate Zones self-generates this on first world load with a
// default-template Zones array. Note: the mod's Steam page says
// "profiles\DDP_ClimateZones\Config.json", but its actual runtime log says
// otherwise - the real path has an extra DDP/ parent directory. See
// climateZones.ts.
export const CLIMATE_ZONES_SETTINGS = `${PROFILE_DIR}/DDP/DDP_ClimateZones/Config.json`;

// Fuel-System self-generates this on first world load. Matches vehicle fuel
// type/consumption by classname; `type` can be a base class (inheritance-
// chain matching), not just an exact classname. See fuelSystem.ts.
export const FUEL_SYSTEM_VEHICLES = `${PROFILE_DIR}/iTzMods/FuelSystem/vehicles.xml`;

// This project's own custom DayZ addons, bundled into a single Workshop mod
// ("the server pack") - built/signed with armake2 rather than Windows DayZ
// Tools (see src/modBuild.ts). Each immediate subdirectory of the pack's
// addonsDir containing a config.cpp becomes its own PBO inside it.
export interface ServerPackConfig {
  /** Must match the CfgMods class name / `dir` in this pack's mod.cpp. */
  name: string;
  /** Source dir - contains addons/, mod.cpp, .workshop_id, preview.png. */
  dir: string;
  addonsDir: string;
  /** Generated, machine-local, never committed: this pack's own armake2 signing keypair. */
  keysDir: string;
  /** Generated, machine-local, never committed: this pack's assembled @<name>/ PBO build output. */
  buildDir: string;
  workshopIdFile: string;
  /** meta.cpp's `name` field / this pack's Workshop item title. */
  displayName: string;
}

export const SERVERPACK: ServerPackConfig = {
  name: "DZSurvivalServerPack",
  dir: `${ROOT}/serverpack`,
  addonsDir: `${ROOT}/serverpack/addons`,
  keysDir: `${ROOT}/.serverpack-keys`,
  buildDir: `${ROOT}/.serverpack-build`,
  workshopIdFile: `${ROOT}/serverpack/.workshop_id`,
  displayName: "DayZ Survival - Server Pack",
};

// DayZ-Editor (the offline client-side building tool) saves its .dze files
// here, inside the client's Proton prefix. EDITOR_FILES_DIR is where
// @DayZ-Editor-Loader reads them from on the server side (auto-created
// under the mission root once that mod is active) - see editorSync.ts,
// which copies the newest save from one to the other.
export const DAYZ_EDITOR_SAVE_DIR = `${
  Deno.env.get("HOME")
}/.local/share/Steam/steamapps/compatdata/${DAYZ_CLIENT_APPID}/pfx/drive_c/users/steamuser/Documents/DayZ/Editor`;
export const EDITOR_FILES_DIR = `${MISSION_DIR}/EditorFiles`;

// Real Bohemia DayZ Tools (Steam app 830640, Windows-only) run via Wine -
// needed only for `DSSignFile.exe`. armake2's packing is fine, but its
// paired signer, BiSignUtils, produces `.bisign` files that BiSignUtils'
// own `checkAll` accepts yet the real `DSCheckSignatures.exe` rejects as
// "wrong" - the exact, previously-unexplained cause of DayZ's connect-time
// "Client has a PBO which is not part of the server" kick (see modSign.ts).
export const DAYZ_TOOLS_APPID = "830640";
export const DAYTOOLS_DIR = `${ROOT}/daytools`;
export const WINE_PREFIX_DIR = `${ROOT}/.wine-daytools`;
export const DSSIGNFILE_EXE = `${DAYTOOLS_DIR}/Bin/DsUtils/DSSignFile.exe`;

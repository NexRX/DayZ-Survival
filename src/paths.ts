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

// Mission template referenced in serverDZ.cfg's `class Missions`. Expansion
// stores its per-mission settings (e.g. AI patrols) under this mission's own
// `expansion/settings/` folder, so this is shared with the AI patrol setup.
export const MISSION_TEMPLATE = "dayzOffline.chernarusplus";
export const MISSION_DIR = `${SERVER_DIR}/mpmissions/${MISSION_TEMPLATE}`;
export const AI_PATROL_SETTINGS = `${MISSION_DIR}/expansion/settings/AIPatrolSettings.json`;

// Vanilla loot economy, shipped as part of the mission itself (not
// mod-generated) - re-downloaded/validated by steamcmd on every `install`,
// so any tuning here must be re-applied every start (see economy.ts).
export const ECONOMY_TYPES_FILE = `${MISSION_DIR}/db/types.xml`;
export const ECONOMY_EVENTS_FILE = `${MISSION_DIR}/db/events.xml`;

// Fixed-position event spawn point registry, shipped as part of the mission
// itself. "Herd"-type animal territories (Wolf/Deer/WildBoar/... and now
// WildHorse) each need a matching self-closing <event name="..." /> stub
// here even though their actual positions come from the territory/zone file,
// not a <pos> list - confirmed by the vanilla entries already present.
// "Ambient"-type territories (Hen/Fox/Hare/Raven/Rat) do NOT need an entry
// here at all (confirmed absent for all of them) - see wildlifeTerritories.ts.
export const MISSION_EVENT_SPAWNS_FILE = `${MISSION_DIR}/cfgeventspawns.xml`;

// DayZ-Expansion-Market's per-category trader stock/price files, generated
// under PROFILE_DIR on first server start (see market.ts).
export const EXPANSION_MARKET_DIR = `${PROFILE_DIR}/ExpansionMod/Market`;

// Search For Loot (Improved)'s persistent "area flags" cache: a binary index
// of loot-searchable areas/buildings, built once and reused across restarts
// for performance. It is NOT part of storage_1, so a world wipe won't touch
// it - but it goes stale (and crashes the mod's loader, AFR_AreaFlagsService,
// with "SkipAreaFlagsUsageChunk") whenever the mission's type/spawn data
// changes underneath it (new mods, NCPR merges, manual loot edits). Deleting
// it is always safe; the mod regenerates it fresh on next mission load.
export const AREA_FLAGS_CACHE = `${MISSION_DIR}/areaflags.map`;

// DayZ-Dynamic-AI-Addon (Spatial AI) stores its config in the *server
// profile* (not the mission), regenerating it with defaults on first load.
export const SPATIAL_SETTINGS = `${PROFILE_DIR}/ExpansionMod/AI/Spatial/SpatialSettings.json`;

// @Dynamic-AI-Missions self-regenerates its MainConfig.json on first load,
// confirmed on a live server run.
export const DYNAMIC_MISSIONS_SETTINGS = `${PROFILE_DIR}/AIMissions/MainConfig.json`;

// DayZ-Expansion-Core's airdrop mission loot settings, stored here. Unlike
// the other PRIME_TARGETS-style configs, this is NOT written on plain world
// load - only once an actual airdrop mission fires - so prime.ts
// deliberately does not wait on it; loot.ts's tuneAirdropLoot() re-applies
// tuning to it lazily on every start once it does exist.
export const AIRDROP_SETTINGS = `${PROFILE_DIR}/ExpansionMod/Settings/AirdropSettings.json`;

// DayZ-Expansion-AI's in-game AI menu (T key: spawn companions, set
// waypoints, export patrols) is gated by SteamID64 entries in this file's
// `Admins` array, generated alongside AIPatrolSettings.json.
export const AI_SETTINGS = `${PROFILE_DIR}/ExpansionMod/Settings/AISettings.json`;

// InediaInfectedAI self-regenerates its config in the server profile,
// confirmed via the mod's own wiki (github.com/ysaroka/InediaInfectedAI/wiki).
export const INEDIA_SETTINGS = `${PROFILE_DIR}/Inedia/InediaInfectedAIConfig.json`;

// AI-Bandits self-generates both configs in the server profile on first
// start (confirmed via github.com/hunter688/Hunterz-mods-Wiki) - Dynamic
// covers patrols/snipers, Static covers stationary NPCs. Both share the
// same per-entry 0-100 "accuracy" field where applicable.
export const AI_BANDITS_DYNAMIC_SETTINGS = `${PROFILE_DIR}/AI_Bandits/DynamicAIB.json`;
export const AI_BANDITS_STATIC_SETTINGS = `${PROFILE_DIR}/AI_Bandits/StaticAIB.json`;

// Terje-Start-Screen copies its Templates/Loadouts.xml into the profile on
// first start (confirmed via the mod's Steam page and
// github.com/TerjeBruoygard/TerjeMods) - this is what drives the starting-
// gear selection screen.
export const TERJE_LOADOUTS = `${PROFILE_DIR}/TerjeSettings/StartScreen/Loadouts.xml`;

// Terje-Start-Screen's respawn-point selection screen (regional spawns,
// admin base, plus the skill-gated/sleeping-bag/dead-body respawn options),
// self-generated from the mod's template the same way as Loadouts.xml above.
export const TERJE_RESPAWNS = `${PROFILE_DIR}/TerjeSettings/StartScreen/Respawns.xml`;

// Terje-Start-Screen's own settings file (self-generated with defaults on
// first world load, confirmed on a live server run). Governs which pages of
// the character-creation/respawn flow are shown, including the skill-point
// allocation page (StartScreen.SkillsPageEnabled) - separate from Terje-
// Skills' actual skill-progression system in TerjeSettings/Skills.cfg, which
// grows skills purely from play regardless of this setting.
export const TERJE_START_SCREEN_CFG = `${PROFILE_DIR}/TerjeSettings/StartScreen.cfg`;

// Community Online Tools (COT, via @Community-Online-Tools) grants its
// teleport/freecam/spawn admin menu per-player via one JSON file per player
// in this directory, named after their internal identity id (a base64 hash,
// NOT their SteamID64) - confirmed on a live server run. That id is printed
// in the server's `.ADM` admin log (enabled via `-adminlog`) the first time
// each player connects, e.g.:
//   Player "Nex" (id=XZ3FQuGVspzzW43W9S3B5Bmm0NSRqFosQwmYTk5kdnY=) is connecting
export const COT_PLAYERS_DIR = `${PROFILE_DIR}/PermissionsFramework/Players`;

// Dynamic Scavenging (@Dynamic-Scavenging) self-generates this on first
// world load - confirmed on a live server run. It's a single flat JSON file
// mixing real settings with _xxxFieldName_info documentation keys.
export const DYNAMIC_SCAVENGING_SETTINGS =
  `${PROFILE_DIR}/DynamicScavenging/DynamicScavenging.json`;

// Vehicle3PP (@Vehicle3PP) self-generates this flat classname whitelist on
// first world load - confirmed on a live server run. Ships with only 5
// vanilla classnames; any modded vehicle not listed here doesn't get
// forced/allowed 3rd-person camera treatment by the mod.
export const VEHICLE_3PP_WHITELIST = `${PROFILE_DIR}/3PPVehicleWhitelist.json`;

// Vanilla mission file (shipped as part of the mission itself, not
// mod-generated) that Lads-Lighting-Overhaul (@Lads-Lighting-Overhaul)
// hooks into via WorldsData.lightingConfig - confirmed on a live install
// (ships with lightingConfig: 0, i.e. vanilla lighting, until set to one of
// the mod's preset values). See lighting.ts.
export const CFG_GAMEPLAY_FILE = `${MISSION_DIR}/cfggameplay.json`;

// Fuel-System (@Fuel-System) self-generates this on first world load -
// confirmed on a live server run. Matches vehicle fuel type/consumption by
// classname, and the mod's own Steam page confirms `type` "can be a base
// class" (inheritance-chain matching), not just an exact classname. See
// fuelSystem.ts.
export const FUEL_SYSTEM_VEHICLES = `${PROFILE_DIR}/iTzMods/FuelSystem/vehicles.xml`;

// This project's own custom DayZ addons, bundled into a single Workshop
// mod ("server pack") so there's only ever one Workshop item to maintain -
// built/signed with armake2 rather than Windows DayZ Tools (see
// src/modBuild.ts). Each immediate subdirectory of SERVERPACK_ADDONS_DIR
// containing a config.cpp becomes its own PBO inside the one mod; adding a
// new addon needs no build-tooling changes, just a new folder there.
export const SERVERPACK_DIR = `${ROOT}/serverpack`;
export const SERVERPACK_ADDONS_DIR = `${SERVERPACK_DIR}/addons`;
// Must match the CfgMods class name / `dir` in serverpack/mod.cpp.
export const SERVERPACK_NAME = "DZSurvivalServerPack";
export const SERVERPACK_WORKSHOP_ID_FILE = `${SERVERPACK_DIR}/.workshop_id`;

// Generated, machine-local, and never committed: the server pack's shared
// armake2 signing keypair and its assembled @<SERVERPACK_NAME>/ PBO build
// output, ready to be published or symlinked into a local test server's mod
// path.
export const SERVERPACK_KEYS_DIR = `${ROOT}/.serverpack-keys`;
export const SERVERPACK_BUILD_DIR = `${ROOT}/.serverpack-build`;

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
export const DSCHECKSIGNATURES_EXE = `${DAYTOOLS_DIR}/Bin/DsUtils/DSCheckSignatures.exe`;

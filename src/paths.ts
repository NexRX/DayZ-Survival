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

// Community Online Tools (COT, via @Community-Online-Tools) grants its
// teleport/freecam/spawn admin menu per-player via one JSON file per player
// in this directory, named after their internal identity id (a base64 hash,
// NOT their SteamID64) - confirmed on a live server run. That id is printed
// in the server's `.ADM` admin log (enabled via `-adminlog`) the first time
// each player connects, e.g.:
//   Player "Nex" (id=XZ3FQuGVspzzW43W9S3B5Bmm0NSRqFosQwmYTk5kdnY=) is connecting
export const COT_PLAYERS_DIR = `${PROFILE_DIR}/PermissionsFramework/Players`;

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

// DayZ-Expansion-Core's SafeZone module config - like AIPatrolSettings.json,
// self-generated (with Chernarus' own default city safe zones already in
// it) the first time the mission loads. src/traders.ts's
// ensureCustomTraderSafeZone() adds one more CircleZones entry for the
// custom trader city, without touching the existing defaults.
export const SAFE_ZONE_SETTINGS = `${MISSION_DIR}/expansion/settings/SafeZoneSettings.json`;

// DayZ-Expansion-Market's own global config - self-generated (with 5-6
// default LandSpawnPositions/AirSpawnPositions/WaterSpawnPositions entries
// already in it, all clustered near the vanilla trader city) the first
// time the mission loads. src/traders.ts's
// ensureCustomVehicleSpawnPositions() adds more entries near the custom
// trader city's own Vehicle Dealer, without touching the existing
// defaults - confirmed via ExpansionTraderBase.HasVehicleSpawnPosition()
// (unpacked from market_scripts.pbo) that vehicle purchases can only spawn
// at a position listed here, within MaxVehicleDistanceToTrader of the
// buying trader's own NPC.
export const MARKET_SETTINGS = `${MISSION_DIR}/expansion/settings/MarketSettings.json`;

// Vanilla loot economy, shipped as part of the mission itself (not
// mod-generated) - re-downloaded/validated by steamcmd on every `install`,
// so any tuning here must be re-applied every start (see economy.ts).
export const ECONOMY_TYPES_FILE = `${MISSION_DIR}/db/types.xml`;
export const ECONOMY_EVENTS_FILE = `${MISSION_DIR}/db/events.xml`;

// Weather pattern config, shipped as part of the mission itself (same
// re-validation caveat as the economy files above - see weather.ts). Ships
// disabled (enable="0") by default, meaning none of its own values do
// anything until it's turned on.
export const CFG_WEATHER_FILE = `${MISSION_DIR}/cfgweather.xml`;

// Terje-Radiation self-generates this on first world load - confirmed on a
// live server run. Ships with exactly one example zone (a
// TerjeRadioactiveScriptableArea), disabled (Active=0) by default - see
// hazards.ts.
export const TERJE_SCRIPTABLE_AREAS =
  `${PROFILE_DIR}/TerjeSettings/ScriptableAreas/ScriptableAreasSpawner.xml`;

// No-Build-Zones self-generates this flat profile-root JSON on first world
// load (per the mod's own Steam Workshop page - "Included in the 'Others'
// folder", not a subfolder) - see noBuildZones.ts.
export const NO_BUILD_ZONES_SETTINGS = `${PROFILE_DIR}/NoBuildZone.json`;

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

// DayZ-Expansion-Market's trader *identity* files (which categories/items
// each named trader sells) - ships 17 defaults, self-generated alongside
// EXPANSION_MARKET_DIR on first server start. src/traders.ts adds its own
// custom identities here (e.g. a single "Everything" trader) alongside the
// untouched defaults.
export const EXPANSION_TRADERS_DIR = `${PROFILE_DIR}/ExpansionMod/Traders`;

// DayZ-Expansion-Core's gear "loadout" preset files (referenced by name from
// the `loadout:<Name>` token in a trader NPC's `.map` Gear field - see
// src/traders.ts). Confirmed via DayZ-Expansion-Core's own script source
// (ExpansionConstants.c: EXPANSION_LOADOUT_FOLDER = "$profile:ExpansionMod\\
// Loadouts\\"; ExpansionPrefab.c's GetPath()). Unlike EXPANSION_TRADERS_DIR
// above, this directory is NOT pre-populated with defaults on first server
// start, so files here are safe to write unconditionally.
export const EXPANSION_LOADOUTS_DIR = `${PROFILE_DIR}/ExpansionMod/Loadouts`;

// DayZ-Expansion-Core's generic placed-object mapping folder (confirmed live
// - auto-created empty alongside traderzones/traders on first world load).
// Same plain-text pipe-delimited format as the trader `.map` files (see
// traders.ts's traderMapLine()), but for arbitrary decorative/static
// objects: `<ClassName>|<Position>|<Orientation>|<Special>|<Takeable>|<Attachments>`
// (confirmed via DayZ-Expansion-Core's own ExpansionWorldObjectsModule.c,
// GetObjectFromFile()). Used to place the trader restock status board
// (see traders.ts's ensureCustomTraderBoard()) without needing a manual
// DayZ-Editor placement step.
export const EXPANSION_OBJECTS_DIR = `${MISSION_DIR}/expansion/objects`;

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

// Knock Knock Zombies (@Knock-Knock-Zombies) self-generates this on first
// world load - confirmed on a live server run (default chanceToSpawn 15,
// maxZombiePerEvent 1). See aiWorldEvents.ts.
export const KNOCK_KNOCK_ZOMBIES_SETTINGS =
  `${PROFILE_DIR}/KnockKnockZombies/KnockKnockZombies_Settings.json`;

// Airborne AI (@Airborne-AI) self-generates this on first world load -
// confirmed on a live server run. See aiWorldEvents.ts.
export const AIRBORNE_AI_SETTINGS = `${PROFILE_DIR}/AirborneAI/AirborneAI_Settings.json`;

// AI War Zones (@Ai-Warzone) self-generates this on first world load, with
// 3 example zones (Berezino/Vybor/Krasnostav PD) already pre-populated -
// confirmed on a live server run. See aiWorldEvents.ts.
export const AI_WARZONES_SETTINGS = `${PROFILE_DIR}/AIWarZones/AIWarZones_Settings.json`;

// hSF Zombie Horde Event (@hSF-Zombie-Horde-Event) self-generates these on
// first world load - confirmed on a live server run. See aiWorldEvents.ts.
export const ZOMBIE_HORDE_GENERAL_SETTINGS =
  `${PROFILE_DIR}/ZombieHorde/Settings/GeneralSettings.json`;

// DDP Server Climate Zones (@DDP-Climate-Zones) self-generates this on first
// world load with a default-template Zones array. The mod's own Steam page
// says "profiles\DDP_ClimateZones\Config.json", but its actual runtime log
// on a live run said otherwise: "Loaded config from
// $profile:DDP\DDP_ClimateZones\Config.json" - confirmed on disk at
// profiles/DDP/DDP_ClimateZones/Config.json (an extra DDP/ parent directory
// the Steam page didn't mention). See climateZones.ts.
export const CLIMATE_ZONES_SETTINGS = `${PROFILE_DIR}/DDP/DDP_ClimateZones/Config.json`;

// Fuel-System (@Fuel-System) self-generates this on first world load -
// confirmed on a live server run. Matches vehicle fuel type/consumption by
// classname, and the mod's own Steam page confirms `type` "can be a base
// class" (inheritance-chain matching), not just an exact classname. See
// fuelSystem.ts.
export const FUEL_SYSTEM_VEHICLES = `${PROFILE_DIR}/iTzMods/FuelSystem/vehicles.xml`;

// This project's own custom DayZ addons, bundled into Workshop mods
// ("server packs") - built/signed with armake2 rather than Windows DayZ
// Tools (see src/modBuild.ts). Each immediate subdirectory of a pack's
// addonsDir containing a config.cpp becomes its own PBO inside that pack;
// adding a new addon needs no build-tooling changes, just a new folder
// there.
//
// Two packs exist, split by whether an addon has ANY client-visible/
// client-required behavior (UI, self-actions, board interactions, input
// overrides) *and* whether it registers anything into Community-Online-
// Tools' module/permission system (JMModuleBase subclasses,
// GetPermissionsManager().RegisterPermission(), etc.):
//   - SERVERPACK ( DZSurvivalServerPack) - loaded via -mod= (players must
//     download it). Holds DZSurvivalFindStone (hold-action UI),
//     DZSurvivalMapGate (overrides the client's own M-key handler),
//     DZSurvivalTraderRestock (the board's ActionCheckTraderBoard is a
//     player-facing proximity action), and DZSurvivalBaseDecay (server-only
//     *logic*, but registers a COT permission/module - see below for why
//     that alone forces it into this pack).
//   - SERVERPACK_SERVERONLY (DZSurvivalServerOnly) - LOCAL ONLY, never
//     published to Steam Workshop at all (see localServerPacks.ts's
//     ensureLocalServerPack() - staged directly into the server's own mod
//     folder and loaded via -servermod= on every start, so nobody -
//     including this server itself - ever needs to download it). Currently
//     EMPTY (see below) - src/server.ts's doStart() skips staging/loading
//     it entirely whenever listAddons() returns none, so this is a safe
//     no-op until something genuinely qualifies again.
//
//   *** Why DZSurvivalBaseDecay isn't server-only, even though its actual
//   decay logic is ***: it was originally here, since none of its hooks are
//   player-facing (only *Server()/OnStartServer-suffixed methods + EEInit/
//   EEDelete). But its COT admin-command integration (DZSurvivalBaseDecay_
//   COTCommand.c) registers a JMModuleBase + a permission node
//   ("Admin.DZSurvivalBaseDecay.Trigger"), and COT requires every
//   registered permission node to exist IDENTICALLY on both client and
//   server - it builds a tree client-side from whatever's compiled in, then
//   compares it structurally (child count per node) against what the
//   server sends on connect. A permission registered only server-side
//   (because the addon defining it was -servermod=-only) makes the client's
//   copy of that branch have fewer children than the server's, which
//   throws "Received child count N for X does not match registered child
//   count M!" while deserializing the role sync - corrupting that client's
//   entire permission tree from then on. The practical symptom (confirmed
//   live on this project, 2026-09): COT's own admin UI/keybinds (which gate
//   on GetPermissionsManager().HasPermission("COT.View")) stop responding
//   to ANY input entirely, silently, with no error shown to the user, while
//   things that check permissions purely server-side (e.g. chat command
//   gating) keep working fine - a very confusing split-brain bug to
//   diagnose from symptoms alone. Lesson: ANY addon that touches COT's
//   module/permission system at all must live in the shared pack, no
//   matter how server-only its actual behavior is - see
//   DZSurvivalBaseDecay_Module.c's GetGame().IsServer() guards for how the
//   real logic still stays server-authoritative despite the scripts
//   compiling into the client build too.
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
  /** Whether this pack is meant to be loaded via -servermod= (mods.txt's "server" column). */
  serverOnly: boolean;
  /** True if this pack is never published to Steam Workshop at all (see localServerPacks.ts). */
  localOnly: boolean;
}

function serverPackConfig(opts: {
  name: string;
  dirName: string;
  keysDirName: string;
  buildDirName: string;
  displayName: string;
  serverOnly: boolean;
  localOnly: boolean;
}): ServerPackConfig {
  const dir = `${ROOT}/${opts.dirName}`;
  return {
    name: opts.name,
    dir,
    addonsDir: `${dir}/addons`,
    keysDir: `${ROOT}/${opts.keysDirName}`,
    buildDir: `${ROOT}/${opts.buildDirName}`,
    workshopIdFile: `${dir}/.workshop_id`,
    displayName: opts.displayName,
    serverOnly: opts.serverOnly,
    localOnly: opts.localOnly,
  };
}

export const SERVERPACK: ServerPackConfig = serverPackConfig({
  name: "DZSurvivalServerPack",
  dirName: "serverpack",
  keysDirName: ".serverpack-keys",
  buildDirName: ".serverpack-build",
  displayName: "DayZ Survival - Server Pack",
  serverOnly: false,
  localOnly: false,
});

export const SERVERPACK_SERVERONLY: ServerPackConfig = serverPackConfig({
  name: "DZSurvivalServerOnly",
  dirName: "serverpack-serveronly",
  keysDirName: ".serverpack-serveronly-keys",
  buildDirName: ".serverpack-serveronly-build",
  displayName: "DayZ Survival - Server-Only Pack",
  serverOnly: true,
  localOnly: true,
});

export const SERVER_PACKS: ServerPackConfig[] = [SERVERPACK, SERVERPACK_SERVERONLY];

// DayZ-Editor (the offline client-side building tool) saves its .dze files
// here, inside the client's Proton prefix - confirmed by locating an actual
// save on this machine. EDITOR_FILES_DIR is where @DayZ-Editor-Loader reads
// them from on the server side (auto-created under the mission root once
// that mod is active) - see editorSync.ts, which copies the newest save
// from one to the other.
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
export const DSCHECKSIGNATURES_EXE = `${DAYTOOLS_DIR}/Bin/DsUtils/DSCheckSignatures.exe`;

// KeyCard-Rooms-Better (@KeyCard-Rooms-Better) ships its own
// KeyCardSystemServerConfig.pbo with every T1/T2/T3 crate loot array
// completely empty ({"", ""} placeholders). Filled in via a separate
// -servermod= addon instead (safe: never touches this mod's own PBOs at
// all) - see serverpack-serveronly/addons/DZSurvivalKeycardLootOverride/.
// An earlier approach directly repacked+re-signed this mod's own PBO in
// place, which got every connecting client kicked ("Server has a more
// recent version") since it's loaded via -mod= (client-required) and DayZ
// enforces a content/version match there - reverted back to the stock copy.

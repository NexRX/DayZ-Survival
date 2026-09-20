import { PLACEHOLDER_POSITION } from "./common.ts";
import { NPC_BLACKMARKET_HASSAN } from "./npc.ts";

export const LOCATION = {
  romashka: [7986, 221, 11308], // safe-zone trader
  farm_perimeter: PLACEHOLDER_POSITION, // Hostile patrol are near Romashka
  coast_road: PLACEHOLDER_POSITION, // Kamenka–Romashka coastal road patrol route midpoint
  intel_building: PLACEHOLDER_POSITION, // Building containing the intel for the opening travel objective.
  solnichniy_checkpoint: PLACEHOLDER_POSITION, // Solnichniy outskirts - AI checkpoint / AI Camp location
  nwaf_outskirts: PLACEHOLDER_POSITION, // NWAF outskirts where the Cordon defector is found
  cherno_rooftop: PLACEHOLDER_POSITION, // Cherno high-ground vantage point for scouting
  cherno_block: PLACEHOLDER_POSITION, // Cherno/Electro police station block - Reaper stronghold (Act III climax)
  sery_docks_blackmarket: NPC_BLACKMARKET_HASSAN.Position, // black market trader
  kamenka_coast_stash: PLACEHOLDER_POSITION, // Kamenka coastline - buried stash (Treasure Hunt)
  stary_sobor_edge: PLACEHOLDER_POSITION, // Stary Sobor radiation patrol center from AIPatrolSettings.json.
  skalisty_stash: PLACEHOLDER_POSITION, // Skalisty radiation patrol center. Replace with the exact stash position.
  nwaf_perimeter: PLACEHOLDER_POSITION, // NWAF patrol center from AIPatrolSettings.json.
  nwaf_patrol: PLACEHOLDER_POSITION, // NWAF patrol center reused as the convoy route until a dedicated route is added.
  tisy_gate: PLACEHOLDER_POSITION, // Tisy mission/patrol center from DynamicAIMissions.json and AIPatrolSettings.json.
  shepherd_command_post: PLACEHOLDER_POSITION, // Final Shepherd command post for Acts IV-V.
  escape_zone: PLACEHOLDER_POSITION, // Compound exit used for the escape-zone objective.
  rally_point: PLACEHOLDER_POSITION, // Staging area used to regroup before the next push.
  lookout: PLACEHOLDER_POSITION, // Elevated position used to observe the surrounding area.
  burst_speed: PLACEHOLDER_POSITION, // Route used for the fast-movement travel objective.
  safe_route: PLACEHOLDER_POSITION, // Tree-lined route intended to avoid exposed ground.
  clear_building: PLACEHOLDER_POSITION, // Building selected for the room-by-room clearing objective.
  hospital: PLACEHOLDER_POSITION, // Hospital used for the infected sweep objective.
  hvip_marksman: PLACEHOLDER_POSITION, // Position of the hostile marksman calling in infected.
  warehouse: PLACEHOLDER_POSITION, // Warehouse used for the industrial infected-clear objective.
  rooftop_clear: PLACEHOLDER_POSITION, // Rooftops used for the elevated infected-clear objective.
  nighthunt: PLACEHOLDER_POSITION, // Area used for the nighttime infected hunt.
  roadblock: PLACEHOLDER_POSITION, // Roadblock occupied by the hostile camp.
  outpost: PLACEHOLDER_POSITION, // Forward outpost targeted for the camp raid.
  bunker: PLACEHOLDER_POSITION, // Sealed bunker used for the close-quarters camp sweep.
  factory: PLACEHOLDER_POSITION, // Factory floor used for the industrial camp clear.
  tank_graveyard: PLACEHOLDER_POSITION, // Vehicle graveyard used for the tank-graveyard camp.
  informant: PLACEHOLDER_POSITION, // Informant extraction point for the supply-drop lead.
  wounded_doctor: PLACEHOLDER_POSITION, // Safe position for extracting the wounded doctor.
  scientist_exfil: PLACEHOLDER_POSITION, // Extraction point for the scientist evacuation.
  shepherd_captive: PLACEHOLDER_POSITION, // Extraction point for the Shepherd captive.
  roaming_group: PLACEHOLDER_POSITION, // Area occupied by the roaming hostile group.
  hunter_patrol: PLACEHOLDER_POSITION, // Hunting ground for the tracking patrol.
  night_stalkers: PLACEHOLDER_POSITION, // Night route used by the stalking patrol.
  drowned_crate: PLACEHOLDER_POSITION, // River location containing the drowned crate.
  abandoned_postbox: PLACEHOLDER_POSITION, // Abandoned postbox hiding the treasure.
  oak_cache: PLACEHOLDER_POSITION, // Oak tree landmark hiding the buried cache.
  rooftop_vent: PLACEHOLDER_POSITION, // Rooftop ventilation shaft hiding the cache.
  under_bridge: PLACEHOLDER_POSITION, // Bridge underside containing the discarded stash.
} as const;

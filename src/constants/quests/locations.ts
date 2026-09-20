import { PLACEHOLDER_POSITION } from "./common.ts";
import { NPC_BLACKMARKET_HASSAN } from "./npc.ts";

export const LOCATION = {
  romashka: [7986, 221, 11308],
  // Green Mountain Raider patrol center used as the Romashka-area threat.
  farm_perimeter: PLACEHOLDER_POSITION,
  // Kamenka–Romashka coastal road - Reaper patrol route midpoint
  coast_road: PLACEHOLDER_POSITION, // PLACEHOLDER: road between Kamenka and Romashka
  // Solnichniy outskirts - Reaper checkpoint / AI Camp location
  solnichniy_checkpoint: PLACEHOLDER_POSITION, // PLACEHOLDER: Solnichniy outskirts
  // NWAF outskirts where the Cordon defector is found
  nwaf_outskirts: PLACEHOLDER_POSITION, // PLACEHOLDER: NWAF approach road
  // Cherno high-ground vantage point for scouting
  cherno_rooftop: PLACEHOLDER_POSITION, // PLACEHOLDER: Cherno elevated position
  // Cherno/Electro police station block - Reaper stronghold (Act III climax)
  cherno_block: PLACEHOLDER_POSITION, // PLACEHOLDER: Cherno police station
  sery_docks: NPC_BLACKMARKET_HASSAN.Position,
  // Kamenka coastline - buried stash (Treasure Hunt)
  kamenka_coast_stash: PLACEHOLDER_POSITION, // PLACEHOLDER: coastline near Kamenka
  // Stary Sobor radiation patrol center from AIPatrolSettings.json.
  stary_sobor_edge: PLACEHOLDER_POSITION,
  // Skalisty radiation patrol center. Replace with the exact stash position.
  skalisty_stash: PLACEHOLDER_POSITION,
  // NWAF patrol center from AIPatrolSettings.json.
  nwaf_perimeter: PLACEHOLDER_POSITION,
  // NWAF patrol center reused as the convoy route until a dedicated route is added.
  nwaf_patrol: PLACEHOLDER_POSITION,
  // Tisy mission/patrol center from DynamicAIMissions.json and AIPatrolSettings.json.
  tisy_gate: PLACEHOLDER_POSITION,
  // PLACEHOLDER: final Shepherd command post for Acts IV-V.
  shepherd_command_post: PLACEHOLDER_POSITION,
} as const;

import { NPC_BLACKMARKET_SERY } from "./npc.ts";

// PLACEHOLDER markers mean "fill these in before your first playtest".
export const LOCATION = {
  // Romashka Farm - use the same CUSTOM_POSITION as the trader compound
  romashka: [7986, 221, 11308],
  // Romashka perimeter treeline where Reaper scouts are spotted
  farm_perimeter: [0, 0, 0], // PLACEHOLDER: near Romashka treeline
  // Kamenka–Romashka coastal road - Reaper patrol route midpoint
  coast_road: [4900.0, 10.0, 5600.0], // PLACEHOLDER: road between Kamenka and Romashka
  // Solnichniy outskirts - Reaper checkpoint / AI Camp location
  solnichniy_checkpoint: [5200.0, 10.0, 5400.0], // PLACEHOLDER: Solnichniy outskirts
  // NWAF outskirts where the Cordon defector is found
  nwaf_outskirts: [4700.0, 10.0, 10100.0], // PLACEHOLDER: NWAF approach road
  // Cherno high-ground vantage point for scouting
  cherno_rooftop: [4650.0, 15.0, 6100.0], // PLACEHOLDER: Cherno elevated position
  // Cherno/Electro police station block - Reaper stronghold (Act III climax)
  cherno_block: [4640.0, 5.0, 6080.0], // PLACEHOLDER: Cherno police station
  // Kamenka/Solnichniy dock area - Sery's black-market territory
  sery_docks: NPC_BLACKMARKET_SERY.Position,
  // Kamenka coastline - buried stash (Treasure Hunt)
  kamenka_coast_stash: [4820.0, 5.0, 5720.0], // PLACEHOLDER: coastline near Kamenka
  // Stary Sobor radiation zone edge - outer perimeter
  stary_sobor_edge: [6150.0, 0.0, 7700.0], // PLACEHOLDER: Sobor zone edge
  // Skalisty Island - buried core sample stash
  skalisty_stash: [3500.0, 5.0, 8500.0], // PLACEHOLDER: Skalisty Island coast
  // NWAF outer perimeter - Cordon scientist extraction point
  nwaf_perimeter: [4600.0, 10.0, 10050.0], // PLACEHOLDER: NWAF wire perimeter
  // NWAF outer patrol loop - Cordon convoy route
  nwaf_patrol: [4650.0, 10.0, 10150.0], // PLACEHOLDER: NWAF outer loop
  // Tisy main gate - Cordon's last defensive line (campaign climax)
  tisy_gate: [7500.0, 10.0, 7200.0], // PLACEHOLDER: Tisy main checkpoint
} as const;

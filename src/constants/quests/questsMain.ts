import { Quest, QUEST_CONFIG_DIR, QuestType } from "../types/quest.ts";
import * as objectives from "./objectives.ts";
import { ref } from "./objectives.ts";
import {
  configToRecord,
  currency,
  fixQuests,
  item,
  QUEST_CONFIG_VERSION,
  reward,
  rgb,
} from "./common.ts";
import { NPC_TASKMASTER_DANIELS } from "./npc.ts";
import { FALSE, TRUE } from "../types/common.ts";

const MAIN_QUEST_DEFAULTS = {
  Type: QuestType.NORMAL,
  ConfigVersion: QUEST_CONFIG_VERSION,
  QuestColor: rgb(255, 180, 0),
  QuestGiverIDs: [NPC_TASKMASTER_DANIELS.ID],
  QuestTurnInIDs: [NPC_TASKMASTER_DANIELS.ID],
  SequentialObjectives: TRUE,
  CancelQuestOnPlayerDeath: FALSE,
  IsAchievement: FALSE,
  IsGroupQuest: FALSE,
  Active: TRUE,
  Autocomplete: FALSE,
  NeedToSelectReard: FALSE,
};

// Campaign premise: Daniels is using expendable survivors to trace the origin of
// the Raiders occupying the red zones, and the signal drawing them there.
// Location coordinates live in locations.ts and are intentionally easy to replace.
const MAIN_QUEST_ACT1_REACH_ROMASHKA: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 1,
  Title: "Act I: Get Up",
  ObjectiveText: "Reach Romashka Farm Safe Area",
  Descriptions: [
    "I woke up face-down in the sand, salt in my mouth, with very few things but most notably, a map. Among the scribbles is a location marked 'Trader Farm, Safe'. Is this my salvation?",
    "The fence looks like it was built by people who could just about protect themselves in this wasteland. A guard waves me through. Another man looks me over and asks, 'Looking for a job?'",
    "Daniels says the farm survives because it sees trouble before trouble arrives. If I want food, shelter, and answers, I need to prove I can reach the fence alive.",
  ],
  // Empty QuestGiverIDs and PreQuestIDs = auto assigned quest
  QuestGiverIDs: [],
  PreQuestIDs: [],
  Objectives: [ref(objectives.TRAVEL_ROMASHKA_FARM)],
  Rewards: [reward("Tomato"), currency(3.5)],
  Active: TRUE,
  FollowUpQuest: 2,
};

const MAIN_QUEST_ACT1_FARM_SURVIVAL: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 2,
  Title: "Act I: A Place That Still Grows",
  ObjectiveText: "Help Romashka prepare for another night.",
  Descriptions: [
    "Daniels will not waste ammunition on a stranger. He gives me the kind of work that keeps a settlement alive: food, water, and soil under the fingernails.",
    "The farm has enough land to grow, but not enough hands to defend it. Every plank and every seed bought by scavenging is one more day the fence holds.",
    "The garden is tended and the stockpile is heavier. Daniels finally tells me the attacks are not random. Someone—or something—is testing the farm.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT1_REACH_ROMASHKA.ID],
  QuestItems: [item("HandSaw"), item("Shovel"), item("ZucchiniSeedsPack")],
  Objectives: [
    ref(objectives.ACTION_FARMING),
    ref(objectives.COLLECT_BUILDING_MATERIALS),
  ],
  Rewards: [reward("Canteen"), reward("BandageDressing", 3), currency(5)],
  FollowUpQuest: 3,
};

const MAIN_QUEST_ACT1_RAIDER_SCOUTS: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 3,
  Title: "Act I: I Will Find You...",
  ObjectiveText: "Find and break the scouts watching Romashka.",
  Descriptions: [
    "We've spotted tracks outside the of camp that are too clean for infected. I believe its a scouting party from a faction called Raiders: armed scavengers who move with the patience of hunters and leave no witnesses when they can help it. We need to nip this in the bud while we still can",
    "That scouting party is still nearby. Kill the scouts before they learn the farm's routines, we can't let them reveal our weaknesses.",
    "The scouts carried a hand-drawn mark: a red circle around Stary Sobor. Daniels says the radiation zones are not just dangerous—they are being used.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT1_FARM_SURVIVAL.ID],
  Objectives: [ref(objectives.AIPATROL_RAIDER_PERIMETER)],
  Rewards: [reward("GPSReceiver"), reward("Battery9V"), currency(7.5)],
  FollowUpQuest: 4,
};

const MAIN_QUEST_ACT2_FOLLOW_THE_SIGNAL: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 4,
  Title: "Act II: Follow the Signal",
  ObjectiveText: "Reach the coastal route and prepare to enter the red zone.",
  Descriptions: [
    "The Raiders were not scouting Romashka. They were measuring it. Daniels has one lead: an old transmission that begins whenever the Stary zone goes loud.",
    "Take the coastal road and build something that can keep you alive when the clean air ends. The map marks Stary's outer edge, but the dead do not respect map lines.",
    "The signal is stronger here. Beneath the static is a repeating phrase: 'room seven'. Daniels wants the source, whatever is left of it.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT1_RAIDER_SCOUTS.ID],
  Objectives: [
    ref(objectives.TRAVEL_COASTAL_ROAD),
    ref(objectives.CRAFT_DUST_MASK),
  ],
  Rewards: [reward("Canteen"), reward("Morphine", 2), currency(10)],
  FollowUpQuest: 5,
};

const MAIN_QUEST_ACT2_STARY_RED_ROOM: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 5,
  Title: "Act II: The Red Rooms",
  ObjectiveText: "Break into the Stary Sobor zone and recover the buried evidence.",
  Descriptions: [
    "Stary Sobor is a wound in the map. The radiation is bad enough to kill slowly; the AI inside makes sure nobody has time to wait for it.",
    "Daniels believes the keycard rooms were not built to protect supplies. They were built to hide records. Clear the guards, find the cache, and do not stay for curiosity's sake.",
    "The buried case contains a melted keycard and a fragment of a research log. The same signal was broadcast from an island to the east: Skalisty.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT2_FOLLOW_THE_SIGNAL.ID],
  Objectives: [
    ref(objectives.AICAMP_STARY_RAD_ZONE),
    ref(objectives.TREASUREHUNT_STARY_EVIDENCE),
  ],
  Rewards: [reward("TetracyclineAntibiotics", 2), currency(15)],
  FollowUpQuest: 6,
};

const MAIN_QUEST_ACT2_EXTRACT_THE_DEFECTOR: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 6,
  Title: "Act II: Someone Who Knows",
  ObjectiveText: "Extract the scientist from the Cordon perimeter and return the evidence.",
  Descriptions: [
    "The log names a Cordon scientist who understood the signal. She was moved north before the collapse and may still be alive near the airfield perimeter.",
    "Get her out alive. The Raiders are not protecting the scientist—they are trying to move her before anyone can ask what the keycard rooms were really for.",
    "The scientist confirms the signal is a lure. It gathers AI around selected sites, making the zones into prisons. She knows how to shut it down, but the transmitter is at Tisy.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT2_STARY_RED_ROOM.ID],
  Objectives: [
    ref(objectives.AIVIP_EXTRACT_SCIENTIST),
    ref(objectives.DELIVERY_MEDICAL_TO_ROMASHKA),
  ],
  Rewards: [reward("Epinephrine"), reward("SalineBagIV"), currency(20)],
  FollowUpQuest: 7,
};

const MAIN_QUEST_ACT3_SKALISTY_TRUTH: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 7,
  Title: "Act III: No Safe Shore",
  ObjectiveText: "Recover the transmitter component from Skalisty Island.",
  Descriptions: [
    "The scientist's notes point to Skalisty. The island's radiation zone was a test site, and one component of the transmitter was never recovered.",
    "Cross the water, search the dead, and take the component from wherever Cordon buried it. The island is crawling with AI that never received the order to stand down.",
    "The component still pulses in your hands. It is not a beacon. It is a command key—and someone at Tisy is waiting for it.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT2_EXTRACT_THE_DEFECTOR.ID],
  Objectives: [ref(objectives.TREASUREHUNT_SKALISTY_CACHE)],
  Rewards: [reward("NBCGlovesGray"), currency(25)],
  FollowUpQuest: 8,
};

const MAIN_QUEST_ACT3_BREAK_THE_CONVOY: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 8,
  Title: "Act III: The Last Convoy",
  ObjectiveText: "Stop the Cordon convoy carrying the transmitter core.",
  Descriptions: [
    "The command key is useless without the core. A Cordon convoy is moving it toward Tisy under heavy escort, and Daniels cannot spare a single guard from Romashka.",
    "Hit the convoy before it reaches the gate. The road is open, the AI is numerous, and the people inside know exactly what happens when the signal is silenced.",
    "The convoy is broken. The core is yours. Daniels says the transmitter can be destroyed—but only after the final broadcast begins.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT3_SKALISTY_TRUTH.ID],
  Objectives: [ref(objectives.AIPATROL_CONVOY_ESCORT)],
  Rewards: [reward("AmmoBox_762x39_20Rnd"), reward("Morphine", 2), currency(30)],
  FollowUpQuest: 9,
};

const MAIN_QUEST_ACT3_SHUTDOWN: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 9,
  Title: "Act III: The Quiet After",
  ObjectiveText: "End the signal at Tisy and decide what survives.",
  Descriptions: [
    "The transmitter is waking up. Every AI patrol on the map is drifting toward Tisy, and the final broadcast will turn the whole northern forest into a kill zone.",
    "Take the core to the gate, fight through the last line, and shut the machine down. Do not expect a clean victory; there may not be enough of the old world left for one.",
    "The signal dies. For the first time since waking on the coast, the map is silent. Daniels offers a place at Romashka, but the silence leaves one question: who built the machine, and who will come looking for it?",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT3_BREAK_THE_CONVOY.ID],
  Objectives: [
    ref(objectives.AICAMP_TISY_TRANSMITTER),
    ref(objectives.CRAFT_PIPE_BOMB),
  ],
  Rewards: [reward("PlateCarrierVest"), reward("Canteen"), currency(50)],
  FollowUpQuest: 10,
};

const MAIN_QUEST_ACT4_SIGNAL_AFTERSHOCK: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 10,
  Title: "Act IV: Signal Aftershock",
  ObjectiveText: "Find out what the dead transmitter woke up.",
  Descriptions: [
    "The signal is dead, but the map is not quiet. Radios are crackling from places that should have no power, and the survivors who heard the last broadcast are disappearing.",
    "Daniels wants proof that the shutdown worked. Scavenge working radio parts and reach the overlook where the first aftershock was recorded.",
    "The aftershock is not coming from Tisy. It is moving between relay sites, following the old civilian emergency network. Someone prepared a second route.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT3_SHUTDOWN.ID],
  Objectives: [
    ref(objectives.COLLECT_RADIO_PARTS),
    ref(objectives.TRAVEL_LOOKOUT),
  ],
  Rewards: [reward("ItemRadio"), reward("Battery9V", 2), currency(35)],
  FollowUpQuest: 11,
};

const MAIN_QUEST_ACT4_BROKEN_RELAY: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 11,
  Title: "Act IV: The Broken Relay",
  ObjectiveText: "Search the relay vehicle and recover its control hardware.",
  Descriptions: [
    "The relay network was maintained by mobile crews. One of their vehicles is still parked near the old service route, surrounded by the kind of silence that usually means an ambush.",
    "Open the vehicle, strip the useful parts, and bring back anything that can identify the next relay. The machine may be dead, but its maintenance trail is not.",
    "The control hardware carries a route stamped with a civilian evacuation code. The destination is an abandoned hospital, and the code is still being used.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT4_SIGNAL_AFTERSHOCK.ID],
  Objectives: [
    ref(objectives.ACTION_OPEN_VEHICLE_HOOD),
    ref(objectives.COLLECT_WEAPON_PARTS),
  ],
  Rewards: [reward("FNP45_MRDSOptic"), reward("PistolSuppressor"), currency(40)],
  FollowUpQuest: 12,
};

const MAIN_QUEST_ACT4_HOSPITAL_BROADCAST: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 12,
  Title: "Act IV: Ward Zero",
  ObjectiveText: "Clear the hospital and recover the emergency broadcast ledger.",
  Descriptions: [
    "The hospital was listed as an evacuation point, but no evacuation ever reached it. The relay crew used the wards as a holding site for people who heard the signal.",
    "Sweep every floor. Whatever is inside has had years to learn the corridors, and the ledger will be buried beneath the bodies if you leave anything standing.",
    "The ledger names a network called the Shepherds. They did not build the transmitter; they used it to decide which settlements lived long enough to be useful.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT4_BROKEN_RELAY.ID],
  Objectives: [
    ref(objectives.TARGET_HOSPITAL_SWEEP),
    ref(objectives.TRAVEL_RALLY_POINT),
  ],
  Rewards: [reward("TetracyclineAntibiotics", 3), reward("SalineBagIV"), currency(45)],
  FollowUpQuest: 13,
};

const MAIN_QUEST_ACT4_SHEPHERD_WITNESS: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 13,
  Title: "Act IV: The Shepherd's Witness",
  ObjectiveText: "Extract the last relay technician alive.",
  Descriptions: [
    "The ledger says one technician survived the hospital purge. He was moved before the Shepherds arrived and may still be alive, carrying the access sequence for the emergency network.",
    "Find him and bring him out. The Shepherds will kill their own people to keep that sequence buried, and the technician knows exactly what the network was designed to do.",
    "The technician confirms the relays can still broadcast a kill order to every connected AI faction. The final relay is hidden beneath an old bridge.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT4_HOSPITAL_BROADCAST.ID],
  Objectives: [
    ref(objectives.AIVIP_SCIENTIST_EXFIL),
    ref(objectives.DELIVERY_GUNSMITH_KIT),
  ],
  Rewards: [reward("Epinephrine"), reward("Morphine", 2), currency(50)],
  FollowUpQuest: 14,
};

const MAIN_QUEST_ACT4_BURIED_HANDSHAKE: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 14,
  Title: "Act IV: Buried Handshake",
  ObjectiveText: "Recover the relay handshake and prepare the counter-broadcast.",
  Descriptions: [
    "The technician's route ends at the bridge. Beneath it, the Shepherds buried a physical handshake key used to authenticate emergency broadcasts when the grid was still alive.",
    "Dig it up, then build enough ammunition to survive the trip to the final relay. There will be no second attempt once the handshake is used.",
    "The key is intact. Its last authenticated command was not a shutdown—it was a population purge. Daniels says the final relay must be destroyed before anyone can issue it again.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT4_SHEPHERD_WITNESS.ID],
  Objectives: [
    ref(objectives.TREASUREHUNT_UNDER_BRIDGE),
    ref(objectives.CRAFT_AMMO_PACK),
  ],
  Rewards: [reward("AmmoBox_762x39_20Rnd", 2), reward("Canteen"), currency(60)],
  FollowUpQuest: 15,
};

const MAIN_QUEST_ACT5_BLACK_LEDGER: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 15,
  Title: "Act V: The Black Ledger",
  ObjectiveText: "Find the Shepherds' command post and recover their target list.",
  Descriptions: [
    "The handshake identifies the command post, but not its exact room. The Shepherds left watchers on the rooftops to burn the ledger if anyone gets close.",
    "Clear the high ground and search the marked ventilation shaft. The target list may tell Daniels which settlements are next—or prove Romashka was always on it.",
    "The ledger contains Romashka's name, crossed out only because the transmitter failed. The Shepherds have moved to a new command post and are preparing a manual purge.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT4_BURIED_HANDSHAKE.ID],
  Objectives: [
    ref(objectives.TARGET_ROOFTOP_CLEAR),
    ref(objectives.TREASUREHUNT_ROOFTOP_VENT),
  ],
  Rewards: [reward("PlateCarrierVest"), reward("AmmoBox_762x39_20Rnd"), currency(65)],
  FollowUpQuest: 16,
};

const MAIN_QUEST_ACT5_HOSTAGES: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 16,
  Title: "Act V: No Witnesses",
  ObjectiveText: "Rescue the people the Shepherds kept alive as leverage.",
  Descriptions: [
    "The target list includes survivors being kept alive as bargaining pieces. One of them was taken from a failed convoy and is being held somewhere near the command post.",
    "Get the captive out without turning the building into a grave. The Shepherds will use the hostage as bait, and the infected will follow every gunshot.",
    "The captive is safe for the moment. They remember a marksman on the eastern roof calling in reinforcements whenever anyone tries to escape.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT5_BLACK_LEDGER.ID],
  Objectives: [
    ref(objectives.AIVIP_SHEPHERD_CAPTIVE),
    ref(objectives.COLLECT_BODY_GEAR),
  ],
  Rewards: [reward("BandageDressing", 5), reward("Canteen"), currency(70)],
  FollowUpQuest: 17,
};

const MAIN_QUEST_ACT5_BURN_THE_ROUTE: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 17,
  Title: "Act V: Burn the Route",
  ObjectiveText: "Cut the Shepherds' supply route before the final assault.",
  Descriptions: [
    "The command post is being resupplied through a marked warehouse route. If the Shepherds keep their ammunition and fuel, they can hold the settlement hostage for another year.",
    "Clear the warehouse, recover the emergency documents, and light a signal that tells Daniels the route is open for the final push.",
    "The supply line is broken. The marksman is still alive on the roof, and every remaining Shepherd is converging on the command room.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT5_HOSTAGES.ID],
  Objectives: [
    ref(objectives.TARGET_WAREHOUSE_CLEAR),
    ref(objectives.CRAFT_FLARE_BATON),
  ],
  Rewards: [reward("AmmoBox_762x39_20Rnd", 2), reward("Epinephrine"), currency(75)],
  FollowUpQuest: 18,
};

const MAIN_QUEST_ACT5_EXECUTIONER: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 18,
  Title: "Act V: The Executioner",
  ObjectiveText: "Silence the Shepherd marksman and deliver the command ledger.",
  Descriptions: [
    "The marksman is more than a guard. He is the Shepherds' executioner, the one who decides which captives are worth keeping and which are made into warnings.",
    "Put him down, take the ledger, and deliver it to Daniels. The final page contains the authentication phrase for the manual purge.",
    "The executioner is dead. The ledger is in Daniels' hands, but the phrase is already being broadcast from inside the command post.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT5_BURN_THE_ROUTE.ID],
  Objectives: [
    ref(objectives.AIPATROL_SHEPHERD_EXECUTIONER),
    ref(objectives.DELIVERY_INTEL_PACKAGE),
  ],
  Rewards: [reward("Morphine", 3), reward("AmmoBox_762x39_20Rnd", 2), currency(80)],
  FollowUpQuest: 19,
};

const MAIN_QUEST_ACT5_LAST_COMMAND: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 19,
  Title: "Act V: The Last Command",
  ObjectiveText: "Destroy the Shepherd command post before the purge completes.",
  Descriptions: [
    "The command post is broadcasting the purge manually. The old network may be broken, but a human voice can still turn every connected patrol into a weapon.",
    "Break through the last defenders, reach the command room, and destroy the route before the phrase finishes. There is no clean way to end this—only a final choice about what to leave standing.",
    "The command room burns. Daniels has the ledger, the survivors have a place at Romashka, and the factions that once answered the signal are finally blind. The coast is still hell, but for once, the next threat will have to find you by hand.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT5_EXECUTIONER.ID],
  Objectives: [
    ref(objectives.AICAMP_SHEPHERD_COMMAND),
    ref(objectives.TRAVEL_ESCAPE_ZONE),
  ],
  Rewards: [reward("PlateCarrierVest"), reward("Canteen"), currency(100)],
};

const MAIN_QUESTS: Quest[] = fixQuests([
  MAIN_QUEST_ACT1_REACH_ROMASHKA,
  MAIN_QUEST_ACT1_FARM_SURVIVAL,
  MAIN_QUEST_ACT1_RAIDER_SCOUTS,
  MAIN_QUEST_ACT2_FOLLOW_THE_SIGNAL,
  MAIN_QUEST_ACT2_STARY_RED_ROOM,
  MAIN_QUEST_ACT2_EXTRACT_THE_DEFECTOR,
  MAIN_QUEST_ACT3_SKALISTY_TRUTH,
  MAIN_QUEST_ACT3_BREAK_THE_CONVOY,
  MAIN_QUEST_ACT3_SHUTDOWN,
  MAIN_QUEST_ACT4_SIGNAL_AFTERSHOCK,
  MAIN_QUEST_ACT4_BROKEN_RELAY,
  MAIN_QUEST_ACT4_HOSPITAL_BROADCAST,
  MAIN_QUEST_ACT4_SHEPHERD_WITNESS,
  MAIN_QUEST_ACT4_BURIED_HANDSHAKE,
  MAIN_QUEST_ACT5_BLACK_LEDGER,
  MAIN_QUEST_ACT5_HOSTAGES,
  MAIN_QUEST_ACT5_BURN_THE_ROUTE,
  MAIN_QUEST_ACT5_EXECUTIONER,
  MAIN_QUEST_ACT5_LAST_COMMAND,
]);

export const MAIN_QUESTS_CONFIGS = configToRecord(MAIN_QUESTS, `${QUEST_CONFIG_DIR}/Quest_`);

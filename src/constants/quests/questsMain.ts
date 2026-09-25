import type { Quest } from "../types/quest.d.ts";
import { QuestType } from "../types/common.ts";
import { QUEST_CONFIG_DIR } from "../paths.ts";
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
  safetyChecks,
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

// Campaign premise: Daniels is using new survivors to trace the origin of
// the Raiders occupying the red zones, and the signal drawing them there.
// Location coordinates live in locations.ts and are intentionally easy to replace.
const MAIN_QUEST_ACT1_REACH_ROMASHKA: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 1,
  Title: "Act I: Get Up",
  ObjectiveText: "Reach Romashka Farm Safe Area",
  Descriptions: [
    "I woke up face-down in the sand, salt in my mouth, with very few things but most notably thing is a map. Among the scribbles is a location marked 'Trader Farm, Safe'. Might as well find out how true that is.",
    "The fence looks like it was built by people who could just about protect themselves in this wasteland. A guard scans my appearance, see's I'm barely a threat and waves me through. Another man looks me over and asks, 'Looking for work?'",
    "Daniels says the farm survives because it sees trouble before trouble arrives. If I more than to survive, I need to give before I can take anymore.",
  ],
  // Empty QuestGiverIDs and PreQuestIDs = auto assigned quest
  QuestGiverIDs: [],
  PreQuestIDs: [],
  Objectives: [
    ref(objectives.ACTI_TRAVEL_ROMASHKA_FARM),
  ],
  Rewards: [reward("BakedBeansCan_Opened"), currency(5)],
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
    "The farm has enough land to grow, but not enough hands to defend it. Every plank and every seed planted is one more day we're likely to live.",
    "The garden is tended and the stockpile is heavier. Daniels finally tells me the attacks are not random. Someone—or something—is testing the farm.",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT1_REACH_ROMASHKA.ID],
  QuestItems: [item("Shovel"), item("ZucchiniSeedsPack")],
  Objectives: [
    ref(objectives.ACTI_ACTION_FARMING),
    ref(objectives.ACTI_COLLECT_BUILDING_MATERIALS),
  ],
  Rewards: [reward("Canteen"), reward("BandageDressing", 2), currency(10)],
  FollowUpQuest: 3,
};

const MAIN_QUEST_ACT1_RAIDER_SCOUTS: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 3,
  Title: "Act I: I Will Find You...",
  ObjectiveText: "Find and break the scouts watching Romashka.",
  Descriptions: [
    'Daniels: "We\'ve spotted tracks outside the of camp that are too clean for infected. I believe its a scouting party from a faction called Raiders: armed scavengers who move with the patience of hunters and leave no witnesses when they can help it. We need to nip this in the bud while we still can"',
    "That scouting party is still nearby. Kill the scouts before they learn the farm's routines, we can't let them reveal our weaknesses.",
    'Daniels: "The scouts have been delete with for now, they won\'t be exposing Romashka farms any time soon thaks to you! Use these to find your location on the map in a pinch", he hands me a GPS, this will certainly come in handy.',
  ],
  PreQuestIDs: [MAIN_QUEST_ACT1_FARM_SURVIVAL.ID],
  Objectives: [
    ref(objectives.ACTI_TRAVEL_SEVEROGRAD_RAIDERS),
    ref(objectives.ACTI_AIPATROL_RAIDER_SEVEROGRAD),
  ],
  Rewards: [reward("GPSReceiver"), reward("Battery9V"), currency(15)],
  FollowUpQuest: 4,
};

const MAIN_QUEST_ACT1_DIGGING_FOR_ANSWERS: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 4,
  Title: "Act I: Digging for Answers",
  ObjectiveText: "Follow the scouts' notes to their forward camp and find out what they buried.",
  Descriptions: [
    'Daniels turns the notes we recovered for him over in his hands. "Coordinates, not orders. They marked a camp east of here, and something they didn\'t want to carry back with them. I want to know what it was."',
    "The camp is abandoned but not empty. Somewhere in this mess of tarps and firepits is whatever the scouts thought was worth burying instead of hauling home.",
    "\"You're back! Great, what did interesting?\" Daniels asks. I had over the notebook, he flicks through the notes with a puzzled expression. \"A cache with a coded notebook? Mhm, and this deliberate. they'll be looking for this I bet. Someone up their chain is planning further ahead than I'd like... Thanks, here's your payment.\"",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT1_RAIDER_SCOUTS.ID],
  Objectives: [
    ref(objectives.ACTI_TRAVEL_RAIDER_CAMP),
    ref(objectives.ACTI_TREASUREHUNT_RAIDER_CACHE),
  ],
  Rewards: [reward("TacticalBaconCan"), reward("CanOpener"), currency(20)],
  FollowUpQuest: 5,
};

const MAIN_QUEST_ACT1_DIGGING_IN: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 5,
  Title: "Act I: Digging In",
  ObjectiveText:
    "Help learn defences for Romashka before the Raiders come looking for their cache.",
  Descriptions: [
    "Daniels: \"When they notice that cache is gone, they'll be pissed and undoubtly search for it, and given the scotts we fucking killed, they may divert people to find us. I'd rather they find a strong defence than a weak one. Figure out how we can make watch towers with whatever you can find. Do that and then we'll pay you handsomely for the lessons learnt.\"",
    "Timber, wire, and a working pair of eyes up high, we might just be able to make this watchtower plank by plank while a stockpile grows underneath it.",
    '"Welcome as usual, looks like you\'ve learnt a thing or too." Daniels remarks. I begin to start explain the resources I used to build a watch tower and explain some of the farming techniques I\'ve employed. His expression almost turns to a smile as he utters "First time in weeks this place has felt like it could hold off against more than zeds. Heres your tution fee."',
  ],
  PreQuestIDs: [MAIN_QUEST_ACT1_DIGGING_FOR_ANSWERS.ID],
  QuestItems: [item("ExpansionBarbedWireKit"), item("ExpansionFloorKit", 2)],
  Objectives: [
    ref(objectives.ACTI_CRAFTING_WATCHTOWER),
    ref(objectives.ACTI_DELIVERY_TOWER_KITS),
  ],
  Rewards: [
    reward("TacticalBaconCan"),
    reward("Matchbox"),
    reward("Pot"),
    reward("CookingStand"),
    currency(25),
  ],
  FollowUpQuest: 6,
};

const MAIN_QUEST_ACT1_SIGNAL_IN_THE_STATIC: Quest = {
  ...MAIN_QUEST_DEFAULTS,
  ID: 6,
  Title: "Act I: Signal in the Static",
  ObjectiveText: "Find and silence whoever is calling the Raiders in.",
  Descriptions: [
    "Daniels: \"Remember that cache? It had a radio log. Someone's been transmitting units eastwards for weeks. Fuck! the bandit factions usually focus westwards... Find out who's running this Raider group, we need to make the east not worth it. IF we leave behind the cache's logbock they'll get the message. I've managed to partial decode their messages, head out to the military camp at the northern tip of the North West Airfield and fuck 'em up good! You'll be paid quite well in return. In the mean time, I'll be sending some men to head out to other positions we've learnt\"",
    "I need to head to the military camp at the northern tip of the North West Airfield. I should expect Raiders and should kill as many of them as I can in order to put them on the retreat.",
    "Daniels dejectedly looks my way as I return. \"This wasn't local. Whatever's coordinating these Raiders, it's bigger than small set of camp, We've bashed in the bee's nest alright but they'll be back for blood. No backing out now... But you've done well and earn't us some more breathing space, take this hand gun as a reward, It's specially engraved and will defind you well.\". I can tell this isn't over, I should come back later when Daniels has a plan",
  ],
  PreQuestIDs: [MAIN_QUEST_ACT1_DIGGING_IN.ID],
  Objectives: [
    ref(objectives.ACTI_TARGET_RAIDER_GUARDS),
    ref(objectives.ACTI_AIVIP_SIGNAL_OPERATOR),
  ],
  Rewards: [
    reward("Engraved1911"),
    reward("Mag_1911_7Rnd"),
    reward("PistolSuppressor"),
    reward("AmmoBox_9x19_25rnd"),
    currency(30),
  ],
};

export const MAIN_QUESTS: Quest[] = safetyChecks(
  fixQuests([
    MAIN_QUEST_ACT1_REACH_ROMASHKA,
    MAIN_QUEST_ACT1_FARM_SURVIVAL,
    MAIN_QUEST_ACT1_RAIDER_SCOUTS,
    MAIN_QUEST_ACT1_DIGGING_FOR_ANSWERS,
    MAIN_QUEST_ACT1_DIGGING_IN,
    MAIN_QUEST_ACT1_SIGNAL_IN_THE_STATIC,
  ]),
  "Quests (Main)",
);

export const MAIN_QUESTS_CONFIGS = configToRecord(MAIN_QUESTS, `${QUEST_CONFIG_DIR}/Quest_`);

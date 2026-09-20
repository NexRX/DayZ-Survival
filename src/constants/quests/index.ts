import { QUEST_SETTINGS_CONFIG, QuestSettings, WeeklyResetDay } from "../types/quest.ts";
import { ALL_NPC_CONFIGS } from "./npc.ts";
import { ALL_OBJECTIVE_CONFIGS } from "./objectives.ts";
import { MAIN_QUESTS_CONFIGS } from "./questsMain.ts";
import { SIDE_QUESTS_CONFIGS } from "./questsSide.ts";

const QUEST_SETTINGS: QuestSettings = {
  m_Version: 10,
  EnableQuests: 1,
  EnableQuestLogTab: 1,
  CreateQuestNPCMarkers: 1,
  QuestAcceptedTitle: "Quest Accepted",
  QuestAcceptedText: "The quest %1 has been accepted!",
  QuestCompletedTitle: "Quest Completed",
  QuestCompletedText: "All objectives of the quest %1 have been completed.",
  QuestFailedTitle: "Quest Failed",
  QuestFailedText: "The quest %1 failed!",
  QuestCanceledTitle: "Quest Canceled",
  QuestCanceledText: "The quest %1 has been canceled!",
  QuestTurnInTitle: "Quest Turn-In",
  QuestTurnInText: "The quest %1 has been completed!",
  QuestObjectiveCompletedTitle: "Objective Completed",
  QuestObjectiveCompletedText: "You have completed objective %1 of the quest %2.",
  QuestCooldownTitle: "Quest Cooldown",
  QuestCooldownText: "This quest is still on cooldown! Come back in %1.",
  QuestNotInGroupTitle: "Group Quest",
  QuestNotInGroupText: "Group quests can only be accepted while in a group!",
  QuestNotGroupOwnerTitle: "Group Quest",
  QuestNotGroupOwnerText: "Only a group owner can accept and turn in a group quest!",
  GroupQuestMode: 0,
  AchievementCompletedTitle: 'Achievement "%1" completed!',
  AchievementCompletedText: "%1",
  WeeklyResetDay: WeeklyResetDay.Wednesday,
  WeeklyResetMinute: 0,
  WeeklyResetHour: 8,
  DailyResetHour: 8,
  DailyResetMinute: 0,
  UseUTCTime: 0,
  UseQuestNPCIndicators: 1,
  MaxActiveQuests: 10,
};

export const ALL_QUEST_CONFIGS = {
  [QUEST_SETTINGS_CONFIG]: QUEST_SETTINGS,
  ...QUEST_SETTINGS,
  ...ALL_OBJECTIVE_CONFIGS,
  ...MAIN_QUESTS_CONFIGS,
  ...SIDE_QUESTS_CONFIGS,
  ...ALL_NPC_CONFIGS,
} as const;

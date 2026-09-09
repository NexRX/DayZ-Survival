class ZHordeEventManager
{
	protected static ref ZHordeEventManager s_Instance;

	protected ref ZHordeGeneralSettings m_GeneralSettings;
	protected ref ZHordeRewardsSettings m_RewardSettings;
	protected ref ZHordeZombieTypesSettings m_ZombieTypeSettings;
	protected ref ZHordeWhitelistSettings m_WhitelistSettings;

	protected ref array<ZombieBase> m_EventInfected;
	protected ref map<string, int> m_LastTargetedTime;
	protected ref map<string, int> m_PlayerJoinedAt;
	protected ref array<string> m_EventZombieIds;

	protected bool m_WarningActive;
	protected bool m_EventActive;

	protected int m_NextEventAt;
	protected int m_WarningEndsAt;
	protected int m_EventEndsAt;
	protected int m_NextWaveAt;

	protected string m_CurrentTargetId;
	protected int m_LastCountdownMessage;

	protected int m_TotalEventZombiesSpawned;
	protected int m_TargetEventZombieKills;
	protected int m_CurrentWaveNumber;
	protected bool m_LastSelectionBlockedByTerritory;
	protected bool m_TerritoryFilteredAnyCandidate;
	protected bool m_LastSelectionBlockedBySoloProtection;
	protected string m_LastSoloProtectedPlayerId;
	protected bool m_LastSelectionBlockedByJoinCooldown;
	protected string m_LastJoinCooldownProtectedPlayerId;

	void ZHordeEventManager()
	{
		s_Instance = this;

		m_GeneralSettings = ZHordeConfig.LoadGeneral();
		m_RewardSettings = ZHordeConfig.LoadRewards();
		m_ZombieTypeSettings = ZHordeConfig.LoadZombieTypes();
		m_WhitelistSettings = ZHordeConfig.LoadWhitelist();

		m_EventInfected = new array<ZombieBase>;
		m_LastTargetedTime = new map<string, int>;
		m_PlayerJoinedAt = new map<string, int>;
		m_EventZombieIds = new array<string>;

		m_WarningActive = false;
		m_EventActive = false;
		m_CurrentTargetId = "";
		m_LastCountdownMessage = -1;
		m_LastSelectionBlockedByTerritory = false;
		m_TerritoryFilteredAnyCandidate = false;
		m_LastSelectionBlockedBySoloProtection = false;
		m_LastSoloProtectedPlayerId = "";
		m_LastSelectionBlockedByJoinCooldown = false;
		m_LastJoinCooldownProtectedPlayerId = "";

		ResetEventCounters();
		ScheduleNextEvent();

		GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).CallLater(Tick, 1000, true);
		ZHordeLogger.Log("Zombie Horde manager started.");
	}

	static ZHordeEventManager GetInstance()
	{
		return s_Instance;
	}

	void RegisterPlayerJoin(PlayerBase player, PlayerIdentity identity)
	{
		if (!GetGame() || !GetGame().IsServer())
			return;

		string playerId = GetIdentityId(player, identity);
		if (playerId == string.Empty)
			return;

		m_PlayerJoinedAt.Set(playerId, GetNow());

		string playerName = "unknown";
		if (identity)
			playerName = identity.GetName();

		ZHordeLogger.Log("Player join cooldown tracked for " + playerName + " for " + m_GeneralSettings.PlayerJoinCooldownSeconds.ToString() + " seconds.");
	}

	void UnregisterPlayerJoin(PlayerBase player)
	{
		if (!player || !player.GetIdentity())
			return;

		string playerId = player.GetIdentity().GetId();
		if (playerId == string.Empty)
			return;

		int ignoredJoinedAt = 0;
		if (m_PlayerJoinedAt.Find(playerId, ignoredJoinedAt))
			m_PlayerJoinedAt.Remove(playerId);
	}

	protected string GetIdentityId(PlayerBase player, PlayerIdentity identity)
	{
		if (identity)
			return identity.GetId();

		if (player && player.GetIdentity())
			return player.GetIdentity().GetId();

		return "";
	}

	protected void ResetEventCounters()
	{
		m_TotalEventZombiesSpawned = 0;
		m_TargetEventZombieKills = 0;
		m_CurrentWaveNumber = 0;
		m_EventZombieIds.Clear();
	}

	protected int GetNow()
	{
		return GetGame().GetTime() / 1000;
	}

	protected int RandomIntInclusive(int minValue, int maxValue)
	{
		if (maxValue <= minValue)
			return minValue;

		return minValue + Math.RandomInt(0, (maxValue - minValue) + 1);
	}

	protected void ScheduleNextEvent()
	{
		int now = GetNow();
		int delay = RandomIntInclusive(m_GeneralSettings.MinTimeBetweenEventsSeconds, m_GeneralSettings.MaxTimeBetweenEventsSeconds);
		m_NextEventAt = now + delay;

		ZHordeLogger.Log("Next horde event scheduled in " + delay.ToString() + " seconds.");
	}

	protected void Tick()
	{
		if (!GetGame() || !GetGame().IsServer())
			return;

		if (!m_GeneralSettings || !m_GeneralSettings.Enabled)
			return;

		int now = GetNow();

		if (!m_WarningActive && !m_EventActive)
		{
			if (now >= m_NextEventAt)
			{
				if (GetEligibleTargetPlayerCount() < m_GeneralSettings.MinPlayersOnline)
				{
					m_NextEventAt = now + 60;
					ZHordeLogger.Log("Skipped event start. Not enough eligible players online.");
					return;
				}

				if (!IsCurrentTimeWithinSpawnWindow())
				{
					m_NextEventAt = now + 60;
					ZHordeLogger.Log("Skipped event start. Current in-game time is outside the allowed spawn window.");
					return;
				}

				StartWarning();
			}

			return;
		}

		if (m_WarningActive)
		{
			int remainingWarning = m_WarningEndsAt - now;

			if (remainingWarning <= 0)
			{
				StartEvent();
				return;
			}

			if (remainingWarning == 60 || remainingWarning == 30 || remainingWarning == 10)
			{
				if (m_LastCountdownMessage != remainingWarning)
				{
					string countdownMessage = ApplySecondsToken(m_GeneralSettings.NotifyWarningCountdownMessage, remainingWarning);
					BroadcastNotification(m_GeneralSettings.NotifyWarningTitle, countdownMessage);
					m_LastCountdownMessage = remainingWarning;
				}
			}

			return;
		}

		if (m_EventActive)
		{
			PlayerBase target = GetPlayerByIdentityId(m_CurrentTargetId);

			if (!target || !target.IsAlive())
			{
				ZHordeLogger.Log("Target player died or became invalid during active event.");
				EndEventTargetDied();
				return;
			}

			if (now >= m_EventEndsAt)
			{
				EndEventCompleted(target);
				return;
			}

			if (now >= m_NextWaveAt)
			{
				if (m_CurrentWaveNumber > 0)
				{
					string nextWaveMessage = ApplyWaveToken(m_GeneralSettings.NotifyNextWaveStartingMessage, m_CurrentWaveNumber + 1);
					SendPlayerNotification(target, m_GeneralSettings.NotifyEventActiveTitle, nextWaveMessage);
				}

				SpawnWave();
				m_NextWaveAt = now + m_GeneralSettings.SpawnIntervalSeconds;
			}
		}
	}

	protected void StartWarning()
	{
		m_WarningActive = true;
		m_LastCountdownMessage = -1;
		m_WarningEndsAt = GetNow() + m_GeneralSettings.WarningDurationSeconds;

		BroadcastNotification(m_GeneralSettings.NotifyWarningTitle, m_GeneralSettings.NotifyWarningStartMessage);
		ZHordeLogger.Log("Warning phase started.");
	}

	protected void StartEvent()
	{
		ref array<string> attemptedTargetIds = new array<string>;
		PlayerBase target = ChooseTargetPlayer();

		while (target && target.GetIdentity() && m_GeneralSettings.RetryTargetSelectionOnInvalidCandidate && !IsPlayerValidTarget(target))
		{
			attemptedTargetIds.Insert(target.GetIdentity().GetId());
			ZHordeLogger.Log("Selected target became invalid before event start, retrying with another candidate: " + target.GetIdentity().GetName());
			target = ChooseTargetPlayer(attemptedTargetIds);
		}

		m_WarningActive = false;

		if (!target || !target.GetIdentity())
		{
			if (m_LastSelectionBlockedByTerritory)
			{
				BroadcastNotification(m_GeneralSettings.NotifyEventActiveTitle, m_GeneralSettings.NotifyTerritoryProtectionBlockedMessage);
				ZHordeLogger.Log("Event target selection blocked by territory protection.");
			}
			else if (m_LastSelectionBlockedBySoloProtection)
			{
				NotifySoloProtectedPlayer();
				ZHordeLogger.Log("Event target selection blocked by single-player protection.");
			}
			else if (m_LastSelectionBlockedByJoinCooldown)
			{
				ZHordeLogger.Log("Event target selection blocked by player join cooldown.");
			}
			else
			{
				ZHordeLogger.Log("Could not start event. No valid target player found.");
			}
			ScheduleNextEvent();
			return;
		}

		ResetEventCounters();

		m_EventActive = true;
		m_CurrentTargetId = target.GetIdentity().GetId();
		m_EventEndsAt = GetNow() + m_GeneralSettings.EventDurationSeconds;
		m_NextWaveAt = GetNow();

		m_LastTargetedTime.Set(m_CurrentTargetId, GetNow());

		if (m_GeneralSettings.AnnounceTargetPlayer)
		{
			string chosenMessage = ApplyPlayerToken(m_GeneralSettings.NotifyTargetChosenMessage, target.GetIdentity().GetName());
			BroadcastNotification(m_GeneralSettings.NotifyEventActiveTitle, chosenMessage);
		}
		else
		{
			BroadcastNotification(m_GeneralSettings.NotifyEventActiveTitle, m_GeneralSettings.NotifyEventActiveMessage);
		}

		string startMessage = ApplyPercentToken(m_GeneralSettings.NotifyTargetStartMessage, Math.Round(m_RewardSettings.CompletionKillPercentRequired));
		SendPlayerNotification(target, m_GeneralSettings.NotifyEventActiveTitle, startMessage);

		ZHordeLogger.Log("Event started. Target player: " + target.GetIdentity().GetName());
	}

	protected void EndEventTargetDied()
	{
		string failedTargetName = GetCurrentTargetName();

		m_EventActive = false;
		m_WarningActive = false;
		m_CurrentTargetId = "";

		if (m_GeneralSettings.CleanupSpawnedInfectedOnEnd)
		{
			CleanupSpawnedInfected();
		}
		else
		{
			m_EventInfected.Clear();
		}

		if (failedTargetName != string.Empty)
		{
			string failedMessage = ApplyPlayerToken(m_GeneralSettings.NotifyEventFailedMessage, failedTargetName);
			BroadcastNotification(m_GeneralSettings.NotifyEventActiveTitle, failedMessage);
			ZHordeLogger.Log("Event failed because target player died: " + failedTargetName);
		}
		else
		{
			BroadcastNotification(m_GeneralSettings.NotifyEventActiveTitle, m_GeneralSettings.NotifyEventEndedMessage);
			ZHordeLogger.Log("Event failed because target player died.");
		}

		ResetEventCounters();
		ScheduleNextEvent();
	}

	protected void EndEventCompleted(PlayerBase target)
	{
		m_EventActive = false;
		m_WarningActive = false;

		if (m_GeneralSettings.CleanupSpawnedInfectedOnEnd)
		{
			CleanupSpawnedInfected();
		}
		else
		{
			m_EventInfected.Clear();
		}

		float killPercent = GetTargetKillPercent();
		bool rewardGranted = HasMetCompletionRequirement();

		if (target && target.GetIdentity())
		{
			string survivedMessage = ApplyPlayerToken(m_GeneralSettings.NotifyEventSurvivedMessage, target.GetIdentity().GetName());
			BroadcastNotification(m_GeneralSettings.NotifyEventActiveTitle, survivedMessage);

			if (rewardGranted)
			{
				SendPlayerNotification(target, m_GeneralSettings.NotifyEventActiveTitle, m_GeneralSettings.NotifyRewardGrantedMessage);
				SpawnCompletionRewards(target);
				ZHordeLogger.Log("Event completed successfully by target: " + target.GetIdentity().GetName() + ". Reward granted. Kill percent: " + killPercent.ToString());
			}
			else
			{
				string deniedDetail = m_GeneralSettings.NotifyRewardDeniedDetail;
				deniedDetail.Replace("{KILL_PERCENT}", FormatPercentValue(killPercent));
				deniedDetail.Replace("{REQUIRED_PERCENT}", FormatPercentValue(m_RewardSettings.CompletionKillPercentRequired));

				SendPlayerNotification(target, m_GeneralSettings.NotifyEventActiveTitle, m_GeneralSettings.NotifyRewardDeniedTitle);
				SendPlayerNotification(target, m_GeneralSettings.NotifyEventActiveTitle, deniedDetail);

				ZHordeLogger.Log("Event completed by target without reward: " + target.GetIdentity().GetName() + ". Kill percent: " + killPercent.ToString() + ", required: " + m_RewardSettings.CompletionKillPercentRequired.ToString());
			}
		}
		else
		{
			BroadcastNotification(m_GeneralSettings.NotifyEventActiveTitle, m_GeneralSettings.NotifyEventEndedMessage);
			ZHordeLogger.Log("Event completed, but target reference was missing at reward time.");
		}

		m_CurrentTargetId = "";
		ResetEventCounters();
		ScheduleNextEvent();
	}

	protected int NormalizeHourValue(int hourValue)
	{
		if (hourValue < 0)
			hourValue = 0;

		if (hourValue > 23)
			hourValue = 23;

		return hourValue;
	}

	protected int GetCurrentWorldHour()
	{
		int year;
		int month;
		int day;
		int hour;
		int minute;

		GetGame().GetWorld().GetDate(year, month, day, hour, minute);
		return NormalizeHourValue(hour);
	}

	protected bool IsHourWithinWindow(int hourValue, int startHour, int endHour)
	{
		startHour = NormalizeHourValue(startHour);
		endHour = NormalizeHourValue(endHour);

		if (startHour == endHour)
			return true;

		if (startHour < endHour)
			return hourValue >= startHour && hourValue < endHour;

		return hourValue >= startHour || hourValue < endHour;
	}

	protected bool IsCurrentTimeWithinSpawnWindow()
	{
		if (!m_GeneralSettings.RestrictEventStartByTimeWindow)
			return true;

		string mode = m_GeneralSettings.AllowedSpawnTimeWindow;
		mode.ToLower();

		if (mode == string.Empty || mode == "any")
			return true;

		int currentHour = GetCurrentWorldHour();
		int dayStartHour = NormalizeHourValue(m_GeneralSettings.DayStartHour);
		int nightStartHour = NormalizeHourValue(m_GeneralSettings.NightStartHour);

		if (mode == "day")
			return IsHourWithinWindow(currentHour, dayStartHour, nightStartHour);

		if (mode == "night")
			return IsHourWithinWindow(currentHour, nightStartHour, dayStartHour);

		return true;
	}

	protected int GetOnlinePlayerCount()
	{
		array<Man> players = new array<Man>;
		GetGame().GetWorld().GetPlayerList(players);

		int count = 0;

		for (int i = 0; i < players.Count(); i++)
		{
			PlayerBase player = PlayerBase.Cast(players[i]);
			if (!player)
				continue;

			if (!player.GetIdentity())
				continue;

			if (!player.IsAlive())
				continue;

			count++;
		}

		return count;
	}

	protected int GetEligibleTargetPlayerCount()
	{
		array<Man> players = new array<Man>;
		GetGame().GetWorld().GetPlayerList(players);

		int count = 0;

		for (int i = 0; i < players.Count(); i++)
		{
			PlayerBase player = PlayerBase.Cast(players[i]);
			if (!IsPlayerValidTarget(player))
				continue;

			count++;
		}

		return count;
	}

	protected bool IsPlayerOnJoinCooldown(PlayerBase player)
	{
		if (!player || !player.GetIdentity())
			return false;

		if (!m_GeneralSettings || m_GeneralSettings.PlayerJoinCooldownSeconds <= 0)
			return false;

		string playerId = player.GetIdentity().GetId();
		int joinedAt = 0;

		if (!m_PlayerJoinedAt.Find(playerId, joinedAt))
		{
			m_PlayerJoinedAt.Set(playerId, GetNow());
			joinedAt = GetNow();
		}

		int elapsed = GetNow() - joinedAt;
		if (elapsed < m_GeneralSettings.PlayerJoinCooldownSeconds)
		{
			m_LastSelectionBlockedByJoinCooldown = true;
			m_LastJoinCooldownProtectedPlayerId = playerId;
			return true;
		}

		return false;
	}

	protected bool IsPlayerValidTarget(PlayerBase player)
	{
		if (!player)
			return false;

		if (!player.GetIdentity())
			return false;

		if (!player.IsAlive())
			return false;

		if (IsPlayerOnJoinCooldown(player))
			return false;

		if (m_GeneralSettings.IgnorePlayersInVehicles && player.GetCommand_Vehicle())
			return false;

		if (IsPlayerWhitelisted(player))
			return false;

		if (IsPositionInSafeZone(player.GetPosition()))
			return false;

		if (IsPositionNearTerritoryFlag(player.GetPosition()))
		{
			m_TerritoryFilteredAnyCandidate = true;
			return false;
		}

		return true;
	}



	protected bool IsPlayerWhitelisted(PlayerBase player)
	{
		if (!player || !player.GetIdentity())
			return false;

		if (!m_WhitelistSettings || !m_WhitelistSettings.WhitelistedPlayerIds)
			return false;

		string playerId = player.GetIdentity().GetPlainId();
		if (playerId == string.Empty)
			playerId = player.GetIdentity().GetId();

		for (int i = 0; i < m_WhitelistSettings.WhitelistedPlayerIds.Count(); i++)
		{
			string listedId = m_WhitelistSettings.WhitelistedPlayerIds[i];
			if (listedId == string.Empty)
				continue;

			if (listedId == playerId)
				return true;
		}

		return false;
	}

	protected bool IsPlayerWithinContributionRange(PlayerBase player, PlayerBase target)
	{
		if (!player || !target)
			return false;

		return vector.Distance(player.GetPosition(), target.GetPosition()) <= m_GeneralSettings.NearbyPlayerContributionRange;
	}

	protected bool PassesSinglePlayerProtection(PlayerBase player)
	{
		if (!m_GeneralSettings.UseSinglePlayerTargetProtection)
			return true;

		array<Man> players = new array<Man>;
		GetGame().GetWorld().GetPlayerList(players);

		int validCount = 0;
		for (int i = 0; i < players.Count(); i++)
		{
			PlayerBase checkPlayer = PlayerBase.Cast(players[i]);
			if (!checkPlayer)
				continue;

			if (!checkPlayer.GetIdentity())
				continue;

			if (!checkPlayer.IsAlive())
				continue;

			validCount++;
		}

		if (validCount != 1)
			return true;

		string playerId = player.GetIdentity().GetId();
		int lastTime = 0;
		if (m_LastTargetedTime.Find(playerId, lastTime))
		{
			if ((GetNow() - lastTime) < m_GeneralSettings.SinglePlayerSelectionCooldownSeconds)
			{
				m_LastSelectionBlockedBySoloProtection = true;
				m_LastSoloProtectedPlayerId = player.GetIdentity().GetId();
				ZHordeLogger.Log("Single-player protection blocked event by cooldown for player: " + player.GetIdentity().GetName());
				return false;
			}
		}

		float roll = Math.RandomFloatInclusive(0.0, 100.0);
		if (roll > m_GeneralSettings.SinglePlayerSelectionChancePercent)
		{
			m_LastSelectionBlockedBySoloProtection = true;
			m_LastSoloProtectedPlayerId = player.GetIdentity().GetId();
			ZHordeLogger.Log("Single-player protection blocked event by chance roll for player: " + player.GetIdentity().GetName() + " roll=" + roll.ToString());
			return false;
		}

		return true;
	}

	protected PlayerBase ChooseTargetPlayer(array<string> excludeIds = null)
	{
		m_LastSelectionBlockedByTerritory = false;
		m_TerritoryFilteredAnyCandidate = false;
		m_LastSelectionBlockedBySoloProtection = false;
		m_LastSoloProtectedPlayerId = "";
		m_LastSelectionBlockedByJoinCooldown = false;
		m_LastJoinCooldownProtectedPlayerId = "";

		array<Man> players = new array<Man>;
		GetGame().GetWorld().GetPlayerList(players);

		ref array<PlayerBase> candidates = new array<PlayerBase>;
		int i;

		for (i = 0; i < players.Count(); i++)
		{
			PlayerBase player = PlayerBase.Cast(players[i]);
			if (!IsPlayerValidTarget(player))
				continue;

			if (excludeIds && player.GetIdentity())
			{
				string excludeId = player.GetIdentity().GetId();
				if (excludeIds.Find(excludeId) > -1)
					continue;
			}

			candidates.Insert(player);
		}

		if (candidates.Count() < m_GeneralSettings.MinPlayersOnline)
		{
			if (m_TerritoryFilteredAnyCandidate)
			{
				m_LastSelectionBlockedByTerritory = true;
			}
			return null;
		}

		ref array<PlayerBase> eligibleCandidates = new array<PlayerBase>;
		for (i = 0; i < candidates.Count(); i++)
		{
			PlayerBase candidate = candidates[i];
			if (!PassesSinglePlayerProtection(candidate))
				continue;

			eligibleCandidates.Insert(candidate);
		}

		if (eligibleCandidates.Count() == 0)
			return null;

		ref array<PlayerBase> workingCandidates = eligibleCandidates;
		if (m_GeneralSettings.PreferNeverTargetedPlayers)
		{
			ref array<PlayerBase> neverTargetedCandidates = new array<PlayerBase>;
			for (i = 0; i < eligibleCandidates.Count(); i++)
			{
				PlayerBase candidateNever = eligibleCandidates[i];
				string candidateNeverId = candidateNever.GetIdentity().GetId();
				int ignoredLastTime = 0;
				if (!m_LastTargetedTime.Find(candidateNeverId, ignoredLastTime))
				{
					neverTargetedCandidates.Insert(candidateNever);
				}
			}

			if (neverTargetedCandidates.Count() > 0)
				workingCandidates = neverTargetedCandidates;
		}

		int now = GetNow();
		if (m_GeneralSettings.RecentTargetBiasCooldownSeconds > 0)
		{
			ref array<PlayerBase> nonRecentCandidates = new array<PlayerBase>;
			for (i = 0; i < workingCandidates.Count(); i++)
			{
				PlayerBase recentCandidate = workingCandidates[i];
				string recentCandidateId = recentCandidate.GetIdentity().GetId();
				int recentLastTime = 0;
				if (!m_LastTargetedTime.Find(recentCandidateId, recentLastTime) || recentLastTime <= 0)
				{
					nonRecentCandidates.Insert(recentCandidate);
					continue;
				}

				if ((now - recentLastTime) >= m_GeneralSettings.RecentTargetBiasCooldownSeconds)
					nonRecentCandidates.Insert(recentCandidate);
			}

			if (nonRecentCandidates.Count() > 0)
				workingCandidates = nonRecentCandidates;
		}

		ref array<PlayerBase> bestCandidates = new array<PlayerBase>;
		int oldestTargetTime = 2147483647;

		for (i = 0; i < workingCandidates.Count(); i++)
		{
			PlayerBase candidateBest = workingCandidates[i];
			string candidateId = candidateBest.GetIdentity().GetId();

			int lastTime = 0;
			if (!m_LastTargetedTime.Find(candidateId, lastTime))
				lastTime = 0;

			if (lastTime < oldestTargetTime)
			{
				oldestTargetTime = lastTime;
				bestCandidates.Clear();
				bestCandidates.Insert(candidateBest);
			}
			else if (lastTime == oldestTargetTime)
			{
				bestCandidates.Insert(candidateBest);
			}
		}

		if (bestCandidates.Count() == 0)
			return null;

		return bestCandidates[Math.RandomInt(0, bestCandidates.Count())];
	}

	protected PlayerBase GetPlayerByIdentityId(string identityId)
	{
		if (identityId == string.Empty)
			return null;

		array<Man> players = new array<Man>;
		GetGame().GetWorld().GetPlayerList(players);

		for (int i = 0; i < players.Count(); i++)
		{
			PlayerBase player = PlayerBase.Cast(players[i]);
			if (!player)
				continue;

			if (!player.GetIdentity())
				continue;

			if (player.GetIdentity().GetId() == identityId)
				return player;
		}

		return null;
	}


	protected void NotifySoloProtectedPlayer()
	{
		if (m_LastSoloProtectedPlayerId == string.Empty)
			return;

		PlayerBase player = GetPlayerByIdentityId(m_LastSoloProtectedPlayerId);
		if (!player)
			return;

		SendPlayerNotification(player, m_GeneralSettings.NotifyEventActiveTitle, m_GeneralSettings.NotifySoloProtectionLuckyMessage);
	}

	protected string GetCurrentTargetName()
	{
		PlayerBase target = GetPlayerByIdentityId(m_CurrentTargetId);
		if (target && target.GetIdentity())
		{
			return target.GetIdentity().GetName();
		}

		return "";
	}

	protected void BroadcastNotification(string title, string message, float duration = 8.0)
	{
		array<Man> players = new array<Man>;
		GetGame().GetWorld().GetPlayerList(players);

		for (int i = 0; i < players.Count(); i++)
		{
			PlayerBase player = PlayerBase.Cast(players[i]);
			if (!player)
				continue;

			if (!player.GetIdentity())
				continue;

			SendNotification(player.GetIdentity(), duration, title, message);
		}
	}

	protected void SendPlayerNotification(PlayerBase player, string title, string message, float duration = 8.0)
	{
		if (!player)
			return;

		if (!player.GetIdentity())
			return;

		SendNotification(player.GetIdentity(), duration, title, message);
	}

	protected void SendNotification(PlayerIdentity identity, float duration, string title, string message)
	{
		if (!m_GeneralSettings || !m_GeneralSettings.EnableNotifications)
			return;

		if (!identity)
			return;

		NotificationSystem.SendNotificationToPlayerIdentityExtended(identity, duration, title, message, m_GeneralSettings.NotificationIcon);
	}

	protected string ApplySecondsToken(string message, int seconds)
	{
		message.Replace("{SECONDS}", seconds.ToString());
		return message;
	}

	protected string ApplyPlayerToken(string message, string playerName)
	{
		message.Replace("{PLAYER}", playerName);
		return message;
	}

	protected string ApplyPercentToken(string message, int percentValue)
	{
		message.Replace("{PERCENT}", percentValue.ToString());
		return message;
	}

	protected string ApplyWaveToken(string message, int waveNumber)
	{
		message.Replace("{WAVE}", waveNumber.ToString());
		return message;
	}

	protected int GetDesiredWaveCount()
	{
		int onlinePlayers = GetOnlinePlayerCount();
		int bonus = Math.Min((onlinePlayers - 1) * m_GeneralSettings.ExtraZombiesPerAdditionalPlayer, m_GeneralSettings.MaxExtraZombiesFromPopulation);

		if (bonus < 0)
			bonus = 0;

		return m_GeneralSettings.ZombiesPerWave + bonus;
	}

	protected void PruneTrackedInfected()
	{
		for (int i = m_EventInfected.Count() - 1; i >= 0; i--)
		{
			ZombieBase infected = m_EventInfected[i];
			if (!infected)
			{
				m_EventInfected.Remove(i);
				continue;
			}

			if (!infected.IsAlive())
			{
				m_EventInfected.Remove(i);
			}
		}
	}

	protected int GetActiveTrackedInfectedCount()
	{
		PruneTrackedInfected();
		return m_EventInfected.Count();
	}

	protected string GetRandomZombieType()
	{
		if (!m_ZombieTypeSettings || !m_ZombieTypeSettings.ZombieTypes || m_ZombieTypeSettings.ZombieTypes.Count() == 0)
			return "ZmbM_CitizenASkinny_Beige";

		return m_ZombieTypeSettings.ZombieTypes[Math.RandomInt(0, m_ZombieTypeSettings.ZombieTypes.Count())];
	}

	protected float GetSpawnRadiusMin()
	{
		if (m_GeneralSettings.AggroOnSpawn)
			return m_GeneralSettings.AggroSpawnRadiusMin;

		return m_GeneralSettings.SpawnRadiusMin;
	}

	protected float GetSpawnRadiusMax()
	{
		if (m_GeneralSettings.AggroOnSpawn)
			return m_GeneralSettings.AggroSpawnRadiusMax;

		return m_GeneralSettings.SpawnRadiusMax;
	}

	protected bool FindSpawnPosition(vector center, out vector outPos)
	{
		float angleDeg;
		float angleRad;
		float distance;
		float x;
		float z;
		float y;

		for (int i = 0; i < 20; i++)
		{
			angleDeg = Math.RandomFloatInclusive(0.0, 360.0);
			angleRad = angleDeg * 0.0174532925;
			distance = Math.RandomFloatInclusive(GetSpawnRadiusMin(), GetSpawnRadiusMax());

			x = center[0] + Math.Cos(angleRad) * distance;
			z = center[2] + Math.Sin(angleRad) * distance;
			y = GetGame().SurfaceY(x, z);

			outPos = Vector(x, y, z);

			if (vector.Distance(outPos, center) < GetSpawnRadiusMin())
				continue;

			return true;
		}

		return false;
	}

	protected bool FindNearbyRewardPosition(vector center, float desiredDistance, out vector outPos)
	{
		float angleDeg;
		float angleRad;
		float distance;
		float x;
		float z;
		float y;

		for (int i = 0; i < 20; i++)
		{
			angleDeg = Math.RandomFloatInclusive(0.0, 360.0);
			angleRad = angleDeg * 0.0174532925;
			distance = Math.RandomFloatInclusive(Math.Max(1.0, desiredDistance - 0.75), desiredDistance + 0.75);

			x = center[0] + Math.Cos(angleRad) * distance;
			z = center[2] + Math.Sin(angleRad) * distance;
			y = GetGame().SurfaceY(x, z);

			outPos = Vector(x, y, z);
			return true;
		}

		outPos = center;
		return false;
	}

	protected void SpawnWave()
	{
		PlayerBase target = GetPlayerByIdentityId(m_CurrentTargetId);

		if (!target)
		{
			ZHordeLogger.Log("No valid target during active event. Ending event.");
			EndEventTargetDied();
			return;
		}

		if (!target.IsAlive())
		{
			ZHordeLogger.Log("Target died just before spawn wave. Ending event.");
			EndEventTargetDied();
			return;
		}

		int activeTracked = GetActiveTrackedInfectedCount();
		if (activeTracked >= m_GeneralSettings.MaxAliveEventZombies)
		{
			ZHordeLogger.Log("Skipped wave. Active event infected cap reached: " + activeTracked.ToString());
			return;
		}

		int desired = GetDesiredWaveCount();
		int availableSlots = m_GeneralSettings.MaxAliveEventZombies - activeTracked;
		int spawnCount = Math.Min(desired, availableSlots);

		int spawned = 0;

		for (int i = 0; i < spawnCount; i++)
		{
			vector spawnPos;
			if (!FindSpawnPosition(target.GetPosition(), spawnPos))
				continue;

			string zombieType = GetRandomZombieType();
			ZombieBase infected = ZombieBase.Cast(GetGame().CreateObjectEx(zombieType, spawnPos, ECE_INITAI | ECE_SETUP | ECE_CREATEPHYSICS));

			if (!infected)
				continue;

			FaceInfectedTowardTarget(infected, target);

			if (m_GeneralSettings.AggroOnSpawn)
			{
				QueueAggroNudges(infected, target);
			}

			m_EventInfected.Insert(infected);
			m_EventZombieIds.Insert(infected.ToString());
			m_TotalEventZombiesSpawned++;
			spawned++;
		}

		if (spawned > 0)
		{
			m_CurrentWaveNumber++;
			ZHordeLogger.Log("Spawned wave " + m_CurrentWaveNumber.ToString() + " of " + spawned.ToString() + " infected near " + target.GetIdentity().GetName());
		}
	}

	protected void FaceInfectedTowardTarget(ZombieBase infected, PlayerBase target)
	{
		if (!infected || !target)
			return;

		vector dir = target.GetPosition() - infected.GetPosition();
		vector ori = dir.VectorToAngles();
		infected.SetOrientation(Vector(ori[0], 0, 0));
	}

	protected void QueueAggroNudges(ZombieBase infected, PlayerBase target)
	{
		if (!infected || !target || !target.GetIdentity())
			return;

		int delayStep = m_GeneralSettings.AggroOrientationRefreshDelayMs;
		if (delayStep < 1)
			delayStep = 1;

		for (int i = 1; i <= m_GeneralSettings.AggroOrientationRefreshCount; i++)
		{
			GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).CallLater(RefreshInfectedFocusById, i * delayStep, false, infected, target.GetIdentity().GetId());
		}
	}

	void RefreshInfectedFocusById(ZombieBase infected, string targetId)
	{
		if (!infected)
			return;

		PlayerBase target = GetPlayerByIdentityId(targetId);
		if (!target)
			return;

		if (!target.IsAlive())
			return;

		FaceInfectedTowardTarget(infected, target);
	}

	protected void SpawnCompletionRewards(PlayerBase target)
	{
		if (!m_RewardSettings.RewardOnCompletion)
			return;

		vector chestPos;
		if (!FindNearbyRewardPosition(target.GetPosition(), m_RewardSettings.RewardSpawnDistance, chestPos))
		{
			chestPos = target.GetPosition();
		}

		EntityAI rewardContainer = EntityAI.Cast(GetGame().CreateObjectEx(m_RewardSettings.RewardContainerClassName, chestPos, ECE_PLACE_ON_SURFACE | ECE_CREATEPHYSICS));

		if (!rewardContainer)
		{
			ZHordeLogger.Log("Failed to create reward container: " + m_RewardSettings.RewardContainerClassName);
			return;
		}

		ItemBase rewardContainerItem = ItemBase.Cast(rewardContainer);
		if (rewardContainerItem)
		{
			rewardContainerItem.SetHealth01("", "", 1.0);
		}

		FillRewardContainer(rewardContainer, chestPos);
		ZHordeLogger.Log("Spawned reward container " + m_RewardSettings.RewardContainerClassName + " for " + target.GetIdentity().GetName());

		if (m_RewardSettings.CleanupRewardContainerWhenEmpty)
		{
			ScheduleRewardContainerEmptyCheck(rewardContainer);
		}

		if (m_RewardSettings.RewardContainerCleanupDelaySeconds > 0)
		{
			GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).CallLater(DeleteRewardEntity, m_RewardSettings.RewardContainerCleanupDelaySeconds * 1000, false, rewardContainer);
		}

		if (m_RewardSettings.RewardFireworksEnabled)
		{
			vector fireworkPos;
			if (!FindNearbyRewardPosition(chestPos, 2.5, fireworkPos))
			{
				fireworkPos = chestPos;
			}

			ItemBase fireworkLauncher = ItemBase.Cast(GetGame().CreateObjectEx("FireworksLauncher", fireworkPos, ECE_PLACE_ON_SURFACE | ECE_CREATEPHYSICS));

			if (fireworkLauncher)
			{
				fireworkLauncher.SetHealth01("", "", 1.0);
				GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).CallLater(StartRewardFireworks, m_RewardSettings.RewardFireworksDelayMs, false, fireworkLauncher);
				if (m_RewardSettings.CleanupRewardFireworks && m_RewardSettings.RewardFireworksCleanupDelaySeconds > 0)
				{
					GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).CallLater(DeleteRewardEntity, m_RewardSettings.RewardFireworksCleanupDelaySeconds * 1000, false, fireworkLauncher);
				}
				ZHordeLogger.Log("Spawned completion fireworks launcher for " + target.GetIdentity().GetName());
			}
			else
			{
				ZHordeLogger.Log("Failed to spawn completion fireworks launcher.");
			}
		}
	}


	protected ref array<ref ZHordeRewardItem> GetRandomizedRewardsToSpawn()
	{
		ref array<ref ZHordeRewardItem> selectedRewards = new array<ref ZHordeRewardItem>;
		ref array<ref ZHordeRewardItem> eligibleRewards = new array<ref ZHordeRewardItem>;

		if (!m_RewardSettings.CompletionRewards)
			return selectedRewards;

		for (int i = 0; i < m_RewardSettings.CompletionRewards.Count(); i++)
		{
			ZHordeRewardItem reward = m_RewardSettings.CompletionRewards[i];
			if (!reward)
				continue;

			if (reward.ClassName == string.Empty)
				continue;

			float roll = Math.RandomFloatInclusive(0.0, 100.0);
			if (roll <= reward.ChancePercent)
			{
				eligibleRewards.Insert(reward);
			}
		}

		if (!m_RewardSettings.UseRandomRewards)
			return eligibleRewards;

		int minItems = m_RewardSettings.RandomRewardMinItems;
		int maxItems = m_RewardSettings.RandomRewardMaxItems;

		if (minItems < 0)
			minItems = 0;

		if (maxItems < minItems)
			maxItems = minItems;

		if (eligibleRewards.Count() == 0)
			return selectedRewards;

		int countToPick = minItems;
		if (maxItems > minItems)
		{
			countToPick = Math.RandomIntInclusive(minItems, maxItems);
		}

		if (countToPick > eligibleRewards.Count())
			countToPick = eligibleRewards.Count();

		while (selectedRewards.Count() < countToPick && eligibleRewards.Count() > 0)
		{
			int randomIndex = Math.RandomInt(0, eligibleRewards.Count());
			selectedRewards.Insert(eligibleRewards[randomIndex]);
			eligibleRewards.Remove(randomIndex);
		}

		return selectedRewards;
	}

	protected void FillRewardContainer(EntityAI rewardContainer, vector chestPos)
	{
		ref array<ref ZHordeRewardItem> rewardsToSpawn = GetRandomizedRewardsToSpawn();
		if (!rewardsToSpawn)
			return;

		for (int i = 0; i < rewardsToSpawn.Count(); i++)
		{
			ZHordeRewardItem reward = rewardsToSpawn[i];
			if (!reward)
				continue;

			if (reward.ClassName == string.Empty)
				continue;

			int quantity = reward.Quantity;
			if (quantity < 1)
			{
				quantity = 1;
			}

			for (int j = 0; j < quantity; j++)
			{
				EntityAI spawnedReward = EntityAI.Cast(rewardContainer.GetInventory().CreateInInventory(reward.ClassName));

				if (!spawnedReward)
				{
					vector groundPos;
					if (!FindNearbyRewardPosition(chestPos, 1.25, groundPos))
					{
						groundPos = chestPos;
					}

					spawnedReward = EntityAI.Cast(GetGame().CreateObjectEx(reward.ClassName, groundPos, ECE_PLACE_ON_SURFACE | ECE_CREATEPHYSICS));
				}

				ItemBase rewardItem = ItemBase.Cast(spawnedReward);
				if (rewardItem)
				{
					rewardItem.SetHealth01("", "", reward.Health);
				}
			}
		}
	}

	protected void StartRewardFireworks(ItemBase fireworkLauncher)
	{
		if (!fireworkLauncher)
			return;

		fireworkLauncher.OnIgnitedThis(null);
	}

	protected void ScheduleRewardContainerEmptyCheck(EntityAI rewardContainer)
	{
		if (!rewardContainer)
			return;

		GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).CallLater(CheckRewardContainerEmpty, 5000, false, rewardContainer);
	}

	protected void CheckRewardContainerEmpty(EntityAI rewardContainer)
	{
		if (!rewardContainer)
			return;

		if (IsRewardContainerEmpty(rewardContainer))
		{
			ZHordeLogger.Log("Reward container emptied, deleting container.");
			GetGame().ObjectDelete(rewardContainer);
			return;
		}

		ScheduleRewardContainerEmptyCheck(rewardContainer);
	}

	protected bool IsRewardContainerEmpty(EntityAI rewardContainer)
	{
		if (!rewardContainer)
			return true;

		InventoryLocation il = new InventoryLocation;
		for (int i = 0; i < rewardContainer.GetInventory().AttachmentCount(); i++)
		{
			EntityAI attachment = rewardContainer.GetInventory().GetAttachmentFromIndex(i);
			if (attachment)
				return false;
		}

		CargoBase cargo = rewardContainer.GetInventory().GetCargo();
		if (cargo && cargo.GetItemCount() > 0)
			return false;

		return true;
	}

	protected void DeleteRewardEntity(EntityAI entity)
	{
		if (!entity)
			return;

		GetGame().ObjectDelete(entity);
	}

	protected void CleanupSpawnedInfected()
	{
		for (int i = m_EventInfected.Count() - 1; i >= 0; i--)
		{
			ZombieBase infected = m_EventInfected[i];
			if (!infected)
				continue;

			GetGame().ObjectDelete(infected);
		}

		m_EventInfected.Clear();
		ZHordeLogger.Log("Cleaned up event-spawned infected.");
	}


	protected bool IsTerritoryFlagMatch(Object objectRef)
	{
		if (!objectRef)
			return false;

		string objectType = objectRef.GetType();

		if (!m_GeneralSettings.TerritoryFlagClassNames)
			return false;

		for (int i = 0; i < m_GeneralSettings.TerritoryFlagClassNames.Count(); i++)
		{
			string className = m_GeneralSettings.TerritoryFlagClassNames[i];
			if (className == string.Empty)
				continue;

			if (objectType == className)
				return true;

			if (m_GeneralSettings.TerritoryFlagUseIsKindOf && objectRef.IsKindOf(className))
				return true;
		}

		return false;
	}

	protected bool IsPositionNearTerritoryFlag(vector position)
	{
		if (!m_GeneralSettings.UseTerritoryFlagProtection)
			return false;

		if (!m_GeneralSettings.TerritoryFlagClassNames || m_GeneralSettings.TerritoryFlagClassNames.Count() == 0)
			return false;

		array<Object> nearbyObjects = new array<Object>;
		array<CargoBase> proxyCargos = new array<CargoBase>;
		GetGame().GetObjectsAtPosition3D(position, m_GeneralSettings.TerritoryFlagProtectionRadius, nearbyObjects, proxyCargos);

		for (int i = 0; i < nearbyObjects.Count(); i++)
		{
			Object nearbyObject = nearbyObjects[i];
			if (IsTerritoryFlagMatch(nearbyObject))
			{
				return true;
			}
		}

		return false;
	}

	protected bool IsPositionInSafeZone(vector position)
	{
		if (!m_GeneralSettings.SafeZones)
			return false;

		for (int i = 0; i < m_GeneralSettings.SafeZones.Count(); i++)
		{
			ZHordeSafeZone safeZone = m_GeneralSettings.SafeZones[i];
			if (!safeZone)
				continue;

			if (vector.Distance(position, safeZone.Position) <= safeZone.Radius)
			{
				return true;
			}
		}

		return false;
	}

	protected float GetTargetKillPercent()
	{
		if (m_TotalEventZombiesSpawned <= 0)
			return 0.0;

		return (m_TargetEventZombieKills * 100.0) / m_TotalEventZombiesSpawned;
	}

	protected bool HasMetCompletionRequirement()
	{
		if (!m_RewardSettings.RewardOnCompletion)
			return false;

		if (m_RewardSettings.CompletionKillPercentRequired <= 0.0)
			return true;

		return GetTargetKillPercent() >= m_RewardSettings.CompletionKillPercentRequired;
	}

	protected string FormatPercentValue(float value)
	{
		return Math.Round(value).ToString();
	}

	bool IsTrackedEventZombie(ZombieBase zombie)
	{
		if (!zombie)
			return false;

		string zombieId = zombie.ToString();
		return m_EventZombieIds.Find(zombieId) != -1;
	}

	void OnTrackedZombieKilled(ZombieBase zombie, Object killer)
	{
		if (!m_EventActive)
			return;

		if (!zombie)
			return;

		string zombieId = zombie.ToString();
		int trackedIndex = m_EventZombieIds.Find(zombieId);
		if (trackedIndex == -1)
			return;

		m_EventZombieIds.Remove(trackedIndex);

		PlayerBase killerPlayer = ResolveKillerPlayer(killer);
		PlayerBase target = GetPlayerByIdentityId(m_CurrentTargetId);

		if (!killerPlayer || !target)
			return;

		bool countKill = false;
		if (killerPlayer == target)
		{
			countKill = true;
		}
		else if (m_GeneralSettings.CountNearbyPlayerKillsTowardCompletion && IsPlayerWithinContributionRange(killerPlayer, target))
		{
			countKill = true;
		}

		if (countKill)
		{
			m_TargetEventZombieKills++;
			ZHordeLogger.Log("Tracked infected counted toward completion. Progress: " + m_TargetEventZombieKills.ToString() + "/" + m_TotalEventZombiesSpawned.ToString());
		}
	}

	protected PlayerBase ResolveKillerPlayer(Object killer)
	{
		PlayerBase directPlayer = PlayerBase.Cast(killer);
		if (directPlayer)
			return directPlayer;

		EntityAI killerEntity = EntityAI.Cast(killer);
		if (killerEntity)
			return PlayerBase.Cast(killerEntity.GetHierarchyRootPlayer());

		return null;
	}
}

modded class ZombieBase
{
	override void EEKilled(Object killer)
	{
		super.EEKilled(killer);

		ZHordeEventManager manager = ZHordeEventManager.GetInstance();
		if (manager)
		{
			manager.OnTrackedZombieKilled(this, killer);
		}
	}
}

class ZHordeRewardItem
{
	string ClassName;
	int Quantity;
	float Health;
	float ChancePercent;

	void ZHordeRewardItem()
	{
		ClassName = "";
		Quantity = 1;
		Health = 1.0;
		ChancePercent = 100.0;
	}

	static ref ZHordeRewardItem Create(string className, int quantity = 1, float health = 1.0, float chancePercent = 100.0)
	{
		ref ZHordeRewardItem item = new ZHordeRewardItem;
		item.ClassName = className;
		item.Quantity = quantity;
		item.Health = health;
		item.ChancePercent = chancePercent;
		return item;
	}
}

class ZHordeSafeZone
{
	vector Position;
	float Radius;

	void ZHordeSafeZone()
	{
		Position = "0 0 0";
		Radius = 150.0;
	}

	static ref ZHordeSafeZone Create(vector position, float radius = 150.0)
	{
		ref ZHordeSafeZone zone = new ZHordeSafeZone;
		zone.Position = position;
		zone.Radius = radius;
		return zone;
	}
}


class ZHordeWhitelistSettings
{
	ref array<string> WhitelistedPlayerIds;

	void ZHordeWhitelistSettings()
	{
		WhitelistedPlayerIds = new array<string>;
	}
}

class ZHordeGeneralSettings
{
	bool Enabled;
	int MinPlayersOnline;
	int MinTimeBetweenEventsSeconds;
	int MaxTimeBetweenEventsSeconds;
	int WarningDurationSeconds;
	int EventDurationSeconds;
	int SpawnIntervalSeconds;
	int ZombiesPerWave;
	int ExtraZombiesPerAdditionalPlayer;
	int MaxExtraZombiesFromPopulation;
	int MaxAliveEventZombies;
	float SpawnRadiusMin;
	float SpawnRadiusMax;
	bool CleanupSpawnedInfectedOnEnd;
	bool AnnounceTargetPlayer;
	bool IgnorePlayersInVehicles;
	bool CountNearbyPlayerKillsTowardCompletion;
	float NearbyPlayerContributionRange;
	bool UseSinglePlayerTargetProtection;
	float SinglePlayerSelectionChancePercent;
	int SinglePlayerSelectionCooldownSeconds;
	bool PreferNeverTargetedPlayers;
	int RecentTargetBiasCooldownSeconds;
	int PlayerJoinCooldownSeconds;
	bool RetryTargetSelectionOnInvalidCandidate;
	bool RestrictEventStartByTimeWindow;
	string AllowedSpawnTimeWindowSetting;
	string AllowedSpawnTimeWindow;
	int DayStartHour;
	int NightStartHour;
	bool AggroOnSpawn;
	float AggroSpawnRadiusMin;
	float AggroSpawnRadiusMax;
	int AggroOrientationRefreshCount;
	int AggroOrientationRefreshDelayMs;
	ref array<ref ZHordeSafeZone> SafeZones;
	bool UseTerritoryFlagProtection;
	float TerritoryFlagProtectionRadius;
	bool TerritoryFlagUseIsKindOf;
	ref array<string> TerritoryFlagClassNames;
	bool EnableNotifications;
	string NotificationIcon;
	string NotifyWarningTitle;
	string NotifyWarningStartMessage;
	string NotifyWarningCountdownMessage;
	string NotifyEventActiveTitle;
	string NotifyEventActiveMessage;
	string NotifyTargetChosenMessage;
	string NotifyTargetStartMessage;
	string NotifyTargetShiftedMessage;
	string NotifyNextWaveStartingMessage;
	string NotifyTerritoryProtectionBlockedMessage;
	string NotifySoloProtectionLuckyMessage;
	string NotifyEventFailedMessage;
	string NotifyEventEndedMessage;
	string NotifyEventSurvivedMessage;
	string NotifyRewardGrantedMessage;
	string NotifyRewardDeniedTitle;
	string NotifyRewardDeniedDetail;

	void ZHordeGeneralSettings()
	{
		Enabled = true;
		MinPlayersOnline = 1;
		MinTimeBetweenEventsSeconds = 900;
		MaxTimeBetweenEventsSeconds = 1800;
		WarningDurationSeconds = 60;
		EventDurationSeconds = 180;
		SpawnIntervalSeconds = 20;
		ZombiesPerWave = 10;
		ExtraZombiesPerAdditionalPlayer = 1;
		MaxExtraZombiesFromPopulation = 10;
		MaxAliveEventZombies = 40;
		SpawnRadiusMin = 35.0;
		SpawnRadiusMax = 90.0;
		CleanupSpawnedInfectedOnEnd = true;
		AnnounceTargetPlayer = false;
		IgnorePlayersInVehicles = true;
		CountNearbyPlayerKillsTowardCompletion = false;
		NearbyPlayerContributionRange = 120.0;
		UseSinglePlayerTargetProtection = true;
		SinglePlayerSelectionChancePercent = 35.0;
		SinglePlayerSelectionCooldownSeconds = 1800;
		PreferNeverTargetedPlayers = true;
		RecentTargetBiasCooldownSeconds = 3600;
		PlayerJoinCooldownSeconds = 300;
		RetryTargetSelectionOnInvalidCandidate = true;
		RestrictEventStartByTimeWindow = false;
		AllowedSpawnTimeWindowSetting = "Day, Night or Any";
		AllowedSpawnTimeWindow = "Any";
		DayStartHour = 6;
		NightStartHour = 18;
		AggroOnSpawn = true;
		AggroSpawnRadiusMin = 8.0;
		AggroSpawnRadiusMax = 18.0;
		AggroOrientationRefreshCount = 3;
		AggroOrientationRefreshDelayMs = 500;

		SafeZones = new array<ref ZHordeSafeZone>;
		SafeZones.Insert(ZHordeSafeZone.Create("12142 0 12512", 250.0));

		UseTerritoryFlagProtection = false;
		TerritoryFlagProtectionRadius = 100.0;
		TerritoryFlagUseIsKindOf = true;
		TerritoryFlagClassNames = new array<string>;
		TerritoryFlagClassNames.Insert("TerritoryFlag");

		EnableNotifications = true;
		NotificationIcon = "set:ccgui_enforce image:Icon40Emergency";
		NotifyWarningTitle = "Zombie Horde";
		NotifyWarningStartMessage = "You hear distant shrieks. A horde event is about to begin.";
		NotifyWarningCountdownMessage = "Warning: horde event begins in {SECONDS} seconds.";
		NotifyEventActiveTitle = "Zombie Horde";
		NotifyEventActiveMessage = "The horde is now active. Stay sharp.";
		NotifyTargetChosenMessage = "The horde has chosen {PLAYER}.";
		NotifyTargetStartMessage = "Survive and kill at least {PERCENT} percent of the event infected to earn the reward.";
		NotifyTargetShiftedMessage = "The horde has shifted toward your location.";
		NotifyNextWaveStartingMessage = "The next horde wave is starting.";
		NotifyTerritoryProtectionBlockedMessage = "Horde event skipped. The selected player was protected by a territory flag.";
		NotifySoloProtectionLuckyMessage = "Lucky you. The horde passed you by this time.";
		NotifyEventFailedMessage = "{PLAYER} died. The horde event has failed.";
		NotifyEventEndedMessage = "The horde event has ended.";
		NotifyEventSurvivedMessage = "{PLAYER} survived the horde.";
		NotifyRewardGrantedMessage = "You survived and earned the reward chest.";
		NotifyRewardDeniedTitle = "Zombie Horde reward denied.";
		NotifyRewardDeniedDetail = "Killed {KILL_PERCENT} percent. Required {REQUIRED_PERCENT} percent.";
	}
}

class ZHordeRewardsSettings
{
	bool RewardOnCompletion;
	string RewardContainerClassName;
	float RewardSpawnDistance;
	bool RewardFireworksEnabled;
	int RewardFireworksDelayMs;
	bool CleanupRewardContainerWhenEmpty;
	int RewardContainerCleanupDelaySeconds;
	bool CleanupRewardFireworks;
	int RewardFireworksCleanupDelaySeconds;
	float CompletionKillPercentRequired;
	bool UseRandomRewards;
	int RandomRewardMinItems;
	int RandomRewardMaxItems;
	ref array<ref ZHordeRewardItem> CompletionRewards;

	void ZHordeRewardsSettings()
	{
		RewardOnCompletion = true;
		RewardContainerClassName = "SeaChest";
		RewardSpawnDistance = 2.0;
		RewardFireworksEnabled = true;
		RewardFireworksDelayMs = 1500;
		CleanupRewardContainerWhenEmpty = true;
		RewardContainerCleanupDelaySeconds = 1800;
		CleanupRewardFireworks = true;
		RewardFireworksCleanupDelaySeconds = 180;
		CompletionKillPercentRequired = 50.0;
		UseRandomRewards = false;
		RandomRewardMinItems = 1;
		RandomRewardMaxItems = 3;

		CompletionRewards = new array<ref ZHordeRewardItem>;
		CompletionRewards.Insert(ZHordeRewardItem.Create("M67Grenade", 1, 1.0, 100.0));
		CompletionRewards.Insert(ZHordeRewardItem.Create("AmmoBox_308WinTracer_20Rnd", 1, 1.0, 100.0));
		CompletionRewards.Insert(ZHordeRewardItem.Create("BandageDressing", 2, 1.0, 100.0));
		CompletionRewards.Insert(ZHordeRewardItem.Create("Morphine", 1, 1.0, 100.0));
		CompletionRewards.Insert(ZHordeRewardItem.Create("TacticalBaconCan", 2, 1.0, 100.0));
		CompletionRewards.Insert(ZHordeRewardItem.Create("WaterBottle", 1, 1.0, 100.0));
	}
}

class ZHordeZombieTypesSettings
{
	ref array<string> ZombieTypes;

	void ZHordeZombieTypesSettings()
	{
		ZombieTypes = new array<string>;
		ZombieTypes.Insert("ZmbM_CitizenASkinny_Beige");
		ZombieTypes.Insert("ZmbM_CitizenASkinny_Blue");
		ZombieTypes.Insert("ZmbM_CitizenBFat_Grey");
		ZombieTypes.Insert("ZmbM_CitizenBFat_Red");
		ZombieTypes.Insert("ZmbM_CommercialPilotOld_Blue");
		ZombieTypes.Insert("ZmbM_ConstrWorkerNormal_Beige");
		ZombieTypes.Insert("ZmbM_FarmerFat_Beige");
		ZombieTypes.Insert("ZmbM_FirefighterNormal");
		ZombieTypes.Insert("ZmbM_HandymanNormal_Beige");
		ZombieTypes.Insert("ZmbM_HeavyIndustryWorker");
		ZombieTypes.Insert("ZmbM_HermitSkinny_Beige");
		ZombieTypes.Insert("ZmbM_Jacket_beige");
		ZombieTypes.Insert("ZmbM_Jacket_blue");
		ZombieTypes.Insert("ZmbM_JoggerSkinny_Blue");
		ZombieTypes.Insert("ZmbM_MotobikerFat_Beige");
		ZombieTypes.Insert("ZmbM_OffshoreWorker_Green");
		ZombieTypes.Insert("ZmbM_ParamedicNormal_Green");
		ZombieTypes.Insert("ZmbM_PatientSkinny");
		ZombieTypes.Insert("ZmbM_PolicemanFat");
		ZombieTypes.Insert("ZmbM_PrisonerSkinny");
	}
}

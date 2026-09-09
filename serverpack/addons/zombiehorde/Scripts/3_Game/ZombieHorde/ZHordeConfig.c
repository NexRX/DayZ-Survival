class ZHordeConfig
{
	static void EnsureGeneralDefaults(ZHordeGeneralSettings settings)
	{
		if (!settings.SafeZones)
		{
			settings.SafeZones = new array<ref ZHordeSafeZone>;
		}

		if (!settings.TerritoryFlagClassNames)
		{
			settings.TerritoryFlagClassNames = new array<string>;
		}

		bool hasTerritoryFlag = false;
		for (int i = 0; i < settings.TerritoryFlagClassNames.Count(); i++)
		{
			if (settings.TerritoryFlagClassNames[i] == "TerritoryFlag")
			{
				hasTerritoryFlag = true;
				break;
			}
		}

		if (!hasTerritoryFlag)
		{
			settings.TerritoryFlagClassNames.Insert("TerritoryFlag");
		}

		if (settings.PlayerJoinCooldownSeconds < 0)
		{
			settings.PlayerJoinCooldownSeconds = 0;
		}
	}


	static const string ZH_ROOT = "$profile:ZombieHorde";
	static const string ZH_SETTINGS_ROOT = "$profile:ZombieHorde\\Settings";
	static const string ZH_PERMISSIONS_ROOT = "$profile:ZombieHorde\\Settings\\Permissions";
	static const string ZH_GENERAL_SETTINGS = "$profile:ZombieHorde\\Settings\\GeneralSettings.json";
	static const string ZH_REWARD_SETTINGS = "$profile:ZombieHorde\\Settings\\Rewards.json";
	static const string ZH_ZOMBIE_TYPES_SETTINGS = "$profile:ZombieHorde\\Settings\\ZombieTypes.json";
	static const string ZH_WHITELIST_SETTINGS = "$profile:ZombieHorde\\Settings\\Permissions\\Whitelist.json";

	static void EnsureRoot()
	{
		if (!FileExist(ZH_ROOT))
		{
			MakeDirectory(ZH_ROOT);
		}

		if (!FileExist(ZH_SETTINGS_ROOT))
		{
			MakeDirectory(ZH_SETTINGS_ROOT);
		}

		if (!FileExist(ZH_PERMISSIONS_ROOT))
		{
			MakeDirectory(ZH_PERMISSIONS_ROOT);
		}
	}

	static ref ZHordeWhitelistSettings LoadWhitelist()
	{
		ref ZHordeWhitelistSettings settings = new ZHordeWhitelistSettings;
		EnsureRoot();

		if (FileExist(ZH_WHITELIST_SETTINGS))
		{
			JsonFileLoader<ZHordeWhitelistSettings>.JsonLoadFile(ZH_WHITELIST_SETTINGS, settings);
		}

		if (!settings.WhitelistedPlayerIds)
		{
			settings.WhitelistedPlayerIds = new array<string>;
		}

		JsonFileLoader<ZHordeWhitelistSettings>.JsonSaveFile(ZH_WHITELIST_SETTINGS, settings);
		ZHordeLogger.Log("Loaded whitelist settings: " + ZH_WHITELIST_SETTINGS);
		return settings;
	}

	static ref ZHordeGeneralSettings LoadGeneral()
	{
		ref ZHordeGeneralSettings settings = new ZHordeGeneralSettings;
		EnsureRoot();

		if (FileExist(ZH_GENERAL_SETTINGS))
		{
			JsonFileLoader<ZHordeGeneralSettings>.JsonLoadFile(ZH_GENERAL_SETTINGS, settings);
		}

		EnsureGeneralDefaults(settings);
		JsonFileLoader<ZHordeGeneralSettings>.JsonSaveFile(ZH_GENERAL_SETTINGS, settings);
		ZHordeLogger.Log("Loaded general settings: " + ZH_GENERAL_SETTINGS);
		return settings;
	}

	static ref ZHordeRewardsSettings LoadRewards()
	{
		ref ZHordeRewardsSettings settings = new ZHordeRewardsSettings;
		EnsureRoot();

		if (FileExist(ZH_REWARD_SETTINGS))
		{
			JsonFileLoader<ZHordeRewardsSettings>.JsonLoadFile(ZH_REWARD_SETTINGS, settings);
		}

		JsonFileLoader<ZHordeRewardsSettings>.JsonSaveFile(ZH_REWARD_SETTINGS, settings);
		ZHordeLogger.Log("Loaded rewards settings: " + ZH_REWARD_SETTINGS);
		return settings;
	}

	static ref ZHordeZombieTypesSettings LoadZombieTypes()
	{
		ref ZHordeZombieTypesSettings settings = new ZHordeZombieTypesSettings;
		EnsureRoot();

		if (FileExist(ZH_ZOMBIE_TYPES_SETTINGS))
		{
			JsonFileLoader<ZHordeZombieTypesSettings>.JsonLoadFile(ZH_ZOMBIE_TYPES_SETTINGS, settings);
		}

		JsonFileLoader<ZHordeZombieTypesSettings>.JsonSaveFile(ZH_ZOMBIE_TYPES_SETTINGS, settings);
		ZHordeLogger.Log("Loaded zombie types settings: " + ZH_ZOMBIE_TYPES_SETTINGS);
		return settings;
	}
}

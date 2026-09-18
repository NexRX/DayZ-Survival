class DZSurvivalTraderRestockState
{
	ref map<string, int> LastRestockUnix = new map<string, int>();
	int LastVehiclePartsRestockUnix = 0;
};

class DZSurvivalTraderRestock
{

	protected static const string STATE_DIR = "$profile:DZSurvivalServerPack";
	protected static const string STATE_PATH = STATE_DIR + "\\TraderRestock.json";


	protected static const int TICK_INTERVAL_MS = 3600000; // 1 hour
	protected static const int FIRST_TICK_DELAY_MS = 15000; // let mission settle first

	protected static const vector CUSTOM_TRADER_POSITION = "7991.59 221.09 11312.5";

	protected static const int TIER_COMMON = 0;
	protected static const int TIER_UNCOMMON = 1;
	protected static const int TIER_RARE = 2;
	protected static const int TIER_LEGENDARY = 3;


	protected static const int MIN_RESTOCKS_PER_TICK = 10;
	protected static const int RESTOCK_FRACTION_DIVISOR = 25;

	protected static const int VEHICLE_PARTS_COOLDOWN_HOURS = 24;

	protected static ref DZSurvivalTraderRestockState s_State;
	protected static ref array<string> s_ManagedCategories;
	protected static ref array<string> s_VehiclePartsCategories;

	protected static ref map<string, ref array<string>> s_RestockGroups;
	protected static ref map<string, string> s_CategoryToGroup;
	protected static ref array<string> s_GroupOrder;

	protected static int TierForCap(int cap)
	{
		if (cap <= 1)
			return TIER_LEGENDARY;
		if (cap <= 3)
			return TIER_RARE;
		if (cap <= 8)
			return TIER_UNCOMMON;
		return TIER_COMMON;
	}

	protected static int TierCooldownHours(int tier)
	{
		if (tier == TIER_LEGENDARY)
			return 336; // ~2 weeks
		if (tier == TIER_RARE)
			return 48; // ~2 days
		if (tier == TIER_UNCOMMON)
			return 12;
		return 0; // Common - no cooldown, only gated by the weighted pick itself
	}

	protected static float TierWeight(int tier)
	{
		if (tier == TIER_LEGENDARY)
			return 0.05;
		if (tier == TIER_RARE)
			return 0.2;
		if (tier == TIER_UNCOMMON)
			return 0.5;
		return 1.0; // Common
	}

	protected static string TierName(int tier)
	{
		if (tier == TIER_LEGENDARY)
			return "Legendary";
		if (tier == TIER_RARE)
			return "Rare";
		if (tier == TIER_UNCOMMON)
			return "Uncommon";
		return "Common";
	}

	static void Init()
	{
		s_ManagedCategories = new array<string>();
		s_ManagedCategories.Insert("Guns_Military");
		s_ManagedCategories.Insert("Guns_Civilian");
		s_ManagedCategories.Insert("Gun_Ammo");
		s_ManagedCategories.Insert("Gun_Attachments_Military");
		s_ManagedCategories.Insert("Gun_Attachments_Civilian");
		s_ManagedCategories.Insert("Explosives");
		s_ManagedCategories.Insert("Clothing_Head_Military");
		s_ManagedCategories.Insert("Clothing_Head_Civilian");
		s_ManagedCategories.Insert("Clothing_Top_Military");
		s_ManagedCategories.Insert("Clothing_Top_Civilian");
		s_ManagedCategories.Insert("Clothing_Bottom_Military");
		s_ManagedCategories.Insert("Clothing_Bottom_Civilian");
		s_ManagedCategories.Insert("Clothing_Back_Military");
		s_ManagedCategories.Insert("Clothing_Back_Civilian");
		s_ManagedCategories.Insert("Clothing_Misc_Military");
		s_ManagedCategories.Insert("Clothing_Misc_Civilian");
		s_ManagedCategories.Insert("Consumables");
		s_ManagedCategories.Insert("Medical");
		s_ManagedCategories.Insert("Base_Building");
		s_ManagedCategories.Insert("Utility");
		s_ManagedCategories.Insert("Tools_And_Melee");
		s_ManagedCategories.Insert("Vehicles_Cars");
		s_ManagedCategories.Insert("Vehicles_Helicopters");

		s_VehiclePartsCategories = new array<string>();
		s_VehiclePartsCategories.Insert("Vehicle_Parts");
		s_VehiclePartsCategories.Insert("Batteries");

		s_RestockGroups = new map<string, ref array<string>>();

		array<string> gunsGroup = {"Guns_Military", "Guns_Civilian"};
		s_RestockGroups.Set("Guns", gunsGroup);

		array<string> ammoGroup = {"Gun_Ammo", "Gun_Attachments_Military", "Gun_Attachments_Civilian", "Explosives"};
		s_RestockGroups.Set("Ammo & Attachments", ammoGroup);

		array<string> gearGroup = {
			"Clothing_Head_Military", "Clothing_Head_Civilian",
			"Clothing_Top_Military", "Clothing_Top_Civilian",
			"Clothing_Bottom_Military", "Clothing_Bottom_Civilian",
			"Clothing_Back_Military", "Clothing_Back_Civilian",
			"Clothing_Misc_Military", "Clothing_Misc_Civilian"
		};
		s_RestockGroups.Set("Gear", gearGroup);

		array<string> medicineGroup = {"Medical"};
		s_RestockGroups.Set("Medicine", medicineGroup);

		array<string> carsGroup = {"Vehicles_Cars"};
		s_RestockGroups.Set("Cars", carsGroup);

		array<string> helisGroup = {"Vehicles_Helicopters"};
		s_RestockGroups.Set("Helis", helisGroup);

		array<string> foodGroup = {"Consumables", "Base_Building", "Utility", "Tools_And_Melee"};
		s_RestockGroups.Set("Food & Supplies", foodGroup);

		s_CategoryToGroup = new map<string, string>();
		foreach (string groupName, array<string> groupCategories : s_RestockGroups)
		{
			foreach (string catName : groupCategories)
				s_CategoryToGroup.Set(catName, groupName);
		}

		s_GroupOrder = new array<string>();
		s_GroupOrder.Insert("Guns");
		s_GroupOrder.Insert("Ammo & Attachments");
		s_GroupOrder.Insert("Gear");
		s_GroupOrder.Insert("Medicine");
		s_GroupOrder.Insert("Cars");
		s_GroupOrder.Insert("Helis");
		s_GroupOrder.Insert("Food & Supplies");

		LoadState();

		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Tick, FIRST_TICK_DELAY_MS, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Tick, TICK_INTERVAL_MS, true);

		GetGame().AdminLog(string.Format("[TraderRestock] Initialized - tier-driven restock across %1 managed categories, checking hourly.", s_ManagedCategories.Count()));
	}

	protected static void LoadState()
	{
		s_State = new DZSurvivalTraderRestockState();
		if (FileExist(STATE_PATH))
			JsonFileLoader<DZSurvivalTraderRestockState>.JsonLoadFile(STATE_PATH, s_State);
	}

	protected static void SaveState()
	{
		MakeDirectory(STATE_DIR);
		JsonFileLoader<DZSurvivalTraderRestockState>.JsonSaveFile(STATE_PATH, s_State);
	}

	protected static int NowUnix()
	{
		int year, month, day, hour, minute, second;
		GetYearMonthDayUTC(year, month, day);
		GetHourMinuteSecondUTC(hour, minute, second);

		int y = year;
		if (month <= 2)
			y = year - 1;
		int era = y / 400;
		int yoe = y - era * 400;
		int mAdj = month + 9;
		if (month > 2)
			mAdj = month - 3;
		int doy = (153 * mAdj + 2) / 5 + day - 1;
		int doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
		int days = era * 146097 + doe - 719468;

		return days * 86400 + hour * 3600 + minute * 60 + second;
	}

	static void Tick()
	{
		TickInternal(false);
		VehiclePartsTick(false);
	}

	// Manual/testing entry point
	static int ForceTick()
	{
		int restocked = TickInternal(true);
		restocked += VehiclePartsTick(true);
		return restocked;
	}

	// Manual/testing entry point
	static int ResetStock()
	{
		int resetItems;

		ExpansionMarketTraderZone zone = GetExpansionSettings().GetMarket().GetTraderZoneByPosition(CUSTOM_TRADER_POSITION);
		if (!zone)
			return 0;

		foreach (string categoryName : s_ManagedCategories)
		{
			ExpansionMarketCategory category = GetExpansionSettings().GetMarket().GetCategory(categoryName);
			if (!category || !category.Items)
				continue;

			foreach (ExpansionMarketItem item : category.Items)
			{
				string key = item.ClassName;
				key.ToLower();
				zone.Stock.Set(key, 0);
				resetItems++;
			}
		}

		zone.Save();

		s_State.LastRestockUnix.Clear();
		SaveState();

		GetGame().AdminLog(string.Format("[TraderRestock] Reset stock - %1 item(s) across %2 managed categor(y/ies) zeroed out.", resetItems, s_ManagedCategories.Count()));

		return resetItems;
	}

	protected static int TickInternal(bool force)
	{
		int now = NowUnix();

		ExpansionMarketTraderZone zone = GetExpansionSettings().GetMarket().GetTraderZoneByPosition(CUSTOM_TRADER_POSITION);
		if (!zone)
		{
			GetGame().AdminLog("[TraderRestock] tick - trader zone not found, skipping.");
			return 0;
		}

		array<ExpansionMarketItem> eligible = new array<ExpansionMarketItem>();
		array<float> weights = new array<float>();
		array<int> tiers = new array<int>();
		array<string> groups = new array<string>();

		int totalItems;
		foreach (string categoryName : s_ManagedCategories)
		{
			ExpansionMarketCategory category = GetExpansionSettings().GetMarket().GetCategory(categoryName);
			if (!category || !category.Items)
				continue;

			string groupName;
			if (!s_CategoryToGroup.Find(categoryName, groupName))
				groupName = categoryName;

			foreach (ExpansionMarketItem item : category.Items)
			{
				totalItems++;

				string key = item.ClassName;
				key.ToLower();

				int currentStock;
				zone.Stock.Find(key, currentStock);
				if (currentStock >= item.MaxStockThreshold)
					continue;

				int tier = TierForCap(item.MaxStockThreshold);

				if (!force)
				{
					int cooldownHours = TierCooldownHours(tier);
					if (cooldownHours > 0)
					{
						int lastTs;
						bool seenBefore = s_State.LastRestockUnix.Find(key, lastTs);
						if (seenBefore)
						{
							int elapsedHours = (now - lastTs) / 3600;
							if (elapsedHours < cooldownHours)
								continue;
						}
					}
				}

				float stockRatio = 0.0;
				if (item.MaxStockThreshold > 0)
					stockRatio = (float)currentStock / (float)item.MaxStockThreshold;

				float score = (1.0 - stockRatio) * TierWeight(tier);
				if (score <= 0)
					continue;

				eligible.Insert(item);
				weights.Insert(score);
				tiers.Insert(tier);
				groups.Insert(groupName);
			}
		}

		if (totalItems == 0)
		{
			GetGame().AdminLog("[TraderRestock] tick - managed categories aren't generated yet, nothing to check.");
			return 0;
		}

		int maxRestocks;
		if (force)
			maxRestocks = eligible.Count(); // manual/testing: top up everything eligible right now, cooldowns already ignored above
		else
			maxRestocks = Math.Max(MIN_RESTOCKS_PER_TICK, eligible.Count() / RESTOCK_FRACTION_DIVISOR);

		int restocked;
		for (int n = 0; n < maxRestocks && eligible.Count() > 0; n++)
		{
			float totalWeight = 0.0;
			for (int i = 0; i < weights.Count(); i++)
				totalWeight += weights.Get(i);

			if (totalWeight <= 0)
				break;

			float r = Math.RandomFloat01() * totalWeight;
			float cumulative = 0.0;
			int chosenIndex = eligible.Count() - 1;
			for (int j = 0; j < weights.Count(); j++)
			{
				cumulative += weights.Get(j);
				if (r <= cumulative)
				{
					chosenIndex = j;
					break;
				}
			}

			ExpansionMarketItem chosen = eligible.Get(chosenIndex);
			int chosenTier = tiers.Get(chosenIndex);
			string chosenGroup = groups.Get(chosenIndex);

			string chosenKey = chosen.ClassName;
			chosenKey.ToLower();

			int chosenStock;
			zone.Stock.Find(chosenKey, chosenStock);
			int newStock = Math.Min(chosen.MaxStockThreshold, chosenStock + 1);
			zone.Stock.Set(chosenKey, newStock);

			s_State.LastRestockUnix.Set(chosenKey, now);
			restocked++;

			GetGame().AdminLog(string.Format("[TraderRestock] Restocked %1 (%2 / %3 tier): %4 -> %5 (cap %6)", chosen.ClassName, chosenGroup, TierName(chosenTier), chosenStock, newStock, chosen.MaxStockThreshold));

			eligible.Remove(chosenIndex);
			weights.Remove(chosenIndex);
			tiers.Remove(chosenIndex);
			groups.Remove(chosenIndex);
		}

		if (restocked > 0)
			zone.Save();

		SaveState();

		if (force)
			GetGame().AdminLog(string.Format("[TraderRestock] forced tick - %1 item(s) restocked out of %2 managed.", restocked, totalItems));
		else
			GetGame().AdminLog(string.Format("[TraderRestock] tick - %1 item(s) restocked out of %2 managed. Next check in ~%3 min.", restocked, totalItems, TICK_INTERVAL_MS / 60000));

		return restocked;
	}

	protected static int VehiclePartsTick(bool force)
	{
		int now = NowUnix();

		if (!force)
		{
			int elapsedHours = (now - s_State.LastVehiclePartsRestockUnix) / 3600;
			if (s_State.LastVehiclePartsRestockUnix > 0 && elapsedHours < VEHICLE_PARTS_COOLDOWN_HOURS)
				return 0;
		}

		ExpansionMarketTraderZone zone = GetExpansionSettings().GetMarket().GetTraderZoneByPosition(CUSTOM_TRADER_POSITION);
		if (!zone)
			return 0;

		array<ExpansionMarketItem> eligible = new array<ExpansionMarketItem>();
		array<string> categoryOf = new array<string>();

		foreach (string categoryName : s_VehiclePartsCategories)
		{
			ExpansionMarketCategory category = GetExpansionSettings().GetMarket().GetCategory(categoryName);
			if (!category || !category.Items)
				continue;

			foreach (ExpansionMarketItem item : category.Items)
			{
				string key = item.ClassName;
				key.ToLower();

				int currentStock;
				zone.Stock.Find(key, currentStock);
				if (currentStock >= item.MaxStockThreshold)
					continue;

				eligible.Insert(item);
				categoryOf.Insert(categoryName);
			}
		}

		if (eligible.Count() == 0)
		{
			s_State.LastVehiclePartsRestockUnix = now;
			SaveState();
			return 0;
		}

		int chosenIndex = Math.RandomInt(0, eligible.Count());
		ExpansionMarketItem chosen = eligible.Get(chosenIndex);
		string chosenCategory = categoryOf.Get(chosenIndex);

		string chosenKey = chosen.ClassName;
		chosenKey.ToLower();

		int chosenStock;
		zone.Stock.Find(chosenKey, chosenStock);
		int newStock = Math.Min(chosen.MaxStockThreshold, chosenStock + 1);
		zone.Stock.Set(chosenKey, newStock);
		zone.Save();

		s_State.LastVehiclePartsRestockUnix = now;
		SaveState();

		GetGame().AdminLog(string.Format("[TraderRestock] Vehicle parts daily trickle - restocked %1 (%2): %3 -> %4 (cap %5)", chosen.ClassName, chosenCategory, chosenStock, newStock, chosen.MaxStockThreshold));

		return 1;
	}

	static string BuildBoardStatusText()
	{
		if (!s_ManagedCategories)
			return "Restock system not initialized yet.";

		int now = NowUnix();
		ExpansionMarketTraderZone zone = GetExpansionSettings().GetMarket().GetTraderZoneByPosition(CUSTOM_TRADER_POSITION);
		if (!zone)
			return "Trader zone not found.";

		map<string, int> stockByGroup = new map<string, int>();
		map<string, int> capByGroup = new map<string, int>();
		map<string, int> itemsByGroup = new map<string, int>();
		map<string, int> soonestRemainingSecByGroup = new map<string, int>();
		foreach (string seedGroup : s_GroupOrder)
		{
			stockByGroup.Set(seedGroup, 0);
			capByGroup.Set(seedGroup, 0);
			itemsByGroup.Set(seedGroup, 0);
			soonestRemainingSecByGroup.Set(seedGroup, -1);
		}

		int totalItems;
		foreach (string categoryName : s_ManagedCategories)
		{
			ExpansionMarketCategory category = GetExpansionSettings().GetMarket().GetCategory(categoryName);
			if (!category || !category.Items)
				continue;

			string groupName;
			if (!s_CategoryToGroup.Find(categoryName, groupName))
				groupName = categoryName;

			foreach (ExpansionMarketItem item : category.Items)
			{
				totalItems++;
				int tier = TierForCap(item.MaxStockThreshold);

				string key = item.ClassName;
				key.ToLower();

				int stock;
				zone.Stock.Find(key, stock);

				int curStock;
				stockByGroup.Find(groupName, curStock);
				stockByGroup.Set(groupName, curStock + stock);

				int curCap;
				capByGroup.Find(groupName, curCap);
				capByGroup.Set(groupName, curCap + item.MaxStockThreshold);

				int curItems;
				itemsByGroup.Find(groupName, curItems);
				itemsByGroup.Set(groupName, curItems + 1);

				if (stock < item.MaxStockThreshold)
				{
					int cooldownHours = TierCooldownHours(tier);
					int remainingSec = 0;
					if (cooldownHours > 0)
					{
						int lastTs;
						bool seenBefore = s_State.LastRestockUnix.Find(key, lastTs);
						if (seenBefore)
						{
							int readyAt = lastTs + cooldownHours * 3600;
							remainingSec = Math.Max(0, readyAt - now);
						}
					}

					int existingSoonest;
					soonestRemainingSecByGroup.Find(groupName, existingSoonest);
					if (existingSoonest < 0 || remainingSec < existingSoonest)
						soonestRemainingSecByGroup.Set(groupName, remainingSec);
				}
			}
		}

		if (totalItems == 0)
			return "Managed categories aren't generated yet - give the trader a moment after server start.";

		string text = "";
		foreach (string groupName2 : s_GroupOrder)
		{
			int itemCount;
			itemsByGroup.Find(groupName2, itemCount);
			if (itemCount == 0)
				continue;

			int groupStock;
			stockByGroup.Find(groupName2, groupStock);
			int groupCap;
			capByGroup.Find(groupName2, groupCap);
			int soonest;
			soonestRemainingSecByGroup.Find(groupName2, soonest);

			string readyText;
			if (soonest < 0)
			{
				readyText = "fully stocked";
			}
			else if (soonest == 0)
			{
				readyText = "due now";
			}
			else
			{
				int minsLeft = soonest / 60;
				int hoursLeft = minsLeft / 60;
				int mins = minsLeft % 60;
				readyText = string.Format("next eligible in %1h %2m", hoursLeft, mins);
			}

			text += string.Format("%1: %2/%3 in stock (%4 items, %5)\n", groupName2, groupStock, groupCap, itemCount, readyText);
		}

		return text;
	}
};

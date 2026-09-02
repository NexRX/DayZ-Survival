// DZSurvivalTraderRestock_Module.c
//
// Real-time scheduled restocking for the custom trader city
// (src/traders.ts's "CustomTrader" zone) - DayZ-Expansion-Market itself has
// NO restock/timer system at all (confirmed by unpacking and searching its
// own market_scripts.pbo source: no "Restock", no scheduled stock
// regeneration, no repeating CallLater for stock - it only ever increases
// stock when a player sells an item back to the trader). This adds one,
// entirely independent of server restarts (checks on a real repeating
// in-game timer, not just at mission start) - important since this
// project's server runs for days at a stretch between restarts.
//
// Design (tier-driven, unified across every managed category - replaces an
// earlier version of this file that had 4 hand-picked fixed-interval rules,
// e.g. "1 helicopter/168h", "1 gun/6h"): every real hourly tick, scans
// EVERY item in every category in s_ManagedCategories (see Init() - these
// match src/market.ts's MERGED_CATEGORIES, minus Ghillies/Vehicle_Parts/
// Batteries, which are deliberately never auto-restocked - see that file's
// header comment) and buckets each item into a rarity tier purely from its
// own live MaxStockThreshold (TierForCap() - <=1 Legendary, <=3 Rare, <=8
// Uncommon, else Common - kept in sync with src/market.ts's
// TIER_MAX_STOCK, no separate classname lookup table needed here). Each
// tier has its own per-item restock cooldown (TierCooldownHours) and
// restock likelihood weight (TierWeight) - rarer tiers restock far less
// often AND are far less likely to be the one picked even when eligible,
// so "how coveted an item is" (set via its MaxStockThreshold in
// src/market.ts) directly drives how rarely it trickles back into stock.
// This is deliberately probabilistic, not an exact "1 per Xh" guarantee -
// e.g. a Legendary item (336h cooldown, lowest pick weight) will average
// out to roughly once every two weeks, competing against every other
// tier-eligible item for that tick's picks, but won't land on a precise
// schedule.
//
// Each real tick picks a budget of items (weighted, without replacement -
// see TickInternal()) sized as a FRACTION of the currently-eligible pool
// (Math.Max(MIN_RESTOCKS_PER_TICK, eligible.Count() / RESTOCK_FRACTION_
// DIVISOR)) rather than a flat constant, so the pick count automatically
// scales as the catalog grows/shrinks - a flat count (e.g. "3 per hour")
// silently starves large catalogs (with ~2700 managed items, a flat 3/hour
// budget meant most Common-tier items, including all ammo and every gun
// optic, had a well-under-1% chance of ever being picked and stayed stuck
// at their initial stock indefinitely). Each picked item is raised by
// exactly +1 stock (never above its own cap). Mutates the REAL, live
// ExpansionMarketTraderZone object, found via ExpansionMarketSettings' own PUBLIC
// GetTraderZoneByPosition(vector) - deliberately NOT a by-name lookup via a
// `modded class ExpansionMarketSettings` (tried first, but that broke
// Game-module compilation entirely: modding a class also used as a generic
// type parameter elsewhere, e.g. `JsonFileLoader<ExpansionMarketSettings>.
// JsonLoadFile(path, this)` inside the base class's own Load(), makes the
// compiler treat the modded and original identities as incompatible types -
// "Cannot convert 'ExpansionMarketSettings@N#M' to 'ExpansionMarketSettings'"
// - a real, reproducible EnforceScript limitation, confirmed by isolating
// it with the addon removed/re-added against an otherwise-unchanged mod
// list). Calls the found zone's own .Save() - exactly the same object/
// method any real purchase/sale uses, so there's no risk of racing or
// clobbering a concurrent player transaction's own save. This never lowers
// or clears any item's existing stock - it only ever raises the chosen
// items, and only up to their own cap - so a player's own sold-in stock (or
// any other item's stock) is never touched by a normal tick.
//
// Debug/status: every tick logs a one-line heartbeat via GetGame().AdminLog()
// regardless of whether anything restocked, plus one line per actual
// restock event - both land in the server's .ADM admin log, which
// Community-Online-Tools already reads/displays live in-game (COT ships its
// own `modded class PluginAdminLog`, confirmed by unpacking its
// scripts.pbo) - so "is it still ticking" is answerable without touching
// the server console at all. The same live numbers are also readable
// in-world: see DZSurvivalTraderRestock_ActionManager.c/PlayerBase.c/
// Actions/ActionCheckTraderBoard.c for the physical board.
class DZSurvivalTraderRestockState
{
	// Persisted per-ITEM (lowercased classname) "last restocked" timestamps
	// (real unix seconds) - needed for the per-tier cooldown check, and
	// because Market's own JSON has nowhere to record this. An item with no
	// entry yet (never restocked by this addon) is treated as immediately
	// eligible (cooldown trivially satisfied) - a freshly added/renamed
	// item doesn't have to wait a full cooldown before its first pick.
	ref map<string, int> LastRestockUnix = new map<string, int>();
};

class DZSurvivalTraderRestock
{
	// $profile:DZSurvivalServerPack\... keeps this alongside the rest of
	// this pack's own server-side state, separate from
	// $profile:ExpansionMod\... (which belongs to DayZ-Expansion-Market
	// itself).
	protected static const string STATE_DIR = "$profile:DZSurvivalServerPack";
	protected static const string STATE_PATH = STATE_DIR + "\\TraderRestock.json";

	// Real hourly granularity is fine even for a 336h ("1 helicopter/2 weeks")
	// cooldown - it just means the actual restock can land up to ~1h later
	// than the exact cooldown, which doesn't matter here. CALL_CATEGORY_SYSTEM
	// matches how DayZExpansion_Market itself schedules its own delayed
	// calls (see ExpansionMarketModule.c's RemoveReservedStock scheduling).
	protected static const int TICK_INTERVAL_MS = 3600000; // 1 hour
	protected static const int FIRST_TICK_DELAY_MS = 15000; // let mission settle first

	// Must match src/traders.ts's CUSTOM_POSITION exactly - duplicated here
	// for the same reason as ActionCheckTraderBoard.c's BOARD_POSITION (see
	// that file's own comment): this addon is a separate build artifact with
	// no shared config with the TypeScript CLI. GetTraderZoneByPosition()
	// matches on distance <= the zone's own Radius (300m, see traders.ts), so
	// this exact point (dead center of the zone) always resolves correctly.
	protected static const vector CUSTOM_TRADER_POSITION = "7991.59 221.09 11312.5";

	// Rarity tiers - derived purely from an item's own live
	// MaxStockThreshold (TierForCap()), not a separate classname table, so
	// this stays in sync with src/market.ts's TIER_MAX_STOCK automatically
	// as long as the numeric bands below match that file's tier caps
	// (Common 20, Uncommon 8, Rare 3, Legendary 1 - tightened 2026-08, was
	// 25/10/4/1).
	protected static const int TIER_COMMON = 0;
	protected static const int TIER_UNCOMMON = 1;
	protected static const int TIER_RARE = 2;
	protected static const int TIER_LEGENDARY = 3;

	// Picks per real hourly tick scale with the currently-eligible pool size
	// (see TickInternal()) instead of a flat count, so a growing/shrinking
	// catalog never needs re-tuning by hand again. MIN_RESTOCKS_PER_TICK is a
	// floor for when the eligible pool is small (e.g. right after a full
	// manual reset); RESTOCK_FRACTION_DIVISOR controls what fraction of the
	// eligible pool gets picked otherwise (1/25 = 4% per hour) - see this
	// file's header comment for why this is still probabilistic per item,
	// not an exact schedule. Slowed 2026-08 (was 15/20 = ~5%/hour) as part of
	// the hardcore-survival economy pass - see serverpack/README.md.
	protected static const int MIN_RESTOCKS_PER_TICK = 10;
	protected static const int RESTOCK_FRACTION_DIVISOR = 25;
	// '/restock now' (see DZSurvivalTraderRestock_COTCommand.c) ignores
	// cooldowns entirely; TickInternal() gives it a budget covering every
	// eligible item so a manual trigger visibly tops things up immediately
	// instead of needing to be spammed repeatedly.

	protected static ref DZSurvivalTraderRestockState s_State;
	// Every Market category this addon scans for restock-eligible items -
	// must match src/market.ts's MERGED_CATEGORIES fileNames, minus
	// Ghillies (sale-only, see that file's header comment) and
	// Vehicle_Parts/Batteries (functional necessity, kept generously
	// stocked outside the tier system).
	protected static ref array<string> s_ManagedCategories;

	// Player/admin-facing grouping layer - purely for the board text and
	// admin log readability (see BuildBoardStatusText()). The rarity tier
	// system above still drives every actual cap/cooldown/weight decision -
	// this just re-labels categories into names a player actually cares
	// about (e.g. "Guns", "Cars") instead of exposing the internal
	// Common/Uncommon/Rare/Legendary tiers directly, which used to mix e.g.
	// rare guns and rare clothes into one opaque "Rare" line. Keep this in
	// sync by hand whenever s_ManagedCategories changes - every entry in
	// s_ManagedCategories must appear in exactly one group here.
	protected static ref map<string, ref array<string>> s_RestockGroups;
	// Reverse lookup built from s_RestockGroups: category fileName -> group
	// display name.
	protected static ref map<string, string> s_CategoryToGroup;
	// Explicit display order for BuildBoardStatusText() - map iteration
	// order isn't guaranteed, so this pins the order players see.
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
		// Without this, JsonSaveFile() silently does nothing the very first
		// time (the parent folder doesn't exist yet) - confirmed live: this
		// addon ran through many real server boots during development and
		// TraderRestock.json was never actually written anywhere on disk.
		// MakeDirectory is a real, vanilla-confirmed proto (used the exact
		// same unconditional way by e.g. CameraToolsMenu.c before its own
		// JsonSaveFile calls) - safe/idempotent to call every time.
		MakeDirectory(STATE_DIR);
		JsonFileLoader<DZSurvivalTraderRestockState>.JsonSaveFile(STATE_PATH, s_State);
	}

	protected static int NowUnix()
	{
		// GetGame().GetTime() is *mission* time (resets every server restart
		// per its own doc comment: "returns mission time in milliseconds") -
		// useless for a persisted, cross-restart real-time schedule. Real
		// wall-clock time only comes from the engine's UTC calendar getters
		// (GetYearMonthDayUTC/GetHourMinuteSecondUTC, both confirmed real
		// protos in 1_Core/proto/EnSystem.c), so this converts that into
		// plain Unix seconds via the standard days-from-civil algorithm
		// (Howard Hinnant's, the same one used in most C++/Rust/etc. chrono
		// libraries) - proleptic Gregorian calendar, valid for any real
		// server clock date.
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
	}

	// Manual/testing entry point (called from the Community-Online-Tools
	// "/restock now" command - see DZSurvivalTraderRestock_COTCommand.c).
	// Unlike the real hourly Tick() above, this ignores every item's
	// per-tier cooldown, so it always actually tops up anything below its
	// cap immediately - otherwise, on a freshly restarted/updated server,
	// or simply before an item's real cooldown has elapsed, this would
	// silently do nothing but still show the same success notification,
	// which is confusing during testing. Returns how many items actually
	// got restocked, so the caller can report a real outcome instead of an
	// unconditional "success".
	static int ForceTick()
	{
		return TickInternal(true);
	}

	// Manual/testing entry point (called from the Community-Online-Tools
	// "/restock reset" command - see DZSurvivalTraderRestock_COTCommand.c).
	// Zeroes out EVERY item's stock in EVERY category this addon manages
	// (s_ManagedCategories - never any other Market category, e.g. never
	// Ghillies/Vehicle_Parts/Batteries), then clears the whole per-item
	// cooldown state, so the very next real tick treats every managed item
	// like a freshly-seen one again (immediately eligible, same as a brand
	// new server). Intended for trader-testing resets, not something that
	// should run on a live server casually - mutates the same live
	// ExpansionMarketTraderZone/.Save() as every real purchase/sale, so
	// this is a real, permanent stock change, not a preview. Returns how
	// many items actually got their stock reset to 0, so the caller can
	// report a real outcome.
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

	// Scans every item in every managed category, builds the eligible pool
	// (below its own cap AND, unless forced, past its own tier's cooldown
	// since it was last restocked by this addon), then does up to
	// MAX_RESTOCKS_PER_TICK (or MAX_RESTOCKS_PER_FORCED_TICK, if forced)
	// weighted, without-replacement picks - each raises the chosen item's
	// stock by exactly +1 (never above its own cap). Weight per item is
	// (1 - currentStock/cap) * TierWeight(tier): needier items within a
	// tier are more likely to be picked, and rarer tiers are far less
	// likely to be picked at all even when equally needy - see this file's
	// header comment for the full design rationale.
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

	// Builds the live status text shown by the physical board's action (see
	// Actions/ActionCheckTraderBoard.c) - one line per player-facing group
	// (see s_RestockGroups/s_GroupOrder), aggregated across every managed
	// category in that group. The rarity tier system still drives every
	// per-item cap/cooldown/weight decision (see TierForCap/TierCooldownHours/
	// TierWeight) - this just aggregates by a name a player actually
	// recognizes ("Guns", "Cars", ...) instead of the internal
	// Common/Uncommon/Rare/Legendary tiers, which used to mix e.g. rare guns
	// and rare clothes into one opaque "Rare" line. "next eligible" per
	// group is the soonest any currently-below-cap item in that group will
	// clear its own tier cooldown - not a guarantee that item (or any item)
	// actually gets picked the moment it's eligible, since picks are still
	// weighted/randomized (see TickInternal()).
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

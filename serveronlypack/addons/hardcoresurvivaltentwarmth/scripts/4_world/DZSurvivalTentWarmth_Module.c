class DZSurvivalTentWarmth
{
	protected static const int TICK_INTERVAL_MS = 1500;
	protected static const float LOOKUP_RADIUS = 4.0;
	protected static const float MAX_HEIGHT_DIFF = 2.5;
	protected static const float WARM_TARGET = 0.10;

	static void Init()
	{
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Tick, TICK_INTERVAL_MS, true);
		GetGame().AdminLog("[TentWarmth] Initialized - players at a pitched tent will be kept warm.");
	}

	static bool IsNearPitchedTent(vector playerPos)
	{
		array<Object> nearby = new array<Object>();
		GetGame().GetObjectsAtPosition(playerPos, LOOKUP_RADIUS, nearby, null);

		foreach (Object obj : nearby)
		{
			if (!obj || !obj.IsItemTent())
				continue;

			TentBase tent = TentBase.Cast(obj);
			if (!tent || tent.GetState() != TentBase.PITCHED)
				continue;

			vector tentPos = tent.GetPosition();
			if (Math.AbsFloat(tentPos[1] - playerPos[1]) > MAX_HEIGHT_DIFF)
				continue;

			return true;
		}

		return false;
	}

	static void Tick()
	{
		array<Man> players = new array<Man>();
		GetGame().GetPlayers(players);

		foreach (Man man : players)
		{
			PlayerBase player = PlayerBase.Cast(man);
			if (!player || !player.IsAlive())
				continue;

			if (!IsNearPitchedTent(player.GetPosition()))
				continue;

			if (player.GetStatHeatComfort().Get() < WARM_TARGET)
				player.GetStatHeatComfort().Set(WARM_TARGET);
		}
	}
};

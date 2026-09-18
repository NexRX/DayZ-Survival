class DZSurvivalTraderFireplaceState
{
	bool Spawned = false;
};

class DZSurvivalTraderFireplace
{
	protected static const string STATE_DIR = "$profile:DZSurvivalServerPack";
	protected static const string STATE_PATH = STATE_DIR + "\\TraderFireplace.json";

	protected static const int SPAWN_DELAY_MS = 20000;
	protected static const int IGNITE_DELAY_MS = 1000;

	protected static const vector FIRE_POSITION = "7987.59 221.09 11314.5";

	protected static ref DZSurvivalTraderFireplaceState s_State;

	static void Init()
	{
		s_State = new DZSurvivalTraderFireplaceState();
		if (FileExist(STATE_PATH))
			JsonFileLoader<DZSurvivalTraderFireplaceState>.JsonLoadFile(STATE_PATH, s_State);

		if (s_State.Spawned)
		{
			GetGame().AdminLog("[TraderFireplace] Already spawned in a previous session - skipping.");
			return;
		}

		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(SpawnFireplace, SPAWN_DELAY_MS, false);
	}

	protected static void SpawnFireplace()
	{
		if (s_State.Spawned) return;

		Fireplace fire = Fireplace.Cast(GetGame().CreateObject("FBF_Fireplace", FIRE_POSITION));
		if (!fire)
		{
			GetGame().AdminLog("[TraderFireplace] CreateObject(\"FBF_Fireplace\") failed - will retry next mission start.");
			return;
		}

		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IgniteFireplace, IGNITE_DELAY_MS, false, fire);
	}

	protected static void IgniteFireplace(Fireplace fire)
	{
		if (!fire)
		{
			GetGame().AdminLog("[TraderFireplace] Fireplace object vanished before ignition - will retry next mission start.");
			return;
		}

		fire.StartFire(true);

		s_State.Spawned = true;
		MakeDirectory(STATE_DIR);
		JsonFileLoader<DZSurvivalTraderFireplaceState>.JsonSaveFile(STATE_PATH, s_State);

		GetGame().AdminLog("[TraderFireplace] Spawned and permanently ignited FBF_Fireplace at the trader fire barrel.");
	}
};

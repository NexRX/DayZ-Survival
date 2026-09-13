// DZSurvivalTraderFireplace_Module.c
//
// Spawns and permanently ignites exactly ONE FBF_Fireplace (from
// @Forever_Burning_Campfire) at the custom trader city's fire barrel - fully
// automated, no admin ever needs to manually spawn/hold/ignite it. This
// deliberately does NOT use a repeating CreateObject() call or a
// DayZ-Editor placement: the mod's own Steam page explicitly warns
// FBF_Fireplace "shouldn't be spawned with VPP builder tools or DayZ
// Editor... if you leave them in init/editor/vpp, they will multiply" - i.e.
// every mission start would create a brand new one on top of whatever
// already persisted from before (it's a genuine persistent entity, like a
// player-built campfire, saved to storage_1). Guarding this with a one-time
// persistent marker (same JSON state-file pattern as
// DZSurvivalTraderRestock_Module.c) sidesteps that entirely: after the very
// first successful spawn, this addon never touches world creation again,
// even across every future restart.
//
// Real classnames/behavior confirmed by derapifying
// forever_burning_campfire.pbo's own scripts (2026-09): FBF_Fireplace
// extends vanilla `Fireplace` and overrides CalcAndSetQuantity()/
// SpendFireConsumable() to always reset its own fuel back to max - so
// calling the inherited, public Fireplace.StartFire(true) (confirmed via
// DZ's own scripts.pbo, 4_World/Entities/ItemBase/FireplaceBase.c) is enough
// to make it burn forever without ever running out, matching its own
// in-game description ("will burn forever once ignited") - no need to
// replicate its "place into barrel"/UI action flow at all.
class DZSurvivalTraderFireplaceState
{
	bool Spawned = false;
};

class DZSurvivalTraderFireplace
{
	// $profile:DZSurvivalServerPack keeps this alongside the rest of this
	// pack's own server-side state (see DZSurvivalTraderRestock_Module.c's
	// identical STATE_DIR).
	protected static const string STATE_DIR = "$profile:DZSurvivalServerPack";
	protected static const string STATE_PATH = STATE_DIR + "\\TraderFireplace.json";

	protected static const int SPAWN_DELAY_MS = 20000; // let mission/economy settle first
	// FBF_Fireplace's own DeferredInit() (which attaches its FireWood/Paper
	// fuel) runs on a delayed CallLater itself (34ms after creation,
	// confirmed via DZ's own scripts.pbo EntityAI.c) - not synchronously
	// within CreateObject() - so igniting waits a full second past spawn
	// before calling StartFire(), to guarantee fuel is already attached
	// first.
	protected static const int IGNITE_DELAY_MS = 1000;

	// Must match src/foreverBurningCampfire.ts's FIRE_BARREL_OFFSET (added
	// to that file's own copy of CUSTOM_POSITION) exactly - duplicated here
	// since this addon is a separate build artifact with no shared config
	// with the TypeScript CLI. Update both this and that file's offset
	// together if the trader town position ever moves.
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
		if (s_State.Spawned) return; // paranoia guard - Init() only ever schedules this once anyway

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
		// Without this, JsonSaveFile() silently does nothing the very first
		// time (parent folder doesn't exist yet) - same MakeDirectory
		// requirement as DZSurvivalTraderRestock_Module.c's own SaveState().
		MakeDirectory(STATE_DIR);
		JsonFileLoader<DZSurvivalTraderFireplaceState>.JsonSaveFile(STATE_PATH, s_State);

		GetGame().AdminLog("[TraderFireplace] Spawned and permanently ignited FBF_Fireplace at the trader fire barrel.");
	}
};

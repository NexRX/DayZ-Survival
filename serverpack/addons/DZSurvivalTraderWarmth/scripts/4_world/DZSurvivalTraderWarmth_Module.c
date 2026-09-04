// DZSurvivalTraderWarmth_Module.c
//
// "Warm up in the trader zone": nudges every connected player's HeatComfort
// stat up to a cozy-but-safe floor while they're within the custom trader
// city's safe zone, so the trader city itself doubles as a warm sanctuary
// (on top of the actual FBF_Fireplace/torches placed there by
// DZSurvivalTraderFireplace/src/foreverBurningCampfire.ts) - no need to
// stand right next to a specific fire, the whole zone counts.
//
// BUG HISTORY (read before changing WARM_TARGET again!):
// This used to unconditionally .Set() HeatComfort to 1.0 (max) every 1.5s.
// That is NOT safe - HeatComfort isn't just a display value, vanilla's own
// HeatComfortMdfr.c (confirmed via DZ's own scripts.pbo,
// 4_World/Classes/PlayerModifiers/Modifiers/HeatComfortMdfr.c) treats
// sustained high HeatComfort as an active hyperthermia hazard:
//   - above PlayerConstants.THRESHOLD_HEAT_COMFORT_PLUS_WARNING (0.15) it
//     starts draining the Water stat,
//   - above THRESHOLD_HEAT_COMFORT_PLUS_CRITICAL (0.45) it additionally
//     calls player.AddHealth() with a real health-loss rate that scales
//     (via Easing.EaseInQuad) from 0.035 up to 0.30 HP/second as
//     HeatComfort approaches 1.0.
// Forcing HeatComfort = 1.0 every tick pinned every player in the zone at
// the maximum 0.30 HP/s burn rate for as long as they stood there - i.e.
// exactly the boiling-hot-to-death bug a player hit standing in the trader
// safe zone. The fix has two parts:
//   1. WARM_TARGET is now 0.10 - comfortably under the 0.15 WARNING
//      threshold, so this addon can never itself trigger any water-loss or
//      health-loss penalty, no matter how long a player lingers.
//   2. We only raise HeatComfort up to WARM_TARGET when the player's real
//      (vanilla-computed) value is currently below it - we never lower a
//      naturally higher value. So a player who is already warmer (or
//      dangerously hotter, e.g. from real fire + heavy clothing) is left
//      entirely alone; this addon only ever helps someone who'd otherwise
//      be cold, and only up to a safe, damage-free floor.
//
// Environment.c's own recalculation runs on a fixed ENVIRO_TICK_RATE = 3
// second cycle (confirmed via DZ's own scripts.pbo, 3_Game/constants.c) and
// would otherwise pull HeatComfort back down toward whatever the player's
// actual clothing/weather gives them. Re-applying this every 1.5s (twice
// vanilla's own cycle) guarantees the floor keeps winning while the player
// remains in the zone, without needing to hook/replicate any of
// Environment.c's internal calculations. The moment a player leaves the
// zone, this simply stops touching their stat and vanilla's own
// weather-driven calculation takes back over immediately - there's no
// lingering "buff" to expire.
class DZSurvivalTraderWarmth
{
	// Must match src/traders.ts's CUSTOM_POSITION/CUSTOM_SAFE_ZONE_RADIUS
	// exactly - duplicated here for the same reason as
	// DZSurvivalTraderFireplace_Module.c's FIRE_POSITION: this addon is a
	// separate build artifact with no shared config with the TypeScript
	// CLI. Update both together if the trader city's safe zone ever moves
	// or is resized.
	protected static const float TRADER_POS_X = 7991.59;
	protected static const float TRADER_POS_Z = 11312.5;
	protected static const float RADIUS = 175.0;
	protected static const float RADIUS_SQ = RADIUS * RADIUS;

	protected static const int TICK_INTERVAL_MS = 1500;

	// HeatComfort's real range is -1..1, but see BUG HISTORY above: this must
	// stay comfortably under PlayerConstants.THRESHOLD_HEAT_COMFORT_PLUS_WARNING
	// (0.15) or it risks triggering vanilla's own water/health-loss penalties.
	protected static const float WARM_TARGET = 0.10;

	static void Init()
	{
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Tick, TICK_INTERVAL_MS, true);
		GetGame().AdminLog(string.Format("[TraderWarmth] Initialized - players within %1m of the trader city will be kept warm.", RADIUS));
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

			vector pos = player.GetPosition();
			float dx = pos[0] - TRADER_POS_X;
			float dz = pos[2] - TRADER_POS_Z;
			float distSq = dx * dx + dz * dz;
			if (distSq > RADIUS_SQ)
				continue;

			// Floor only - never lower a value the player already earned (see
			// BUG HISTORY above for why this must never be an unconditional Set()).
			if (player.GetStatHeatComfort().Get() < WARM_TARGET)
				player.GetStatHeatComfort().Set(WARM_TARGET);
		}
	}
};

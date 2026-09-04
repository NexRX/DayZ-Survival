// DZSurvivalTentWarmth_Module.c
//
// "Warm up in a tent": nudges a player's HeatComfort stat up to a cozy-but-
// safe floor while they're standing at/inside any PITCHED tent (any of
// vanilla's TentBase subclasses - MediumTent/LargeTent/CarTent/PartyTent,
// and any modded tent that still derives from TentBase) - not just the
// fixed-position trader city DZSurvivalTraderWarmth already covers.
//
// Why this can't reuse a fixed coordinate (unlike DZSurvivalTraderWarmth):
// tents are player-placed and can end up anywhere on the map, so there is
// no static position/radius to hardcode. Instead, every tick this looks up
// real nearby objects around each connected player (GetGame().
// GetObjectsAtPosition() - the same native proximity query vanilla's own
// PluginUniversalTemperatureSourceServer debug tool and Bot_Hunt/WoodBase
// use) and checks whether any of them is an actual pitched tent close
// enough to count as "sheltering under it". No permanent per-tent
// registration/tracking is needed - tents can be pitched, packed, moved, or
// destroyed at any time and this simply reflects whatever is true on the
// next tick.
//
// Deliberately NOT hooked into vanilla's own UniversalTemperatureSource
// system (the mechanism real campfires/torches use - see FireplaceBase.c/
// Torch.c) even though it exists and would be the more "native" route: that
// would mean modding TentBase itself (every tent, including third-party
// modded ones, inherits from it) to register a permanent temperature
// source, which is riskier to get right (its Lambda/settings plumbing is
// built around actual heat radiating outward from a burning object, not
// "you're standing under cover") and harder to verify without a full
// in-game session. This module instead reuses the exact same battle-tested
// "periodic floor-raise" approach as DZSurvivalTraderWarmth, which the
// project owner already confirmed works correctly live - see that module's
// own BUG HISTORY comment for why a floor-raise (never an unconditional
// Set()) is required to avoid the hyperthermia/water-loss bug.
class DZSurvivalTentWarmth
{
	protected static const int TICK_INTERVAL_MS = 1500;

	// Horizontal search radius (meters) around the player to look for a
	// tent's origin point. Large tents/party tents can span several meters,
	// so this is sized to comfortably cover a player standing anywhere
	// under a big tent's canvas, not just exactly on its center point.
	protected static const float LOOKUP_RADIUS = 4.0;

	// Vertical tolerance (meters) - matches TentBase's own
	// MAX_PLACEMENT_HEIGHT_DIFF (1.5) with a little extra headroom, so a
	// player standing on a slope near a tent still counts, but someone on a
	// rooftop/floor above or below a tent pitched at ground level does not.
	protected static const float MAX_HEIGHT_DIFF = 2.5;

	// HeatComfort's real range is -1..1, but must stay comfortably under
	// PlayerConstants.THRESHOLD_HEAT_COMFORT_PLUS_WARNING (0.15) - see
	// DZSurvivalTraderWarmth_Module.c's BUG HISTORY for the full writeup on
	// why this exact value was chosen and why it must never be raised
	// without re-reading that history first.
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

			// Floor only - never lower a value the player already earned
			// (same rule as DZSurvivalTraderWarmth, see that module's BUG
			// HISTORY for why an unconditional Set() is unsafe).
			if (player.GetStatHeatComfort().Get() < WARM_TARGET)
				player.GetStatHeatComfort().Set(WARM_TARGET);
		}
	}
};

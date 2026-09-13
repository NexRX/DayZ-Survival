// Vanilla's Fireplace.IsThisIgnitionSuccessful() refuses to light a fire
// that isn't "roofed" (per a 20m upward raycast against fire-interaction
// geometry - see GameConstants.ROOF_CHECK_RAYCAST_DIST /
// FireplaceBase.CheckForRoofLimited) while it's currently raining or windy.
// In practice that raycast only hits real building/structure geometry, not
// natural cover like tree canopies - so a player sheltering under a tree in
// a forest during rain gets denied ignition even though they're reasonably
// covered, which is exactly the "used 6 hand drill kits, can't start a
// single fire" bug report this addon fixes.
//
// This override drops only the immediate-weather gate (the "IsRainingAbove()
// / IsWindy()" branch below, and the CheckForRoofLimited() call that only
// existed to feed it). Every other real mechanic is left completely
// untouched:
//   - HasAnyKindling()          - still need actual kindling
//   - IsCeilingHighEnoughForSmoke() + IsOnInteriorSurface() - still can't
//     light a smoky fire in a real low-ceilinged indoor room
//   - IsOnWaterSurface()        - still can't ignite standing in water
//   - IsWet()                   - the fireplace/fuel itself still has to
//     not already be soaked (a real, separate wetness stat that
//     accumulates over time) - this is not about "is it raining right now"
modded class Fireplace
{
	override bool IsThisIgnitionSuccessful( EntityAI item_source = NULL )
	{
		SetIgniteFailure( false );

		if ( !HasAnyKindling() )
		{
			return false;
		}

		if ( !IsOven() )
		{
			if ( !IsCeilingHighEnoughForSmoke() && IsOnInteriorSurface() )
			{
				return false;
			}
		}

		if ( IsOnWaterSurface() )
		{
			return false;
		}

		if ( IsWet() )
		{
			SetIgniteFailure( true );
			Param1<bool> failure = new Param1<bool>( GetIgniteFailure() );
			g_Game.RPCSingleParam( this, FirePlaceFailure.WET, failure, true );
			return false;
		}

		return true;
	}
}

modded class ThirstMdfr
{
	override void OnTick(PlayerBase player, float deltaT)
	{
		player.GetMovementState(m_MovementState);
		float water = player.GetStatWater().Get();
		float metabolic_speed = MiscGameplayFunctions.GetWaterMetabolicSpeed(m_MovementState.m_iMovement);
		float modifier = GetTerjeMetabolicSpeedModifier(player, deltaT, water);
		float healthDmg = 0;
		
		player.GetStatWater().Add( (-metabolic_speed * modifier * deltaT) );
		if ( water <= PlayerConstants.LOW_WATER_THRESHOLD )
		{
			player.SetMixedSoundState( eMixedSoundStates.THIRSTY );
			if ((player.GetStomach().GetDigestingType() & PlayerStomach.DIGESTING_WATER) == 0)
			{
				float healthModifier = GetTerjeHealthDammageModifier(player, deltaT, water);
				healthDmg = PlayerConstants.LOW_WATER_DAMAGE_PER_SEC * healthModifier * deltaT;
				player.GetTerjeHealth().DecreaseHealth(healthDmg, TerjeDamageSource.THIRST);
			}
		}
		else
		{
			player.UnsetMixedSoundState( eMixedSoundStates.THIRSTY );
		}
		
		OnTerjeTickResult(player, deltaT, water, healthDmg);
	}
	
	protected float GetTerjeMetabolicSpeedModifier(PlayerBase player, float deltaT, float water)
	{
		return (water / PlayerConstants.SL_WATER_MAX) + PlayerConstants.CONSUMPTION_MULTIPLIER_BASE;
	}
	
	protected float GetTerjeHealthDammageModifier(PlayerBase player, float deltaT, float water)
	{
		return 1.0;
	}
	
	protected void OnTerjeTickResult(PlayerBase player, float deltaT, float water, float healthDmg)
	{
		// Override this function instead of OnTick when you need an access to water and damage results.
	}
}
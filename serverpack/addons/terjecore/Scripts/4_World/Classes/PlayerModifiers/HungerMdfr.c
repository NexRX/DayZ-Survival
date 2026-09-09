modded class HungerMdfr
{
	override void OnTick(PlayerBase player, float deltaT)
	{
		player.GetMovementState(m_MovementState);
		float energy = player.GetStatEnergy().Get();
		float metabolic_speed = MiscGameplayFunctions.GetEnergyMetabolicSpeed(m_MovementState.m_iMovement);
		float modifier = GetTerjeMetabolicSpeedModifier(player, deltaT, energy);
		float healthDmg = 0;
		
		player.GetStatEnergy().Add( -metabolic_speed * modifier * deltaT );
		if ( energy <= PlayerConstants.LOW_ENERGY_THRESHOLD )
		{
			player.SetMixedSoundState( eMixedSoundStates.HUNGRY );
			if ((player.GetStomach().GetDigestingType() & PlayerStomach.DIGESTING_ENERGY) == 0)
			{
				float healthModifier = GetTerjeHealthDammageModifier(player, deltaT, energy);
				healthDmg = PlayerConstants.LOW_ENERGY_DAMAGE_PER_SEC * healthModifier * deltaT;
				player.GetTerjeHealth().DecreaseHealth(healthDmg, TerjeDamageSource.HUNGER);
			}
		}
		else
		{
			player.UnsetMixedSoundState( eMixedSoundStates.HUNGRY );
		}
		
		OnTerjeTickResult(player, deltaT, energy, healthDmg);
	}
	
	protected float GetTerjeMetabolicSpeedModifier(PlayerBase player, float deltaT, float energy)
	{
		return (energy / PlayerConstants.SL_ENERGY_MAX) + PlayerConstants.CONSUMPTION_MULTIPLIER_BASE;
	}
	
	protected float GetTerjeHealthDammageModifier(PlayerBase player, float deltaT, float energy)
	{
		return 1.0;
	}
	
	protected void OnTerjeTickResult(PlayerBase player, float deltaT, float energy, float healthDmg)
	{
		// Override this function instead of OnTick when you need an access to energy and damage results.
	}
}
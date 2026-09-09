modded class ThirstMdfr
{
	override protected float GetTerjeMetabolicSpeedModifier(PlayerBase player, float deltaT, float water)
	{
		float metabolic_speed = super.GetTerjeMetabolicSpeedModifier(player, deltaT, water);
		if (player && player.GetTerjeSkills())
		{
			float skillModifier;
			if (player.GetTerjeSkills().GetSkillModifierValue("mtblsm", "energconsmod", skillModifier))
			{
				metabolic_speed *= Math.Clamp(1.0 + skillModifier, 0, 1);
			}
			
			if (m_MovementState.m_iMovement == DayZPlayerConstants.MOVEMENTIDX_IDLE)
			{
				float watrsavePerkValue;
				if (player.GetTerjeSkills().GetPerkValue("mtblsm", "watrsave", watrsavePerkValue))
				{
					metabolic_speed *= Math.Clamp(1.0 + watrsavePerkValue, 0, 1);
				}
			}
			else if (m_MovementState.m_iMovement == DayZPlayerConstants.MOVEMENTIDX_SPRINT)
			{
				float hydrcontrPerkValue;
				if (player.GetTerjeSkills().GetPerkValue("mtblsm", "hydrcontr", hydrcontrPerkValue))
				{
					metabolic_speed *= Math.Clamp(1.0 + hydrcontrPerkValue, 0, 1);
				}
			}
			else
			{
				float watrcontaPerkValue;
				if (player.GetTerjeSkills().GetPerkValue("mtblsm", "watrconta", watrcontaPerkValue))
				{
					metabolic_speed *= Math.Clamp(1.0 + watrcontaPerkValue, 0, 1);
				}
			}
		}
		
		return metabolic_speed;
	}
	
	override protected float GetTerjeHealthDammageModifier(PlayerBase player, float deltaT, float water)
	{
		float healthDmg = super.GetTerjeHealthDammageModifier(player, deltaT, water);
		if (player && player.GetTerjeSkills())
		{
			float reswaterPerkValue;
			if (player.GetTerjeSkills().GetPerkValue("mtblsm", "reswater", reswaterPerkValue))
			{
				healthDmg *= Math.Clamp(1.0 + reswaterPerkValue, 0, 1);
			}
		}
		
		return healthDmg;
	}
}
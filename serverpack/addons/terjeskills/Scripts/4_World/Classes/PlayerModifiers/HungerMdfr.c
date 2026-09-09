modded class HungerMdfr
{
	override protected float GetTerjeMetabolicSpeedModifier(PlayerBase player, float deltaT, float energy)
	{
		float metabolic_speed = super.GetTerjeMetabolicSpeedModifier(player, deltaT, energy);
		if (player && player.GetTerjeSkills())
		{
			float skillModifier;
			if (player.GetTerjeSkills().GetSkillModifierValue("mtblsm", "energconsmod", skillModifier))
			{
				metabolic_speed *= Math.Clamp(1.0 + skillModifier, 0, 1);
			}
			
			if (m_MovementState.m_iMovement == DayZPlayerConstants.MOVEMENTIDX_IDLE)
			{
				float enrgsavePerkValue;
				if (player.GetTerjeSkills().GetPerkValue("mtblsm", "enrgsave", enrgsavePerkValue))
				{
					metabolic_speed *= Math.Clamp(1.0 + enrgsavePerkValue, 0, 1);
				}
			}
			else if (m_MovementState.m_iMovement == DayZPlayerConstants.MOVEMENTIDX_SPRINT)
			{
				float enrgcontrPerkValue;
				if (player.GetTerjeSkills().GetPerkValue("mtblsm", "enrgcontr", enrgcontrPerkValue))
				{
					metabolic_speed *= Math.Clamp(1.0 + enrgcontrPerkValue, 0, 1);
				}
			}
			else
			{
				float enrgcontaPerkValue;
				if (player.GetTerjeSkills().GetPerkValue("mtblsm", "enrgconta", enrgcontaPerkValue))
				{
					metabolic_speed *= Math.Clamp(1.0 + enrgcontaPerkValue, 0, 1);
				}
			}
		}
		
		return metabolic_speed;
	}
	
	override protected float GetTerjeHealthDammageModifier(PlayerBase player, float deltaT, float energy)
	{
		float healthDmg = super.GetTerjeHealthDammageModifier(player, deltaT, energy);
		if (player && player.GetTerjeSkills())
		{
			float reshungerPerkValue;
			if (player.GetTerjeSkills().GetPerkValue("mtblsm", "reshunger", reshungerPerkValue))
			{
				healthDmg *= Math.Clamp(1.0 + reshungerPerkValue, 0, 1);
			}
		}
		
		return healthDmg;
	}
}
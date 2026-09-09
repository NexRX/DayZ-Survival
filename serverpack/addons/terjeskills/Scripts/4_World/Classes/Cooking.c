modded class Cooking
{
	override int UpdateCookingStateOnStick( Edible_Base item_to_cook, float cook_time_inc )
	{
		int result = super.UpdateCookingStateOnStick(item_to_cook, cook_time_inc);
		if (g_Game && g_Game.IsDedicatedServer())
		{
			if (result == 1 && item_to_cook && item_to_cook.GetFoodStageType() != FoodStageType.BURNED)
			{
				PlayerBase hierarhyParent = PlayerBase.Cast(item_to_cook.GetHierarchyRootPlayer());
				if (hierarhyParent && hierarhyParent.GetTerjeSkills())
				{
					int expGain = GetTerjeSettingInt(TerjeSettingsCollection.SKILLS_SURV_COOKING_ON_STICK_EXP_GAIN);
					if (expGain > 0)
					{
						hierarhyParent.GetTerjeSkills().AddSkillExperience("surv", expGain);
					}
				}
			}
		}
		
		return result;
	}
}
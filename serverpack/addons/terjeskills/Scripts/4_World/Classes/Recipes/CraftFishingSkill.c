modded class CraftFishingRod
{
	override bool CanDo(ItemBase ingredients[], PlayerBase player)
	{
		return super.CanDo(ingredients, player) && TerjeSkillsCraftingHelper.GetInstance().CanDoCraftPerkRequired(this, player, "fish", "craftsman");
	}
	
	override void Do(ItemBase ingredients[], PlayerBase player, array<ItemBase> results, float specialty_weight)//gets called upon recipe's completion
	{
		super.Do(ingredients, player, results, specialty_weight);
		TerjeSkillsCraftingHelper.GetInstance().DoCraftPerkRequired(this, player, results, "fish", "craftsman", true);
	}
}

modded class CraftFishNetTrap
{
	override bool CanDo(ItemBase ingredients[], PlayerBase player)
	{
		return super.CanDo(ingredients, player) && TerjeSkillsCraftingHelper.GetInstance().CanDoCraftPerkRequired(this, player, "fish", "craftsman");
	}
	
	override void Do(ItemBase ingredients[], PlayerBase player, array<ItemBase> results, float specialty_weight)//gets called upon recipe's completion
	{
		super.Do(ingredients, player, results, specialty_weight);
		TerjeSkillsCraftingHelper.GetInstance().DoCraftPerkRequired(this, player, results, "fish", "craftsman", true);
	}
}

modded class CraftBoneHook
{
	override bool CanDo(ItemBase ingredients[], PlayerBase player)
	{
		return super.CanDo(ingredients, player) && TerjeSkillsCraftingHelper.GetInstance().CanDoCraftPerkRequired(this, player, "fish", "craftsman");
	}
	
	override void Do(ItemBase ingredients[], PlayerBase player, array<ItemBase> results, float specialty_weight)//gets called upon recipe's completion
	{
		super.Do(ingredients, player, results, specialty_weight);
		TerjeSkillsCraftingHelper.GetInstance().DoCraftPerkRequired(this, player, results, "fish", "craftsman", true);
	}
}

modded class CraftWoodenHook
{
	override bool CanDo(ItemBase ingredients[], PlayerBase player)
	{
		return super.CanDo(ingredients, player) && TerjeSkillsCraftingHelper.GetInstance().CanDoCraftPerkRequired(this, player, "fish", "craftsman");
	}
	
	override void Do(ItemBase ingredients[], PlayerBase player, array<ItemBase> results, float specialty_weight)//gets called upon recipe's completion
	{
		super.Do(ingredients, player, results, specialty_weight);
		TerjeSkillsCraftingHelper.GetInstance().DoCraftPerkRequired(this, player, results, "fish", "craftsman", true);
	}
}
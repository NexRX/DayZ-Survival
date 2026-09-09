modded class ActionCraftStoneKnifeEnv
{
	override bool ActionCondition( PlayerBase player, ActionTarget target, ItemBase item )
	{	
		return super.ActionCondition(player, target, item) && TerjeSkillsCraftingHelper.GetInstance().CanDoCraftPerkRequired(null, player, "surv", "bushcraft");
	}
	
	override void OnFinishProgressServer( ActionData action_data )
	{
		action_data.m_Player.m_terjeSkillsSpawnEntityOnGroundCache = new array<ItemBase>;
		super.OnFinishProgressServer(action_data);
		TerjeSkillsCraftingHelper.GetInstance().DoCraftPerkRequired(null, action_data.m_Player, action_data.m_Player.m_terjeSkillsSpawnEntityOnGroundCache, "surv", "bushcraft", true);
		action_data.m_Player.m_terjeSkillsSpawnEntityOnGroundCache = null;
	}
}

modded class ActionCraftBoneKnifeEnv
{
	override bool ActionCondition( PlayerBase player, ActionTarget target, ItemBase item )
	{	
		return super.ActionCondition(player, target, item) && TerjeSkillsCraftingHelper.GetInstance().CanDoCraftPerkRequired(null, player, "surv", "bushcraft");
	}
	
	override void OnFinishProgressServer( ActionData action_data )
	{
		action_data.m_Player.m_terjeSkillsSpawnEntityOnGroundCache = new array<ItemBase>;
		super.OnFinishProgressServer(action_data);
		TerjeSkillsCraftingHelper.GetInstance().DoCraftPerkRequired(null, action_data.m_Player, action_data.m_Player.m_terjeSkillsSpawnEntityOnGroundCache, "surv", "bushcraft", true);
		action_data.m_Player.m_terjeSkillsSpawnEntityOnGroundCache = null;
	}
}
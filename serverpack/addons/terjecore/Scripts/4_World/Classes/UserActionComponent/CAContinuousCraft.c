modded class CAContinuousCraft
{
	override void Setup( ActionData action_data  )
	{
		super.Setup(action_data);
		
		WorldCraftActionData action_data_wc = WorldCraftActionData.Cast(action_data);	
		PluginRecipesManager module_recipes_manager;
		Class.CastTo(module_recipes_manager, GetPlugin(PluginRecipesManager));
		if (module_recipes_manager && action_data.m_Player)
		{
			m_AdjustedTimeToComplete *= module_recipes_manager.GetTerjeRecipeTimeModifier(action_data.m_Player, action_data_wc.m_RecipeID);
		}
	}
}
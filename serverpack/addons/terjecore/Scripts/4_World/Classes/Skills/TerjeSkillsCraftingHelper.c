class TerjeSkillsCraftingHelper
{
	private static ref TerjeSkillsCraftingHelper m_Instance = null;
	
	static ref TerjeSkillsCraftingHelper GetInstance()
	{
		if (m_Instance == null)
		{
			m_Instance = new TerjeSkillsCraftingHelper;
		}
		
		return m_Instance;
	}
	
	bool CanDoCraftPerkRequired(RecipeBase recipe, PlayerBase player, string skillId, string perkId, int requiredLevel = 1)
	{
		return true;
	}
	
	void DoCraftPerkRequired(RecipeBase recipe, PlayerBase player, array<ItemBase> results, string skillId, string perkId, bool gainExperience)
	{
	
	}
}
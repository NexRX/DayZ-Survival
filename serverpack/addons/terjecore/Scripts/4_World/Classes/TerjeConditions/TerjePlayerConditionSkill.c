class TerjePlayerConditionSkill : TerjePlayerConditionBase
{
	override bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		string skillId;
		string requiredLevel;
		if (condition.FindAttribute("skillId", skillId) && condition.FindAttribute("requiredLevel", requiredLevel))
		{
			if (player && (player.GetTerjeSkills() != null) && (player.GetTerjeSkills().GetSkillLevel(skillId) >= requiredLevel.ToInt()))
			{
				return true;
			}
		}
		
		return false;
	}
	
	override string GetText(PlayerBase player, TerjeXmlObject condition)
	{
		string skillId;
		string requiredLevel;
		TerjeSkillCfg skillCfg;
		if (condition.FindAttribute("skillId", skillId) && GetTerjeSkillsRegistry().FindSkill(skillId, skillCfg) && condition.FindAttribute("requiredLevel", requiredLevel))
		{
			return "#STR_TERJECORE_COND_REQ '" + skillCfg.GetDisplayName() + "' #STR_TERJECORE_COND_SKILL " + requiredLevel;
		}
		
		return string.Empty;
	}
}
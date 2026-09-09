modded class TerjeBookBase
{
	const string COLOR_GREEN = "<color rgba='97,215,124,255'>";
	const string COLOR_BLUE = "<color rgba='0,148,255,255'>";
	const string COLOR_END = "</color>";
	const string NEXT_LINE = "<br/>";
	
	override void SetActions()
	{
		super.SetActions();
		
		AddAction(ActionTerjeReadSkillbook);
	}
	
	override bool DescriptionOverride(out string output)
	{
		if (ConfigIsExisting("terjeSkillId"))
		{
			ref TerjeSkillCfg skillCfg;
			string skillId = GetTerjeGameConfig().ConfigGetStringRaw("CfgVehicles " + GetType() + " terjeSkillId");
			int skillExpGain = GetTerjeGameConfig().ConfigGetInt("CfgVehicles " + GetType() + " terjeSkillExpGain");
			int skillMinLevel = GetTerjeGameConfig().ConfigGetInt("CfgVehicles " + GetType() + " terjeSkillMinLevel");
			int skillMaxLevel = GetTerjeGameConfig().ConfigGetInt("CfgVehicles " + GetType() + " terjeSkillMaxLevel");
			if (GetTerjeSkillsRegistry().FindSkill(skillId, skillCfg) && skillExpGain > 0 && skillMaxLevel > 0)
			{
				output = skillCfg.GetDisplayName() + ": " + COLOR_GREEN + "+" + skillExpGain + COLOR_END + " #STR_TERJESKILL_MISC2 (#STR_TERJESKILL_MISC1: " + COLOR_BLUE + skillMinLevel + "-" + skillMaxLevel + COLOR_END + ")";
				return true;
			}
		}
		
		return super.DescriptionOverride(output);
	}
}
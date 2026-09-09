modded class TerjeAdmintoolSupport
{
	override void OnInit()
	{
		super.OnInit();
		
		ref array<ref TerjeSkillCfg> skills = new array<ref TerjeSkillCfg>;
		GetTerjeSkillsRegistry().GetSkills(skills);
		foreach (ref TerjeSkillCfg skill : skills)
		{
			RegisterPlayerStat(new TerjeAdmintoolSupport_PlayerStat_Skill(skill.GetId(), skill.GetDisplayName(), skill.GetIcon(), 0, skill.GetMaxLevel()));
		}
	}
}

class TerjeAdmintoolSupport_PlayerStat_Skill : TerjeAdmintoolSupport_PlayerStat
{
	override float GetValue(PlayerBase player)
	{
		if (player.GetTerjeSkills())
		{
			return player.GetTerjeSkills().GetSkillLevel(GetId());
		}
		
		return 0;
	}
	
	override void SetValue(PlayerBase player, float value)
	{
		if (player.GetTerjeSkills())
		{
			player.GetTerjeSkills().SetSkillLevel(GetId(), (int)value);
		}
	}
}
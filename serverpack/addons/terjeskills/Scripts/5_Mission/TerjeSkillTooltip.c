class TerjeSkillTooltip
{
	static const string COLOR_GREEN = "<color rgba='97,215,124,255'>";
	static const string COLOR_BLUE = "<color rgba='0,148,255,255'>";
	static const string COLOR_END = "</color>";
	static const string NEXT_LINE = "<br/>";
	
	private static ref Widget m_skillTooltipInstance = null;
	static ref Widget GetSkillTooltipWidget(TerjeSkillCfg skillCfg, int exp, int points)
	{
		if (m_skillTooltipInstance)
		{
			m_skillTooltipInstance.Unlink();
		}
		
		m_skillTooltipInstance = g_Game.GetWorkspace().CreateWidgets("TerjeSkills/Layouts/TerjeSkillTooltip.layout", ItemManager.GetInstance().GetTerjeSkillsRoot() );
		m_skillTooltipInstance.Show(false);
		
		int level = skillCfg.GetLevelFromExp(exp);
		string expStr = "MAX";
		if (level < skillCfg.GetMaxLevel())
		{
			expStr = exp.ToString() + "/" + skillCfg.GetExpForLevel(level + 1).ToString();
		}
		
		string info = skillCfg.GetDescription();	
		ref array<ref TerjeSkillModifierCfg> modifiers = new array<ref TerjeSkillModifierCfg>;
		skillCfg.GetModifiers(modifiers);
		if (modifiers.Count() > 0)
		{
			info += NEXT_LINE;
			foreach (ref TerjeSkillModifierCfg modifier : modifiers)
			{
				string modifierPercent = TerjeMathHelper.ToDisplayPercent(modifier.GetValue());
				string totalPercent = TerjeMathHelper.ToDisplayPercent(modifier.GetValue() * level);
				info += NEXT_LINE + modifier.GetText() + " " + COLOR_BLUE + modifierPercent + "%" + COLOR_END + " #STR_TERJESKILL_MISC0 (" + COLOR_GREEN + totalPercent + "%" + COLOR_END + ")";
			}
		}
		
		ImageWidget.Cast(m_skillTooltipInstance.FindAnyWidget("terje_skill_tooltip_icon")).LoadImageFile(0, skillCfg.GetIcon());
		TextWidget.Cast(m_skillTooltipInstance.FindAnyWidget("terje_skill_tooltip_name")).SetText(skillCfg.GetDisplayName());
		TextWidget.Cast(m_skillTooltipInstance.FindAnyWidget("terje_skill_tooltip_info")).SetText(info);
		TextWidget.Cast(m_skillTooltipInstance.FindAnyWidget("terje_skill_tooltip_level")).SetText("#STR_TERJESKILL_MISC1: " + level.ToString() + "/" + skillCfg.GetMaxLevel().ToString());
		TextWidget.Cast(m_skillTooltipInstance.FindAnyWidget("terje_skill_tooltip_exp")).SetText("#STR_TERJESKILL_MISC2: " + expStr);
		TextWidget.Cast(m_skillTooltipInstance.FindAnyWidget("terje_skill_tooltip_points")).SetText("#STR_TERJESKILL_MISC3: " + points);
		
		m_skillTooltipInstance.FindAnyWidget("terje_skill_tooltip_content_spacer").Update();
		m_skillTooltipInstance.FindAnyWidget("terje_skill_tooltip_content").Update();
		
		return m_skillTooltipInstance;
	}
}

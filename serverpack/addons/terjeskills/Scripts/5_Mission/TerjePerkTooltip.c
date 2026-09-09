class TerjePerkTooltip
{
	static const string COLOR_RED = "<color rgba='198,59,64,255'>";
	static const string COLOR_YELLOW = "<color rgba='255,215,0,255'>";
	static const string COLOR_GREEN = "<color rgba='97,215,124,255'>";
	static const string COLOR_BLUE = "<color rgba='0,148,255,255'>";
	static const string COLOR_GREY = "<color rgba='160,160,160,255'>";
	static const string COLOR_END = "</color>";
	static const string NEXT_LINE = "<br/>";
	
	private static ref Widget m_perkTooltipInstance = null;
	static ref Widget GetPerkTooltipWidget(TerjePerkCfg perkCfg, int perkLevel, int perkActiveLevel, bool canBeUpgraded)
	{
		if (m_perkTooltipInstance)
		{
			m_perkTooltipInstance.Unlink();
		}
		
		m_perkTooltipInstance = g_Game.GetWorkspace().CreateWidgets("TerjeSkills/Layouts/TerjePerkTooltip.layout", ItemManager.GetInstance().GetTerjeSkillsRoot() );
		m_perkTooltipInstance.Show(false);
		
		string info = perkCfg.GetDescription() + NEXT_LINE;	
		if (perkActiveLevel > 0 && perkActiveLevel <= perkCfg.GetStagesCount())
		{
			float curValueRaw = perkCfg.GetValue(perkActiveLevel - 1);
			if (curValueRaw != 0)
			{
				string curValuePercentage = TerjeMathHelper.ToDisplayPercent(curValueRaw);
				info += NEXT_LINE + "#STR_TERJESKILL_MISC4 " + COLOR_GREEN + curValuePercentage + perkCfg.GetMetricSymbol() + COLOR_END;
			}
		}
		
		if (perkLevel >= 0 && perkLevel < perkCfg.GetStagesCount())
		{
			float nextValueRaw = perkCfg.GetValue(perkLevel);
			int nextSkillLevel = perkCfg.GetRequiredSkillLevel(perkLevel);
			int nextPerkPoints = perkCfg.GetRequiredPerkPoints(perkLevel);
			info += NEXT_LINE + "#STR_TERJESKILL_MISC5 " + COLOR_BLUE + nextPerkPoints + COLOR_END + " #STR_TERJESKILL_MISC6 " + COLOR_BLUE + nextSkillLevel + COLOR_END;
			
			if (nextValueRaw != 0)
			{
				string nextValuePercentage = TerjeMathHelper.ToDisplayPercent(nextValueRaw);
				info += " #STR_TERJESKILL_MISC7 " + COLOR_BLUE + nextValuePercentage + perkCfg.GetMetricSymbol() + COLOR_END;
			}
		}
		
		if (perkCfg.GetStagesCount() > 1)
		{
			info += NEXT_LINE + NEXT_LINE + "#STR_TERJESKILL_MISC16 ";
			for (int i = 0; i < perkCfg.GetStagesCount(); i++)
			{
				if (i > 0)
				{
					info += ", ";
				}
				
				if (perkCfg.HasHints())
				{
					info += COLOR_BLUE + perkCfg.GetHint(i) + COLOR_END;
				}
				else
				{
					string infoValuePercentage = TerjeMathHelper.ToDisplayPercent(perkCfg.GetValue(i));
					info += COLOR_BLUE + infoValuePercentage + perkCfg.GetMetricSymbol() + COLOR_END;
				}
			}
		}
		
		if (perkLevel == 0)
		{
			info += NEXT_LINE + NEXT_LINE + COLOR_GREY + "<b>#STR_TERJESKILL_MISC17</b>" + COLOR_END;
		}
		else if (perkActiveLevel == perkLevel && perkLevel > 0)
		{
			info += NEXT_LINE + NEXT_LINE + COLOR_GREEN + "<b>#STR_TERJESKILL_MISC8</b>" + COLOR_END;
		}
		else if (perkActiveLevel < perkLevel && perkLevel > 0)
		{
			if (perkActiveLevel > 0)
			{
				int deactRequiredLevel = 0;
				if (perkLevel > 0 && perkLevel <= perkCfg.GetStagesCount())
				{
					deactRequiredLevel = perkCfg.GetRequiredSkillLevel(perkLevel - 1);
				}
				
				info += NEXT_LINE + NEXT_LINE + COLOR_RED + "<b>#STR_TERJESKILL_MISC10 (</b>" + COLOR_END + COLOR_GREY + deactRequiredLevel + COLOR_END + COLOR_RED + "<b>)</b>" + COLOR_END;
			}
			else
			{
				info += NEXT_LINE + NEXT_LINE + COLOR_RED + "<b>#STR_TERJESKILL_MISC9</b>" + COLOR_END;
			}
		}
		
		if (canBeUpgraded)
		{
			info += NEXT_LINE + NEXT_LINE + COLOR_YELLOW + "<b>#STR_TERJESKILL_MISC11</b>" + COLOR_END;
		}
		
		ImageWidget.Cast(m_perkTooltipInstance.FindAnyWidget("terje_perk_tooltip_icon")).LoadImageFile(0, perkCfg.GetEnabledIcon());
		TextWidget.Cast(m_perkTooltipInstance.FindAnyWidget("terje_perk_tooltip_name")).SetText(perkCfg.GetDisplayName());
		TextWidget.Cast(m_perkTooltipInstance.FindAnyWidget("terje_perk_tooltip_info")).SetText(info);
		TextWidget.Cast(m_perkTooltipInstance.FindAnyWidget("terje_perk_tooltip_level")).SetText("#STR_TERJESKILL_MISC12: " + perkLevel.ToString() + "/" + perkCfg.GetStagesCount().ToString());
		
		m_perkTooltipInstance.FindAnyWidget("terje_perk_tooltip_content_spacer").Update();
		m_perkTooltipInstance.FindAnyWidget("terje_perk_tooltip_content").Update();
		
		return m_perkTooltipInstance;
	}
}

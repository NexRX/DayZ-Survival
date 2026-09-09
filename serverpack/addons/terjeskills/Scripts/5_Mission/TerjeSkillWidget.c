class TerjeSkillWidget: Container
{	
	private ref Header m_Header;
	private ref TerjeSkillCfg m_Skill;
	private PlayerBase m_Player;
	private ref map<string, ref Widget> m_perkWidgets;
	private int m_CurrentLevel;
	private int m_CurrentExp;
	private int m_CurrentPerkPoints;
	
	void TerjeSkillWidget(LayoutHolder parent) 
	{
		m_perkWidgets = new map<string, ref Widget>;
		
		Widget headerWidget = GetMainWidget().FindAnyWidget("terje_skill_header");
		if (headerWidget)
		{
			WidgetEventHandler.GetInstance().RegisterOnMouseEnter(headerWidget, this, "OnHeaderMouseEnter");
			WidgetEventHandler.GetInstance().RegisterOnMouseLeave(headerWidget, this, "OnHeaderMouseLeave");
		}
		
		Widget resetPerksWidget = GetMainWidget().FindAnyWidget("terje_skill_header_reset_hover");
		if (resetPerksWidget)
		{
			WidgetEventHandler.GetInstance().RegisterOnMouseEnter(resetPerksWidget, this, "OnResetMouseEnter");
			WidgetEventHandler.GetInstance().RegisterOnMouseLeave(resetPerksWidget, this, "OnResetMouseLeave");
			WidgetEventHandler.GetInstance().RegisterOnMouseButtonDown(resetPerksWidget, this, "OnResetMouseDown");
			WidgetEventHandler.GetInstance().RegisterOnMouseButtonUp(resetPerksWidget, this, "OnResetMouseUp");
		}
	}
	
	void ~TerjeSkillWidget() 
	{
		m_perkWidgets.Clear();
		
		ref ItemManager itemManager = ItemManager.GetInstance();
		if (itemManager != null)
		{
			itemManager.HideTooltip();
		}
	}
	
	void InitializeSkill(TerjeSkillCfg skill, PlayerBase player)
	{
		m_Skill = skill;
		m_Player = player;
	}
	
	override void SetLayoutName()
	{
		m_LayoutName = "TerjeSkills/Layouts/TerjeSkillLayout.layout";
	}
	
	override void SetHeader(Header header)
	{
		m_Header = header;
	}
	
	override Header GetHeader()
	{
		return m_Header;
	}
	
	bool OnHeaderMouseEnter(Widget w, int x, int y)
	{
		ref ItemManager itemManager = ItemManager.GetInstance();
		if (itemManager != null)
		{
			itemManager.TerjeSkillsSetupTooltipWidget(TerjeSkillTooltip.GetSkillTooltipWidget(m_Skill, m_CurrentExp, m_CurrentPerkPoints), x, y);
		}
		
		return false;
	}
	
	bool OnHeaderMouseLeave( Widget w, Widget s, int x, int y )
	{
		ref ItemManager itemManager = ItemManager.GetInstance();
		if (itemManager != null)
		{
			itemManager.HideTooltip();
		}
		
		return false;
	}
	
	bool OnResetMouseEnter(Widget w, int x, int y)
	{
		if (w)
		{
			w.SetColor(ARGB(60, 0, 0, 0));
			return true;
		}
		
		return false;
	}
	
	bool OnResetMouseLeave( Widget w, Widget s, int x, int y	)
	{
		if (w)
		{
			w.SetColor(ARGB(0, 0, 0, 0));
			return true;
		}
		
		return false;
	}
	
	void OnResetMouseDown( Widget w, int x, int y, int button )
	{
		if (w)
		{
			w.SetColor(ARGB(120, 0, 0, 0));
		}
	}
	
	void OnResetMouseUp( Widget w, int x, int y, int button )
	{
		if (w && w.IsVisible() && m_Player && m_Player.GetIdentity() && m_Player.IsAlive() && m_Player.GetTerjeSkills() && m_Skill != null)
		{
			float experienceLoseOnResetPerks;
			GetTerjeSettingFloat(TerjeSettingsCollection.SKILLS_EXPERIENCE_LOSE_ON_RESET_PERKS, experienceLoseOnResetPerks);
			
			int expbackPercent = (int)(experienceLoseOnResetPerks * 100.0);
			string title = "#STR_TERJESKILL_MISC13";
			string message = "#STR_TERJESKILL_MISC14 " + expbackPercent + "% #STR_TERJESKILL_MISC15";			
			g_Game.GetUIManager().ShowScriptedMenu(TerjeModalDialog.GetInstance(title, message, ScriptCaller.Create(OnResetSkillModalDialogResult)), g_Game.GetUIManager().GetMenu());
		}
	}
	
	void OnResetSkillModalDialogResult(bool result)
	{
		if (result)
		{
			string skillId = m_Skill.GetId();
			
			// Apply on client
			m_Player.GetTerjeSkills().ResetSkill(skillId);
			Refresh();
					
			// Apply on server
			m_Player.TerjeRPCSingleParam(TerjeSkillsConstants.TRPC_PLAYER_PERKS_RESET, new Param1<string>(skillId), true, null);
		}
	}
	
	bool OnPerkMouseEnter(Widget w, int x, int y)
	{
		if (w && m_Skill && m_Player && m_Player.GetTerjeSkills())
		{
			Widget highlightWidget = w.FindAnyWidget("terje_perk_highlight");
			if (highlightWidget)
			{
				highlightWidget.SetColor(ARGB(60, 0, 0, 0));
				
				ref TerjePerkCfg perkCfg;
				if (m_Skill.FindPerk(w.GetName(), perkCfg))
				{
					bool canBeUpgraded;
					int perkLevel;
					int perkActiveLevel;
					m_Player.GetTerjeSkills().GetPerkStatus(m_Skill.GetId(), perkCfg.GetId(), perkLevel, perkActiveLevel, canBeUpgraded);
					ref ItemManager itemManager = ItemManager.GetInstance();
					if (itemManager != null)
					{
						itemManager.TerjeSkillsSetupTooltipWidget(TerjePerkTooltip.GetPerkTooltipWidget(perkCfg, perkLevel, perkActiveLevel, canBeUpgraded), x, y);
					}
				}
				
				return true;
			}
		}
		
		return false;
	}
	
	bool OnPerkMouseLeave( Widget w, Widget s, int x, int y	)
	{
		if (w)
		{
			Widget highlightWidget = w.FindAnyWidget("terje_perk_highlight");
			if (highlightWidget)
			{
				highlightWidget.SetColor(ARGB(0, 0, 0, 0));
				return true;
			}
		}
		
		ref ItemManager itemManager = ItemManager.GetInstance();
		if (itemManager != null)
		{
			itemManager.HideTooltip();
		}
		
		return false;
	}
	
	void OnPerkMouseDown( Widget w, int x, int y, int button )
	{
		if (w)
		{
			Widget highlightWidget = w.FindAnyWidget("terje_perk_highlight");
			if (highlightWidget)
			{
				highlightWidget.SetColor(ARGB(120, 0, 0, 0));
				
				ref ItemManager itemManager = ItemManager.GetInstance();
				if (itemManager != null)
				{
					itemManager.HideTooltip();
				}
			}
		}
	}
	
	void OnPerkMouseUp( Widget w, int x, int y, int button )
	{
		if (w)
		{
			Widget highlightWidget = w.FindAnyWidget("terje_perk_highlight");
			if (highlightWidget)
			{
				highlightWidget.SetColor(ARGB(0, 0, 0, 0));
				
				if (highlightWidget.IsVisible() && m_Player && m_Player.GetIdentity() && m_Player.IsAlive() && m_Player.GetTerjeSkills() && m_Skill != null)
				{
					string skillId = m_Skill.GetId();
					string perkId = w.GetName();
					
					// Apply on client
					m_Player.GetTerjeSkills().AddPerkLevel(skillId, perkId);
					Refresh();
					
					// Apply on server
					m_Player.TerjeRPCSingleParam(TerjeSkillsConstants.TRPC_PLAYER_PERK_APPLY, new Param2<string, string>(skillId, perkId), true, null);
				}
			}
		}
	}
	
	override void Refresh()
	{
		super.Refresh();
		Widget resetPerksWidget = GetMainWidget().FindAnyWidget("terje_skill_header_reset");
		if (resetPerksWidget)
		{
			bool allowReset = false;
			if (GetTerjeSettingBool(TerjeSettingsCollection.SKILLS_ALLOW_SKILLS_RESET, allowReset) && allowReset)
			{
				resetPerksWidget.Show(true);
			}
			else
			{
				resetPerksWidget.Show(false);
			}
		}
		
		if (m_Skill != null && m_Player != null && m_Player.GetTerjeSkills() != null)
		{
			m_CurrentExp = m_Player.GetTerjeSkills().GetSkillExperience(m_Skill.GetId());
			m_CurrentLevel = m_Player.GetTerjeSkills().GetSkillLevel(m_Skill.GetId());
			m_CurrentPerkPoints = m_Player.GetTerjeSkills().GetSkillPerkPoints(m_Skill.GetId());

			float currentProgress = 0;				
			int startLevelExp = m_Skill.GetExpForLevel(m_CurrentLevel);
			int endLevelExp = m_Skill.GetExpForLevel(m_CurrentLevel + 1);	
			if (m_CurrentExp > startLevelExp && m_CurrentExp < endLevelExp && startLevelExp < endLevelExp && (endLevelExp - startLevelExp) > 0)
			{
				currentProgress = Math.Clamp( ((float)(m_CurrentExp - startLevelExp)) / ((float)(endLevelExp - startLevelExp)) * 100.0, 0, 100);
			}
			
			string info = m_Skill.GetDisplayName();
			if (m_CurrentLevel >= m_Skill.GetMaxLevel())
			{
				info = info + " (MAX)";
			}
			else
			{
				info = info + " (" + m_CurrentExp.ToString() + "/" + endLevelExp.ToString() + ")";
			}
			
			string extraPointsStr = "";
			if (m_CurrentPerkPoints > 0)
			{
				extraPointsStr = "+" + m_CurrentPerkPoints.ToString();
			}
			
			TextWidget.Cast(GetMainWidget().FindAnyWidget("terje_skill_header_info")).SetText(info);
			TextWidget.Cast(GetMainWidget().FindAnyWidget("terje_skill_header_points")).SetText(extraPointsStr);
			TextWidget.Cast(GetMainWidget().FindAnyWidget("terje_skill_header_level")).SetText(m_CurrentLevel.ToString());
			ImageWidget.Cast(GetMainWidget().FindAnyWidget("terje_skill_header_icon")).LoadImageFile(0, m_Skill.GetIcon());
			ProgressBarWidget.Cast(GetMainWidget().FindAnyWidget("terje_skill_header_exp")).SetCurrent(currentProgress);
			Widget perksContentBody = GetMainWidget().FindAnyWidget("terje_skill_perks_grid");
			
			// Perk widgets lazy initialization
			if (m_perkWidgets.Count() == 0)
			{
				ref array<ref TerjePerkCfg> perks = new array<ref TerjePerkCfg>;
				m_Skill.GetPerks(perks);
				foreach (ref TerjePerkCfg perk : perks)
				{
					if (perk.IsHidden())
					{
						continue;
					}
					
					ref Widget perkLayoutWidget = g_Game.GetWorkspace().CreateWidgets("TerjeSkills/Layouts/TerjePerkLayout.layout", perksContentBody);
					m_perkWidgets.Insert(perk.GetId(), perkLayoutWidget);
					perkLayoutWidget.FindAnyWidget("terje_perk_highlight").Show(false);
					perkLayoutWidget.SetName(perk.GetId());
					
					WidgetEventHandler.GetInstance().RegisterOnMouseEnter(perkLayoutWidget, this, "OnPerkMouseEnter");
					WidgetEventHandler.GetInstance().RegisterOnMouseLeave(perkLayoutWidget, this, "OnPerkMouseLeave");
					WidgetEventHandler.GetInstance().RegisterOnMouseButtonDown(perkLayoutWidget, this, "OnPerkMouseDown");
					WidgetEventHandler.GetInstance().RegisterOnMouseButtonUp(perkLayoutWidget, this, "OnPerkMouseUp");
				}
			}
			
			// Refresh perk widgets
			foreach (string perkId, ref Widget perkWidget : m_perkWidgets)
			{
				ref TerjePerkCfg perkCfg = null;
				if (m_Skill.FindPerk(perkId, perkCfg) && perkCfg)
				{
					bool canBeUpgraded;
					int perkLevel;
					int perkActiveLevel;
					string iconPath = "";
					string levelPath = "";
					string borderPath = "";
					m_Player.GetTerjeSkills().GetPerkStatus(m_Skill.GetId(), perkId, perkLevel, perkActiveLevel, canBeUpgraded);
					
					if (perkLevel > 0)
					{
						if (perkCfg.GetStagesCount() == perkLevel)
						{
							levelPath = "set:TerjePerkLevels_icon image:L_MAX";
						}
						else
						{
							int perkClampedLevel = perkLevel;
							if (perkClampedLevel > 10)
							{
								perkClampedLevel = 10;
							}
							
							levelPath = "set:TerjePerkLevels_icon image:L" + perkClampedLevel.ToString();
						}
					}
					else
					{
						levelPath = "set:TerjePerkLevels_icon image:L_NONE";
					}
					
					if (perkActiveLevel > 0)
					{
						iconPath = perkCfg.GetEnabledIcon();
					}
					else
					{
						iconPath = perkCfg.GetDisabledIcon();
					}
					
					if (perkActiveLevel == perkLevel && perkLevel > 0 && canBeUpgraded)
					{
						borderPath = "set:TerjeSkillBorders_icon image:ts_ui_perk_border3";
					}
					else if (canBeUpgraded)
					{
						borderPath = "set:TerjeSkillBorders_icon image:ts_ui_perk_border1";
					}
					else if (perkActiveLevel == perkLevel && perkLevel > 0)
					{
						borderPath = "set:TerjeSkillBorders_icon image:ts_ui_perk_border2";
					}
					else
					{
						borderPath = "set:TerjeSkillBorders_icon image:ts_ui_perk_border0";
					}
					
					ImageWidget.Cast(perkWidget.FindAnyWidget("terje_perk_icon")).LoadImageFile(0, iconPath);
					ImageWidget.Cast(perkWidget.FindAnyWidget("terje_perk_level")).LoadImageFile(0, levelPath);
					ImageWidget.Cast(perkWidget.FindAnyWidget("terje_perk_border")).LoadImageFile(0, borderPath);
					perkWidget.FindAnyWidget("terje_perk_highlight").Show(canBeUpgraded);
				}
			}
		}
	}
}

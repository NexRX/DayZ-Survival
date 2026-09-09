modded class MissionGameplay
{
	override void OnInit()
	{
		super.OnInit();

		if (m_Hud != null)
		{
			m_Hud.InitConditionalTerjeBadgesAndNotifiers();
		}
	}
	
	override void OnMissionFinish()
	{
		super.OnMissionFinish();
		
		GetTerjeGameConfig().Reset();
		GetTerjeSettingsSynchContext().Reset();
		GetTerjeSkillsRegistry().Reset();
		TerjeScriptableProtection.GetInstance().Reset();
	}
	
	override void OnKeyPress(int key)
	{
		super.OnKeyPress(key);
		
		UIScriptedMenu currentMenu = GetGame().GetUIManager().GetMenu();
		if (currentMenu)
		{
			if (currentMenu.IsInherited(TerjeModalDialog))
			{
				currentMenu.OnKeyPress(null, 0, 0, key);
			}
		}
	}
	
	override void OnUpdate(float timeslice)
	{
		super.OnUpdate(timeslice);
		
		PlayerBase player = PlayerBase.Cast( GetGame().GetPlayer() );
		if (player && player.GetTerjeStats())
		{
			if (m_Hud)
			{
				bool detailedDiseaseHudBadges = false;
				bool detailedHealingHudBadges = false;
				GetTerjeSettingBool(TerjeSettingsCollection.CORE_DETAILED_DISEASE_HUD_BADGES, detailedDiseaseHudBadges);
				GetTerjeSettingBool(TerjeSettingsCollection.CORE_DETAILED_HEALING_HUD_BADGES, detailedHealingHudBadges);
				OnUpdateTerjeCustomBadges(player, detailedDiseaseHudBadges, detailedHealingHudBadges);
			}
			
			OnUpdateTerjeCustomGUI(player, timeslice);
		}
	}
	
	void OnUpdateTerjeCustomGUI(PlayerBase player, float deltaTime)
	{
	
	}
	
	void OnUpdateTerjeCustomBadges(PlayerBase player, bool detailedDiseaseHudBadges, bool detailedHealingHudBadges)
	{
	
	}
}
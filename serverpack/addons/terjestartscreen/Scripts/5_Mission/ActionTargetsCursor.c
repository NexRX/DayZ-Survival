modded class ActionTargetsCursor
{
	override string GetItemDesc(ActionBase action)
	{
		int nameDisplayMode = -1;
		if (GetTerjeSettingInt(TerjeSettingsCollection.STARTSCREEN_DISPLAY_PLAYER_NAMES_MODE, nameDisplayMode) && (nameDisplayMode >= 0))
		{
			Object tgObject = m_DisplayInteractTarget;
			if (!tgObject && m_Target)
			{
				tgObject = m_Target.GetObject();
			}
			
			PlayerBase tgPlayer = PlayerBase.Cast(tgObject);
			if (tgPlayer)
			{
				string characterName = tgPlayer.GetTerjeCharacterName();
				if (characterName != string.Empty)
				{
					if (nameDisplayMode == 0)
					{
						return characterName;
					}
					else if (nameDisplayMode == 1)
					{
						if (!tgPlayer.IsAlive())
						{
							return characterName;
						}
					}
					else if (nameDisplayMode == 2)
					{
						if (tgPlayer.GetTerjeFaceVisible())
						{
							return characterName;
						}
					}
					else if (nameDisplayMode == 3)
					{
						if ((!tgPlayer.IsAlive()) && (tgPlayer.GetTerjeFaceVisible()))
						{
							return characterName;
						}
					}
				}
			}
		}
		
		return super.GetItemDesc(action);;
	}
}
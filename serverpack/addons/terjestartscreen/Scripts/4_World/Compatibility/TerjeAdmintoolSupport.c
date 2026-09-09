modded class TerjeAdmintoolSupport
{
	override void OnInit()
	{
		super.OnInit();
		
		if (GetTerjeSettingBool(TerjeSettingsCollection.STARTSCREEN_SOULS_ENABLED))
		{
			int max = GetTerjeSettingInt(TerjeSettingsCollection.STARTSCREEN_SOULS_MAXCOUNT);
			if (max < 1)
			{
				max = 1;
			}
			
			RegisterPlayerStat(new TerjeAdmintoolSupport_PlayerStat_Souls("terjeSouls", "Souls", "set:TerjeStartScreen_icons image:tss_soul", 0, max));
		}
	}
}

class TerjeAdmintoolSupport_PlayerStat_Souls : TerjeAdmintoolSupport_PlayerStat
{
	override float GetValue(PlayerBase player)
	{
		if (player.GetTerjeSouls() != null)
		{
			return player.GetTerjeSouls().GetCount();
		}
		else
		{
			return GetMin();
		}
	}
	
	override void SetValue(PlayerBase player, float value)
	{
		if (player.GetTerjeSouls())
		{
			player.GetTerjeSouls().SetCount((int)Math.Round(value));
		}
	}
}
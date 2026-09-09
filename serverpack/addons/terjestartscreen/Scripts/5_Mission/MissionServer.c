modded class MissionServer
{
	override void InvokeOnConnect(PlayerBase player, PlayerIdentity identity)
	{
		super.InvokeOnConnect(player, identity);
		GetPluginTerjeRespawnObjects().SendToClient(identity);
		
		if ((player.GetTerjeStats() != null) && (player.GetTerjeStats().IsStartScreenInProgress()))
		{
			if (player.m_terjeStartScreenParams == null)
			{
				player.SetTerjeServerStartScreenImmunity(false);
				player.ClearInventory();
				player.SetTerjeMaintenanceMode(true);
				player.SetHealth("", "", 0);
			}
		}
	}
	
	override void InvokeOnDisconnect(PlayerBase player)
	{
		super.InvokeOnDisconnect(player);
		
		if (player && player.m_terjeStartScreenParams != null)
		{
			player.m_terjeStartScreenParams = null;
			player.SetTerjeServerStartScreenImmunity(false);
			player.ClearInventory();
			player.SetTerjeMaintenanceMode(true);
			player.SetHealth("", "", 0);
		}
	}
	
	override void OnGameplayDataHandlerLoad()
	{
		super.OnGameplayDataHandlerLoad();
		m_RespawnMode = GameConstants.RESPAWN_MODE_RANDOM;
	}
	
	override PlayerBase OnClientNewEvent(PlayerIdentity identity, vector pos, ParamsReadContext ctx)
	{
		if (GetDayZGame() != null)
		{
			TerjePlayerProfile profile;
			if (GetTerjeDatabase().GetPlayerProfile(identity.GetId(), profile) && (profile != null))
			{
				GetDayZGame().SetSelectedTerjeCharacterClassname(profile.GetCharacterClassname());
			}
		}
		
		PlayerBase result = super.OnClientNewEvent(identity, pos, ctx);
		if (GetDayZGame() != null)
		{
			GetDayZGame().SetSelectedTerjeCharacterClassname(string.Empty);
		}
		
		return result;
	}
}
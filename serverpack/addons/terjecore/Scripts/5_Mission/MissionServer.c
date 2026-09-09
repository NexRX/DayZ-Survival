modded class MissionServer
{	
	override void OnEvent(EventType eventTypeId, Param params) 
	{
		if (eventTypeId == ClientPrepareEventTypeID)
		{
			ClientPrepareEventParams clientPrepareParams = ClientPrepareEventParams.Cast(params);
			if (clientPrepareParams != null)
			{
				GetTerjeDatabase().OnPlayerPreloading(clientPrepareParams.param1);
				
				ScriptRPC ctx();
				OnTerjeSynchSettingsToClient(ctx);
				ctx.Send(null, 67963733, true, clientPrepareParams.param1);
			}
		}
		else if (eventTypeId == ClientRespawnEventTypeID)
		{
			ClientRespawnEventParams respawnParams = ClientRespawnEventParams.Cast(params);
			if (respawnParams != null)
			{
				PlayerBase respawnPlayer = PlayerBase.Cast(respawnParams.param2);
				if (respawnPlayer)
				{
					respawnPlayer.SetTerjeGodMode(false);
					respawnPlayer.SetTerjeIndestructible(false);
					respawnPlayer.SetTerjeIgnoreDamage(false);
				}
			}
		}
		else if (eventTypeId == ClientDisconnectedEventTypeID)
		{
			ClientDisconnectedEventParams disconnectParams = ClientDisconnectedEventParams.Cast(params);
			if (disconnectParams != null)
			{
				PlayerBase disconnectPlayer = PlayerBase.Cast(disconnectParams.param2);
				if (disconnectPlayer)
				{
					disconnectPlayer.SetTerjeGodMode(false);
					disconnectPlayer.SetTerjeIndestructible(false);
					disconnectPlayer.SetTerjeIgnoreDamage(false);
				}
			}
		}
		
		super.OnEvent(eventTypeId, params);
	}
	
	override void InvokeOnConnect(PlayerBase player, PlayerIdentity identity)
	{
		super.InvokeOnConnect(player, identity);
		GetTerjeDatabase().OnPlayerConnected(player, identity, identity.GetId());
		GetTerjeCustomRecipesPlugin().SendTerjeCustomRecipesToClient(identity);
	}
	
	override void PlayerDisconnected(PlayerBase player, PlayerIdentity identity, string uid)
	{
		super.PlayerDisconnected(player, identity, uid);
		GetTerjeDatabase().OnPlayerDisconnected(player, identity, uid);
	}
	
	override PlayerBase OnClientNewEvent(PlayerIdentity identity, vector pos, ParamsReadContext ctx)
	{
		PlayerBase result = super.OnClientNewEvent(identity, pos, ctx);
		if (result)
		{
			result.SetTerjePlayerSpawnState(1);
		}
		
		return result;
	}
	
	override void OnClientReadyEvent(PlayerIdentity identity, PlayerBase player)
	{
		super.OnClientReadyEvent(identity, player);
		
		if (player)
		{
			player.SetTerjePlayerSpawnState(2);
		}
	}
	
	protected void OnTerjeSynchSettingsToClient(ParamsWriteContext ctx)
	{
		GetTerjeGameConfig().SendSettingsToClient(ctx);
		GetTerjeSettingsPlugin().SendSettingsToClient(ctx);
	}
}
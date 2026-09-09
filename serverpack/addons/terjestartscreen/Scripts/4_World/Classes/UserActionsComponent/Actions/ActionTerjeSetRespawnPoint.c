class ActionTerjeSetRespawnPoint: ActionInteractBase
{
	void ActionTerjeSetRespawnPoint()
	{
		m_CommandUID = DayZPlayerConstants.CMD_ACTIONMOD_INTERACTONCE;
		m_StanceMask = DayZPlayerConstants.STANCEMASK_CROUCH | DayZPlayerConstants.STANCEMASK_ERECT;
		m_Text = "#STR_TERJESTARTSCREEN_SETRESP_ACTION";
	}
	
	override void CreateConditionComponents()  
	{
		m_ConditionItem 	= new CCINone();
		m_ConditionTarget 	= new CCTCursor();
	}
	
	override bool IsLockTargetOnUse()
	{
		return false;
	}
	
	override bool ActionCondition( PlayerBase player, ActionTarget target, ItemBase item )
	{
		if (!target) 
			return false;
		
		if (!target.GetObject()) 
			return false;
		
		PluginTerjeRespawnObjects plugin = GetPluginTerjeRespawnObjects();
		if (!plugin)
			return false;
		
		if (GetGame() && GetGame().IsClient() && (plugin.GetLastLocalObject() == target.GetObject()))
			return false;
		
		return plugin.CanSetObjectAsRespawn(target.GetObject(), player);
	}
	
	override void OnExecuteClient( ActionData action_data )
	{
		PluginTerjeRespawnObjects plugin = GetPluginTerjeRespawnObjects();
		if (plugin)
		{
			plugin.SetLastLocalObject(action_data.m_Target.GetObject());
		}
	}
	
	override void OnExecuteServer( ActionData action_data )
	{
		if (!action_data.m_Target)
			return;
		
		Object object = action_data.m_Target.GetObject();
		if (!object)
			return;
		
		PluginTerjeRespawnObjects plugin = GetPluginTerjeRespawnObjects();
		if (!plugin)
			return;
		
		if (plugin.SetObjectAsRespawn(object, action_data.m_Player))
		{
			SendNotificationOnSuccess(action_data.m_Player.GetIdentity());
		}
		else
		{
			SendNotificationOnFail(action_data.m_Player.GetIdentity());
		}
	}
	
	protected void SendNotificationOnSuccess(PlayerIdentity identity)
	{
		string title = "#STR_TERJESTARTSCREEN_SETRESP_TITLE";
		string message = "#STR_TERJESTARTSCREEN_SETRESP_DESC";
		string icon = "set:TerjeStartScreen_icons image:tss_bed";
		NotificationSystem.SendNotificationToPlayerIdentityExtended(identity, 8, title, message, icon);
	}
	
	protected void SendNotificationOnFail(PlayerIdentity identity)
	{
		string title = "#STR_TERJESTARTSCREEN_SETRESP_TITLE";
		string message = "#STR_TERJESTARTSCREEN_SETRESP_ERR";
		string icon = "set:TerjeStartScreen_icons image:tss_bed";
		NotificationSystem.SendNotificationToPlayerIdentityExtended(identity, 8, title, message, icon);
	}
}
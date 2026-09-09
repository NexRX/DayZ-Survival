modded class MissionServer
{
	protected ref ZHordeEventManager m_ZHordeEventManager;

	override void OnInit()
	{
		super.OnInit();

		if (GetGame().IsServer())
		{
			m_ZHordeEventManager = new ZHordeEventManager();
		}
	}

	override void InvokeOnConnect(PlayerBase player, PlayerIdentity identity)
	{
		super.InvokeOnConnect(player, identity);

		if (GetGame().IsServer() && m_ZHordeEventManager)
		{
			m_ZHordeEventManager.RegisterPlayerJoin(player, identity);
		}
	}

	override void InvokeOnDisconnect(PlayerBase player)
	{
		if (GetGame().IsServer() && m_ZHordeEventManager)
		{
			m_ZHordeEventManager.UnregisterPlayerJoin(player);
		}

		super.InvokeOnDisconnect(player);
	}
}

modded class MissionServer
{
	void MissionServer()
	{
		IH_LightingConfig.Get();

		DayZGame dayZGame = DayZGame.Cast(GetGame());
		if (dayZGame && dayZGame.Event_OnRPC)
			dayZGame.Event_OnRPC.Insert(IH_HandleLightingRpc);
	}

	void ~MissionServer()
	{
		DayZGame dayZGame = DayZGame.Cast(GetGame());
		if (dayZGame && dayZGame.Event_OnRPC)
			dayZGame.Event_OnRPC.Remove(IH_HandleLightingRpc);
	}

	static void IH_HandleLightingRpc(PlayerIdentity sender, Object target, int rpcType, ParamsReadContext ctx)
	{
		if (rpcType == IH_LightingRpc.RequestConfig)
			IH_LightingConfig.SendConfigToClient(sender);
	}
}

modded class MissionGameplay
{
	void MissionGameplay()
	{
		DayZGame dayZGame = DayZGame.Cast(GetGame());
		if (dayZGame && dayZGame.Event_OnRPC)
			dayZGame.Event_OnRPC.Insert(IH_HandleLightingRpc);

		if (IH_LightingConfig.IsNetworkClient())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_RequestLightingConfig, 750, false);
	}

	void ~MissionGameplay()
	{
		DayZGame dayZGame = DayZGame.Cast(GetGame());
		if (dayZGame && dayZGame.Event_OnRPC)
			dayZGame.Event_OnRPC.Remove(IH_HandleLightingRpc);

		if (GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_RequestLightingConfig);

		IH_LightingConfig.ResetNetworkPayloadAssemblers();
		IH_UndergroundVisibilityManager.Reset();
	}

	static void IH_HandleLightingRpc(PlayerIdentity sender, Object target, int rpcType, ParamsReadContext ctx)
	{
		if (rpcType != IH_LightingRpc.ReceiveConfig && rpcType != IH_LightingRpc.ReceiveHideModelConfig)
			return;

		if (!ctx)
			return;

		Param3<int,int,string> payload = new Param3<int,int,string>(0, 0, "");
		if (!ctx.Read(payload) || !payload)
			return;

		IH_LightingConfig.ApplyNetworkPayloadChunk(rpcType, payload.param1, payload.param2, payload.param3);
	}

	static void IH_RequestLightingConfig()
	{
		IH_LightingConfig.RequestConfigFromServer();
	}
}

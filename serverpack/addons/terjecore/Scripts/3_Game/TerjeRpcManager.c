class TerjeRpcManager
{
	private ref map<string, ref Param2<Class, string>> m_RegisteredRPCs = new map<string, ref Param2<Class, string>>;
	private ref map<string, ref ScriptCaller> m_RegisteredRPCsEx = new map<string, ref ScriptCaller>;

	void HandleRPC(PlayerIdentity sender, Object target, ParamsReadContext ctx) 
	{
		Param1<string> metaData;
		if (!ctx.Read(metaData))
		{
			return;
		}
		
		ScriptCaller caller;
		Param2<Class, string> invoker;
		
		if (m_RegisteredRPCs.Find(metaData.param1, invoker))
		{
			if (invoker.param1)
			{
				auto invokeData = new Param2<ParamsReadContext, PlayerIdentity>(ctx, sender);
				GetGame().GameScript.CallFunctionParams(invoker.param1, invoker.param2, null, invokeData);
			}
		}
		else if (m_RegisteredRPCsEx.Find(metaData.param1, caller))
		{
			if (caller)
			{
				caller.Invoke(ctx, sender);
			}
		}
		else
		{
			TerjeLog_Error("RPC with ID " + metaData.param1 + " not found.");
			return;
		}
	}
	
	void RegisterHandler(string id, Class instance, string fnc)
	{
		if (m_RegisteredRPCs.Contains(id))
		{
			m_RegisteredRPCs.Remove(id);
		}
		
		m_RegisteredRPCs.Insert(id, new Param2<Class, string>(instance, fnc));
	}
	
	void RegisterHandlerEx(string id, ScriptCaller callback)
	{
		if (m_RegisteredRPCsEx.Contains(id))
		{
			m_RegisteredRPCsEx.Remove(id);
		}
		
		m_RegisteredRPCsEx.Insert(id, callback);
	}
	
	void UnregisterHandler(string id)
	{
		if (m_RegisteredRPCs.Contains(id))
		{
			m_RegisteredRPCs.Remove(id);
		}
		
		if (m_RegisteredRPCsEx.Contains(id))
		{
			m_RegisteredRPCsEx.Remove(id);
		}
	}

	void SendToClient(string id, PlayerIdentity identity, Param params) 
	{
		if (GetGame().IsDedicatedServer())
		{
			array<ref Param> sendData();
			sendData.Insert(new Param1<string>(id));
			
			if (params != null)
			{
				sendData.Insert(params);
			}
			
			GetGame().RPC(null, 67963732, sendData, true, identity);
		}
	}
	
	void StreamToClient(string id, PlayerIdentity identity, out TerjeStreamRpc stream)
	{
		stream = new TerjeStreamRpc();
		stream.InitTerjeRpc(id, identity, TerjeStreamRpc_Target.TO_CLIENT);
	}
	
	void SendToServer(string id, Param params) 
	{
		if (!GetGame().IsDedicatedServer())
		{
			array<ref Param> sendData();
			sendData.Insert(new Param1<string>(id));
			
			if (params != null)
			{
				sendData.Insert(params);
			}
			
			GetGame().RPC(null, 67963732, sendData, true, null);
		}
	}
	
	void StreamToServer(string id, out TerjeStreamRpc stream)
	{
		stream = new TerjeStreamRpc();
		stream.InitTerjeRpc(id, null, TerjeStreamRpc_Target.TO_SERVER);
	}
	
	void SendToAll(string id, Param params) 
	{
		if (GetGame().IsDedicatedServer())
		{
			array<ref Param> sendData();
			sendData.Insert(new Param1<string>(id));
			
			if (params != null)
			{
				sendData.Insert(params);
			}
			
			GetGame().RPC(null, 67963732, sendData, true, null);
		}
	}
	
	void StreamToAll(string id, out TerjeStreamRpc stream)
	{
		stream = new TerjeStreamRpc();
		stream.InitTerjeRpc(id, null, TerjeStreamRpc_Target.TO_ALL);
	}
}

static ref TerjeRpcManager m_TerjeRpcManagerInstance = new TerjeRpcManager;
TerjeRpcManager GetTerjeRPC()
{
	return m_TerjeRpcManagerInstance;
}
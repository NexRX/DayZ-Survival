modded class DayZGame
{
	ref set<int> m_terjePressedKeys = new set<int>;
	ref ScriptInvoker TerjeKeyPressedEvent = new ScriptInvoker;
	
	override void OnRPC(PlayerIdentity sender, Object target, int rpc_type, ParamsReadContext ctx)
	{
		if (rpc_type == 67963732)
		{
			GetTerjeRPC().HandleRPC(sender, target, ctx);
			return;
		}
		else if (rpc_type == 67963733)
		{
			OnTerjeSynchSettingsFromServer(ctx);
			return;
		}
		
		super.OnRPC(sender, target, rpc_type, ctx);
	}
	
	protected void OnTerjeSynchSettingsFromServer(ParamsReadContext ctx)
	{
		GetTerjeGameConfig().OnReceiveClientSettings(ctx);
		GetTerjeSettingsSynchContext().OnReceiveClientSettings(ctx);
	}
	
	override void OnKeyPress(int key)
	{
		super.OnKeyPress(key);
		
		if (m_terjePressedKeys.Find(key) == -1)
		{
			m_terjePressedKeys.Insert(key);
		}
	}
	
	override void OnKeyRelease(int key)
	{
		super.OnKeyRelease(key);
	
		int keyIndex = m_terjePressedKeys.Find(key);
		if (keyIndex != -1)
		{
			m_terjePressedKeys.Remove(keyIndex);
			TerjeKeyPressedEvent.Invoke(key);
		}
	}
	
	bool IsTerjeKeyPressed(int key)
	{
		return (m_terjePressedKeys.Find(key) != -1);
	}
}
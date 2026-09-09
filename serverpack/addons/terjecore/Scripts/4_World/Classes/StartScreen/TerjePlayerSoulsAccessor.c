class TerjePlayerSoulsAccessor
{
	protected PlayerBase m_Player;
	
	void TerjePlayerSoulsAccessor(PlayerBase player)
	{
		m_Player = player;
	}
	
	bool IsEnabled()
	{
		return false;
	}
	
	int GetCount()
	{
		return 0;
	}
	
	void SetCount(int count, bool showNotification = true)
	{
	
	}
	
	void AddCount(int count, bool showNotification = true)
	{
	
	}
}
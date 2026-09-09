class TerjePlayerStats : TerjePlayerRecordsBase
{
	private int m_LifetimeStat;
	
	override void OnInit()
	{
		super.OnInit();
		m_LifetimeStat = RegisterRecordInt("lifetime", 0, true);
	}
	
	int IncrementLifetime()
	{
		int result = GetIntValue(m_LifetimeStat) + 1;
		SetIntValue(m_LifetimeStat, result);
		return result;
	}
	
	int GetLifetime()
	{
		return GetIntValue(m_LifetimeStat);
	}
}
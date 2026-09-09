modded class UndergroundHandlerClient
{
	bool IsTerjeClientUnderground()
	{
		return m_InsideTriggers && m_InsideTriggers.Count() > 0;
	}
}
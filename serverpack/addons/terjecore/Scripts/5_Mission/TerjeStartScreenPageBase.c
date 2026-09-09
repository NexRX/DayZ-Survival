class TerjeStartScreenPageBase : TerjeWidgetBase
{
	ref ScriptCaller m_NextPageCallback = null;
	
	void InitInputContext(TerjeStartScreenContextBase context)
	{
		
	}
	
	void InitOutputContext(TerjeStartScreenContextBase context)
	{
	
	}
	
	void ExecuteNextPage()
	{
		if (m_NextPageCallback != null && m_NextPageCallback.IsValid())
		{
			m_NextPageCallback.Invoke();
			m_NextPageCallback = null;
		}
	}
}
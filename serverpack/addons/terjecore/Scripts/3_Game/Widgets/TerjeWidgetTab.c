class TerjeWidgetTab : TerjeWidgetBase
{
	private string m_tabName;
	private int m_tabId;
	
	void SetTabMetadata(string name, int id)
	{
		m_tabName = name;
		m_tabId = id;
	}
	
	string GetTabName()
	{
		return m_tabName;
	}
	
	int GetTabId()
	{
		return m_tabId;
	}
	
	TerjeWidgetBase CreateContentWidget(typename name)
	{
		return CreateTerjeWidget(name);
	}
}
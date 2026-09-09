class TerjeLoadoutSelectorHandler
{
	bool IsVisible(PlayerBase player, string loadoutId, TerjeXmlObject selectorRoot, TerjeXmlObject selectorItem)
	{
		return false;
	}
	
	bool IsValid(PlayerBase player, string loadoutId, TerjeXmlObject selectorRoot, TerjeXmlObject selectorItem)
	{
		return false;
	}
	
	string GetText(PlayerBase player, string loadoutId, TerjeXmlObject selectorRoot, TerjeXmlObject selectorItem)
	{
		return string.Empty;
	}
	
	void Apply(PlayerBase player, string loadoutId, TerjeXmlObject selectorRoot, TerjeXmlObject selectorItem)
	{
		
	}
}
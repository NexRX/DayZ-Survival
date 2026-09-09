class TerjeCustomPointsHandler
{
	// DEPRECATED, use GetPointsEx instead
	int GetPoints(PlayerBase player, string loadoutId, int selectionId)
	{
		return -1;
	}
	
	int GetPointsEx(PlayerBase player, string loadoutId, int selectionId, TerjeXmlObject selectorRoot)
	{
		return -1;
	}
}
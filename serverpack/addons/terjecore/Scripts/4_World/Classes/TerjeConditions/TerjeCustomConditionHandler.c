class TerjeCustomConditionHandler
{
	// Calls on the server to check condition
	bool CheckCondition(PlayerBase player, TerjeXmlObject condition)
	{
		return false;
	}
	
	// Calls on the server after the player selects loadout, spawn point, etc... with this condition
	void ApplyCondition(PlayerBase player, TerjeXmlObject condition)
	{
	
	}
	
	// Calls on the server to define the condition text that will be displayed to the player in the UI
	string GetConditionText(PlayerBase player, TerjeXmlObject condition)
	{
		return string.Empty;
	}
}
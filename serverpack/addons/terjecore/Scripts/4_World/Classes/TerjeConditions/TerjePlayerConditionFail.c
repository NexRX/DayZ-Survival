class TerjePlayerConditionFail : TerjePlayerConditionBase
{
	override bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		return false;
	}
	
	override string GetText(PlayerBase player, TerjeXmlObject condition)
	{
		string message;
		if (!condition.FindAttribute("message", message))
		{
			message = "CONDITION FAILED";
		}
		
		return message;
	}
}
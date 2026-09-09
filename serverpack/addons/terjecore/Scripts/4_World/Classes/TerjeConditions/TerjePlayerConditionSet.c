class TerjePlayerConditionSet : TerjePlayerConditionBase
{
	override bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		return true;
	}
	
	override void Apply(PlayerBase player, TerjeXmlObject condition)
	{
		string name;
		string value;
		
		if (player && condition && condition.FindAttribute("name", name) && condition.FindAttribute("value", value))
		{
			if (condition.EqualAttribute("persist", "1"))
			{
				if (player.GetTerjeProfile() != null)
				{
					player.GetTerjeProfile().SetUserVariableInt(name, EvaluateValueParameter(player, value));
				}
			}
			else
			{
				if (player.GetTerjeStats() != null)
				{
					player.GetTerjeStats().SetUserVariableInt(name, EvaluateValueParameter(player, value));
				}
			}
		}
	}
}
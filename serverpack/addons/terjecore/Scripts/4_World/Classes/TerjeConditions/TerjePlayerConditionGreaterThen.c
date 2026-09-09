class TerjePlayerConditionGreaterThen : TerjePlayerConditionBase
{
	override bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		string name;
		string value;
		if (player && condition && condition.FindAttribute("name", name) && condition.FindAttribute("value", value))
		{
			if (condition.EqualAttribute("persist", "1"))
			{
				if (player.GetTerjeProfile() != null)
				{
					return (player.GetTerjeProfile().GetUserVariableInt(name)) > (EvaluateValueParameter(player, value));
				}
			}
			else
			{
				if (player.GetTerjeStats() != null)
				{
					return (player.GetTerjeStats().GetUserVariableInt(name)) > (EvaluateValueParameter(player, value));
				}
			}
		}
		
		return false;
	}
	
	override void Apply(PlayerBase player, TerjeXmlObject condition)
	{
		if (player && condition)
		{
			TerjePlayerConditions filter = TerjePlayerConditions.GetInstance();
			for (int i = 0; i < condition.GetChildrenCount(); i++)
			{
				filter.ApplyCondition(player, condition.GetChild(i));
			}
		}
	}
}
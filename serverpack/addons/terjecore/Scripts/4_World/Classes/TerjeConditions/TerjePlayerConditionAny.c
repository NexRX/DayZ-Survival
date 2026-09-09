class TerjePlayerConditionAny : TerjePlayerConditionBase
{
	override bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		if (player && condition)
		{
			TerjePlayerConditions filter = TerjePlayerConditions.GetInstance();
			for (int i = 0; i < condition.GetChildrenCount(); i++)
			{
				if (filter.ValidateCondition(player, condition.GetChild(i)))
				{
					return true;
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
				TerjeXmlObject child = condition.GetChild(i);
				if (filter.ValidateCondition(player, child))
				{
					filter.ApplyCondition(player, child);
				}
			}
		}
	}
}
class TerjePlayerConditionBase
{
	bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		return false;
	}
	
	void Apply(PlayerBase player, TerjeXmlObject condition)
	{
	
	}
	
	string GetText(PlayerBase player, TerjeXmlObject condition)
	{
		return string.Empty;
	}
	
	protected int EvaluateValueParameter(PlayerBase player, string value)
	{
		if (value.Length() > 1)
		{
			string prefix = value.Get(0);
			if (prefix == "$")
			{
				value = value.Substring(1, value.Length() - 1);
				return EvaluateSystemAliasParameter(player, value);
			}
			else if (prefix == "%")
			{
				value = value.Substring(1, value.Length() - 1);
				if (player.GetTerjeStats() != null)
				{
					return player.GetTerjeStats().GetUserVariableInt(value);
				}
				
				return 0;
			}
			else if (prefix == "&")
			{
				value = value.Substring(1, value.Length() - 1);
				if (player.GetTerjeProfile() != null)
				{
					return player.GetTerjeProfile().GetUserVariableInt(value);
				}
				
				return 0;
			}
		}
		
		return value.ToInt();
	}
	
	protected int EvaluateSystemAliasParameter(PlayerBase player, string alias)
	{
		if (alias == "lifetime")
		{
			if (player.GetTerjeStats() != null)
			{
				return player.GetTerjeStats().GetLifetime();
			}
		}
		
		return 0;
	}
}
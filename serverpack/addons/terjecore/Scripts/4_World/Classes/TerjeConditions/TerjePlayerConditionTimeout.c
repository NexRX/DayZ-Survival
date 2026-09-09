class TerjePlayerConditionTimeout : TerjePlayerConditionBase
{
	override bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		string id;
		if (condition.FindAttribute("id", id) && (id != string.Empty))
		{
			PluginTerjeServertime serverTimePlugin = GetTerjeServertime();
			if (player && (player.GetTerjeProfile() != null) && (serverTimePlugin != null))
			{
				int playerTimestamp;
				if (player.GetTerjeProfile().GetExpirableTimestamp("@" + id, playerTimestamp))
				{
					return playerTimestamp < serverTimePlugin.GetTimestamp();
				}
				else
				{
					return true;
				}
			}
		}
		else
		{
			TerjeLog_Warning("Attribute 'id' is required for 'Timeout' condition.");
		}
		
		return false;
	}
	
	override void Apply(PlayerBase player, TerjeXmlObject condition)
	{
		string id;
		if (condition.FindAttribute("id", id) && (id != string.Empty))
		{
			PluginTerjeServertime serverTimePlugin = GetTerjeServertime();
			if (player && (player.GetTerjeProfile() != null) && (serverTimePlugin != null))
			{
				int timespan = TerjeMathHelper.ParseTimespanFromXml(condition);
				int timestamp = serverTimePlugin.GetTimestamp();
				player.GetTerjeProfile().SetExpirableTimestamp("@" + id, timestamp + timespan);
			}
		}
	}
	
	override string GetText(PlayerBase player, TerjeXmlObject condition)
	{
		string id;
		string timeoutStr = string.Empty;
		if (condition.FindAttribute("id", id) && (id != string.Empty))
		{
			PluginTerjeServertime serverTimePlugin = GetTerjeServertime();
			if (player && (player.GetTerjeProfile() != null) && (serverTimePlugin != null))
			{
				int playerTimestamp;
				if (player.GetTerjeProfile().GetExpirableTimestamp("@" + id, playerTimestamp))
				{
					int timeout = playerTimestamp - serverTimePlugin.GetTimestamp();
					timeoutStr = TerjeStringHelper.SecondsToHM(timeout);
					if (timeoutStr != string.Empty)
					{
						return "#STR_TERJECORE_COND_TM " + timeoutStr;
					}
				}
			}
		}
		
		timeoutStr = TerjeStringHelper.SecondsToHM(TerjeMathHelper.ParseTimespanFromXml(condition));
		if (timeoutStr != string.Empty)
		{
			return "#STR_TERJECORE_COND_TM2 " + timeoutStr;
		}
		
		return string.Empty;
	}
}
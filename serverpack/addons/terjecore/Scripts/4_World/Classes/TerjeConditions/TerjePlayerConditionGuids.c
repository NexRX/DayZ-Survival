class TerjePlayerConditionGuids : TerjePlayerConditionBase
{
	override bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		if (player && player.GetIdentity())
		{
			string playerSteamId = player.GetIdentity().GetId();
			string playerPlainId = player.GetIdentity().GetPlainId();
			for (int specificPlayerId = 0; specificPlayerId < condition.GetChildrenCount(); specificPlayerId++)
			{
				TerjeXmlObject specificPlayerNode = condition.GetChild(specificPlayerId);
				if (specificPlayerNode.IsObjectNode() && (specificPlayerNode.GetName() == "SpecificPlayer"))
				{
					string steamGUID;
					if (specificPlayerNode.FindAttribute("steamGUID", steamGUID))
					{
						if ((playerSteamId == steamGUID) || (playerPlainId == steamGUID))
						{
							return true;
						}
					}
				}
			}
		}
		
		return false;
	}
	
	override string GetText(PlayerBase player, TerjeXmlObject condition)
	{
		return "#STR_TERJECORE_COND_SP";
	}
}
class TerjeStartScreenContextLoadout : TerjeStartScreenContextBase
{
	ref TerjeXmlObject m_inputLoadouts = new TerjeXmlObject;
	ref TerjeXmlObject m_outputSelectedLoadout = new TerjeXmlObject;
	
	override string GetPageName()
	{
		return "loadout";
	}
	
	override bool Serialize(Serializer ctx)
	{
		if (!super.Serialize(ctx))
			return false;
		
		if (!m_inputLoadouts.Binarize(ctx))
			return false;
		
		if (!m_outputSelectedLoadout.Binarize(ctx))
			return false;
		
		return true;
	}
	
	override bool Deserialize(Serializer ctx)
	{
		if (!super.Deserialize(ctx))
			return false;
		
		if (!m_inputLoadouts.Unbinarize(ctx))
			return false;
		
		if (!m_outputSelectedLoadout.Unbinarize(ctx))
			return false;
		
		return true;
	}
	
	override void Build(PlayerBase player)
	{
		super.Build(player);
		GetPluginTerjeStartScreen().BuildLoadoutsForPlayer(player, m_inputLoadouts);
	}
	
	override void Apply(PlayerBase player)
	{
		super.Apply(player);
		
		if (!player)
			return;
		
		if (player.GetTerjeProfile() == null)
			return;
		
		if (!m_outputSelectedLoadout)
			return;
		
		string loadoutId;
		if (!m_outputSelectedLoadout.FindAttribute("id", loadoutId))
			return;
		
		TerjeXmlObject itemsXml = m_outputSelectedLoadout.GetChildByNodeName("Items");
		if (itemsXml != null)
		{
			string loadoutSelections = string.Empty;
			for (int itemsId = 0; itemsId < itemsXml.GetChildrenCount(); itemsId++)
			{
				TerjeXmlObject selectorXml = itemsXml.GetChild(itemsId);
				if (selectorXml != null && (selectorXml.GetName() == "Selector") && (selectorXml.EqualAttribute("$visible", "1")))
				{
					string subSelection = string.Empty;
					for (int itemId = 0; itemId < selectorXml.GetChildrenCount(); itemId++)
					{
						TerjeXmlObject selectorItem = selectorXml.GetChild(itemId);
						if ((selectorItem != null) && selectorItem.EqualAttribute("$selected", "1"))
						{
							if (subSelection.Length() > 0)
							{
								subSelection += "+";
							}
							
							subSelection += itemId.ToString();
							
							ApplyLoadoutSelectorHandler(player, loadoutId, selectorXml, selectorItem);
						}
					}
					
					if (subSelection != string.Empty)
					{
						if (loadoutSelections.Length() > 0)
						{
							loadoutSelections += "|";
						}
						
						loadoutSelections += subSelection;
					}
				}
			}
			
			player.GetTerjeProfile().SetLastLoadout(loadoutId, loadoutSelections);
		}
		
		TerjeXmlObject conditionsXml = m_outputSelectedLoadout.GetChildByNodeName("Conditions");
		if (conditionsXml != null)
		{
			TerjePlayerConditions playerConds = TerjePlayerConditions.GetInstance();
			for (int condId = 0; condId < conditionsXml.GetChildrenCount(); condId++)
			{
				TerjeXmlObject condXml = conditionsXml.GetChild(condId);
				if (condXml != null && condXml.IsObjectNode())
				{
					playerConds.ApplyCondition(player, condXml);
				}
			}
		}
	}
		
	protected void ApplyLoadoutSelectorHandler(PlayerBase player, string loadoutId, TerjeXmlObject selectorRoot, TerjeXmlObject selectorItem)
	{
		string handlerClassname;
		if (selectorItem.FindAttribute("handler", handlerClassname) && (handlerClassname != string.Empty))
		{
			typename handlerType = handlerClassname.ToType();
			if (handlerType && handlerType.IsInherited(TerjeLoadoutSelectorHandler))
			{
				TerjeLoadoutSelectorHandler handlerInstance = TerjeLoadoutSelectorHandler.Cast(handlerType.Spawn());
				if (handlerInstance != null)
				{
					handlerInstance.Apply(player, loadoutId, selectorRoot, selectorItem);
				}
				else
				{
					TerjeLog_Warning("Handler class '" + handlerClassname + "' cannot be created.");
				}
			}
			else
			{
				TerjeLog_Warning("Handler class '" + handlerClassname + "' not found or not inherited TerjeLoadoutSelectorHandler.");
			}
		}
	}
}
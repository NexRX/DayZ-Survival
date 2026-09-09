modded class InspectMenuNew
{
	override void SetItem(EntityAI item)
	{
		super.SetItem(item);
		
		if (item && layoutRoot)
		{
			UpdateItemInfoTerjeCustomLiquidType(layoutRoot, item);
		}
	}
	
	static void UpdateItemInfoTerjeCustomLiquidType(Widget root_widget, EntityAI item)
	{
		ItemBase itemBase = ItemBase.Cast(item);
		if (itemBase && root_widget)
		{
			int vanillaLiquidType = itemBase.GetLiquidType();
			int terjeLiquidType = itemBase.GetTerjeLiquidType();
			if (vanillaLiquidType == LIQUID_TERJE_CUSTOM && terjeLiquidType > 0)
			{
				ref LiquidInfo liquidInfo;
				if (TerjeCustomLiquids.GetInstance().m_LiquidInfosByType.Find(terjeLiquidType, liquidInfo))
				{
					int color = Colors.COLOR_LIQUID;
					string colorOverrideCfg = "CfgTerjeCustomLiquids " + liquidInfo.m_LiquidClassName + " terjeOverrideLiquidColor";
					if (GetTerjeGameConfig().ConfigIsExisting(colorOverrideCfg))
					{
						color = GetTerjeGameConfig().ConfigGetInt(colorOverrideCfg);
					}
					
					InspectMenuNew.WidgetTrySetText(root_widget, "ItemLiquidTypeWidget", liquidInfo.m_LiquidDisplayName, color);
				}
			}
		}
	}
}

modded class ItemManager
{
	override void PrepareTooltip(EntityAI item, int x = 0, int y = 0)
	{
		super.PrepareTooltip(item, x, y);
		
		if (item && m_TooltipWidget && !IsDragging())
		{
			InspectMenuNew.UpdateItemInfoTerjeCustomLiquidType(m_TooltipWidget, item);
		}
	}
}

modded class ActionPourLiquid
{
	override bool ActionCondition( PlayerBase player, ActionTarget target, ItemBase item )
	{	
		bool result = super.ActionCondition(player, target, item);
		if (result)
		{
			ItemBase target_item = ItemBase.Cast(target.GetObject());
			if ( target_item && item )
			{
				result = TerjeCustomLiquids.GetInstance().CanTransfer(item, target_item);
			}
		}
		
		return result;
	}
}
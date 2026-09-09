modded class CAContinuousQuantityLiquidTransfer
{
	override void CalcAndSetQuantity(ActionData action_data)
	{
		int quantity = m_SpentQuantity;
		super.CalcAndSetQuantity(action_data);
		
		ItemBase target_item = ItemBase.Cast(action_data.m_Target.GetObject());
		if (GetGame().IsDedicatedServer())
		{
			if (m_TendencyDrain)
			{
				TerjeCustomLiquids.GetInstance().FixVanillaTransfer(target_item, action_data.m_MainItem, quantity);
			}
			else
			{
				TerjeCustomLiquids.GetInstance().FixVanillaTransfer(action_data.m_MainItem, target_item, quantity);
			}
		}
	}
}
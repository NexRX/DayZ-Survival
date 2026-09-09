#ifdef WRDG_DOGTAGS
#ifdef SERVER
modded class PluginTerjeStartScreen
{
	override void DeleteLoadoutItemEquip(ItemBase item)
	{
		if (item.IsInherited(Dogtag_Base))
		{
			return;
		}
		
		super.DeleteLoadoutItemEquip(item);
	}
}

modded class TerjeStartScreenParams
{
	override void OnServerDone(PlayerBase player)
	{
		super.OnServerDone(player);
		if (player)
		{
			Dogtag_Base dogTag = Dogtag_Base.Cast(player.GetInventory().FindAttachment(InventorySlots.GetSlotIdFromString("Dogtag")));
			if (dogTag)
			{
				dogTag.SetNickName(player.GetTerjeCharacterName());
			}
		}
	}
}
#endif
#endif
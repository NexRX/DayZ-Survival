class TerjePlayerModifierPerkStrongHands : TerjePlayerModifierBase
{
	int m_ticksCount = 0;
	
	override float GetTimeout()
	{
		return 1.0;
	}
	
	override void OnServerFixedTick(PlayerBase player, float deltaTime)
	{
		super.OnServerFixedTick(player, deltaTime);
		
		ItemBase itemInHands = player.GetItemInHands();
		if (itemInHands && player.GetIdentity() && IsHeavyItemSkillCheck(itemInHands) && player.CanDropEntity(itemInHands) && player.GetTerjeSkills())
		{
			if (player.GetTerjeSkills().IsPerkRegistered("strng", "strhands") && player.GetTerjeSkills().GetPerkLevel("strng", "strhands") == 0)
			{
				m_ticksCount = m_ticksCount + 1;
				if (m_ticksCount >= 3)
				{
					m_ticksCount = 0;
					player.GetInventory().DropEntity(InventoryMode.SERVER, player, itemInHands);
					NotificationSystem.SendNotificationToPlayerIdentityExtended(player.GetIdentity(), 5, "#STR_TERJEPERK_REQUIRED_MSG", "#STR_TERJEPERK_STRONGHANDS_MSG", "set:TerjePerk_icon image:tp_stronghands");
				}
			}
		}
	}
	
	bool IsHeavyItemSkillCheck(ItemBase itemInHands)
	{
		if (!itemInHands)
		{
			return false;
		}
		
		return itemInHands.GetWeightEx() >= GetTerjeSettingFloat(TerjeSettingsCollection.SKILLS_STRENGTH_STRONG_HANDS_THRESHOLD) * 1000;
	}
}
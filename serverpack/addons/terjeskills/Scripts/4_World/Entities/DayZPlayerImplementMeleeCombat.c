modded class DayZPlayerImplementMeleeCombat
{
	override protected int TrySelectFinisherType(InventoryItem weapon, EntityAI target)
	{
		PlayerBase player = PlayerBase.Cast(m_DZPlayer);
		if (player && player.GetTerjeSkills() && player.GetTerjeSkills().IsPerkRegistered("stlth", "silentkilr") && player.GetTerjeSkills().GetPerkLevel("stlth", "silentkilr") == 0)
		{
			return -1;
		}
		
		return super.TrySelectFinisherType(weapon, target);
	}
}
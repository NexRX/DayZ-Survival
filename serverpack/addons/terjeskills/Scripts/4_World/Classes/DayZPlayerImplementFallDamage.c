modded class DayZPlayerImplementFallDamage
{
	override void HandleFallDamage(FallDamageData pData)
	{
		PlayerBase player;
		if (PlayerBase.CastTo(player, m_Player) && player && player.GetTerjeSkills())
		{
			float stuntmanPerkModifier;
			if (player.GetTerjeSkills().GetPerkValue("athlc", "stuntman", stuntmanPerkModifier))
			{
				pData.m_Height *= Math.Clamp(1.0 + stuntmanPerkModifier, 0.0, 1.0);
			}
		}
		
		super.HandleFallDamage(pData);
	}
}
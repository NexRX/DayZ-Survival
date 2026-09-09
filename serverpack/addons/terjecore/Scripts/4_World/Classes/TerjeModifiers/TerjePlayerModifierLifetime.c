class TerjePlayerModifierLifetime : TerjePlayerModifierBase
{
	override float GetTimeout()
	{
		return 1;
	}
	
	override void OnServerFixedTick(PlayerBase player, float deltaTime)
	{
		super.OnServerFixedTick(player, deltaTime);
		player.OnTerjeCharacterLifetimeUpdated(player.GetTerjeStats().IncrementLifetime());
	}
}
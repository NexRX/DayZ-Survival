#ifdef SATORU_SAVE_LOOT_ON_DEATH_MOD
modded class TerjeStartScreenParams
{
	override void OnServerDone(PlayerBase player)
	{
		super.OnServerDone(player);
		if (player)
		{
			SavePlayerLoot.Load(player);
		}
	}
}
#endif
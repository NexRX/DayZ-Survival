#ifdef WRDG_DOGTAGS
#ifdef SERVER
modded class MissionServer
{
	override void InvokeOnConnect(PlayerBase player, PlayerIdentity identity)
	{
		super.InvokeOnConnect(player, identity);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Call(this.TerjeToDogtagCompatibilityUpdateName, player);
	}
	
	void TerjeToDogtagCompatibilityUpdateName(PlayerBase player)
	{
		if (player && player.GetDogtag())
		{
			player.GetDogtag().SetNickName(player.GetTerjeCharacterName()); // updates player's name
		}
	}
}
#endif
#endif
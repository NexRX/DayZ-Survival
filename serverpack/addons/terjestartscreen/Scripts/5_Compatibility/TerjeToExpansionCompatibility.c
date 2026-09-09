#ifdef EXPANSIONMODSPAWNSELECTION
modded class ExpansionRespawnHandlerModule
{
	override void StartSpawnSelection(PlayerBase player, PlayerIdentity identity)
	{
		// DISABLE EXPANSION SPAWN SELECTION TO PREVENT MOD CONFLICTS
		TerjeLog_Warning("DayZ Expansion spawn selection skiped to ensure compatibility with the TerjeStartScreen mod.");
	}
}
#endif
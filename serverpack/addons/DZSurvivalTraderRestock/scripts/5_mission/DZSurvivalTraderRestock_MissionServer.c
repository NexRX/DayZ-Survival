// DZSurvivalTraderRestock_MissionServer.c
//
// MissionServer (5_Mission scope, dedicated/host-only - MissionClient is the
// separate class used on real clients, so no IsMissionHost()-style guard is
// needed here) is where vanilla itself hooks its own one-time, server-only
// mission-start setup (e.g. EffectAreaLoader.CreateZones() in its real
// OnMissionStart() - confirmed via server/dta/scripts.pbo). This starts the
// restock ticker the same way.
modded class MissionServer
{
	override void OnMissionStart()
	{
		super.OnMissionStart();
		DZSurvivalTraderRestock.Init();
	}
};

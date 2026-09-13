// DZSurvivalTraderFireplace_MissionServer.c
//
// Same MissionServer.OnMissionStart() hook pattern as
// DZSurvivalTraderRestock_MissionServer.c (see that file's own comment for
// why this specific override is the right one - server-only, one-time
// mission-start setup).
modded class MissionServer
{
	override void OnMissionStart()
	{
		super.OnMissionStart();
		DZSurvivalTraderFireplace.Init();
	}
};

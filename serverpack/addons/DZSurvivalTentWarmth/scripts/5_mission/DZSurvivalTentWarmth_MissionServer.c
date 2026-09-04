// DZSurvivalTentWarmth_MissionServer.c
//
// Same MissionServer.OnMissionStart() hook pattern as
// DZSurvivalTraderRestock_MissionServer.c/DZSurvivalTraderFireplace_MissionServer.c/
// DZSurvivalTraderWarmth_MissionServer.c (server-only, one-time
// mission-start setup - safe to layer another `modded class MissionServer`
// addon on top of the existing ones).
modded class MissionServer
{
	override void OnMissionStart()
	{
		super.OnMissionStart();
		DZSurvivalTentWarmth.Init();
	}
};

// DZSurvivalTraderWarmth_MissionServer.c
//
// Same MissionServer.OnMissionStart() hook pattern as
// DZSurvivalTraderRestock_MissionServer.c/DZSurvivalTraderFireplace_MissionServer.c
// (server-only, one-time mission-start setup - safe to layer a third
// `modded class MissionServer` addon on top of the existing two).
modded class MissionServer
{
	override void OnMissionStart()
	{
		super.OnMissionStart();
		DZSurvivalTraderWarmth.Init();
	}
};

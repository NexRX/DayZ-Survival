// DZSurvivalBaseDecay_MissionServer.c
//
// Same pattern as DZSurvivalTraderRestock_MissionServer.c - MissionServer's
// OnMissionStart() is where vanilla itself does its own one-time,
// server-only mission setup (dedicated/host-only; MissionClient is separate,
// so no IsMissionHost()-style guard is needed here).
modded class MissionServer
{
	override void OnMissionStart()
	{
		super.OnMissionStart();
		DZSurvivalBaseDecay.Init();
	}
};

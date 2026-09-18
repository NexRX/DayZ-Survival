modded class MissionServer
{
	override void OnMissionStart()
	{
		super.OnMissionStart();
		DZSurvivalTentWarmth.Init();
	}
};

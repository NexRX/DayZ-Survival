modded class PluginManager
{
	override void Init()
	{
		super.Init();
		RegisterPlugin("PluginTerjeRespawnObjects", true, true);
		RegisterPlugin("PluginTerjeStartScreen", false, true);
	}
}
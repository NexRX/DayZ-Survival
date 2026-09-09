modded class PluginManager
{
	override void Init()
	{
		RegisterPlugin("PluginTerjeCore", false, true);
		RegisterPlugin("PluginTerjeSettings", true, true);
		RegisterPlugin("PluginTerjeDatabase", true, true);
		RegisterPlugin("PluginTerjeServertime", false, true);
		RegisterPlugin("PluginTerjeClientItemsCore", true, false);
		RegisterPlugin("PluginTerjeClientAnimalsCore", true, false);
		RegisterPlugin("PluginTerjeScriptableAreas", true, true);
		super.Init();
	}
}
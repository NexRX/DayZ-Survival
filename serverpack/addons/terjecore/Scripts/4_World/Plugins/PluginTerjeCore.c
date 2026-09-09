class PluginTerjeCore extends PluginBase
{
	private ref array<string> m_submodules;
	
	override void OnInit()
	{
		m_submodules = new array<string>;
		RegisterSubmodules(m_submodules);
	}
	
	protected void RegisterSubmodules(array<string> submodules)
	{
		submodules.Insert("TerjeCore");
	}
}
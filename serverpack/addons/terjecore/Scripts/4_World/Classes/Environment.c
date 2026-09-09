modded class Environment
{
	override void ProcessHeatComfort()
	{
		if (m_Player && m_Player.GetTerjeDisableHeatComfort())
		{
			m_HeatComfort = 0.0;
 			SetTargetHeatComfort(0.0);
 			m_Player.GetStatHeatComfort().Set(0.0);
			return;
		}
		
		super.ProcessHeatComfort();
	}
	
	override void SetHeatcomfortDirectly()
	{
		if (m_Player && m_Player.GetTerjeDisableHeatComfort())
		{
			m_HeatComfort = 0.0;
 			SetTargetHeatComfort(0.0);
 			m_Player.GetStatHeatComfort().Set(0.0);
			return;
		}
		
		super.SetHeatcomfortDirectly();
	}
}
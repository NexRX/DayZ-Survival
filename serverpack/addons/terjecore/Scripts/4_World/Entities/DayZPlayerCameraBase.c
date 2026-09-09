modded class DayZPlayerCameraBase
{
	protected int m_terjeNVtype = 0;
	
	override void SetNVPostprocess(int NVtype)
	{
		super.SetNVPostprocess(NVtype);
		m_terjeNVtype = NVtype;
	}
	
	int GetTerjeNVType()
	{
		return m_terjeNVtype;
	}
}
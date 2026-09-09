class TerjeSettingsSynch
{
	protected ref array<ref TerjeSettingSynch> m_settings = new array<ref TerjeSettingSynch>;
	
	void OnReceiveClientSettings(ParamsReadContext ctx)
	{
		Reset();
		ctx.Read(m_settings);
	}
	
	void Reset()
	{
		m_settings.Clear();
	}
	
	array<ref TerjeSettingSynch> GetData()
	{
		return m_settings;
	}
}

class TerjeSettingSynch
{
	string m_name;
	string m_value;
	
	void TerjeSettingSynch(string name, string value)
	{
		m_name = name;
		m_value = value;
	}
}

static ref TerjeSettingsSynch m_TerjeSettingsSynchInstance = new TerjeSettingsSynch;
TerjeSettingsSynch GetTerjeSettingsSynchContext()
{
	return m_TerjeSettingsSynchInstance;
}
modded class TerjePlayerStats
{
	private int m_TerjeStartScreen_Progress;
	private int m_TerjeStartScreen_SurvSoulsCounter;
	
	override void OnInit()
	{
		super.OnInit();
		
		m_TerjeStartScreen_Progress = RegisterRecordBool("tp.prgss", false, true);
		m_TerjeStartScreen_SurvSoulsCounter = RegisterRecordInt("tp.survsc", 0, true);
	}
	
	bool IsStartScreenInProgress()
	{
		return GetBoolValue(this.m_TerjeStartScreen_Progress);
	}
	void SetStartScreenInProgress(bool value)
	{
		SetBoolValue(this.m_TerjeStartScreen_Progress, value);
	}
	
	int GetSurvSoulsCounter()
	{
		return TerjeMathHelper.MaxInt(0, GetIntValue(this.m_TerjeStartScreen_SurvSoulsCounter));
	}
	void IncrementSurvSoulsCounter()
	{
		SetIntValue(this.m_TerjeStartScreen_SurvSoulsCounter, GetSurvSoulsCounter() + 1);
	}
}

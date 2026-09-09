modded class DayZGame
{
	protected string m_terjeSelectedCharacterClassname = string.Empty;
	
	void SetSelectedTerjeCharacterClassname(string value)
	{
		m_terjeSelectedCharacterClassname = value;
	}
	
	override string CreateRandomPlayer()
	{
		if (m_terjeSelectedCharacterClassname != string.Empty)
		{
			return m_terjeSelectedCharacterClassname;
		}
		
		return super.CreateRandomPlayer();
	}
}
class TerjeStartScreenContextSkills : TerjeStartScreenContextBase
{
	int m_inputPoints;
	
	ref map<string, int> m_outputPoints = new map<string, int>;
	
	override string GetPageName()
	{
		return "skills";
	}
	
	override bool Serialize(Serializer ctx)
	{
		if (!super.Serialize(ctx))
			return false;
		
		if (!ctx.Write(m_inputPoints))
			return false;
		
		int count = m_outputPoints.Count();
		if (!ctx.Write(count))
			return false;
		
		foreach (string key, int value : m_outputPoints)
		{
			if (!ctx.Write(key))
				return false;
			
			if (!ctx.Write(value))
				return false;
		}
		
		return true;
	}
	
	override bool Deserialize(Serializer ctx)
	{
		if (!super.Deserialize(ctx))
			return false;
		
		if (!ctx.Read(m_inputPoints))
			return false;
		
		int count;
		if (!ctx.Read(count))
			return false;
		
		m_outputPoints.Clear();
		for (int i = 0; i < count; i++)
		{
			string key;
			if (!ctx.Read(key))
				return false;
			
			int value;
			if (!ctx.Read(value))
				return false;
			
			m_outputPoints.Set(key, value);
		}
		
		return true;
	}
	
	override void Build(PlayerBase player)
	{
		super.Build(player);
		
		m_inputPoints = GetTerjeSettingInt(TerjeSettingsCollection.STARTSCREEN_SKILLS_PAGE_POINTS);
	}
	
	override void Apply(PlayerBase player)
	{
		super.Apply(player);
		
		if (player && (player.GetTerjeSkills() != null) && (player.GetTerjeProfile() != null))
		{
			array<ref TerjeSkillCfg> skills();
			GetTerjeSkillsRegistry().GetSkills(skills);
			foreach (ref TerjeSkillCfg skill : skills)
			{
				int level;
				if (!m_outputPoints.Find(skill.GetId(), level))
				{
					level = 0;
				}
				
				player.GetTerjeSkills().SetSkillLevel(skill.GetId(), level, false);
			}
			
			player.GetTerjeProfile().SetSkillsSelectedFlag(2);
		}
	}
}
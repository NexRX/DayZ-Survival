class TerjeExperienceModScriptableArea : TerjeScriptableArea
{
	protected ref set<string> m_SkillFilters = null;
	
	override string GetTerjeScriptableAreaType()
	{
		return "exp";
	}
	
	override void SetTerjeFilter(string filter)
	{
		ref array<string> splitedParts = new array<string>;
		filter.Split(",", splitedParts);
		m_SkillFilters = new set<string>;
		foreach (string part : splitedParts)
		{
			m_SkillFilters.Insert(part.Trim());
		}
	}
	
	override void SetTerjeParameters(map<string, float> parameters)
	{
		super.SetTerjeParameters(parameters);
		
		if (parameters.Contains("Radius"))
		{
			m_terjeInnerRadius = parameters.Get("Radius");
			m_terjeOuterRadius = parameters.Get("Radius");
		}
	}
	
	override bool TryCalculateTerjeEffectFilter(EntityAI source, string filterEntry)
	{
		if (filterEntry != "" && m_SkillFilters != null && m_SkillFilters.Count() > 0)
		{
			return m_SkillFilters.Find(filterEntry) != -1;
		}
		
		return super.TryCalculateTerjeEffectFilter(source, filterEntry);
	}
}
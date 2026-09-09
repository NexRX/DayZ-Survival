class TerjeStartScreenContextRules : TerjeStartScreenContextBase
{
	ref array<string> m_rulesMarkdownContent = new array<string>;
	bool m_readToEndRequired;
	float m_nextTimeout;
	
	override string GetPageName()
	{
		return "rules";
	}
	
	override bool Serialize(Serializer ctx)
	{
		if (!super.Serialize(ctx))
			return false;
		
		if (!ctx.Write(m_rulesMarkdownContent))
			return false;
		
		if (!ctx.Write(m_readToEndRequired))
			return false;
		
		if (!ctx.Write(m_nextTimeout))
			return false;
		
		return true;
	}
	
	override bool Deserialize(Serializer ctx)
	{
		if (!super.Deserialize(ctx))
			return false;
		
		m_rulesMarkdownContent.Clear();
		if (!ctx.Read(m_rulesMarkdownContent))
			return false;
		
		if (!ctx.Read(m_readToEndRequired))
			return false;
		
		if (!ctx.Read(m_nextTimeout))
			return false;
		
		return true;
	}
	
	override void Build(PlayerBase player)
	{
		super.Build(player);
		
		GetPluginTerjeStartScreen().GetRulesMarkdownContent(m_rulesMarkdownContent);
		m_readToEndRequired = GetTerjeSettingBool(TerjeSettingsCollection.STARTSCREEN_RULES_SCROLL);
		m_nextTimeout = GetTerjeSettingFloat(TerjeSettingsCollection.STARTSCREEN_RULES_TIMEOUT);
	}
	
	override void Apply(PlayerBase player)
	{
		super.Apply(player);
		
		if (player.GetTerjeProfile() != null)
		{
			player.GetTerjeProfile().SetServerRulesAccepted(true);
		}
	}
}
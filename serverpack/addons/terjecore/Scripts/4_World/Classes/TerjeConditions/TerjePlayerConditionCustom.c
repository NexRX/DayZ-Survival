class TerjePlayerConditionCustom : TerjePlayerConditionBase
{
	override bool Validate(PlayerBase player, TerjeXmlObject condition)
	{
		string classname;
		if (condition.FindAttribute("classname", classname) && (classname != string.Empty))
		{
			typename type = classname.ToType();
			if (type && type.IsInherited(TerjeCustomConditionHandler))
			{
				TerjeCustomConditionHandler customCondition = TerjeCustomConditionHandler.Cast(type.Spawn());
				if (customCondition != null)
				{
					return customCondition.CheckCondition(player, condition);
				}
			}
			else
			{
				TerjeLog_Warning("Class '" + classname + "' not found or not inherited TerjeCustomConditionHandler.");
			}
		}
		else
		{
			TerjeLog_Warning("Attribute 'classname' is required for 'CustomCondition'.");
		}
		
		return false;
	}
	
	override void Apply(PlayerBase player, TerjeXmlObject condition)
	{
		string classname;
		if (condition.FindAttribute("classname", classname) && (classname != string.Empty))
		{
			typename type = classname.ToType();
			if (type && type.IsInherited(TerjeCustomConditionHandler))
			{
				TerjeCustomConditionHandler customCondition = TerjeCustomConditionHandler.Cast(type.Spawn());
				if (customCondition != null)
				{
					customCondition.ApplyCondition(player, condition);
				}
			}
		}
	}
	
	override string GetText(PlayerBase player, TerjeXmlObject condition)
	{
		string classname;
		if (condition.FindAttribute("classname", classname) && (classname != string.Empty))
		{
			typename type = classname.ToType();
			if (type && type.IsInherited(TerjeCustomConditionHandler))
			{
				TerjeCustomConditionHandler customCondition = TerjeCustomConditionHandler.Cast(type.Spawn());
				if (customCondition != null)
				{
					return customCondition.GetConditionText(player, condition);
				}
			}
		}
		
		return string.Empty;
	}
}
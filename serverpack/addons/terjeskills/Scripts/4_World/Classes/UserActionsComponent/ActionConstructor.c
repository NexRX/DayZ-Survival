modded class ActionConstructor
{
	override void RegisterActions(TTypenameArray actions)
	{
		super.RegisterActions(actions);
		
		actions.Insert(ActionTerjeMaskStash);
		actions.Insert(ActionTerjeReadSkillbook);
	}
}
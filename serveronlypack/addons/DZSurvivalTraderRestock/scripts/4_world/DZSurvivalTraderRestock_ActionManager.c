// DZSurvivalTraderRestock_ActionManager.c
//
// Registers ActionCheckTraderBoard with the game's action system - same
// ActionConstructor.RegisterActions() pattern already proven in
// DZSurvivalFindStone_ActionManager.c (see that file's own comments for why
// this step, on its own, is still not enough to make the action usable).
modded class ActionConstructor
{
	override void RegisterActions(TTypenameArray actions)
	{
		super.RegisterActions(actions);
		actions.Insert(ActionCheckTraderBoard);
	}
};

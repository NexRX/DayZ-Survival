// DZSurvivalFindStone_ActionManager.c
//
// Registers ActionFindStoneOnPath with the game's action system.
//
// Verified against the vanilla script source (server/dta/scripts.pbo,
// 4_World/Classes/UserActionsComponent/ActionConstructor.c): new player
// actions are registered by modding ActionConstructor.RegisterActions(),
// which vanilla's own ActionManagerBase constructor calls to build the
// global action list/name map. ActionManagerBase itself has no
// "CreateActionComponent" method - that was an incorrect assumption in an
// earlier draft of this file and failed to compile
// ("Function 'CreateActionComponent' is marked as override, but there is
// no function with this name in the base class").
modded class ActionConstructor
{
	override void RegisterActions(TTypenameArray actions)
	{
		super.RegisterActions(actions);
		actions.Insert(ActionFindStoneOnPath);
	}
};

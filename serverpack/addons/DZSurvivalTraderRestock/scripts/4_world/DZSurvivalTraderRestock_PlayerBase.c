// DZSurvivalTraderRestock_PlayerBase.c
//
// Self-target actions (HasTarget() == false) are only ever considered if
// also added to PlayerBase's own explicit per-action whitelist (confirmed
// directly in vanilla's server/dta/scripts.pbo, and already the exact same
// lesson this pack learned building DZSurvivalFindStone - see that addon's
// own DZSurvivalFindStone_PlayerBase.c for the full trace). Registering the
// action alone (DZSurvivalTraderRestock_ActionManager.c) is not enough.
modded class PlayerBase
{
	override void SetActions(out TInputActionMap InputActionMap)
	{
		super.SetActions(InputActionMap);
		AddAction(ActionCheckTraderBoard, InputActionMap);
	}
};

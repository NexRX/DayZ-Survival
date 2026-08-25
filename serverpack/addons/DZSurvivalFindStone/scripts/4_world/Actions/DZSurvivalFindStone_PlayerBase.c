// DZSurvivalFindStone_PlayerBase.c
//
// The real, actual reason the "Search for a stone" action never appeared
// in-game at all (confirmed live: zero debug prints from ActionCondition,
// even after standing on a railway for 10+ seconds) - inserting an action
// into ActionConstructor.RegisterActions() (see
// DZSurvivalFindStone_ActionManager.c) only constructs a singleton instance
// and adds it to the *global* action registry
// (ActionManagerBase.m_ActionsArray/m_ActionNameActionMap) - it does NOT by
// itself make the action a candidate on any player. Self-target actions
// (HasTarget() == false) are only ever considered by
// ActionInput.UpdatePossibleActions() -> PlayerBase.GetActions(), which
// returns whatever's in PlayerBase's own m_InputActionMapControled -
// populated exclusively by PlayerBase.SetActions(), a config-free,
// explicit per-action whitelist (confirmed directly in vanilla's own
// server/dta/scripts.pbo, 4_World/Entities/ManBase/PlayerBase.c: every
// self-action, e.g. ActionUncoverHeadSelf, ActionMineBushByHand,
// ActionIgniteFireplaceByAir, is added there one by one via AddAction()).
// Without also appearing in that list, an action is fully constructed,
// valid, and error-free, but the client-side action-discovery system never
// looks at it - it simply never becomes a candidate, so ActionCondition()
// is never even called, regardless of surface, stance, or anything else.
//
// Fixed by modding PlayerBase.SetActions() to add our action the same way
// vanilla does for its own self-actions.
modded class PlayerBase
{
	override void SetActions(out TInputActionMap InputActionMap)
	{
		super.SetActions(InputActionMap);
		AddAction(ActionFindStoneOnPath, InputActionMap);
	}
};

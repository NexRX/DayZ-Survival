// DZSurvivalBaseDecay_Actions.c
//
// Records base-decay activity for the single most common real interaction:
// an owner/guest opening a gate/tent they already know the code for. This
// path never touches the CodeLock object's own state at all (vanilla's
// ActionInteractLockOnFence.OnStartServer / ActionInteractLockOnTent.
// OnStartServer call fence.OpenFence() / tent.ToggleAnimation("entrancec")
// directly - see DZSurvivalBaseDecay_Module.c's header comment for the full
// reasoning, including why hooking OpenFence()/the tent equivalent directly
// was tried and rejected, and why CodeLock's own methods alone would miss
// this).
//
// Each override re-derives the exact same isOwner||isGuest condition the
// vanilla body already checks (rather than relying on any side effect from
// calling super() - the vanilla methods return void and expose no way to
// tell whether the door actually opened), then records activity for that
// specific lock if it matches. If the base's lock isn't currently even
// locked, or the check fails, super() already handled that - this only ever
// adds a side effect on top, never changes behavior.
modded class ActionInteractLockOnFence
{
	override void OnStartServer(ActionData action_data)
	{
		super.OnStartServer(action_data);

		PlayerBase player = action_data.m_Player;
		PlayerIdentity identity = player.GetIdentity();
		Fence fence = Fence.Cast(action_data.m_Target.GetObject());
		if (!fence)
			return;

		CodeLock codelock = CodeLock.Cast(fence.GetCodeLock());
		if (!codelock || !identity)
			return;

		if (codelock.GetLockState() && (codelock.IsOwner(identity.GetId()) || codelock.IsGuest(identity.GetId())))
			DZSurvivalBaseDecay.RecordActivity(codelock);
	}
};

modded class ActionInteractLockOnTent
{
	override void OnStartServer(ActionData action_data)
	{
		super.OnStartServer(action_data);

		PlayerBase player = action_data.m_Player;
		PlayerIdentity identity = player.GetIdentity();
		TentBase tent = TentBase.Cast(action_data.m_Target.GetParent());
		if (!tent)
			return;

		CodeLock codelock = CodeLock.Cast(tent.GetCodeLock());
		if (!codelock || !identity)
			return;

		if (codelock.GetLockState() && (codelock.IsOwner(identity.GetId()) || codelock.IsGuest(identity.GetId())))
			DZSurvivalBaseDecay.RecordActivity(codelock);
	}
};

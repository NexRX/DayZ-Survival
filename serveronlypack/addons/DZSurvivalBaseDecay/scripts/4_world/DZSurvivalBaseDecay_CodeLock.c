// DZSurvivalBaseDecay_CodeLock.c
//
// Hooks CodeLock's own lifecycle/mutation methods for DZSurvivalBaseDecay -
// see DZSurvivalBaseDecay_Module.c's header comment for why these specific
// four methods were chosen (EEInit/EEDelete for the runtime registry,
// LockServer/ServerSetOwner for the activity signals that actually go
// through the CodeLock object itself). The complementary "owner/guest opens
// an already-set gate" activity signal, which never touches CodeLock at
// all, is recorded separately - see DZSurvivalBaseDecay_Actions.c.
modded class CodeLock
{
	override void EEInit()
	{
		super.EEInit();
		DZSurvivalBaseDecay.RegisterLock(this);
	}

	override void EEDelete(EntityAI parent)
	{
		super.EEDelete(parent);
		DZSurvivalBaseDecay.UnregisterLock(this);
	}

	// Initial claim (setting a passcode for the first time) and passcode
	// changes both go through here - clearly real, deliberate activity.
	override void LockServer(ItemBase parent, string passcode)
	{
		super.LockServer(parent, passcode);
		DZSurvivalBaseDecay.RecordActivity(this);
	}

	// Covers a stranger successfully entering the correct passcode and
	// becoming the owner (first claim via passcode entry) or a guest -
	// CodeLockServerRPC.EnterCode() (private, can't be hooked directly)
	// always calls this right before opening, on both the fresh-claim and
	// stranger-becomes-guest paths.
	override void ServerSetOwner(string id)
	{
		super.ServerSetOwner(id);
		DZSurvivalBaseDecay.RecordActivity(this);
	}
};

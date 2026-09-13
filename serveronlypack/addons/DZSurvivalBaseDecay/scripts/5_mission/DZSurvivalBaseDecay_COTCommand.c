// DZSurvivalBaseDecay_COTCommand.c
//
// Adds Community-Online-Tools chat commands for observing/testing base
// decay, mirroring DZSurvivalTraderRestock_COTCommand.c's own pattern (same
// JMModuleBase extension point, same admin-only permission gating - see
// that file's header comment for why this route was chosen over a custom
// GUI panel).
//
// IMPORTANT: this whole addon (DZSurvivalBaseDecay) must be loaded on BOTH
// client and server (it lives in serverpack/, a client+server pack) even
// though its actual decay logic is server-only. COT's permission
// system builds an in-memory tree of every registered permission node, and
// the server sends its tree to each connecting client to compare structure
// (child counts per node) - if a permission is registered only server-side
// (e.g. by a servermod=-only addon the client never loads), the client's
// local tree ends up with fewer children under that node than the server's,
// and COT's JMPermission::OnReceive throws "Received child count N for X
// does not match registered child count M!" while deserializing the role
// sync. This doesn't just fail loudly - it leaves the client's permission
// tree in a broken/partial state, which silently breaks EVERY permission
// check on that client from then on (GetPermissionsManager().HasPermission
// returns false-ish/undefined for things that should be granted), which in
// turn breaks COT's own UI/keybinds entirely (COTModule.SetOpen/ToggleCOT/
// ToggleMenu all gate on HasPermission("COT.View")) while server-side-only
// checks (e.g. chat command permission gating, which runs entirely on the
// server and never needs the client's copy of the tree) keep working fine -
// exactly the confusing split-brain symptom that led to this addon needing
// to live in the shared client+server pack rather than a server-only one.
// Any future addon that registers a COT permission/module MUST be loaded
// on both sides for the same reason - see DZSurvivalBaseDecay_Module.c's
// RegisterLock/UnregisterLock/RecordActivity for how the actual decay
// logic itself is still kept server-only (via GetGame().IsServer() guards)
// despite the script files themselves compiling into the client build too.
//
// Usage in-game (as an admin):
//     /basedecay status   - reports how many locked bases are tracked and
//                            how many days until the closest one decays.
//     /basedecay now       - runs a real decay pass immediately (same logic
//                            as the daily tick), for testing without waiting
//                            up to 24h for the next real tick.
class DZSurvivalBaseDecayModule: JMModuleBase
{
	void DZSurvivalBaseDecayModule()
	{
		GetPermissionsManager().RegisterPermission("Admin.DZSurvivalBaseDecay.Trigger");
	}

	override array<string> GetCommandNames()
	{
		array<string> names = new array<string>();
		names.Insert("basedecay");
		return names;
	}

	override void GetSubCommands(inout array<ref JMCommand> commands)
	{
		AddSubCommand(commands, "status", "Command_BaseDecayStatus", "Admin.DZSurvivalBaseDecay.Trigger");
		AddSubCommand(commands, "now", "Command_BaseDecayNow", "Admin.DZSurvivalBaseDecay.Trigger");
	}

	void Command_BaseDecayStatus(JMCommandParameterList params, PlayerIdentity sender, JMPlayerInstance instance)
	{
		if (!sender)
			return;

		string text = DZSurvivalBaseDecay.BuildStatusText();
		ExpansionNotification("Base Decay", text).Success(sender);
	}

	// Runs server-side (JMCommandModule's OnRPC only ever executes on the
	// server, same as DZSurvivalTraderRestock's own commands) - safe to
	// call DZSurvivalBaseDecay.ForceTick() directly.
	void Command_BaseDecayNow(JMCommandParameterList params, PlayerIdentity sender, JMPlayerInstance instance)
	{
		int decayed = DZSurvivalBaseDecay.ForceTick();

		if (sender)
		{
			GetGame().AdminLog(string.Format("[BaseDecay] Manual decay pass triggered via COT '/basedecay now' by %1 (%2) - %3 base(s) decayed.", sender.GetName(), sender.GetId(), decayed));

			string text;
			if (decayed > 0)
				text = string.Format("Decayed %1 abandoned base(s).", decayed);
			else
				text = "Nothing decayed - every tracked locked base has been active within the last 30 days.";

			ExpansionNotification("Base Decay", text).Success(sender);
		}
	}
};

// Registers the module above with COT's module manager - a separate
// `modded class JMModuleConstructor` from a different addon is safe/
// additive here (DZSurvivalTraderRestock's own COT command file already
// does the same thing from a different PBO, alongside this one).
modded class JMModuleConstructor
{
	override void RegisterModules(out TTypenameArray modules)
	{
		super.RegisterModules(modules);

		modules.Insert(DZSurvivalBaseDecayModule);
	}
};

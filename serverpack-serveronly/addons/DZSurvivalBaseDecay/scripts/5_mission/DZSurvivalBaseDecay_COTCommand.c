// DZSurvivalBaseDecay_COTCommand.c
//
// Adds Community-Online-Tools chat commands for observing/testing base
// decay, mirroring DZSurvivalTraderRestock_COTCommand.c's own pattern (same
// JMModuleBase extension point, same admin-only permission gating - see
// that file's header comment for why this route was chosen over a custom
// GUI panel).
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

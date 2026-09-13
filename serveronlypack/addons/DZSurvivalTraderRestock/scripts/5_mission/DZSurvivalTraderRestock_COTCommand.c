// DZSurvivalTraderRestock_COTCommand.c
//
// Adds a manual-restock trigger reachable from Community-Online-Tools, for
// testing without waiting up to an hour for the next real tick (see
// DZSurvivalTraderRestock_Module.c's Tick()).
//
// COT ships an explicit third-party extension point for exactly this - any
// JMModuleBase can supply extra "/command word" chat commands via
// GetCommandNames()/GetSubCommands() (confirmed real by unpacking COT's own
// scripts.pbo: JMObjectSpawnerModule/JMTeleportModule both use this same
// pattern for their own "/object spawn ...", "/tp ..." commands). This is
// used instead of building a whole new GUI panel/button: a real clickable
// COT panel button requires a hand-authored .layout resource plus a fully
// custom JMRenderableModuleBase+JMFormBase pair wired through its own RPC
// channel - all doable, but a real GUI panel would also mean re-deriving
// COT's own Enfusion layout format from scratch with no visual tool
// available on Linux (DayZ Tools' Workbench is Windows-only). The command
// route reuses JMCommandModule's own already-working client->server RPC
// channel entirely, needs no new networking code, and is gated by COT's own
// permission system exactly like every other admin action - so this is a
// deliberate, permanent design choice, not a placeholder.
//
// Usage in-game (as an admin with the permission below): open chat and type
//     /restock now
// This runs DZSurvivalTraderRestock.ForceTick() immediately, server-side -
// a variant of the real hourly tick that ignores the "wait until the real
// interval has elapsed" and "first time seen" rules (see
// DZSurvivalTraderRestock_Module.c's TickInternal()), since a manual test
// trigger that silently does nothing (which the real Tick() would, for any
// item not yet due) isn't useful for testing - then echoes a real outcome
// (how many items actually got restocked) back to the admin who ran it.
//
// A second subcommand:
//     /restock reset
// runs DZSurvivalTraderRestock.ResetStock() - zeroes out stock for every
// item in every category this addon manages (Helicopters/Cars/Boats by
// default, never any other Market category), then rebaselines each of
// those categories' restock timers back to "now" (same as a freshly-seen
// category). This is a real, permanent stock change intended for
// trader-testing resets - not a preview - so it's gated by the same
// admin-only permission as '/restock now'.
class DZSurvivalTraderRestockModule: JMModuleBase
{
	void DZSurvivalTraderRestockModule()
	{
		// Matches the naming convention of COT's own built-in permissions
		// (e.g. "Admin.Example.Button", "Entity.Spawn.Position") - server
		// admins get every "Admin.*" permission by default under COT's
		// permission system, same as every other admin action already used
		// in-game (teleport, kick, etc.), so no extra permissions.json setup
		// should be needed.
		GetPermissionsManager().RegisterPermission("Admin.DZSurvivalTraderRestock.Trigger");
	}

	override array<string> GetCommandNames()
	{
		array<string> names = new array<string>();
		names.Insert("restock");
		return names;
	}

	override void GetSubCommands(inout array<ref JMCommand> commands)
	{
		AddSubCommand(commands, "now", "Command_RestockNow", "Admin.DZSurvivalTraderRestock.Trigger");
		AddSubCommand(commands, "reset", "Command_RestockReset", "Admin.DZSurvivalTraderRestock.Trigger");
	}

	// Runs server-side (JMCommandModule's OnRPC, which calls this, only ever
	// executes on the server - see JMCommandModule.c's PerformCommand RPC
	// handler) - safe to call DZSurvivalTraderRestock.Tick() directly, same
	// as its own real hourly CallLater.
	void Command_RestockNow(JMCommandParameterList params, PlayerIdentity sender, JMPlayerInstance instance)
	{
		int restocked = DZSurvivalTraderRestock.ForceTick();

		if (sender)
		{
			GetGame().AdminLog(string.Format("[TraderRestock] Manual restock triggered via COT '/restock now' by %1 (%2) - %3 item(s) restocked.", sender.GetName(), sender.GetId(), restocked));

			string text;
			if (restocked > 0)
				text = string.Format("Restocked %1 item(s) - check the board for updated status.", restocked);
			else
				text = "Nothing needed restocking - every scheduled item is already at its cap.";

			ExpansionNotification("Trader Restock", text).Success(sender);
		}
	}

	// Runs server-side, same as Command_RestockNow above. Zeroes out stock
	// for every item in every category this addon manages (see
	// DZSurvivalTraderRestock.ResetStock()'s own comment) - a deliberate,
	// permanent stock change intended for trader-testing resets, not a
	// casual live-server action, hence gated by the same admin-only
	// permission as '/restock now'.
	void Command_RestockReset(JMCommandParameterList params, PlayerIdentity sender, JMPlayerInstance instance)
	{
		int resetCount = DZSurvivalTraderRestock.ResetStock();

		if (sender)
		{
			GetGame().AdminLog(string.Format("[TraderRestock] Manual stock reset triggered via COT '/restock reset' by %1 (%2) - %3 item(s) zeroed out.", sender.GetName(), sender.GetId(), resetCount));

			string text = string.Format("Reset %1 item(s) to 0 stock across every managed category.", resetCount);
			ExpansionNotification("Trader Restock", text).Success(sender);
		}
	}
};

// Registers the module above with COT's module manager - without this,
// GetCommandNames()/GetSubCommands() above are never called (COT only asks
// modules it knows about, via JMCommandConstructor.Generate() iterating
// GetModuleManager().GetAllModules()).
modded class JMModuleConstructor
{
	override void RegisterModules(out TTypenameArray modules)
	{
		super.RegisterModules(modules);

		modules.Insert(DZSurvivalTraderRestockModule);
	}
};

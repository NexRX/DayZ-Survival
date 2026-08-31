// DZSurvivalMapGate_MissionGameplay.c
//
// Goal: pressing the map-toggle hotkey (M by default) should only open the
// fullscreen map if the player has BOTH an ItemMap and a GPS device
// (GPSReceiver) somewhere in their inventory - not either one alone.
//
// Why this needed a real script override instead of a config toggle:
// DayZ-Expansion ships exactly one related setting,
// MapSettings.json's `NeedMapItemForKeyBinding` - but tracing every actual
// use of that field (via armake2-unpacked @DayZ-Expansion-AI script,
// PlayerBase.Expansion_GetPositionKnowledgeType()) showed it only governs
// how precisely a player's OWN position is known to AI/squad systems, not
// whether the map GUI itself opens. Its own description string
// ("Require Map or GPS item to show the map") also confirms it's OR-only
// even where it does apply - there's no shipped setting for "require both".
//
// The real gate for the M-key shortcut turned out to be 100% vanilla
// (unpacked from server/dta/scripts.pbo, NOT part of any Expansion mod):
//   5_Mission/mission/missionGameplay.c
//     if (CfgGameplayHandler.GetMapIgnoreMapOwnership() && ...)
//       if (GetUApi().GetInputByID(UAMapToggle).LocalPress() && ...)
//         HandleMapToggleByKeyboardShortcut(player);
//
// HandleMapToggleByKeyboardShortcut() itself just calls
// UIManager.EnterScriptedMenu(MENU_MAP, null) unconditionally - it never
// checks inventory for a Map or GPS at all. So the vanilla "M opens the
// map" shortcut is only reachable when the mission's cfggameplay.json has
// MapData.ignoreMapOwnership = true (see src/mapAccess.ts, which sets this
// every start) - and once reachable, it was completely ungated. This
// override adds the actual Map+GPS requirement on top, by intercepting the
// same method vanilla calls right before opening the menu.
//
// Note: no access modifier on the override below (vanilla itself declares
// this method `protected`) - matching DZSurvivalFindStone's own
// `override void SetActions(...)`, which likewise never repeats an access
// modifier on a modded-class override.
modded class MissionGameplay
{
	override void HandleMapToggleByKeyboardShortcut(Man player)
	{
		PlayerBase pb = PlayerBase.Cast(player);
		if (pb)
		{
			// @DayZ-Expansion-Core's own Expansion_GetInventoryCount()
			// (modded onto PlayerBase) is inheritance-aware (matches any
			// subclass of ItemMap/GPSReceiver, e.g. any map/GPS variant
			// added by other mods) - both types are already registered for
			// tracking by @DayZ-Expansion-AI's own MissionServer init
			// (Expansion_RegisterInventoryItemType(ItemMap)/(GPSReceiver)).
			bool hasMap = pb.Expansion_GetInventoryCount(ItemMap) > 0;
			bool hasGPS = pb.Expansion_GetInventoryCount(GPSReceiver) > 0;
			if (!hasMap || !hasGPS)
				return;
		}

		super.HandleMapToggleByKeyboardShortcut(player);
	}
};

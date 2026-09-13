// ActionCheckTraderBoard.c
//
// A proximity-based self-action available whenever the player is within
// TRADER_RADIUS meters of the custom trader city (matches traders.ts's
// CUSTOM_POSITION and its CUSTOM_SAFE_ZONE_RADIUS - the same radius as the
// SafeZone added around the trader city) AND there's a real,
// player-placed BOARD_CLASSNAME prop somewhere within BOARD_SCAN_RADIUS
// meters of the player.
//
// Deliberately NOT a look-at/crosshair-target action (CCTObject, tried
// first): confirmed live via the server's own RPT log that
// StaticObj_Furniture_tac_board (dz\structures\furniture\school_equipment\
// tac_board.p3d) has literally no geometry LOD at all ("Warning: No
// components in ...tac_board.p3d:geometry"), same for @BuilderItems'
// visually-identical bldr_tac_board variant - with no geometry, the
// engine's own crosshair-target raycast can never resolve this object, so
// a look-at trigger is structurally impossible for it. Instead, this scans
// for a nearby object of BOARD_CLASSNAME via GetObjectsAtPosition3D()
// (vanilla's own nearby-object query, confirmed via
// ActionCreateGreenhouseGardenPlot.c) - this works regardless of
// collision/geometry since it's a pure position-radius query, not a
// raycast. The player places/moves this prop entirely by hand via
// DayZ-Editor (wherever/however they want it to look), so no exact
// position is hardcoded here - only its classname and a short interaction
// radius.
//
// Shows the current stock/next-restock status for every scheduled category
// (DZSurvivalTraderRestock.BuildBoardStatusText()) as a toast notification
// via DayZ-Expansion-Core's own ExpansionNotification (confirmed real API -
// DayZExpansion_Market itself uses this exact pattern,
// `ExpansionNotification(title, text).Error(identity)`, for its own trader
// error messages).
class ActionCheckTraderBoardCB : ActionSingleUseBaseCB
{
};

class ActionCheckTraderBoard : ActionSingleUseBase
{
	// The real classname of the prop the player places via DayZ-Editor for
	// this - a vanilla decoration mesh (StaticObj_Furniture_tac_board), not
	// something this addon or the CLI spawns.
	protected static const string BOARD_CLASSNAME = "StaticObj_Furniture_tac_board";

	// How close the player needs to stand to their placed board prop for it
	// to count (a real interaction distance, not the trader-wide radius
	// below).
	protected static const float BOARD_SCAN_RADIUS = 3.0;

	// Matches traders.ts's CUSTOM_POSITION/CUSTOM_SAFE_ZONE_RADIUS (the
	// custom trader city's SafeZone) - keep both in sync if this changes.
	protected static const vector TRADER_POSITION = "7991.59 221.09 11312.5";
	protected static const float TRADER_RADIUS = 175.0;

	void ActionCheckTraderBoard()
	{
		m_CallbackClass = ActionCheckTraderBoardCB;
		m_CommandUID = DayZPlayerConstants.CMD_ACTIONMOD_PICKUP_HANDS;
		m_StanceMask = DayZPlayerConstants.STANCEMASK_ERECT | DayZPlayerConstants.STANCEMASK_CROUCH;
		m_Text = "Check Trader Restock Board";
	}

	override void CreateConditionComponents()
	{
		m_ConditionItem = new CCINone;
		m_ConditionTarget = new CCTNone;
	}

	override bool HasTarget()
	{
		return false;
	}

	override bool ActionCondition(PlayerBase player, ActionTarget target, ItemBase item)
	{
		if (!player)
			return false;

		if (vector.DistanceSq(player.GetPosition(), TRADER_POSITION) > TRADER_RADIUS * TRADER_RADIUS)
			return false;

		ref array<Object> nearbyObjects = new array<Object>;
		ref array<CargoBase> proxyCargos = new array<CargoBase>;
		GetGame().GetObjectsAtPosition3D(player.GetPosition(), BOARD_SCAN_RADIUS, nearbyObjects, proxyCargos);

		for (int i = 0; i < nearbyObjects.Count(); i++)
		{
			Object obj = nearbyObjects.Get(i);
			if (obj && obj.GetType() == BOARD_CLASSNAME)
				return true;
		}

		return false;
	}

	// NOT OnExecuteServer(): that hook only fires if the player's animation
	// actually emits a mid-animation "ActionExec" notify event (see
	// AnimatedActionBase.OnAnimationEvent()) - unreliable/never-firing for a
	// no-target self-action on the default CMD_ACTIONMOD_PICKUP_HANDS
	// command (confirmed live: the action ran with no visible effect).
	// OnEndServer() fires unconditionally on every single-use action
	// completion (from AnimatedActionBase.End(), called for both
	// UA_FINISHED and UA_CANCEL) - vanilla's own ActionZoomIn.c (identical
	// shape: ActionSingleUseBase, no target, default command UID) confirms
	// this is the correct/reliable hook for this exact action shape.
	override void OnEndServer(ActionData action_data)
	{
		super.OnEndServer(action_data);

		PlayerBase player = PlayerBase.Cast(action_data.m_Player);
		if (!player || !player.GetIdentity())
			return;

		string statusText = DZSurvivalTraderRestock.BuildBoardStatusText();
		ExpansionNotification("Trader Restock Board", statusText).Info(player.GetIdentity());
	}
};

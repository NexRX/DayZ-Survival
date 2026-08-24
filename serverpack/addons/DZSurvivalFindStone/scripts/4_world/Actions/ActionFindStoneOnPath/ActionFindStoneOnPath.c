// ActionFindStoneOnPath.c
//
// Lets a player search the ground for a loose stone while standing on
// gravel/dirt/rail-ballast surfaces (train tracks, dirt trails, gravel
// roads) - the DayZ-Survival equivalent of dzr_find_bark.pbo's "find bark
// on trees" action, but for stones on paths/tracks.
//
// Design notes:
// - Train tracks and dirt trails are terrain, not placeable Objects, so
//   this can't be an "aim at an object" action (CCTObject) - vanilla
//   objects like that don't exist for terrain. Instead this is a
//   self-targeted action (CCTNone/CCINone, HasTarget() == false), the
//   same pattern vanilla uses for e.g. ActionUncoverHeadSelf.
// - No tool is required - this is meant to be a low-tech, always-available
//   way to gather crafting material, not a shortcut around real tools.
// - Spawns "Stone" (not "SmallStone") on a successful search, since vanilla
//   DayZ already ships a craftable "StoneKnife" (types.xml has it flagged
//   crafted="1"), and "Stone" is the more likely vanilla crafting
//   ingredient for it by naming convention - confirm this in-game via the
//   crafting menu and swap to "SmallStone" below if the recipe actually
//   wants that instead.
// - A short per-player cooldown (in-memory, resets on server restart)
//   stops it from being spammed in place; the search itself takes a few
//   seconds (CAContinuousTime) and isn't guaranteed to succeed.
//
// All class/method/constant names below were cross-checked against the
// real vanilla script source (server/dta/scripts.pbo,
// 4_World/Classes/UserActionsComponent/...), specifically against
// ActionDigWorms.c, ActionMineRock.c and ActionUncoverHeadSelf.c as
// reference "ground/self continuous action" implementations. An earlier
// draft of this file guessed several APIs (m_LoopType/UA_LOOP_DIG,
// CMD_ACTIONFB_DIGWORM, a string-returning SurfaceGetType) that don't
// exist and failed to compile - those are fixed here.
class ActionFindStoneOnPathCB : ActionContinuousBaseCB
{
	override void CreateActionComponent()
	{
		m_ActionData.m_ActionComponent = new CAContinuousTime(3.0); // 3 second search
	}
};

class ActionFindStoneOnPath : ActionContinuousBase
{
	// Substrings matched (case-insensitive) against the surface hashname
	// under the player. DayZ surface classnames vary per map/texture-set
	// (e.g. "np_gravel_02", "ballast", "dirt_dry_a") but reliably contain
	// one of these tokens - adjust this list after testing on your map(s)
	// if a particular path surface isn't being detected.
	protected ref array<string> m_ValidSurfaceTokens = {"gravel", "dirt", "rail", "ballast", "road", "path", "mud"};

	protected float m_SuccessChance = 0.65; // 65% chance per completed search
	protected float m_CooldownSeconds = 45.0; // per-player, resets on restart
	protected ref map<string, float> m_LastSearchTime = new map<string, float>();

	void ActionFindStoneOnPath()
	{
		m_CallbackClass = ActionFindStoneOnPathCB;
		m_CommandUID = DayZPlayerConstants.CMD_ACTIONFB_DIGGIN_WORMS;
		m_StanceMask = DayZPlayerConstants.STANCEMASK_ERECT | DayZPlayerConstants.STANCEMASK_CROUCH;
		m_SpecialtyWeight = UASoftSkillsWeight.PRECISE_LOW;
		m_Text = "Search for a stone";
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
		DebugPing(player);

		if (!player)
			return false;

		if (player.IsUnconscious() || player.IsRestrained() || player.IsSwimming())
			return false;

		if (!IsOnValidSurface(player))
			return false;

		if (IsOnCooldown(player))
			return false;

		return true;
	}

	// TEMPORARY diagnostic - proves whether ActionCondition is even being
	// evaluated by the engine at all, independent of the surface check.
	// Rate-limited to once every 5 seconds per player. Remove once the
	// railway/no-action-shown issue is understood.
	protected void DebugPing(PlayerBase player)
	{
		if (!player)
			return;
		string key = "actioncond_" + GetPlayerKey(player);
		float now = GetGame().GetTickTime();
		float last = 0;
		if (m_LastSearchTime.Contains(key))
			last = m_LastSearchTime.Get(key);
		if (now - last > 5.0)
		{
			m_LastSearchTime.Set(key, now);
			Print("[DZSurvivalFindStone] ActionCondition evaluated for player");
		}
	}

	protected bool IsOnValidSurface(PlayerBase player)
	{
		vector pos = player.GetPosition();
		string surface;
		GetGame().SurfaceGetType(pos[0], pos[2], surface);
		surface.ToLower();

		foreach (string token : m_ValidSurfaceTokens)
		{
			if (surface.IndexOf(token) != -1)
				return true;
		}

		// TEMPORARY diagnostic - logs the real surface name under the player
		// whenever nothing matched, rate-limited to once every 5 seconds per
		// player, so the actual DayZ surface classname (e.g. for railway
		// ballast) shows up in profiles/script.log. Remove once the token
		// list is confirmed correct for all surfaces this addon should
		// support.
		string debugKey = "surfacedebug_" + GetPlayerKey(player);
		float now = GetGame().GetTickTime();
		float last = 0;
		if (m_LastSearchTime.Contains(debugKey))
			last = m_LastSearchTime.Get(debugKey);
		if (now - last > 5.0)
		{
			m_LastSearchTime.Set(debugKey, now);
			Print("[DZSurvivalFindStone] Unmatched surface under player: '" + surface + "'");
		}

		return false;
	}

	protected string GetPlayerKey(PlayerBase player)
	{
		if (player.GetIdentity())
			return player.GetIdentity().GetPlainId();

		return player.ToString(); // offline/dev fallback, not expected in normal play
	}

	protected bool IsOnCooldown(PlayerBase player)
	{
		string key = GetPlayerKey(player);
		if (!m_LastSearchTime.Contains(key))
			return false;

		float last = m_LastSearchTime.Get(key);
		return (GetGame().GetTickTime() - last) < m_CooldownSeconds;
	}

	override void OnFinishProgressServer(ActionData action_data)
	{
		super.OnFinishProgressServer(action_data);

		PlayerBase player = PlayerBase.Cast(action_data.m_Player);
		if (!player)
			return;

		m_LastSearchTime.Set(GetPlayerKey(player), GetGame().GetTickTime());

		if (Math.RandomFloat01() > m_SuccessChance)
			return; // searched, found nothing this time

		ItemBase stone = ItemBase.Cast(player.GetInventory().CreateInInventory("Stone"));
		if (!stone)
		{
			// Inventory full - drop it on the ground at the player's feet instead.
			vector pos = player.GetPosition();
			Object dropped = GetGame().CreateObject("Stone", pos);
		}
	}
};

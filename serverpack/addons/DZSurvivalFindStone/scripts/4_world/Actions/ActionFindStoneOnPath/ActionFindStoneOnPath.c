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
//   objects like that don't exist for terrain. Instead this targets the
//   ground surface directly under the player's crosshair (CCTSurface),
//   the same target-condition component vanilla's ActionDigWorms uses to
//   require the player be looking down at fertile ground - here it's used
//   to require looking down at a valid path/gravel/rail surface instead.
// - No tool is required, but the player's hands must be empty
//   (ActionCondition rejects if `item` is non-null), matching the pattern
//   ActionMineBushByHand uses for its own toolless variant.
// - Spawns "SmallStone" on a successful search (confirmed correct via
//   in-game crafting menu - not the larger "Stone").
// - No cooldown - the 20 second hold time itself is the balancing lever.
//   (A per-player cooldown was tried and removed: ActionCondition() runs
//   independently on both client and server, and only the server's half
//   of any shared state gets updated by OnFinishProgressServer - keeping
//   a cooldown in sync would need mirroring via OnFinishProgressClient
//   too, which added complexity not worth it for a "keep pressing E"
//   design, since it stopped being spammable when it started taking 20s.)
//
// All class/method/constant names below were cross-checked against the
// real vanilla script source (server/dta/scripts.pbo,
// 4_World/Classes/UserActionsComponent/...), specifically against
// ActionDigWorms.c, ActionMineBushByHand.c, ActionCraftBoneKnife.c and
// CCTSurface.c as reference "ground-look continuous action"
// implementations.

// CCTGroundOrObjectSurface
// Same distance-based "is the crosshair resting near the player's own
// feet" check as vanilla's CCTSurface, but WITHOUT CCTSurface's own
// built-in rejection of any target that resolves to a real game Object.
//
// Needed because raised terrain features like railway ballast beds are
// modelled as actual placed Objects with their own collision mesh, not
// raw terrain - CCTSurface silently rejects those (confirmed live: no
// diagnostic prints at all while standing on the stones, meaning
// CCTSurface.Can() was rejecting before our own ActionCondition ever
// ran), while the dirt/gravel at the base of the same rail bed is real
// terrain and worked fine. This class accepts a target that's either
// real terrain or a nearby object's surface, as long as the actual hit
// position is within range of the player's feet - the surface-texture
// check in ActionFindStoneOnPath itself still filters by terrain type
// under that position via SurfaceGetType, so this only widens *where*
// the crosshair is allowed to be resting, not *what* counts as a valid
// surface underneath it.
class CCTGroundOrObjectSurface : CCTBase
{
	protected float m_MaximalActionDistanceSq;

	void CCTGroundOrObjectSurface(float maximal_target_distance = UAMaxDistances.SMALL)
	{
		m_MaximalActionDistanceSq = maximal_target_distance * maximal_target_distance;
	}

	override bool Can(PlayerBase player, ActionTarget target)
	{
		if (!target)
			return false;

		if (GetGame().IsServer() && GetGame().IsMultiplayer())
			return true;

		vector hit_pos = target.GetCursorHitPos();
		if (hit_pos == vector.Zero)
			return false;

		return (vector.DistanceSq(hit_pos, player.GetPosition()) <= m_MaximalActionDistanceSq);
	}
};

class ActionFindStoneOnPathCB : ActionContinuousBaseCB
{
	override void CreateActionComponent()
	{
		m_ActionData.m_ActionComponent = new CAContinuousTime(20.0); // 20 second search
	}
};

class ActionFindStoneOnPath : ActionContinuousBase
{
	// Substrings matched (case-insensitive) against the surface hashname
	// under the player. DayZ surface classnames vary per map/texture-set
	// (e.g. "np_gravel_02", "ballast", "dirt_dry_a") but reliably contain
	// one of these tokens - adjust this list after testing on your map(s)
	// if a particular path surface isn't being detected.
	//
	// Confirmed working: dirt/gravel paths. Confirmed NOT matching: the
	// stony ballast sections of railway tracks - the real surface
	// classname there evidently doesn't contain "rail" or "ballast" as
	// texture-set authors named it something else. TEMPORARY diagnostic
	// logging below (see IsOnValidSurface) will print the real unmatched
	// surface name to profiles/script.log so the right token can be added
	// once known - remove that logging once the railway ballast case is
	// confirmed fixed.
	protected ref array<string> m_ValidSurfaceTokens = {"gravel", "dirt", "rail", "ballast", "road", "path", "mud", "stone", "rock", "sleeper", "track"};

	protected float m_SuccessChance = 0.65; // 65% chance per completed search
	protected float m_LastDebugLogTime = 0; // TEMPORARY - throttles the diagnostic print below

	void ActionFindStoneOnPath()
	{
		m_CallbackClass = ActionFindStoneOnPathCB;
		// CMD_ACTIONFB_DIGGIN_WORMS was tried first but instantly self-cancelled -
		// that animation command is only ever used by the real ActionDigWorms,
		// which is target-based (aims at an actual worm-hole object) and is
		// almost certainly gated at the engine level on that context. Switched
		// to CMD_ACTIONFB_CRAFTING, the same command real vanilla uses for
		// ActionCraftBoneKnife - a genuine no-target, no-tool-required,
		// continuous self-action, which is exactly this action's shape.
		m_CommandUID = DayZPlayerConstants.CMD_ACTIONFB_CRAFTING;
		m_FullBody = true;
		m_StanceMask = DayZPlayerConstants.STANCEMASK_ERECT | DayZPlayerConstants.STANCEMASK_CROUCH;
		m_SpecialtyWeight = UASoftSkillsWeight.PRECISE_LOW;
		m_Text = "Search for a stone";
	}

	override void CreateConditionComponents()
	{
		m_ConditionItem = new CCINone;
		// See CCTGroundOrObjectSurface above - CCTSurface (vanilla's version
		// of this) rejects any crosshair hit that resolves to a real Object,
		// which silently broke this action while standing on railway ballast
		// (a raised, collidable prop, not raw terrain).
		m_ConditionTarget = new CCTGroundOrObjectSurface(UAMaxDistances.SMALL);
	}

	override bool HasTarget()
	{
		return true;
	}

	override bool ActionCondition(PlayerBase player, ActionTarget target, ItemBase item)
	{
		if (!player)
			return false;

		// Hands must be empty - this is meant to be a low-tech, always
		// available way to gather crafting material, not a tool shortcut.
		if (item)
			return false;

		if (player.IsUnconscious() || player.IsRestrained() || player.IsSwimming())
			return false;

		if (!IsOnValidSurface(target))
			return false;

		return true;
	}

	protected bool IsOnValidSurface(ActionTarget target)
	{
		if (!target)
			return false;

		vector pos = target.GetCursorHitPos();
		string surface;
		GetGame().SurfaceGetType(pos[0], pos[2], surface);
		surface.ToLower();

		foreach (string token : m_ValidSurfaceTokens)
		{
			if (surface.IndexOf(token) != -1)
				return true;
		}

		// TEMPORARY diagnostic - logs the real surface name under the
		// player's crosshair whenever nothing matched, so the actual
		// classname for railway ballast (or any other unrecognised
		// surface) shows up in profiles/script.log. Rate-limited to once
		// every 3 seconds since this runs every frame while the crosshair
		// rests on an unmatched surface. Remove once the token list is
		// confirmed correct for every surface this addon should support.
		float now = GetGame().GetTickTime();
		if (now - m_LastDebugLogTime > 3.0)
		{
			m_LastDebugLogTime = now;
			Print("[DZSurvivalFindStone] Unmatched surface under crosshair: '" + surface + "'");
		}

		return false;
	}

	override void OnFinishProgressServer(ActionData action_data)
	{
		super.OnFinishProgressServer(action_data);

		PlayerBase player = PlayerBase.Cast(action_data.m_Player);
		if (!player)
			return;

		if (Math.RandomFloat01() > m_SuccessChance)
			return; // searched, found nothing this time

		ItemBase stone = ItemBase.Cast(player.GetInventory().CreateInInventory("SmallStone"));
		if (!stone)
		{
			// Inventory full - drop it on the ground at the player's feet instead.
			vector pos = player.GetPosition();
			Object dropped = GetGame().CreateObject("SmallStone", pos);
		}
	}
};

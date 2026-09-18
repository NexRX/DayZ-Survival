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
	protected ref array<string> m_ValidSurfaceTokens = {"gravel", "rail", "trail", "rock"};

	protected float m_SuccessChance = 0.65; // 65% chance per completed search
	protected float m_LastDebugLogTime = 0; // TEMPORARY - throttles the diagnostic print below

	void ActionFindStoneOnPath()
	{
		m_CallbackClass = ActionFindStoneOnPathCB;
		m_CommandUID = DayZPlayerConstants.CMD_ACTIONFB_CRAFTING;
		m_FullBody = true;
		m_StanceMask = DayZPlayerConstants.STANCEMASK_ERECT | DayZPlayerConstants.STANCEMASK_CROUCH;
		m_SpecialtyWeight = UASoftSkillsWeight.PRECISE_LOW;
		m_Text = "Search for a stone";
	}

	override void CreateConditionComponents()
	{
		m_ConditionItem = new CCINone;
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
			vector pos = player.GetPosition();
			Object dropped = GetGame().CreateObject("SmallStone", pos);
		}
	}
};

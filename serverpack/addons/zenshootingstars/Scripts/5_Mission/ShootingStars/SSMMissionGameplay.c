modded class MissionGameplay
{
	protected ref array<ref SSM_ShootingStarEffect> m_SSM_ActiveEffects;
	protected bool m_SSM_RPCRegistered;

	override void OnInit()
	{
		super.OnInit();

		if (!m_SSM_ActiveEffects)
			m_SSM_ActiveEffects = new array<ref SSM_ShootingStarEffect>;

		SSM_RegisterRPC();
	}

	override void OnMissionFinish()
	{
		SSM_UnregisterRPC();
		SSM_ClearEffects();
		super.OnMissionFinish();
	}

	override void OnUpdate(float timeslice)
	{
		super.OnUpdate(timeslice);

		if (!m_SSM_ActiveEffects)
			return;

		for (int i = m_SSM_ActiveEffects.Count() - 1; i >= 0; i--)
		{
			SSM_ShootingStarEffect effect = m_SSM_ActiveEffects[i];

			if (!effect || !effect.Update(timeslice))
				m_SSM_ActiveEffects.Remove(i);
		}
	}

	protected void SSM_RegisterRPC()
	{
		if (m_SSM_RPCRegistered)
			return;

		DayZGame dayZGame = DayZGame.Cast(g_Game);

		if (!dayZGame)
			return;

		dayZGame.Event_OnRPC.Insert(SSM_OnRPC);
		m_SSM_RPCRegistered = true;
	}

	protected void SSM_UnregisterRPC()
	{
		if (!m_SSM_RPCRegistered)
			return;

		DayZGame dayZGame = DayZGame.Cast(g_Game);

		if (dayZGame)
			dayZGame.Event_OnRPC.Remove(SSM_OnRPC);

		m_SSM_RPCRegistered = false;
	}

	protected void SSM_OnRPC(PlayerIdentity sender, Object target, int rpcType, ParamsReadContext ctx)
	{
		if (rpcType != SSMConstants.RPC_SHOOTING_STAR)
			return;

		float startYaw;
		float startPitch;
		float endYaw;
		float endPitch;
		float duration;

		if (!ctx.Read(startYaw))
			return;

		if (!ctx.Read(startPitch))
			return;

		if (!ctx.Read(endYaw))
			return;

		if (!ctx.Read(endPitch))
			return;

		if (!ctx.Read(duration))
			return;

		SSM_StartShootingStar(startYaw, startPitch, endYaw, endPitch, duration);
	}

	protected void SSM_StartShootingStar(float startYaw, float startPitch, float endYaw, float endPitch, float duration)
	{
		vector startDirection = Vector(startYaw, startPitch, 0.0).AnglesToVector();
		vector endDirection = Vector(endYaw, endPitch, 0.0).AnglesToVector();

		SSM_ShootingStarEffect effect = new SSM_ShootingStarEffect(startDirection, endDirection, duration);

		if (!effect.IsValid())
			return;

		m_SSM_ActiveEffects.Insert(effect);
	}

	protected void SSM_ClearEffects()
	{
		if (!m_SSM_ActiveEffects)
			return;

		m_SSM_ActiveEffects.Clear();
	}
};

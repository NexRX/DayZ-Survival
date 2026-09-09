modded class MissionServer
{
	protected bool m_SSM_SchedulerStarted;
	protected bool m_SSM_HadDarkPeriod;
	protected float m_SSM_RadiantYaw;
	protected float m_SSM_RadiantPitch;

	override void OnInit()
	{
		super.OnInit();

		if (m_SSM_SchedulerStarted)
			return;

		#ifdef ZenModPack
		if (!ZenModEnabled("ZenShootingStars"))
			return;
		#endif

		m_SSM_SchedulerStarted = true;
		SSM_ScheduleNextCheck(SSMConstants.TEST_INTERVAL_MS);
	}

	void ~MissionServer()
	{
		if (g_Game)
			g_Game.GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(SSM_TryShootingStar);
	}

	protected void SSM_TryShootingStar()
	{
		if (!SSM_IsDarkEnough())
		{
			m_SSM_HadDarkPeriod = false;

			if (SSMConstants.TEST_MODE)
				SSM_ScheduleNextCheck(SSMConstants.TEST_INTERVAL_MS);
			else
				SSM_ScheduleNextCheck(SSMConstants.NIGHT_RECHECK_MS);

			return;
		}

		if (!m_SSM_HadDarkPeriod)
		{
			SSM_CreateNightlyRadiant();
			m_SSM_HadDarkPeriod = true;
		}

		SSM_BroadcastShootingStar();
		SSM_ScheduleNextShootingStar();
	}

	protected bool SSM_IsDarkEnough()
	{
		if (SSMConstants.TEST_MODE && SSMConstants.TEST_IGNORE_DARKNESS)
			return true;

		if (!g_Game)
			return false;

		World world = g_Game.GetWorld();

		if (!world)
			return false;

		if (!world.IsNight())
			return false;

		if (world.GetSunOrMoon() < SSMConstants.DARKNESS_THRESHOLD)
			return false;

		Weather weather = g_Game.GetWeather();

		if (!weather)
			return false;

		if (weather.GetOvercast().GetActual() > 0.30)
			return false;

		return true;
	}

	protected void SSM_ScheduleNextShootingStar()
	{
		int delayMs;

		if (SSMConstants.TEST_MODE)
			delayMs = SSMConstants.TEST_INTERVAL_MS;
		else
			delayMs = Math.RandomIntInclusive(SSMConstants.MIN_INTERVAL_MS, SSMConstants.MAX_INTERVAL_MS);

		SSM_ScheduleNextCheck(delayMs);
	}

	protected void SSM_ScheduleNextCheck(int delayMs)
	{
		g_Game.GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(SSM_TryShootingStar, delayMs, false);
	}

	protected void SSM_CreateNightlyRadiant()
	{
		m_SSM_RadiantYaw = Math.RandomFloatInclusive(0.0, 360.0);
		m_SSM_RadiantPitch = Math.RandomFloatInclusive(SSMConstants.NIGHTLY_RADIANT_MIN_PITCH, SSMConstants.NIGHTLY_RADIANT_MAX_PITCH);
	}

	protected void SSM_BroadcastShootingStar()
	{
		float startYaw;
		float startPitch;
		float endYaw;
		float endPitch;
		float duration = Math.RandomFloatInclusive(SSMConstants.MIN_DURATION, SSMConstants.MAX_DURATION);

		if (Math.RandomFloatInclusive(0.0, 1.0) < SSMConstants.SPORADIC_METEOR_CHANCE)
			SSM_GenerateRandomMeteor(startYaw, startPitch, endYaw, endPitch);
		else
			SSM_GenerateRadiantMeteor(startYaw, startPitch, endYaw, endPitch);

		array<Man> players = new array<Man>;
		g_Game.GetPlayers(players);

		foreach (Man man : players)
		{
			PlayerBase player = PlayerBase.Cast(man);

			if (!player)
				continue;

			PlayerIdentity identity = player.GetIdentity();

			if (!identity)
				continue;

			ScriptRPC rpc = new ScriptRPC();
			rpc.Write(startYaw);
			rpc.Write(startPitch);
			rpc.Write(endYaw);
			rpc.Write(endPitch);
			rpc.Write(duration);
			rpc.Send(null, SSMConstants.RPC_SHOOTING_STAR, true, identity);
		}
	}

	protected void SSM_GenerateRandomMeteor(out float startYaw, out float startPitch, out float endYaw, out float endPitch)
	{
		float yawTravel = Math.RandomFloatInclusive(SSMConstants.MIN_TRAVEL_YAW, SSMConstants.MAX_TRAVEL_YAW);

		startYaw = Math.RandomFloatInclusive(0.0, 360.0);
		startPitch = Math.RandomFloatInclusive(SSMConstants.MIN_START_PITCH, SSMConstants.MAX_START_PITCH);

		if (Math.RandomIntInclusive(0, 1) == 0)
			yawTravel = -yawTravel;

		endYaw = SSM_WrapYaw(startYaw + yawTravel);
		endPitch = SSM_ClampEndPitch(startPitch + Math.RandomFloatInclusive(-SSMConstants.MAX_TRAVEL_PITCH, SSMConstants.MAX_TRAVEL_PITCH));
	}

	protected void SSM_GenerateRadiantMeteor(out float startYaw, out float startPitch, out float endYaw, out float endPitch)
	{
		for (int attempt = 0; attempt < SSMConstants.RADIANT_GENERATION_ATTEMPTS; attempt++)
		{
			float yawOffset = Math.RandomFloatInclusive(SSMConstants.RADIANT_MIN_START_YAW_OFFSET, SSMConstants.RADIANT_MAX_START_YAW_OFFSET);
			float pitchOffset = Math.RandomFloatInclusive(SSMConstants.RADIANT_MIN_START_PITCH_OFFSET, SSMConstants.RADIANT_MAX_START_PITCH_OFFSET);

			if (Math.RandomIntInclusive(0, 1) == 0)
				yawOffset = -yawOffset;

			startYaw = SSM_WrapYaw(m_SSM_RadiantYaw + yawOffset);
			startPitch = SSM_ClampStartPitch(m_SSM_RadiantPitch + pitchOffset);

			if (SSM_CalculateRadiantTrajectory(startYaw, startPitch, endYaw, endPitch))
				return;
		}

		SSM_GenerateRandomMeteor(startYaw, startPitch, endYaw, endPitch);
	}

	protected bool SSM_CalculateRadiantTrajectory(float startYaw, float startPitch, out float endYaw, out float endPitch)
	{
		vector radiantDirection = Vector(m_SSM_RadiantYaw, m_SSM_RadiantPitch, 0.0).AnglesToVector().Normalized();
		vector startDirection = Vector(startYaw, startPitch, 0.0).AnglesToVector().Normalized();

		float radiantDotStart = vector.Dot(radiantDirection, startDirection);

		// Project the direction pointing away from the radiant onto the tangent
		// plane at the meteor's starting position.
		vector awayTangent = (startDirection * radiantDotStart) - radiantDirection;

		if (awayTangent.Length() < 0.001)
			return false;

		awayTangent = awayTangent.Normalized();

		float travelAngle = Math.RandomFloatInclusive(SSMConstants.RADIANT_MIN_TRAVEL_ANGLE, SSMConstants.RADIANT_MAX_TRAVEL_ANGLE);
		float travelRadians = travelAngle * Math.DEG2RAD;

		// Advance around the celestial sphere along the great circle which
		// leads directly away from the radiant.
		vector endDirection = (startDirection * Math.Cos(travelRadians)) + (awayTangent * Math.Sin(travelRadians));
		endDirection = endDirection.Normalized();

		vector endAngles = endDirection.VectorToAngles();

		endYaw = SSM_WrapYaw(endAngles[0]);
		endPitch = endAngles[1];

		if (endPitch < SSMConstants.MIN_END_PITCH)
			return false;

		if (endPitch > SSMConstants.MAX_END_PITCH)
			return false;

		return true;
	}

	protected float SSM_WrapYaw(float yaw)
	{
		while (yaw < 0.0)
			yaw = yaw + 360.0;

		while (yaw >= 360.0)
			yaw = yaw - 360.0;

		return yaw;
	}

	protected float SSM_ClampStartPitch(float pitch)
	{
		if (pitch < SSMConstants.MIN_START_PITCH)
			pitch = SSMConstants.MIN_START_PITCH;

		if (pitch > SSMConstants.MAX_START_PITCH)
			pitch = SSMConstants.MAX_START_PITCH;

		return pitch;
	}

	protected float SSM_ClampEndPitch(float pitch)
	{
		if (pitch < SSMConstants.MIN_END_PITCH)
			pitch = SSMConstants.MIN_END_PITCH;

		if (pitch > SSMConstants.MAX_END_PITCH)
			pitch = SSMConstants.MAX_END_PITCH;

		return pitch;
	}
};

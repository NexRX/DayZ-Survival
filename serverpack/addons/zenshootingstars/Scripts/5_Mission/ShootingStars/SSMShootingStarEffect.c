class SSM_ShootingStarEffect
{
	protected ParticleSource m_SSM_Particle;
	protected vector m_SSM_StartDirection;
	protected vector m_SSM_EndDirection;
	protected float m_SSM_Duration;
	protected float m_SSM_Elapsed;

	void SSM_ShootingStarEffect(vector startDirection, vector endDirection, float duration)
	{
		m_SSM_StartDirection = startDirection.Normalized();
		m_SSM_EndDirection = endDirection.Normalized();
		m_SSM_Duration = duration;
		m_SSM_Elapsed = 0.0;

		ParticleManager particleManager = ParticleManager.GetInstance();

		if (!particleManager)
			return;

		vector startPosition = g_Game.GetCurrentCameraPosition() + (m_SSM_StartDirection * SSMConstants.SKY_DISTANCE);
		m_SSM_Particle = particleManager.CreateParticle(ParticleList.SSM_SHOOTING_STAR, startPosition, true, null, vector.Zero, false, this);
	}

	void ~SSM_ShootingStarEffect()
	{
		if (m_SSM_Particle)
			m_SSM_Particle.StopParticle();

		m_SSM_Particle = null;
	}

	bool IsValid()
	{
		return m_SSM_Particle != null;
	}

	bool Update(float timeslice)
	{
		if (!m_SSM_Particle)
			return false;

		m_SSM_Elapsed = m_SSM_Elapsed + timeslice;

		float progress = m_SSM_Elapsed / m_SSM_Duration;

		if (progress >= 1.0)
		{
			vector endPosition = g_Game.GetCurrentCameraPosition() + (m_SSM_EndDirection * SSMConstants.SKY_DISTANCE);
			m_SSM_Particle.SetPosition(endPosition);
			m_SSM_Particle.StopParticle();
			m_SSM_Particle = null;
			return false;
		}

		vector currentDirection = vector.Lerp(m_SSM_StartDirection, m_SSM_EndDirection, progress).Normalized();
		vector currentPosition = g_Game.GetCurrentCameraPosition() + (currentDirection * SSMConstants.SKY_DISTANCE);

		m_SSM_Particle.SetPosition(currentPosition);
		return true;
	}
};

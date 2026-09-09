class IH_Fireflies extends IH_ConfigurableLightEntityBase
{
	Particle m_FireflyEmitter;

	static int FIREFLY_MOTES_PARTICLE = ParticleList.RegisterParticle("IronhordeLighting/graphics/Particles/", "IH_FireflyMotes");

	void IH_Fireflies()
	{
		RegisterConfigurableLight();

		if (IH_ShouldCreateClientLighting() && !IH_IsDayZEditorPreviewObject())
			m_FireflyEmitter = Particle.PlayOnObject(FIREFLY_MOTES_PARTICLE, this, Vector(0, 0.0, 0), Vector(0, 0, 0), true);
	}

	override bool DisableVicinityIcon()
	{
		return true;
	}

	override bool CanReleaseAttachment(EntityAI attachment)
	{
		return false;
	}

	override bool IsInventoryVisible()
	{
		return false;
	}

	override void EEDelete(EntityAI parent)
	{
		if (m_FireflyEmitter)
			m_FireflyEmitter.Stop();

		m_FireflyEmitter = NULL;
		super.EEDelete(parent);
	}
}

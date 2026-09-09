class IH_Decorative_GasLamp extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;
	Particle m_GasLampFlameEmitter;

	static int GAS_LAMP_FLAME_PARTICLE = ParticleList.RegisterParticle("IronhordeLighting/graphics/Particles/", "IH_GasLamp_WickGlow");

	void IH_Decorative_GasLamp()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();

		if (IH_ShouldCreateClientLighting() && !IH_IsDayZEditorPreviewObject())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(SpawnGasLampFlame, 1, false);
	}

	void SpawnGasLampFlame()
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject() || m_GasLampFlameEmitter)
			return;

		m_GasLampFlameEmitter = Particle.PlayOnObject(GAS_LAMP_FLAME_PARTICLE, this, GetMemoryPointPos("light"), Vector(0, 0, 0), true);
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		lightSettings.flarevisible = false;
		lightSettings.flickerspeed = 0.0740667;
		lightSettings.flickeramplitude = 0.05;
		lightSettings.shadowspeed = 0.0370333;
		lightSettings.shadowamplitude = 0.02;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);

		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
			return;

		m_PointLamp.AttachOnObject(this, "0.0 0.1 0.0");
		m_PointLamp.ConfigureFromSettings(lightSettings);
	}

	void ClearPointLamp()
	{
		if (m_PointLamp)
			m_PointLamp.Destroy();

		m_PointLamp = NULL;
	}

	override void EEDelete(EntityAI parent)
	{
		if (GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(SpawnGasLampFlame);

		ClearPointLamp();
		if (m_GasLampFlameEmitter)
			m_GasLampFlameEmitter.Stop();

		m_GasLampFlameEmitter = NULL;
		super.EEDelete(parent);
	}
}

class GasLamp extends IH_Decorative_GasLamp
{
}

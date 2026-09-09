class IH_Decorative_Walltorch_01 extends IH_CandleEffectsBase
{
	static int WALLTORCH_FLAME_PARTICLE = ParticleList.RegisterParticle("IronhordeLighting/graphics/Particles/", "IH_Walltorch_Flame");
	static const float SHADOW_FILL_BRIGHTNESS_SCALE = 0.25;
	IH_PointLightObject m_ShadowFillLamp;

	void IH_Decorative_Walltorch_01()
	{
		InitializeCandleEffects(true);
	}

	vector GetDecorativeWalltorchBasketPosition()
	{
		return Vector(0.0, 0.13, 0.54);
	}

	override void SpawnCandleFlame()
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject() || m_CandleFlameEmitter)
			return;

		m_CandleFlameEmitter = Particle.PlayOnObject(WALLTORCH_FLAME_PARTICLE, this, GetCandleFlamePosition(), Vector(0, 0, 0), true);
	}

	override vector GetCandleFlamePosition()
	{
		return GetDecorativeWalltorchBasketPosition() + Vector(0.0, 0.0, 0.10);
	}

	override vector GetCandleLightPosition()
	{
		return GetDecorativeWalltorchBasketPosition();
	}

	override void RefreshConfiguredLight()
	{
		ClearWalltorchShadowFill();
		super.RefreshConfiguredLight();

		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject() || !m_PointLamp)
			return;

		IH_LightConfigEntry fillSettings = IH_CreatePointDefaults(GetType(), 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		fillSettings.flarevisible = false;
		fillSettings.flickerspeed = 2.0;
		fillSettings.flickeramplitude = 0.05;
		fillSettings.shadowspeed = 1.0;
		fillSettings.shadowamplitude = 0.02;
		fillSettings = IH_LightingConfig.ResolveDefaults(fillSettings);

		fillSettings.lightbrightness = fillSettings.lightbrightness * SHADOW_FILL_BRIGHTNESS_SCALE;
		fillSettings.ambientred = fillSettings.ambientred * SHADOW_FILL_BRIGHTNESS_SCALE;
		fillSettings.ambientgreen = fillSettings.ambientgreen * SHADOW_FILL_BRIGHTNESS_SCALE;
		fillSettings.ambientblue = fillSettings.ambientblue * SHADOW_FILL_BRIGHTNESS_SCALE;
		fillSettings.castshadow = false;
		fillSettings.flarevisible = false;
		fillSettings.shadowspeed = 0.0;
		fillSettings.shadowamplitude = 0.0;

		m_ShadowFillLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_ShadowFillLamp)
			return;

		m_ShadowFillLamp.AttachOnObject(this, GetCandleLightPosition());
		m_ShadowFillLamp.ConfigureFromSettings(fillSettings);
	}

	void ClearWalltorchShadowFill()
	{
		if (m_ShadowFillLamp)
			m_ShadowFillLamp.Destroy();

		m_ShadowFillLamp = NULL;
	}

	override float GetCandleShadowAmplitudeScale()
	{
		return 0.5;
	}

	override float GetCandleShadowSpeedScale()
	{
		return 0.25;
	}

	override void EEDelete(EntityAI parent)
	{
		ClearWalltorchShadowFill();
		super.EEDelete(parent);
	}
}

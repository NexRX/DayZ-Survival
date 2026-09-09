
class IH_CandleEffectsBase extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;
	Particle m_CandleFlameEmitter;

	static int CANDLE_FLAME_PARTICLE = ParticleList.RegisterParticle("IronhordeLighting/graphics/Particles/", "IH_Candle_WickGlow");
	static const float CANDLE_MOVEMENT_SPEED_SCALE = 0.3333333;

	void InitializeCandleEffects(bool deferClientEffects = false)
	{
		RegisterConfigurableLight();

		if (deferClientEffects && IH_ShouldCreateClientLighting() && !IH_IsDayZEditorPreviewObject())
		{
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(InitializeDeferredCandleEffects, 1, false);
			return;
		}

		RefreshConfiguredLight();
		SpawnCandleFlame();
	}

	void InitializeDeferredCandleEffects()
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		RefreshConfiguredLight();
		SpawnCandleFlame();
	}

	void SpawnCandleFlame()
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject() || m_CandleFlameEmitter)
			return;

		m_CandleFlameEmitter = Particle.PlayOnObject(CANDLE_FLAME_PARTICLE, this, GetCandleFlamePosition(), Vector(0, 0, 0), true);
	}

	vector GetCandleFlamePosition()
	{
		return Vector(0, 0.1, 0);
	}

	vector GetCandleLightPosition()
	{
		return Vector(0, 0.85, 0);
	}

	float GetCandleShadowAmplitudeScale()
	{
		return 1.0;
	}

	float GetCandleShadowSpeedScale()
	{
		return 1.0;
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		lightSettings.flarevisible = false;
		lightSettings.flickerspeed = 2.0;
		lightSettings.flickeramplitude = 0.05;
		lightSettings.shadowspeed = 1.0;
		lightSettings.shadowamplitude = 0.02;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);

		lightSettings.flickerspeed = lightSettings.flickerspeed * CANDLE_MOVEMENT_SPEED_SCALE;
		lightSettings.shadowspeed = lightSettings.shadowspeed * CANDLE_MOVEMENT_SPEED_SCALE * GetCandleShadowSpeedScale();
		lightSettings.shadowamplitude = lightSettings.shadowamplitude * GetCandleShadowAmplitudeScale();

		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
			return;

		m_PointLamp.AttachOnObject(this, GetCandleLightPosition());
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
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(InitializeDeferredCandleEffects);

		ClearPointLamp();
		if (m_CandleFlameEmitter)
			m_CandleFlameEmitter.Stop();

		m_CandleFlameEmitter = NULL;
		super.EEDelete(parent);
	}

}

class IH_Candle extends IH_CandleEffectsBase
{
	void IH_Candle()
	{
		InitializeCandleEffects();
	}
}

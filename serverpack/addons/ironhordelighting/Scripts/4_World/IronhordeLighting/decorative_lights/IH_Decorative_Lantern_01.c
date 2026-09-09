class IH_Decorative_Lantern_01 extends IH_CandleEffectsBase
{
	static const float SIDE_LIGHT_BRIGHTNESS_SCALE = 0.20;
	static const float SIDE_LIGHT_RADIUS_SCALE = 0.50;
	IH_PointLightObject m_LeftSidePointLamp;
	IH_PointLightObject m_RightSidePointLamp;

	void IH_Decorative_Lantern_01()
	{
		InitializeCandleEffects(true);
	}

	vector GetDecorativeLanternLightReferencePosition()
	{
		return GetMemoryPointPos("light_pos");
	}

	override void SpawnCandleFlame()
	{
	}

	vector GetDecorativeLanternExteriorLightPosition()
	{
		return GetDecorativeLanternLightReferencePosition() + Vector(0.0, 0.50, 0.0);
	}

	vector GetDecorativeLanternLeftSideLightPosition()
	{
		return GetDecorativeLanternLightReferencePosition() + Vector(-0.16, 0.03, 0.0);
	}

	vector GetDecorativeLanternRightSideLightPosition()
	{
		return GetDecorativeLanternLightReferencePosition() + Vector(0.16, 0.03, 0.0);
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		ClearDecorativeLanternSideLights();

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
		lightSettings.shadowspeed = lightSettings.shadowspeed * CANDLE_MOVEMENT_SPEED_SCALE;

		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
			return;

		m_PointLamp.AttachOnObject(this, GetDecorativeLanternExteriorLightPosition());
		m_PointLamp.ConfigureFromSettings(lightSettings);

		lightSettings.lightbrightness = lightSettings.lightbrightness * SIDE_LIGHT_BRIGHTNESS_SCALE;
		lightSettings.beamlengthradius = lightSettings.beamlengthradius * SIDE_LIGHT_RADIUS_SCALE;
		lightSettings.fadeoutradius = lightSettings.fadeoutradius * SIDE_LIGHT_RADIUS_SCALE;
		lightSettings.ambientred = lightSettings.ambientred * SIDE_LIGHT_BRIGHTNESS_SCALE;
		lightSettings.ambientgreen = lightSettings.ambientgreen * SIDE_LIGHT_BRIGHTNESS_SCALE;
		lightSettings.ambientblue = lightSettings.ambientblue * SIDE_LIGHT_BRIGHTNESS_SCALE;
		lightSettings.castshadow = false;

		m_LeftSidePointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (m_LeftSidePointLamp)
		{
			m_LeftSidePointLamp.AttachOnObject(this, GetDecorativeLanternLeftSideLightPosition());
			m_LeftSidePointLamp.ConfigureFromSettings(lightSettings);
		}

		m_RightSidePointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (m_RightSidePointLamp)
		{
			m_RightSidePointLamp.AttachOnObject(this, GetDecorativeLanternRightSideLightPosition());
			m_RightSidePointLamp.ConfigureFromSettings(lightSettings);
		}
	}

	void ClearDecorativeLanternSideLights()
	{
		if (m_LeftSidePointLamp)
			m_LeftSidePointLamp.Destroy();
		if (m_RightSidePointLamp)
			m_RightSidePointLamp.Destroy();

		m_LeftSidePointLamp = NULL;
		m_RightSidePointLamp = NULL;
	}

	override void EEDelete(EntityAI parent)
	{
		ClearDecorativeLanternSideLights();
		super.EEDelete(parent);
	}
}

class IH_Decorative_LuxuryLamp extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_LuxuryLampPointLight;

	void IH_Decorative_LuxuryLamp()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();

#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZMinus180();
#endif
	}

	override void RefreshConfiguredLight()
	{
		ClearLuxuryLampPointLight();
		SpawnLuxuryLampPointLight(2.6667, 0.0533, 3.6667);
	}

	void SpawnLuxuryLampPointLight(float lightRadius, float lightBrightness, float fadeRadius)
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), 255, 200, 128, 0.8, lightBrightness, lightRadius, fadeRadius, 1.0, 0.9, 0.8);
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		m_LuxuryLampPointLight = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_LuxuryLampPointLight)
			return;

		m_LuxuryLampPointLight.AttachOnObject(this, "0.0 0.125 0.0");
		m_LuxuryLampPointLight.ConfigureFromSettings(lightSettings);
	}

	void ClearLuxuryLampPointLight()
	{
		if (m_LuxuryLampPointLight)
			m_LuxuryLampPointLight.Destroy();

		m_LuxuryLampPointLight = NULL;
	}

	override void EEDelete(EntityAI parent)
	{
		ClearLuxuryLampPointLight();
		super.EEDelete(parent);
	}
}

class LuxuryLamp extends IH_Decorative_LuxuryLamp
{
}

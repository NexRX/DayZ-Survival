class IH_Heat_Campfire extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;
	Particle m_FireEmitter;
	Particle m_SmokeEmitter;
	protected EffectSound m_FireLoopSound;

	static int CAMPFIRE_FIRE_CORE = ParticleList.RegisterParticle("IronhordeLighting/graphics/Particles/", "IH_CorpsePyre_Core");

	protected ref UniversalTemperatureSource m_HeatSource;
	protected ref UniversalTemperatureSourceSettings m_HeatSourceSettings;
	protected ref UniversalTemperatureSourceLambdaFireplace m_FireplaceHeatProfile;

	const float HEAT_RADIUS_METERS = 3.0;
	const float SMALL_FIRE_TEMP_CELSIUS = 150;
	const float NORMAL_FIRE_TEMP_CELSIUS = 1000;
	const float FULL_HEAT_RADIUS_METERS = 3.0;
	const float MAX_TRANSFER_TEMP_CELSIUS = 25;

	void IH_Heat_Campfire()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();

		if (!IH_IsDayZEditorPreviewObject() && (!GetGame().IsMultiplayer() || GetGame().IsClient()))
		{
			m_FireEmitter = Particle.PlayOnObject(CAMPFIRE_FIRE_CORE, this, Vector(0, 0.05, 0), Vector(0, 0, 0), true);
			m_SmokeEmitter = Particle.PlayOnObject(ParticleList.CAMP_NORMAL_SMOKE, this, Vector(0, 0.05, 0), Vector(0, 0, 0), true);
		}
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), 255, 145, 45, 0.25, 0.1, 0.5, 2.0, 0.22, 0.09, 0.025);
		lightSettings.flarevisible = false;
		lightSettings.flickerspeed = 2.0;
		lightSettings.flickeramplitude = 0.05;
		lightSettings.shadowspeed = 1.0;
		lightSettings.shadowamplitude = 0.02;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);

		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (m_PointLamp)
		{
			m_PointLamp.AttachOnObject(this, "0.0 0.85 0.0");
			m_PointLamp.ConfigureFromSettings(lightSettings);
		}
	}

	void ClearPointLamp()
	{
		if (m_PointLamp)
			m_PointLamp.Destroy();

		m_PointLamp = NULL;
	}

	override void EEInit()
	{
		super.EEInit();
		if (IH_IsDayZEditorPreviewObject())
			return;

		if (GetGame().IsServer())
		{
			PlaySoundSetLoop(m_FireLoopSound, "HeavyFire_SoundSet", 1.0, 2.0);

			m_HeatSourceSettings = new UniversalTemperatureSourceSettings();
			m_HeatSourceSettings.m_UpdateInterval = 3;
			m_HeatSourceSettings.m_Updateable = true;
			m_HeatSourceSettings.m_AffectStat = true;
			m_HeatSourceSettings.m_TemperatureMin = 0;
			m_HeatSourceSettings.m_TemperatureMax = NORMAL_FIRE_TEMP_CELSIUS;
			m_HeatSourceSettings.m_TemperatureCap = MAX_TRANSFER_TEMP_CELSIUS;
			m_HeatSourceSettings.m_RangeFull = FULL_HEAT_RADIUS_METERS;
			m_HeatSourceSettings.m_RangeMax = HEAT_RADIUS_METERS;

			m_FireplaceHeatProfile = new UniversalTemperatureSourceLambdaFireplace();
			m_FireplaceHeatProfile.SetSmallFireplaceTemperatureMax(SMALL_FIRE_TEMP_CELSIUS);
			m_FireplaceHeatProfile.SetNormalFireplaceTemperatureMax(NORMAL_FIRE_TEMP_CELSIUS);

			m_HeatSource = new UniversalTemperatureSource(this, m_HeatSourceSettings, m_FireplaceHeatProfile);
			m_HeatSource.SetActive(true);

			m_FireplaceHeatProfile.SetFuelCount(4);
			m_FireplaceHeatProfile.SetCurrentTemperature(NORMAL_FIRE_TEMP_CELSIUS);
		}
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
		ClearPointLamp();
		if (m_FireEmitter)
			m_FireEmitter.Stop();
		if (m_SmokeEmitter)
			m_SmokeEmitter.Stop();
		if (m_FireLoopSound)
			m_FireLoopSound.SoundStop();

		super.EEDelete(parent);
	}

}

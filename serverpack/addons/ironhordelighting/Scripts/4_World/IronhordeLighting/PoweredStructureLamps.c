modded class ScriptedLightBase
{
	protected bool m_IHConfiguredFlareVisible;
	protected vector m_IHConfiguredFlarePosition;

	void IH_ApplyConfiguredFlare(bool flareVisible, vector flarePosition = "0 0 0")
	{
		m_IHConfiguredFlareVisible = flareVisible;
		m_IHConfiguredFlarePosition = flarePosition;
		IH_ReapplyConfiguredFlare();

		if (GetGame())
		{
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_ReapplyConfiguredFlare);
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ReapplyConfiguredFlare, 1, false);
		}
	}

	void IH_ReapplyConfiguredFlare()
	{
		SetFlareRelPosition(m_IHConfiguredFlarePosition);
		SetFlareVisible(m_IHConfiguredFlareVisible);
	}
}

IH_LightConfigEntry IH_CreatePointDefaults(string assetName, float red, float green, float blue, float colorScale, float brightness, float radius, float fadeRadius, float ambientRed, float ambientGreen, float ambientBlue)
{
	IH_LightConfigEntry settings = new IH_LightConfigEntry();
	settings.assetname = assetName;
	settings.lighttype = "point";
	settings.redcolor = red;
	settings.greencolor = green;
	settings.bluecolor = blue;
	settings.totalbrightnessscale = colorScale;
	settings.lightbrightness = brightness;
	settings.beamlengthradius = radius;
	settings.fadeoutradius = fadeRadius;
	settings.visibleindaylight = false;
	settings.castshadow = true;
	settings.flarevisible = true;
	settings.ambientred = ambientRed;
	settings.ambientgreen = ambientGreen;
	settings.ambientblue = ambientBlue;
	settings.downwardpitchangle = -12.0;
	settings.pulsingenabled = false;
	settings.pulsespeed = 1.0;
	settings.beamwidthangle = 90.0;
	return settings;
}

IH_LightConfigEntry IH_CreateRotatingDefaults(string assetName, float red, float green, float blue, float colorScale, float brightness, float radius, float rotationSpeed, float pitch = 0.0, bool usePulse = true, float pulseRate = 5.0, float spotAngle = 90.0)
{
	IH_LightConfigEntry settings = new IH_LightConfigEntry();
	settings.assetname = assetName;
	settings.lighttype = "rotating";
	settings.redcolor = red;
	settings.greencolor = green;
	settings.bluecolor = blue;
	settings.totalbrightnessscale = colorScale;
	settings.lightbrightness = brightness;
	settings.beamlengthradius = radius;
	settings.rotationspeed = rotationSpeed;
	settings.downwardpitchangle = pitch;
	settings.pulsingenabled = usePulse;
	settings.pulsespeed = pulseRate;
	settings.beamwidthangle = spotAngle;
	settings.castshadow = true;
	settings.flarevisible = false;
	return settings;
}

IH_LightConfigEntry IH_CreateLayeredRotatingDefaults(string assetName, float red, float green, float blue, float colorScale, float brightness, float longRadius, float midRadius, float coreRadius, float rotationSpeed, float pitch = -12.0, float spotAngle = 90.0)
{
	IH_LightConfigEntry settings = new IH_LightConfigEntry();
	settings.assetname = assetName;
	settings.lighttype = "layeredrotating";
	settings.redcolor = red;
	settings.greencolor = green;
	settings.bluecolor = blue;
	settings.totalbrightnessscale = colorScale;
	settings.lightbrightness = brightness;
	settings.beamlengthradius = longRadius;
	settings.midbeamlengthradius = midRadius;
	settings.corebeamlengthradius = coreRadius;
	settings.rotationspeed = rotationSpeed;
	settings.downwardpitchangle = pitch;
	settings.pulsingenabled = false;
	settings.pulsespeed = 1.0;
	settings.beamwidthangle = spotAngle;
	settings.castshadow = true;
	settings.flarevisible = false;
	return settings;
}

class IH_PointLightObject extends PointLightBase
{

	private static float m_PhaseOffsetCursor = 0;

	bool m_UsePulseSweep = false;
	float m_EffectClock = 0;
	float m_PulseRate = 1.0;
	float m_PulseDelay = 1.0;
	float m_BaseLumens = 1.0;
	float m_ColorStrength = 0.8;
	bool m_UseTimedPattern = false;
	ref array<int> m_TimedPatternDurationsMs;
	int m_TimedPatternIndex = 0;
	float m_TimedPatternElapsedMs = 0.0;
	bool m_TimedPatternLightOn = true;
	float m_TimedPatternOffBrightnessScale = 0.0;
	bool m_UseTimedColorPattern = false;
	ref array<int> m_TimedColorPatternDurationsMs;
	ref array<vector> m_TimedColorPatternColors;
	int m_TimedColorPatternIndex = 0;
	float m_TimedColorPatternElapsedMs = 0.0;



	bool m_UseSignalPattern = false;
	int m_CurrentLetterSlot = 0;
	int m_CurrentSignalSlot = 0;
	float m_MessageCooldownClock = 0;
	float m_LetterPauseClock = 0;
	float m_SignalPauseClock = 0;
	float m_SignalFlashClock = 0;




	void IH_PointLightObject()
	{

		SetVisibleDuringDaylight(false);
		SetRadiusTo( 6 );
		SetBrightnessTo( 0.1 );
		SetCastShadow( true );
		SetFadeOutTime( 0.1 );

		SetDiffuseColor(255 * m_ColorStrength,200 * m_ColorStrength,128 * m_ColorStrength);
		SetAmbientColor(1.0, 0.9, 0.8);

		FadeRadiusTo(10 * 1, 0);
		IH_ApplyConfiguredFlare(true);
	}

	void ~IH_PointLightObject()
	{
		if (GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_ReapplyConfiguredFlare);

		IH_UndergroundVisibilityManager.UnregisterLight(this);
	}




	void SetColor(float red, float green, float blue, float scale = 0.8)
	{
		m_ColorStrength = scale;
		SetDiffuseColor(red * m_ColorStrength, green * m_ColorStrength, blue * m_ColorStrength);
	}




	void SetDefaultBrightness(float brightnessLevel)
	{
		m_BaseLumens = brightnessLevel;
		SetBrightnessTo( m_BaseLumens );
	}

	void ConfigureFromSettings(IH_LightConfigEntry settings)
	{
		SetVisibleDuringDaylight(settings.visibleindaylight);
		SetRadiusTo(settings.beamlengthradius);
		SetDefaultBrightness(settings.lightbrightness);
		SetCastShadow(settings.castshadow);
		SetFadeOutTime(0.1);
		SetColor(settings.redcolor, settings.greencolor, settings.bluecolor, settings.totalbrightnessscale);
		SetAmbientColor(settings.ambientred, settings.ambientgreen, settings.ambientblue);
		FadeRadiusTo(settings.fadeoutradius, 0);
		IH_ApplyConfiguredFlare(settings.flarevisible);

		if (settings.strobeenabled)
			SetStrobeEffect(settings.strobespeed, settings.strobedelay);

		m_UseSignalPattern = settings.signalpatternenabled;

		if (settings.flickerspeed > 0.0)
			SetFlickerSpeed(settings.flickerspeed);
		if (settings.flickeramplitude > 0.0)
			SetFlickerAmplitude(settings.flickeramplitude);
		if (settings.shadowspeed > 0.0)
			SetDancingShadowsMovementSpeed(settings.shadowspeed);
		if (settings.shadowamplitude > 0.0)
			SetDancingShadowsAmplitude(settings.shadowamplitude);

		IH_UndergroundVisibilityManager.RegisterLight(this, settings.visibleindaylight);
	}




	void SetStrobeEffect(float rate = 1.0, float restWindow = 1.0, bool isEnabled = true)
	{
		m_UsePulseSweep = isEnabled;
		m_PulseRate = rate;
		m_PulseDelay = restWindow;
		m_EffectClock = m_PhaseOffsetCursor;
		m_PhaseOffsetCursor = m_PhaseOffsetCursor + 0.33;
		if (m_PhaseOffsetCursor > 1.0)
			m_PhaseOffsetCursor = m_PhaseOffsetCursor - 1.0;
	}

	void ConfigureTimedPattern(array<int> stepDurationsMs, bool startsOn = true, float offBrightnessScale = 0.0)
	{
		m_UseTimedColorPattern = false;
		m_TimedColorPatternDurationsMs = null;
		m_TimedColorPatternColors = null;
		m_TimedColorPatternIndex = 0;
		m_TimedColorPatternElapsedMs = 0.0;
		m_UseTimedPattern = false;
		m_TimedPatternDurationsMs = null;
		m_TimedPatternIndex = 0;
		m_TimedPatternElapsedMs = 0.0;
		m_TimedPatternLightOn = startsOn;
		m_TimedPatternOffBrightnessScale = offBrightnessScale;

		if (!stepDurationsMs || stepDurationsMs.Count() == 0)
		{
			SetBrightnessTo(m_BaseLumens);
			return;
		}

		m_TimedPatternDurationsMs = new array<int>;
		foreach (int stepDurationMs : stepDurationsMs)
		{
			if (stepDurationMs > 0)
				m_TimedPatternDurationsMs.Insert(stepDurationMs);
		}

		if (!m_TimedPatternDurationsMs || m_TimedPatternDurationsMs.Count() == 0)
		{
			SetBrightnessTo(m_BaseLumens);
			return;
		}

		m_UsePulseSweep = false;
		m_UseSignalPattern = false;
		m_UseTimedPattern = true;
		if (m_TimedPatternLightOn)
			SetBrightnessTo(m_BaseLumens);
		else
			SetBrightnessTo(m_BaseLumens * m_TimedPatternOffBrightnessScale);
	}

	void ConfigureTimedColorPattern(array<int> stepDurationsMs, array<vector> stepColors)
	{
		m_UseTimedPattern = false;
		m_TimedPatternDurationsMs = null;
		m_TimedPatternIndex = 0;
		m_TimedPatternElapsedMs = 0.0;

		m_UseTimedColorPattern = false;
		m_TimedColorPatternDurationsMs = null;
		m_TimedColorPatternColors = null;
		m_TimedColorPatternIndex = 0;
		m_TimedColorPatternElapsedMs = 0.0;

		if (!stepDurationsMs || !stepColors || stepDurationsMs.Count() == 0 || stepDurationsMs.Count() != stepColors.Count())
		{
			SetBrightnessTo(m_BaseLumens);
			return;
		}

		m_TimedColorPatternDurationsMs = new array<int>;
		m_TimedColorPatternColors = new array<vector>;

		for (int patternIndex = 0; patternIndex < stepDurationsMs.Count(); patternIndex++)
		{
			int stepDurationMs = stepDurationsMs.Get(patternIndex);
			if (stepDurationMs <= 0)
				continue;

			m_TimedColorPatternDurationsMs.Insert(stepDurationMs);
			m_TimedColorPatternColors.Insert(stepColors.Get(patternIndex));
		}

		if (!m_TimedColorPatternDurationsMs || m_TimedColorPatternDurationsMs.Count() == 0 || m_TimedColorPatternDurationsMs.Count() != m_TimedColorPatternColors.Count())
		{
			m_TimedColorPatternDurationsMs = null;
			m_TimedColorPatternColors = null;
			SetBrightnessTo(m_BaseLumens);
			return;
		}

		m_UsePulseSweep = false;
		m_UseSignalPattern = false;
		m_UseTimedColorPattern = true;
		ApplyTimedColorPatternStep(m_TimedColorPatternColors.Get(0));
	}

	void ApplyTimedColorPatternStep(vector stepColor)
	{
		float stepRed = stepColor[0];
		float stepGreen = stepColor[1];
		float stepBlue = stepColor[2];

		SetColor(stepRed, stepGreen, stepBlue, m_ColorStrength);

		if (stepRed <= 0.0 && stepGreen <= 0.0 && stepBlue <= 0.0)
			SetBrightnessTo(0.0);
		else
			SetBrightnessTo(m_BaseLumens);
	}




	override void OnFrameLightSource(IEntity other, float timeSlice)
	{
		if (m_UseTimedColorPattern)
		{
			if (!m_TimedColorPatternDurationsMs || !m_TimedColorPatternColors || m_TimedColorPatternDurationsMs.Count() == 0 || m_TimedColorPatternDurationsMs.Count() != m_TimedColorPatternColors.Count())
				return;

			m_TimedColorPatternElapsedMs += timeSlice * 1000.0;

			int currentColorDurationMs = m_TimedColorPatternDurationsMs.Get(m_TimedColorPatternIndex);
			while (m_TimedColorPatternElapsedMs >= currentColorDurationMs)
			{
				m_TimedColorPatternElapsedMs = m_TimedColorPatternElapsedMs - currentColorDurationMs;
				m_TimedColorPatternIndex += 1;
				if (m_TimedColorPatternIndex >= m_TimedColorPatternDurationsMs.Count())
					m_TimedColorPatternIndex = 0;

				currentColorDurationMs = m_TimedColorPatternDurationsMs.Get(m_TimedColorPatternIndex);
			}

			ApplyTimedColorPatternStep(m_TimedColorPatternColors.Get(m_TimedColorPatternIndex));
		}
		else if (m_UseTimedPattern)
		{
			if (!m_TimedPatternDurationsMs || m_TimedPatternDurationsMs.Count() == 0)
				return;

			m_TimedPatternElapsedMs += timeSlice * 1000.0;

			int currentDurationMs = m_TimedPatternDurationsMs.Get(m_TimedPatternIndex);
			while (m_TimedPatternElapsedMs >= currentDurationMs)
			{
				m_TimedPatternElapsedMs = m_TimedPatternElapsedMs - currentDurationMs;
				m_TimedPatternIndex += 1;
				if (m_TimedPatternIndex >= m_TimedPatternDurationsMs.Count())
					m_TimedPatternIndex = 0;

				m_TimedPatternLightOn = !m_TimedPatternLightOn;
				currentDurationMs = m_TimedPatternDurationsMs.Get(m_TimedPatternIndex);
			}

			if (m_TimedPatternLightOn)
				SetBrightnessTo(m_BaseLumens);
			else
				SetBrightnessTo(m_BaseLumens * m_TimedPatternOffBrightnessScale);
		}
		else if (m_UsePulseSweep)
		{
			if (m_PulseDelay <= 0.0)
			{
				m_EffectClock += timeSlice * m_PulseRate;
				if (m_EffectClock >= 6.283185)
					m_EffectClock = m_EffectClock - 6.283185;

				float pulseBrightness = (Math.Sin(m_EffectClock) + 1.0) * 0.5;
				SetBrightnessTo(pulseBrightness * m_BaseLumens);
			}
			else if (m_EffectClock > m_PulseDelay)
			{
				m_EffectClock += timeSlice * m_PulseRate;

				float pulseBrightnessOld = Math.Cos( m_EffectClock - m_PulseDelay);
				if (pulseBrightnessOld < 0.0)
				{
					pulseBrightnessOld = 0.0;
					m_EffectClock = 0.0;
				}

				SetBrightnessTo(pulseBrightnessOld * m_BaseLumens);
			}
			else
			{
				m_EffectClock += timeSlice;
			}
		}
		else if (m_UseSignalPattern)
		{
			float flashDuration = 0;
			float shortPulseDuration = 0.1;
			float longPulseDuration = 0.3;

			IH_MorseCodeMessage distressSignalMessage = new IH_MorseCodeMessage();
			IH_MorseCodeCharacter sLetterSignal = new IH_MorseCodeCharacter();
			IH_MorseCodeCharacter oLetterSignal = new IH_MorseCodeCharacter();
			sLetterSignal.SetCharacter({false,false,false});
			oLetterSignal.SetCharacter({true,true,true});
			distressSignalMessage.SetMessage({sLetterSignal, oLetterSignal, sLetterSignal});

			if (m_MessageCooldownClock > 2.0)
			{

				array<ref IH_MorseCodeCharacter> message = distressSignalMessage.GetMessage();

				if (m_CurrentLetterSlot < message.Count())
				{

					if (m_LetterPauseClock > 0.5)
					{

						array<bool> activeSignalPattern = message.Get(m_CurrentLetterSlot).GetCharacter();

						if (m_CurrentSignalSlot < activeSignalPattern.Count())
						{

							if (m_SignalPauseClock > 0.2)
							{

								bool symbol = activeSignalPattern.Get(m_CurrentSignalSlot);


								if (symbol)
									flashDuration = longPulseDuration;
								else
									flashDuration = shortPulseDuration;

								m_SignalFlashClock += timeSlice;
								if (m_SignalFlashClock < flashDuration)
								{
									SetBrightnessTo(m_BaseLumens);
								}
								else
								{

									m_CurrentSignalSlot += 1;
									m_SignalPauseClock = 0.0;
									m_SignalFlashClock = 0.0;
									SetBrightnessTo(0.0);
								}
							}
							else
							{

								m_SignalPauseClock += timeSlice;
							}
						}
						else
						{

							m_CurrentSignalSlot = 0;
							m_CurrentLetterSlot += 1;
							m_LetterPauseClock = 0.0;
						}
					}
					else
					{

						m_LetterPauseClock += timeSlice;
					}
				}
				else
				{

					m_CurrentLetterSlot = 0;
					m_MessageCooldownClock = 0.0;
				}
			}
			else
			{

				m_MessageCooldownClock += timeSlice;
			}
		}
	}
}

class IH_RotatingBeaconSpotLight extends SpotlightLight
{
	float m_BeamYaw;
	float m_BeamPitch = 0.0;
	float m_RotationDegreesPerSecond = 90.0;
	float m_BeamBrightness = 4.0;
	float m_BeamRadius = 30.0;
	float m_BeamSpotAngle = 90.0;
	float m_BeamRed = 255.0;
	float m_BeamGreen = 0.0;
	float m_BeamBlue = 0.0;
	float m_BeamColorScale = 1.0;
	bool m_BeamCastShadow = true;
	bool m_FlareVisible = false;
	bool m_RotationEnabled = true;
	float m_InnerRadiusScale = 0.04;
	bool m_UseSweepPulse = true;
	float m_PulseClock;
	float m_PulseRate = 5.0;
	float m_PulseFloor = 0.35;
	bool m_UseTimedPattern = false;
	ref array<int> m_TimedPatternDurationsMs;
	int m_TimedPatternIndex = 0;
	float m_TimedPatternElapsedMs = 0.0;
	bool m_TimedPatternLightOn = true;
	float m_TimedPatternOffBrightnessScale = 0.0;

	void IH_RotatingBeaconSpotLight()
	{
		ApplyBeaconSettings();
	}

	void ~IH_RotatingBeaconSpotLight()
	{
		if (GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_ReapplyConfiguredFlare);

		IH_UndergroundVisibilityManager.UnregisterLight(this);
	}

	void ConfigureBeacon(float red, float green, float blue, float colorScale, float brightness, float radius, float rotationSpeed, float pitch = 0.0, bool usePulse = true, float pulseRate = 5.0, float spotAngle = 90.0, bool castShadow = true, float innerRadiusScale = 0.04, bool flareVisible = false)
	{
		m_BeamRed = red;
		m_BeamGreen = green;
		m_BeamBlue = blue;
		m_BeamColorScale = colorScale;
		m_BeamBrightness = brightness;
		m_BeamRadius = radius;
		m_BeamSpotAngle = spotAngle;
		m_RotationDegreesPerSecond = rotationSpeed;
		m_BeamPitch = pitch;
		m_UseSweepPulse = usePulse;
		m_PulseRate = pulseRate;
		m_BeamCastShadow = castShadow;
		m_InnerRadiusScale = innerRadiusScale;
		m_FlareVisible = flareVisible;
		ApplyBeaconSettings();
	}

	void ConfigureTimedPattern(array<int> stepDurationsMs, bool startsOn = true, float offBrightnessScale = 0.0)
	{
		m_UseTimedPattern = false;
		m_TimedPatternDurationsMs = null;
		m_TimedPatternIndex = 0;
		m_TimedPatternElapsedMs = 0.0;
		m_TimedPatternLightOn = startsOn;
		m_TimedPatternOffBrightnessScale = offBrightnessScale;

		if (!stepDurationsMs || stepDurationsMs.Count() == 0)
		{
			SetBrightnessTo(m_BeamBrightness);
			return;
		}

		m_TimedPatternDurationsMs = new array<int>;
		foreach (int stepDurationMs : stepDurationsMs)
		{
			if (stepDurationMs > 0)
				m_TimedPatternDurationsMs.Insert(stepDurationMs);
		}

		if (!m_TimedPatternDurationsMs || m_TimedPatternDurationsMs.Count() == 0)
		{
			SetBrightnessTo(m_BeamBrightness);
			return;
		}

		m_UseSweepPulse = false;
		m_UseTimedPattern = true;
		if (m_TimedPatternLightOn)
			SetBrightnessTo(m_BeamBrightness);
		else
			SetBrightnessTo(m_BeamBrightness * m_TimedPatternOffBrightnessScale);
	}

	void SetRotationEnabled(bool isEnabled)
	{
		m_RotationEnabled = isEnabled;
	}

	void ApplyBeaconSettings()
	{
		SetVisibleDuringDaylight(true);
		SetRadiusTo(m_BeamRadius * m_InnerRadiusScale);
		SetSpotLightAngle(m_BeamSpotAngle);
		SetBrightnessTo(m_BeamBrightness);
		SetCastShadow(m_BeamCastShadow);
		SetFadeOutTime(0.1);
		SetDiffuseColor(m_BeamRed * m_BeamColorScale, m_BeamGreen * m_BeamColorScale, m_BeamBlue * m_BeamColorScale);
		SetAmbientColor(0.0, 0.0, 0.0);
		FadeRadiusTo(m_BeamRadius, 0);
		SetOrientation(Vector(m_BeamPitch, m_BeamYaw, 0));
		IH_ApplyConfiguredFlare(m_FlareVisible);
		IH_UndergroundVisibilityManager.RegisterLight(this, true);
	}

	override void OnFrameLightSource(IEntity other, float timeSlice)
	{
		if (m_RotationEnabled)
		{
			m_BeamYaw += timeSlice * m_RotationDegreesPerSecond;
			if (m_BeamYaw >= 360.0)
				m_BeamYaw -= 360.0;
		}

		float brightnessMultiplier = 1.0;
		if (m_UseTimedPattern)
		{
			if (m_TimedPatternDurationsMs && m_TimedPatternDurationsMs.Count() > 0)
			{
				m_TimedPatternElapsedMs += timeSlice * 1000.0;

				int currentDurationMs = m_TimedPatternDurationsMs.Get(m_TimedPatternIndex);
				while (m_TimedPatternElapsedMs >= currentDurationMs)
				{
					m_TimedPatternElapsedMs = m_TimedPatternElapsedMs - currentDurationMs;
					m_TimedPatternIndex += 1;
					if (m_TimedPatternIndex >= m_TimedPatternDurationsMs.Count())
						m_TimedPatternIndex = 0;

					m_TimedPatternLightOn = !m_TimedPatternLightOn;
					currentDurationMs = m_TimedPatternDurationsMs.Get(m_TimedPatternIndex);
				}
			}

			if (!m_TimedPatternLightOn)
				brightnessMultiplier = m_TimedPatternOffBrightnessScale;
		}
		else if (m_UseSweepPulse)
		{
			m_PulseClock += timeSlice * m_PulseRate;
			float sweepPulse = Math.Sin(m_PulseClock);
			if (sweepPulse < 0.0)
				sweepPulse = -sweepPulse;

			brightnessMultiplier = m_PulseFloor + ((1.0 - m_PulseFloor) * sweepPulse);
		}

		SetBrightnessTo(m_BeamBrightness * brightnessMultiplier);
		SetOrientation(Vector(m_BeamPitch, m_BeamYaw, 0));
	}
};

bool IH_ShouldCreateClientLighting()
{
	return GetGame() && (GetGame().IsClient() || !GetGame().IsMultiplayer());
}

class IH_ConfigurableLightEntityBase extends House
{
	protected static ref array<IH_ConfigurableLightEntityBase> s_RegisteredConfigurableLights;
	protected bool m_ConfiguredHideModelNetRegistered;
	protected bool m_ConfiguredHideModelNetValue;
	protected string m_ConfiguredVisibleModelName;
	protected bool m_ConfiguredVisibleModelDetached;
	protected bool m_ConfiguredVisibleFlagCaptured;
	protected bool m_ConfiguredVisibleFlagWasSet;

	bool IH_IsDayZEditorPreviewObject()
	{
#ifdef DayZEditor
		vector objectPosition = GetPosition();
		return objectPosition[1] > -1001.0 && objectPosition[1] < -999.0;
#else
		return false;
#endif
	}

	bool ShouldHideConfiguredModel()
	{
		if (IH_IsDayZEditorPreviewObject())
			return false;

		if (m_ConfiguredHideModelNetValue)
			return true;

		return IH_LightingConfig.ResolveHideModel(GetType(), false);
	}

	void RegisterConfiguredModelNetworking()
	{
		if (m_ConfiguredHideModelNetRegistered)
			return;

		RegisterNetSyncVariableBool("m_ConfiguredHideModelNetValue");
		m_ConfiguredHideModelNetRegistered = true;

		if (GetGame() && GetGame().IsMultiplayer() && GetGame().IsServer())
		{
			m_ConfiguredHideModelNetValue = IH_LightingConfig.ResolveHideModel(GetType(), false);
			SetSynchDirty();
		}
	}

	void ApplyConfiguredModelVisibility()
	{
		if (IH_IsDayZEditorPreviewObject())
			return;

		bool hideConfiguredModel = ShouldHideConfiguredModel();

#ifdef DayZEditor
		if (!GetGame() || !GetGame().IsMultiplayer())
			hideConfiguredModel = false;
#endif

		if (hideConfiguredModel)
		{
			if (!m_ConfiguredVisibleFlagCaptured)
			{
				m_ConfiguredVisibleFlagWasSet = IsFlagSet(EntityFlags.VISIBLE);
				m_ConfiguredVisibleFlagCaptured = true;
			}

			ClearFlags(EntityFlags.VISIBLE, false);

			vobject currentVisibleModel = GetVObject();
			if (currentVisibleModel)
			{
				if (m_ConfiguredVisibleModelName == string.Empty)
					m_ConfiguredVisibleModelName = vtoa(currentVisibleModel);

				SetObject(NULL, "");
			}

			m_ConfiguredVisibleModelDetached = true;

			return;
		}

		if (m_ConfiguredVisibleModelDetached && !GetVObject() && m_ConfiguredVisibleModelName != string.Empty)
		{
			vobject restoredVisibleModel = GetObject(m_ConfiguredVisibleModelName);
			SetObject(restoredVisibleModel, "");
			ReleaseObject(restoredVisibleModel);
		}

		m_ConfiguredVisibleModelDetached = false;

		if (m_ConfiguredVisibleFlagCaptured)
		{
			if (m_ConfiguredVisibleFlagWasSet)
				SetFlags(EntityFlags.VISIBLE, false);

			m_ConfiguredVisibleFlagCaptured = false;
		}
	}

#ifdef DayZEditor
	void IH_RequestDayZEditorDefaultZ90()
	{
		if (IH_IsDayZEditorPreviewObject())
			return;

		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultZ90, 50, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultZ90, 250, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultZ90, 750, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultZ90, 1500, false);
	}

	void IH_ApplyDayZEditorDefaultZ90()
	{
		vector currentOrientation = GetOrientation();

		if (currentOrientation[0] > -0.01 && currentOrientation[0] < 0.01 && currentOrientation[1] > -0.01 && currentOrientation[1] < 0.01 && currentOrientation[2] > -0.01 && currentOrientation[2] < 0.01)
			SetOrientation(Vector(0.0, 0.0, 90.0));
	}

	void IH_RequestDayZEditorDefaultYMinus12Z90()
	{
		if (IH_IsDayZEditorPreviewObject())
			return;

		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultYMinus12Z90, 50, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultYMinus12Z90, 250, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultYMinus12Z90, 750, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultYMinus12Z90, 1500, false);
	}

	void IH_ApplyDayZEditorDefaultYMinus12Z90()
	{
		vector currentOrientation = GetOrientation();

		if (currentOrientation[0] > -0.01 && currentOrientation[0] < 0.01 && currentOrientation[1] > -0.01 && currentOrientation[1] < 0.01 && currentOrientation[2] > -0.01 && currentOrientation[2] < 0.01)
			SetOrientation(Vector(0.0, -12.0, 90.0));
	}

	void IH_RequestDayZEditorDefaultZMinus180()
	{
		if (IH_IsDayZEditorPreviewObject())
			return;

		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultZMinus180, 50, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultZMinus180, 250, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultZMinus180, 750, false);
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_ApplyDayZEditorDefaultZMinus180, 1500, false);
	}

	void IH_ApplyDayZEditorDefaultZMinus180()
	{
		vector currentOrientation = GetOrientation();

		if (currentOrientation[0] > -0.01 && currentOrientation[0] < 0.01 && currentOrientation[1] > -0.01 && currentOrientation[1] < 0.01)
			SetOrientation(Vector(0.0, 0.0, -180.0));
	}
#endif

	void RegisterConfigurableLight()
	{
		if (IH_IsDayZEditorPreviewObject())
			return;

		RegisterConfiguredModelNetworking();

		if (!s_RegisteredConfigurableLights)
			s_RegisteredConfigurableLights = new array<IH_ConfigurableLightEntityBase>;

		if (s_RegisteredConfigurableLights.Find(this) < 0)
		{
			s_RegisteredConfigurableLights.Insert(this);
		}

		ApplyConfiguredModelVisibility();
	}

	void UnregisterConfigurableLight()
	{
		if (!s_RegisteredConfigurableLights)
			return;

		int lightIndex = s_RegisteredConfigurableLights.Find(this);
		if (lightIndex >= 0)
			s_RegisteredConfigurableLights.Remove(lightIndex);
	}

	static void RefreshAllConfigurableLights()
	{
		if (!s_RegisteredConfigurableLights)
			return;

		foreach (IH_ConfigurableLightEntityBase configurableLight : s_RegisteredConfigurableLights)
		{
			if (configurableLight && !configurableLight.IH_IsDayZEditorPreviewObject())
			{
				configurableLight.ApplyConfiguredModelVisibility();
				configurableLight.RefreshConfiguredLight();
				configurableLight.ApplyConfiguredModelVisibility();
			}
		}
	}

	override void EEInit()
	{
		super.EEInit();
		if (IH_IsDayZEditorPreviewObject())
			return;

		ApplyConfiguredModelVisibility();
	}

	override void OnVariablesSynchronized()
	{
		super.OnVariablesSynchronized();
		if (IH_IsDayZEditorPreviewObject())
			return;

		ApplyConfiguredModelVisibility();
	}

	void RefreshConfiguredLight()
	{
	}

	override void EEDelete(EntityAI parent)
	{
#ifdef DayZEditor
		if (GetGame())
		{
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_ApplyDayZEditorDefaultZ90);
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_ApplyDayZEditorDefaultYMinus12Z90);
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_ApplyDayZEditorDefaultZMinus180);
		}
#endif

		UnregisterConfigurableLight();
		super.EEDelete(parent);
	}

}

class IH_IndustrialLightBase extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;

	void SpawnIndustrialPointLight(float lightRadius, float lightBrightness, float fadeRadius)
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), 255, 200, 128, 0.8, lightBrightness, lightRadius, fadeRadius, 1.0, 0.9, 0.8);
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
		{
			Print("[IronhordeLighting][ERROR] Failed to create industrial point light for " + GetType());
			return;
		}
		m_PointLamp.AttachOnObject(this, "0.0 -0.1 0.0");
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
		ClearPointLamp();
		super.EEDelete(parent);
	}

}

class IH_Industrial_Light_01 extends IH_IndustrialLightBase
{
	void IH_Industrial_Light_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPointLight(2.6667, 0.0533, 3.6667);
	}
}

class IH_Industrial_Light_02 extends IH_IndustrialLightBase
{
	void IH_Industrial_Light_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPointLight(4.0, 0.08, 5.5);
	}
}

class IH_Industrial_Light_03 extends IH_IndustrialLightBase
{
	void IH_Industrial_Light_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPointLight(8.0, 0.12, 10.0);
	}
}

class IH_Industrial_Light_04 extends IH_IndustrialLightBase
{
	void IH_Industrial_Light_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPointLight(13.0, 0.18, 16.0);
	}
}

class IH_Industrial_Light_05 extends IH_IndustrialLightBase
{
	void IH_Industrial_Light_05()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPointLight(20.0, 0.24, 24.0);
	}
}

class IH_Industrial_Light_06 extends IH_IndustrialLightBase
{
	void IH_Industrial_Light_06()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPointLight(30, 0.3, 30);
	}
}

class IH_HangarLampBase extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;

	void SpawnHangarPointLight(float lightRadius, float lightBrightness, float fadeRadius)
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), 255, 200, 128, 0.8, lightBrightness, lightRadius, fadeRadius, 1.0, 0.9, 0.8);
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
			return;

		m_PointLamp.AttachOnObject(this, "0.0 -1.1 0.0");
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
		ClearPointLamp();
		super.EEDelete(parent);
	}

}

class IH_Hangar_Lamp_01 extends IH_HangarLampBase
{
	void IH_Hangar_Lamp_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(2.6667, 0.0533, 3.6667);
	}
}

class IH_Hangar_Lamp_02 extends IH_HangarLampBase
{
	void IH_Hangar_Lamp_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(4.0, 0.08, 5.5);
	}
}

class IH_Hangar_Lamp_03 extends IH_HangarLampBase
{
	void IH_Hangar_Lamp_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(8.0, 0.12, 10.0);
	}
}

class IH_Hangar_Lamp_04 extends IH_HangarLampBase
{
	void IH_Hangar_Lamp_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(13.0, 0.18, 16.0);
	}
}

class IH_Hangar_Lamp_05 extends IH_HangarLampBase
{
	void IH_Hangar_Lamp_05()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(20.0, 0.24, 24.0);
	}
}

class IH_Hangar_Lamp_06 extends IH_HangarLampBase
{
	void IH_Hangar_Lamp_06()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(30, 0.3, 30);
	}
}

class IH_LightSource_01 extends IH_HangarLampBase
{
	void IH_LightSource_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(2.6667, 0.0533, 3.6667);
	}
}

class IH_LightSource_02 extends IH_HangarLampBase
{
	void IH_LightSource_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(4.0, 0.08, 5.5);
	}
}

class IH_LightSource_03 extends IH_HangarLampBase
{
	void IH_LightSource_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(8.0, 0.12, 10.0);
	}
}

class IH_LightSource_04 extends IH_HangarLampBase
{
	void IH_LightSource_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(13.0, 0.18, 16.0);
	}
}

class IH_LightSource_05 extends IH_HangarLampBase
{
	void IH_LightSource_05()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(20.0, 0.24, 24.0);
	}
}

class IH_LightSource_06 extends IH_HangarLampBase
{
	void IH_LightSource_06()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnHangarPointLight(30, 0.3, 30);
	}
}

class IH_TownLightPoleBase extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;

	void SpawnTownPoleLight(float red, float green, float blue, float colorScale, float brightness, float radius, float fadeRadius)
	{
		ClearPointLamp();
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), red, green, blue, colorScale, brightness, radius, fadeRadius, 1.0, 0.9, 0.8);
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
			return;

		m_PointLamp.AttachOnObject(this, "0.0 3.6 0.5");
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
		ClearPointLamp();
		super.EEDelete(parent);
	}

}

class IH_Town_LightPole_01 extends IH_TownLightPoleBase
{
	void IH_Town_LightPole_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnTownPoleLight(255, 200, 128, 0.5, 0.06428, 16.9, 9.0625);
	}
}

class IH_Town_LightPole_02 extends IH_TownLightPoleBase
{
	void IH_Town_LightPole_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnTownPoleLight(255, 200, 128, 0.5, 0.08342, 21.52, 11.65);
	}
}

class IH_Town_LightPole_03 extends IH_TownLightPoleBase
{
	void IH_Town_LightPole_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnTownPoleLight(255, 200, 128, 0.5, 0.10257, 26.14, 14.2375);
	}
}

class IH_Town_LightPole_04 extends IH_TownLightPoleBase
{
	void IH_Town_LightPole_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnTownPoleLight(255, 200, 128, 0.5, 0.12171, 30.76, 16.825);
	}
}

class IH_Town_LightPole_05 extends IH_TownLightPoleBase
{
	void IH_Town_LightPole_05()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnTownPoleLight(255, 200, 128, 0.5, 0.14086, 35.38, 19.4125);
	}
}

class IH_Town_LightPole_06 extends IH_TownLightPoleBase
{
	void IH_Town_LightPole_06()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnTownPoleLight(255, 200, 128, 0.5, 0.160, 40.0, 22.0);
	}
}

class IH_IndustrialLightPoleBase extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;

	void SpawnIndustrialPoleLight(float red, float green, float blue, float colorScale, float brightness, float radius, float fadeRadius)
	{
		ClearPointLamp();
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), red, green, blue, colorScale, brightness, radius, fadeRadius, 1.0, 0.9, 0.8);
		lightSettings.flarevisible = false;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
			return;

		m_PointLamp.AttachOnObject(this, "0.0 5.0 2.0");
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
		ClearPointLamp();
		super.EEDelete(parent);
	}

}

class IH_Industrial_LightPole_01 extends IH_IndustrialLightPoleBase
{
	void IH_Industrial_LightPole_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPoleLight(255, 230, 160, 0.5, 0.06428, 45.75, 22.2375);
	}
}

class IH_Industrial_LightPole_02 extends IH_IndustrialLightPoleBase
{
	void IH_Industrial_LightPole_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPoleLight(255, 230, 160, 0.5, 0.08342, 58.2, 28.59);
	}
}

class IH_Industrial_LightPole_03 extends IH_IndustrialLightPoleBase
{
	void IH_Industrial_LightPole_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPoleLight(255, 230, 160, 0.5, 0.10257, 70.65, 34.9425);
	}
}

class IH_Industrial_LightPole_04 extends IH_IndustrialLightPoleBase
{
	void IH_Industrial_LightPole_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPoleLight(255, 230, 160, 0.5, 0.12171, 83.1, 41.295);
	}
}

class IH_Industrial_LightPole_05 extends IH_IndustrialLightPoleBase
{
	void IH_Industrial_LightPole_05()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPoleLight(255, 230, 160, 0.5, 0.14086, 95.55, 47.6475);
	}
}

class IH_Industrial_LightPole_06 extends IH_IndustrialLightPoleBase
{
	void IH_Industrial_LightPole_06()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SpawnIndustrialPoleLight(255, 230, 160, 0.5, 0.160, 108.0, 54.0);
	}
}

class IH_Blinking_Airfield_LandingLight extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;

	void IH_Blinking_Airfield_LandingLight()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), 10, 255, 10, 1.0, 1.0, 1.0, 3.0, 0.0, 0.0, 0.0);
		lightSettings.visibleindaylight = true;
		lightSettings.castshadow = true;
		lightSettings.signalpatternenabled = true;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
			return;

		m_PointLamp.AttachOnObject(this, "0.0 0.3 0.0");
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
		ClearPointLamp();
		super.EEDelete(parent);
	}

}

class IH_Blinking_Tower_BeaconLight extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;

	void IH_Blinking_Tower_BeaconLight()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), 255, 0, 0, 1.0, 4.0, 5.0, 8.0, 0.0, 0.0, 0.0);
		lightSettings.visibleindaylight = true;
		lightSettings.castshadow = true;
		lightSettings.strobeenabled = true;
		lightSettings.strobespeed = 6.0;
		lightSettings.strobedelay = 0.5;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_PointLamp)
			return;

		m_PointLamp.AttachOnObject(this, "0.0 0.3 0.0");
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
		ClearPointLamp();
		super.EEDelete(parent);
	}

}

class IH_RotatingBeaconBase extends IH_ConfigurableLightEntityBase
{
	IH_RotatingBeaconSpotLight m_PrimaryBeam;
	IH_RotatingBeaconSpotLight m_MidBeam;
	IH_RotatingBeaconSpotLight m_CoreBeam;

	void SpawnRotatingBeacon(float red, float green, float blue, float colorScale, float brightness, float radius, float rotationSpeed, float pitch = 0.0, bool usePulse = true, float pulseRate = 5.0, float spotAngle = 90.0)
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreateRotatingDefaults(GetType(), red, green, blue, colorScale, brightness, radius, rotationSpeed, pitch, usePulse, pulseRate, spotAngle);
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);

		m_PrimaryBeam = IH_RotatingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_RotatingBeaconSpotLight, "0 0 0"));
		if (m_PrimaryBeam)
		{
			m_PrimaryBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_PrimaryBeam.ConfigureBeacon(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.18, lightSettings.beamlengthradius, lightSettings.rotationspeed, lightSettings.downwardpitchangle, lightSettings.pulsingenabled, lightSettings.pulsespeed, lightSettings.beamwidthangle, lightSettings.castshadow, 0.04, lightSettings.flarevisible);
		}

		m_MidBeam = IH_RotatingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_RotatingBeaconSpotLight, "0 0 0"));
		if (m_MidBeam)
		{
			m_MidBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_MidBeam.ConfigureBeacon(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.32, lightSettings.beamlengthradius * 0.55, lightSettings.rotationspeed, lightSettings.downwardpitchangle, lightSettings.pulsingenabled, lightSettings.pulsespeed, lightSettings.beamwidthangle * 0.58, lightSettings.castshadow, 0.04, lightSettings.flarevisible);
		}

		m_CoreBeam = IH_RotatingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_RotatingBeaconSpotLight, "0 0 0"));
		if (m_CoreBeam)
		{
			m_CoreBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_CoreBeam.ConfigureBeacon(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.50, lightSettings.beamlengthradius * 0.24, lightSettings.rotationspeed, lightSettings.downwardpitchangle, lightSettings.pulsingenabled, lightSettings.pulsespeed, lightSettings.beamwidthangle * 0.28, lightSettings.castshadow, 0.04, lightSettings.flarevisible);
		}
	}

	void SpawnLayeredRotatingBeacon(float red, float green, float blue, float colorScale, float fullBrightness, float longRadius, float midRadius, float coreRadius, float rotationSpeed, float pitch = -12.0, float spotAngle = 90.0)
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreateLayeredRotatingDefaults(GetType(), red, green, blue, colorScale, fullBrightness, longRadius, midRadius, coreRadius, rotationSpeed, pitch, spotAngle);
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);

		m_PrimaryBeam = IH_RotatingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_RotatingBeaconSpotLight, "0 0 0"));
		if (m_PrimaryBeam)
		{
			m_PrimaryBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_PrimaryBeam.ConfigureBeacon(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.08, lightSettings.beamlengthradius, lightSettings.rotationspeed, lightSettings.downwardpitchangle, false, 1.0, lightSettings.beamwidthangle, lightSettings.castshadow, 0.33, lightSettings.flarevisible);
		}

		m_MidBeam = IH_RotatingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_RotatingBeaconSpotLight, "0 0 0"));
		if (m_MidBeam)
		{
			m_MidBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_MidBeam.ConfigureBeacon(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.25, lightSettings.midbeamlengthradius, lightSettings.rotationspeed, lightSettings.downwardpitchangle, false, 1.0, lightSettings.beamwidthangle, lightSettings.castshadow, 0.33, lightSettings.flarevisible);
		}

		m_CoreBeam = IH_RotatingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_RotatingBeaconSpotLight, "0 0 0"));
		if (m_CoreBeam)
		{
			m_CoreBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_CoreBeam.ConfigureBeacon(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.67, lightSettings.corebeamlengthradius, lightSettings.rotationspeed, lightSettings.downwardpitchangle, false, 1.0, lightSettings.beamwidthangle, lightSettings.castshadow, 0.33, lightSettings.flarevisible);
		}
	}

	void ClearBeaconLights()
	{
		if (m_PrimaryBeam)
			m_PrimaryBeam.Destroy();
		if (m_MidBeam)
			m_MidBeam.Destroy();
		if (m_CoreBeam)
			m_CoreBeam.Destroy();

		m_PrimaryBeam = NULL;
		m_MidBeam = NULL;
		m_CoreBeam = NULL;
	}

	protected void ConfigureBeaconTimedPattern(array<int> stepDurationsMs, bool startsOn = true, float offBrightnessScale = 0.0)
	{
		if (m_PrimaryBeam)
			m_PrimaryBeam.ConfigureTimedPattern(stepDurationsMs, startsOn, offBrightnessScale);
		if (m_MidBeam)
			m_MidBeam.ConfigureTimedPattern(stepDurationsMs, startsOn, offBrightnessScale);
		if (m_CoreBeam)
			m_CoreBeam.ConfigureTimedPattern(stepDurationsMs, startsOn, offBrightnessScale);
	}

	protected void SetBeaconRotationEnabled(bool isEnabled)
	{
		if (m_PrimaryBeam)
			m_PrimaryBeam.SetRotationEnabled(isEnabled);
		if (m_MidBeam)
			m_MidBeam.SetRotationEnabled(isEnabled);
		if (m_CoreBeam)
			m_CoreBeam.SetRotationEnabled(isEnabled);
	}

	void SpawnConfiguredBeaconPattern()
	{
	}

	override void RefreshConfiguredLight()
	{
		ClearBeaconLights();
		SpawnConfiguredBeaconPattern();
	}

	override void EEDelete(EntityAI parent)
	{
		ClearBeaconLights();
		super.EEDelete(parent);
	}

}

class IH_Rotating_Red_01 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Red_01()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 0, 0, 0.40, 1.00117, 3.33356, 60.0, 0.0, true, 5.0, 12.0);
	}
}

class IH_Rotating_Red_02 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Red_02()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 0, 0, 0.525, 1.83431, 6.11130, 85.0, 0.0, true, 5.3333, 17.5);
	}
}

class IH_Rotating_Red_03 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Red_03()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 0, 0, 0.65, 2.66745, 8.88904, 110.0, 0.0, true, 5.6667, 23.0);
	}
}

class IH_Rotating_Red_04 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Red_04()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 0, 0, 0.775, 3.50058, 11.66678, 135.0, 0.0, true, 6.0, 28.5);
	}
}

class IH_Rotating_Red_05 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Red_05()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 0, 0, 0.90, 4.33372, 14.44452, 160.0, 0.0, true, 6.3333, 34.0);
	}
}

class IH_Rotating_Red_06 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Red_06()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 0, 0, 1.025, 5.16686, 17.22226, 185.0, 0.0, true, 6.6667, 39.5);
	}
}

class IH_Rotating_Red_07 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Red_07()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 0, 0, 1.15, 6.0, 20.00, 210.0, 0.0, true, 7.0, 45.0);
	}
}

class IH_Rotating_Amber_01 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Amber_01()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 130, 0, 1.0, 1.50, 11.67, 90.0);
	}
}

class IH_Rotating_Amber_02 extends IH_RotatingBeaconBase
{
	void IH_Rotating_Amber_02()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 130, 0, 1.0, 5.0, 40.0, 180.0, 0.0, true, 7.0);
	}
}

class IH_Rotating_Blue extends IH_RotatingBeaconBase
{
	void IH_Rotating_Blue()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(50, 120, 255, 1.0, 4.5, 35.0, 110.0);
	}
}

class IH_Rotating_Green extends IH_RotatingBeaconBase
{
	void IH_Rotating_Green()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(0, 255, 90, 1.0, 4.0, 35.0, 90.0);
	}
}

class IH_Rotating_Lighthouse extends IH_RotatingBeaconBase
{
	void IH_Rotating_Lighthouse()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnLayeredRotatingBeacon(255, 255, 255, 1.0, 0.0444, 1000.0, 500.0, 175.0, 12.0, -4.0, IH_LightingConfig.LIGHTHOUSE_DEFAULT_BEAM_WIDTH);
	}
}

class IH_SweepingBeaconSpotLight extends SpotlightLight
{
	float m_BeamYaw;
	float m_BeamPitch = -5.0;
	float m_SweepClock;
	float m_SweepRate = 0.55;
	float m_SweepArc = 60.0;
	float m_BeamBrightness = 4.0;
	float m_BeamRadius = 30.0;
	float m_BeamSpotAngle = 18.0;
	float m_BeamRed = 255.0;
	float m_BeamGreen = 245.0;
	float m_BeamBlue = 220.0;
	float m_BeamColorScale = 1.0;
	bool m_BeamCastShadow = true;
	bool m_FlareVisible = false;
	float m_InnerRadiusScale = 0.04;
	bool m_UseSweepPulse = false;
	float m_PulseClock;
	float m_PulseRate = 1.0;
	float m_PulseFloor = 0.35;

	void IH_SweepingBeaconSpotLight()
	{
		ApplySweepSettings();
	}

	void ~IH_SweepingBeaconSpotLight()
	{
		if (GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_ReapplyConfiguredFlare);

		IH_UndergroundVisibilityManager.UnregisterLight(this);
	}

	void ConfigureSweep(float red, float green, float blue, float colorScale, float brightness, float radius, float sweepRate, float sweepArc, float pitch = -5.0, bool usePulse = false, float pulseRate = 1.0, float spotAngle = 18.0, bool castShadow = true, float innerRadiusScale = 0.04, bool flareVisible = false)
	{
		m_BeamRed = red;
		m_BeamGreen = green;
		m_BeamBlue = blue;
		m_BeamColorScale = colorScale;
		m_BeamBrightness = brightness;
		m_BeamRadius = radius;
		m_BeamSpotAngle = spotAngle;
		m_SweepRate = sweepRate;
		m_SweepArc = sweepArc;
		m_BeamPitch = pitch;
		m_UseSweepPulse = usePulse;
		m_PulseRate = pulseRate;
		m_BeamCastShadow = castShadow;
		m_InnerRadiusScale = innerRadiusScale;
		m_FlareVisible = flareVisible;
		ApplySweepSettings();
	}

	void ApplySweepSettings()
	{
		SetVisibleDuringDaylight(true);
		SetRadiusTo(m_BeamRadius * m_InnerRadiusScale);
		SetSpotLightAngle(m_BeamSpotAngle);
		SetBrightnessTo(m_BeamBrightness);
		SetCastShadow(m_BeamCastShadow);
		SetFadeOutTime(0.1);
		SetDiffuseColor(m_BeamRed * m_BeamColorScale, m_BeamGreen * m_BeamColorScale, m_BeamBlue * m_BeamColorScale);
		SetAmbientColor(0.0, 0.0, 0.0);
		FadeRadiusTo(m_BeamRadius, 0);
		SetOrientation(Vector(m_BeamPitch, m_BeamYaw, 0));
		IH_ApplyConfiguredFlare(m_FlareVisible);
		IH_UndergroundVisibilityManager.RegisterLight(this, true);
	}

	override void OnFrameLightSource(IEntity other, float timeSlice)
	{
		m_SweepClock += timeSlice * m_SweepRate;
		if (m_SweepClock >= 6.283185)
			m_SweepClock = m_SweepClock - 6.283185;

		m_BeamYaw = Math.Sin(m_SweepClock) * m_SweepArc;

		float brightnessMultiplier = 1.0;
		if (m_UseSweepPulse)
		{
			m_PulseClock += timeSlice * m_PulseRate;
			float sweepPulse = Math.Sin(m_PulseClock);
			if (sweepPulse < 0.0)
				sweepPulse = -sweepPulse;

			brightnessMultiplier = m_PulseFloor + ((1.0 - m_PulseFloor) * sweepPulse);
		}

		SetBrightnessTo(m_BeamBrightness * brightnessMultiplier);
		SetOrientation(Vector(m_BeamPitch, m_BeamYaw, 0));
	}
}

class IH_SweepingBeaconBase extends IH_ConfigurableLightEntityBase
{
	IH_SweepingBeaconSpotLight m_PrimaryBeam;
	IH_SweepingBeaconSpotLight m_MidBeam;
	IH_SweepingBeaconSpotLight m_CoreBeam;

	void SpawnSweepingBeacon(float red, float green, float blue, float colorScale, float fullBrightness, float longRadius, float midRadius, float coreRadius, float sweepRate, float sweepArc = 60.0, float pitch = -5.0, float spotAngle = 18.0)
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreateRotatingDefaults(GetType(), red, green, blue, colorScale, fullBrightness, longRadius, sweepRate, pitch, false, 1.0, spotAngle);
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);

		m_PrimaryBeam = IH_SweepingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_SweepingBeaconSpotLight, "0 0 0"));
		if (m_PrimaryBeam)
		{
			m_PrimaryBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_PrimaryBeam.ConfigureSweep(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.18, lightSettings.beamlengthradius, lightSettings.rotationspeed, sweepArc, lightSettings.downwardpitchangle, false, 1.0, lightSettings.beamwidthangle, lightSettings.castshadow, 0.04, lightSettings.flarevisible);
		}

		m_MidBeam = IH_SweepingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_SweepingBeaconSpotLight, "0 0 0"));
		if (m_MidBeam)
		{
			m_MidBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_MidBeam.ConfigureSweep(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.32, midRadius, lightSettings.rotationspeed, sweepArc, lightSettings.downwardpitchangle, false, 1.0, lightSettings.beamwidthangle * 0.58, lightSettings.castshadow, 0.04, lightSettings.flarevisible);
		}

		m_CoreBeam = IH_SweepingBeaconSpotLight.Cast(ScriptedLightBase.CreateLight(IH_SweepingBeaconSpotLight, "0 0 0"));
		if (m_CoreBeam)
		{
			m_CoreBeam.AttachOnObject(this, "0.0 0.35 0.0");
			m_CoreBeam.ConfigureSweep(lightSettings.redcolor, lightSettings.greencolor, lightSettings.bluecolor, lightSettings.totalbrightnessscale, lightSettings.lightbrightness * 0.50, coreRadius, lightSettings.rotationspeed, sweepArc, lightSettings.downwardpitchangle, false, 1.0, lightSettings.beamwidthangle * 0.28, lightSettings.castshadow, 0.04, lightSettings.flarevisible);
		}
	}

	void ClearBeaconLights()
	{
		if (m_PrimaryBeam)
			m_PrimaryBeam.Destroy();
		if (m_MidBeam)
			m_MidBeam.Destroy();
		if (m_CoreBeam)
			m_CoreBeam.Destroy();

		m_PrimaryBeam = NULL;
		m_MidBeam = NULL;
		m_CoreBeam = NULL;
	}

	override void RefreshConfiguredLight()
	{
		ClearBeaconLights();
		SpawnConfiguredSweepPattern();
	}

	void SpawnConfiguredSweepPattern()
	{
	}

	override void EEDelete(EntityAI parent)
	{
		ClearBeaconLights();
		super.EEDelete(parent);
	}
}

class IH_GenericPointLightBase extends IH_ConfigurableLightEntityBase
{
	IH_PointLightObject m_PointLamp;
	bool m_PointVisibleDuringDaylight;
	bool m_PointCastShadow;
	bool m_PointFlareVisible;
	bool m_PointStrobeEnabled;
	float m_PointStrobeSpeed = 1.0;
	float m_PointStrobeDelay = 1.0;
	float m_PointFlickerSpeed;
	float m_PointFlickerAmplitude;
	float m_PointShadowSpeed;
	float m_PointShadowAmplitude;
	bool m_PointTimedPatternEnabled;
	bool m_PointTimedPatternStartsOn = true;
	float m_PointTimedPatternOffBrightnessScale = 0.0;
	ref array<int> m_PointTimedPatternDurationsMs;

	vector GetPointLightOffset()
	{
		return Vector(0.0, 0.3, 0.0);
	}

	void SetConfiguredPointFlags(bool visibleDuringDaylight, bool castShadow, bool flareVisible, bool strobeEnabled, float strobeSpeed, float strobeDelay)
	{
		m_PointVisibleDuringDaylight = visibleDuringDaylight;
		m_PointCastShadow = castShadow;
		m_PointFlareVisible = flareVisible;
		m_PointStrobeEnabled = strobeEnabled;
		m_PointStrobeSpeed = strobeSpeed;
		m_PointStrobeDelay = strobeDelay;
	}

	void SetConfiguredPointDynamics(float flickerSpeed, float flickerAmplitude, float shadowSpeed, float shadowAmplitude)
	{
		m_PointFlickerSpeed = flickerSpeed;
		m_PointFlickerAmplitude = flickerAmplitude;
		m_PointShadowSpeed = shadowSpeed;
		m_PointShadowAmplitude = shadowAmplitude;
	}

	void SetConfiguredPointTimedPattern(array<int> stepDurationsMs, bool startsOn = true, float offBrightnessScale = 0.0)
	{
		m_PointTimedPatternEnabled = false;
		m_PointTimedPatternStartsOn = startsOn;
		m_PointTimedPatternOffBrightnessScale = offBrightnessScale;
		m_PointTimedPatternDurationsMs = null;

		if (!stepDurationsMs || stepDurationsMs.Count() == 0)
			return;

		m_PointTimedPatternDurationsMs = new array<int>;
		foreach (int stepDurationMs : stepDurationsMs)
		{
			if (stepDurationMs > 0)
				m_PointTimedPatternDurationsMs.Insert(stepDurationMs);
		}

		m_PointTimedPatternEnabled = m_PointTimedPatternDurationsMs && m_PointTimedPatternDurationsMs.Count() > 0;
	}

	void SpawnConfiguredPointLight(float red, float green, float blue, float colorScale, float brightness, float radius, float fadeRadius, float ambientRed, float ambientGreen, float ambientBlue)
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), red, green, blue, colorScale, brightness, radius, fadeRadius, ambientRed, ambientGreen, ambientBlue);
		lightSettings.visibleindaylight = m_PointVisibleDuringDaylight;
		lightSettings.castshadow = m_PointCastShadow;
		lightSettings.flarevisible = m_PointFlareVisible;
		lightSettings.strobeenabled = m_PointStrobeEnabled;
		lightSettings.strobespeed = m_PointStrobeSpeed;
		lightSettings.strobedelay = m_PointStrobeDelay;
		lightSettings.signalpatternenabled = false;
		lightSettings.flickerspeed = m_PointFlickerSpeed;
		lightSettings.flickeramplitude = m_PointFlickerAmplitude;
		lightSettings.shadowspeed = m_PointShadowSpeed;
		lightSettings.shadowamplitude = m_PointShadowAmplitude;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);

		m_PointLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (m_PointLamp)
		{
			m_PointLamp.AttachOnObject(this, GetPointLightOffset());
			m_PointLamp.ConfigureFromSettings(lightSettings);
			if (m_PointTimedPatternEnabled)
				m_PointLamp.ConfigureTimedPattern(m_PointTimedPatternDurationsMs, m_PointTimedPatternStartsOn, m_PointTimedPatternOffBrightnessScale);
		}
	}

	void ClearPointLamp()
	{
		if (m_PointLamp)
			m_PointLamp.Destroy();

		m_PointLamp = NULL;
	}

	override void EEDelete(EntityAI parent)
	{
		ClearPointLamp();
		super.EEDelete(parent);
	}
}

class IH_LEDStripBase extends ItemBase
{
	const float IH_LED_STRIP_DEFAULT_RGB_SPEED_SECONDS = 10.0;
	const int IH_LED_STRIP_RGB_PHASE_COUNT = 36;
	const int IH_LED_STRIP_RGB_UPDATE_MS = 25;
	const int IH_LED_STRIP_TERRAIN_RECOVERY_INTERVAL_MS = 250;
	const int IH_LED_STRIP_TERRAIN_RECOVERY_MAX_CHECKS = 120;
	const float IH_LED_STRIP_TERRAIN_RECOVERY_TOLERANCE = 0.02;
	const float IH_LED_STRIP_TERRAIN_RECOVERY_LIFT = 0.25;
	const float IH_LED_STRIP_SUPPORT_RAY_DISTANCE = 10.0;

	protected static ref array<IH_LEDStripBase> s_RegisteredLedStripItems;
	protected bool m_ConfiguredHideModelNetRegistered;
	protected bool m_ConfiguredHideModelNetValue;
	protected string m_ConfiguredVisibleModelName;
	protected bool m_ConfiguredVisibleModelDetached;
	protected bool m_ConfiguredVisibleFlagCaptured;
	protected bool m_ConfiguredVisibleFlagWasSet;
	bool m_LedStripRgbEnabled;
	bool m_LedStripRgbUpdateActive;
	bool m_LedStripTerrainRecoveryCheckPending;
	int m_LedStripLastRgbPhase = -1;
	int m_LedStripTerrainRecoveryChecksRemaining;
	string m_LedStripStaticMaterialPath;
	string m_LedStripStaticTexturePath;
	float m_LedStripStaticRed = 255.0;
	float m_LedStripStaticGreen = 255.0;
	float m_LedStripStaticBlue = 255.0;
	float m_LedStripColorScale = 0.18;
	float m_LedStripRgbCycleSpeedSeconds = 10.0;
	ref array<IH_PointLightObject> m_LedStripPointLamps;

	bool IH_IsDayZEditorPreviewObject()
	{
		if (IsHologram())
			return true;

#ifdef DayZEditor
		vector objectPosition = GetPosition();
		return objectPosition[1] > -1001.0 && objectPosition[1] < -999.0;
#else
		return false;
#endif
	}

	bool ShouldActivateLedStripLighting()
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return false;

		InventoryLocation currentLocation = new InventoryLocation();
		if (!GetInventory().GetCurrentInventoryLocation(currentLocation))
			return true;

		int locationType = currentLocation.GetType();
		if (locationType == InventoryLocationType.CARGO || locationType == InventoryLocationType.PROXYCARGO || locationType == InventoryLocationType.ATTACHMENT)
			return false;

		return true;
	}

	bool IH_CanRunTerrainRecovery()
	{
		if (!GetGame())
			return false;

		if (GetGame().IsMultiplayer())
			return GetGame().IsServer();

		return true;
	}

	void IH_StartTerrainRecoveryChecks()
	{
		if (!IH_CanRunTerrainRecovery())
			return;

		IH_StopTerrainRecoveryChecks();
		m_LedStripTerrainRecoveryChecksRemaining = IH_LED_STRIP_TERRAIN_RECOVERY_MAX_CHECKS;
		IH_ScheduleTerrainRecoveryCheck();
	}

	void IH_StopTerrainRecoveryChecks()
	{
		if (m_LedStripTerrainRecoveryCheckPending && GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(IH_CheckTerrainRecovery);

		m_LedStripTerrainRecoveryCheckPending = false;
		m_LedStripTerrainRecoveryChecksRemaining = 0;
	}

	void IH_ScheduleTerrainRecoveryCheck()
	{
		if (!GetGame() || m_LedStripTerrainRecoveryCheckPending || m_LedStripTerrainRecoveryChecksRemaining <= 0)
			return;

		m_LedStripTerrainRecoveryCheckPending = true;
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(IH_CheckTerrainRecovery, IH_LED_STRIP_TERRAIN_RECOVERY_INTERVAL_MS, false);
	}

	bool IH_HasSupportingObjectBelow(vector currentPosition)
	{
		vector rayEnd = currentPosition;
		rayEnd[1] = rayEnd[1] - IH_LED_STRIP_SUPPORT_RAY_DISTANCE;

		vector contactPosition;
		vector contactDirection;
		int contactComponent;
		set<Object> hitObjects = new set<Object>;
		DayZPhysics.RaycastRV(currentPosition, rayEnd, contactPosition, contactDirection, contactComponent, hitObjects, NULL, this, false, false, ObjIntersectView);
		return hitObjects.Count() > 0;
	}

	void IH_CheckTerrainRecovery()
	{
		m_LedStripTerrainRecoveryCheckPending = false;

		if (!IH_CanRunTerrainRecovery() || IsSetForDeletion())
		{
			m_LedStripTerrainRecoveryChecksRemaining = 0;
			return;
		}

		InventoryLocation currentLocation = new InventoryLocation();
		if (!GetInventory().GetCurrentInventoryLocation(currentLocation) || currentLocation.GetType() != InventoryLocationType.GROUND)
		{
			m_LedStripTerrainRecoveryChecksRemaining = 0;
			return;
		}

		vector currentPosition = GetPosition();
		float terrainHeight = GetGame().SurfaceY(currentPosition[0], currentPosition[2]);
		if (currentPosition[1] < terrainHeight - IH_LED_STRIP_TERRAIN_RECOVERY_TOLERANCE && !IH_HasSupportingObjectBelow(currentPosition))
		{
			vector previousPosition = currentPosition;
			currentPosition[1] = terrainHeight + IH_LED_STRIP_TERRAIN_RECOVERY_LIFT;
			SetPosition(currentPosition);
			PlaceOnSurface();
			SetVelocity(this, vector.Zero);
			dBodySetAngularVelocity(this, vector.Zero);
			StopItemDynamicPhysics();
			Print("[IronhordeLighting][WARNING] Recovered thrown LED strip " + GetType() + " from below terrain at " + previousPosition.ToString());
			m_LedStripTerrainRecoveryChecksRemaining = 0;
			return;
		}

		m_LedStripTerrainRecoveryChecksRemaining--;
		IH_ScheduleTerrainRecoveryCheck();
	}

	bool ShouldHideConfiguredModel()
	{
		if (IH_IsDayZEditorPreviewObject())
			return false;

		if (m_ConfiguredHideModelNetValue)
			return true;

		return IH_LightingConfig.ResolveHideModel(GetType(), false);
	}

	void RegisterConfiguredModelNetworking()
	{
		if (m_ConfiguredHideModelNetRegistered)
			return;

		RegisterNetSyncVariableBool("m_ConfiguredHideModelNetValue");
		m_ConfiguredHideModelNetRegistered = true;

		if (GetGame() && GetGame().IsMultiplayer() && GetGame().IsServer())
		{
			m_ConfiguredHideModelNetValue = IH_LightingConfig.ResolveHideModel(GetType(), false);
			SetSynchDirty();
		}
	}

	void ApplyConfiguredModelVisibility()
	{
		if (IH_IsDayZEditorPreviewObject())
			return;

		bool hideConfiguredModel = ShouldHideConfiguredModel();

#ifdef DayZEditor
		if (!GetGame() || !GetGame().IsMultiplayer())
			hideConfiguredModel = false;
#endif

		if (hideConfiguredModel)
		{
			if (!m_ConfiguredVisibleFlagCaptured)
			{
				m_ConfiguredVisibleFlagWasSet = IsFlagSet(EntityFlags.VISIBLE);
				m_ConfiguredVisibleFlagCaptured = true;
			}

			ClearFlags(EntityFlags.VISIBLE, false);

			vobject currentVisibleModel = GetVObject();
			if (currentVisibleModel)
			{
				if (m_ConfiguredVisibleModelName == string.Empty)
					m_ConfiguredVisibleModelName = vtoa(currentVisibleModel);

				SetObject(NULL, "");
			}

			m_ConfiguredVisibleModelDetached = true;
			return;
		}

		if (m_ConfiguredVisibleModelDetached && !GetVObject() && m_ConfiguredVisibleModelName != string.Empty)
		{
			vobject restoredVisibleModel = GetObject(m_ConfiguredVisibleModelName);
			SetObject(restoredVisibleModel, "");
			ReleaseObject(restoredVisibleModel);
		}

		m_ConfiguredVisibleModelDetached = false;

		if (m_ConfiguredVisibleFlagCaptured)
		{
			if (m_ConfiguredVisibleFlagWasSet)
				SetFlags(EntityFlags.VISIBLE, false);

			m_ConfiguredVisibleFlagCaptured = false;
		}
	}

	void RegisterLedStripItem()
	{
		if (IH_IsDayZEditorPreviewObject())
			return;

		RegisterConfiguredModelNetworking();

		if (!s_RegisteredLedStripItems)
			s_RegisteredLedStripItems = new array<IH_LEDStripBase>;

		if (s_RegisteredLedStripItems.Find(this) < 0)
			s_RegisteredLedStripItems.Insert(this);

		ApplyConfiguredModelVisibility();
	}

	void UnregisterLedStripItem()
	{
		if (!s_RegisteredLedStripItems)
			return;

		int itemIndex = s_RegisteredLedStripItems.Find(this);
		if (itemIndex >= 0)
			s_RegisteredLedStripItems.Remove(itemIndex);
	}

	static void RefreshAllLedStripItems()
	{
		if (!s_RegisteredLedStripItems)
			return;

		foreach (IH_LEDStripBase ledStripItem : s_RegisteredLedStripItems)
		{
			if (ledStripItem && !ledStripItem.IH_IsDayZEditorPreviewObject())
			{
				ledStripItem.ApplyConfiguredModelVisibility();
				ledStripItem.RefreshConfiguredLight();
				ledStripItem.ApplyConfiguredModelVisibility();
			}
		}
	}

	override bool IsDeployable()
	{
		return true;
	}

	override void SetActions()
	{
		super.SetActions();
		AddAction(ActionTogglePlaceObject);
		AddAction(ActionPlaceObject);
	}

	void ConfigureLedStrip(float red, float green, float blue, bool rgbEnabled, string materialPath)
	{
		m_LedStripStaticRed = red;
		m_LedStripStaticGreen = green;
		m_LedStripStaticBlue = blue;
		m_LedStripRgbEnabled = rgbEnabled;
		m_LedStripStaticMaterialPath = materialPath;

		if (rgbEnabled)
			m_LedStripStaticTexturePath = BuildLedStripColorTexture(255.0, 235.0, 200.0, 0.075);
		else if (GetType().IndexOf("_1m") >= 0)
			m_LedStripStaticTexturePath = BuildLedStripColorTexture(red, green, blue, 0.085);
		else
			m_LedStripStaticTexturePath = BuildLedStripColorTexture(red, green, blue, 0.12);

		m_LedStripColorScale = 0.32;
		if (IH_IsDayZEditorPreviewObject())
			return;

		RegisterLedStripItem();
		ApplyLedStripStaticMaterial();
	}

	override void EEInit()
	{
		super.EEInit();
		if (IH_IsDayZEditorPreviewObject())
		{
			StopLedStripRgbCycle();
			ClearPointLamp();
			UnregisterLedStripItem();
			return;
		}

		RegisterLedStripItem();
		ApplyConfiguredModelVisibility();
		ApplyLedStripStaticMaterial();
		RefreshConfiguredLight();
	}

	override void OnVariablesSynchronized()
	{
		super.OnVariablesSynchronized();
		ApplyConfiguredModelVisibility();
	}

	override void EEItemLocationChanged(notnull InventoryLocation oldLoc, notnull InventoryLocation newLoc)
	{
		super.EEItemLocationChanged(oldLoc, newLoc);

		if (newLoc.GetType() == InventoryLocationType.GROUND && oldLoc.GetType() == InventoryLocationType.HANDS)
			IH_StartTerrainRecoveryChecks();
		else if (newLoc.GetType() != InventoryLocationType.GROUND)
			IH_StopTerrainRecoveryChecks();
	}

	override void OnItemLocationChanged(EntityAI old_owner, EntityAI new_owner)
	{
		super.OnItemLocationChanged(old_owner, new_owner);
		RefreshConfiguredLight();

		InventoryLocation currentLocation = new InventoryLocation();
		if (GetInventory().GetCurrentInventoryLocation(currentLocation) && currentLocation.GetType() == InventoryLocationType.GROUND)
			IH_StartTerrainRecoveryChecks();
		else
			IH_StopTerrainRecoveryChecks();
	}

	void RefreshConfiguredLight()
	{
		if (IH_IsDayZEditorPreviewObject())
		{
			StopLedStripRgbCycle();
			ClearPointLamp();
			return;
		}

		ApplyConfiguredModelVisibility();
		ApplyLedStripStaticMaterial();
		ClearPointLamp();
		if (ShouldActivateLedStripLighting())
			SpawnLedStripPointLights();
		RefreshLedStripRgbCycle();
	}

	void ApplyLedStripStaticMaterial()
	{
		if (IH_IsDayZEditorPreviewObject())
			return;

		if (m_LedStripStaticTexturePath != string.Empty)
			SetObjectTexture(0, m_LedStripStaticTexturePath);

		if (m_LedStripStaticMaterialPath != string.Empty)
			SetObjectMaterial(0, m_LedStripStaticMaterialPath);
	}

	string BuildLedStripColorTexture(float red, float green, float blue, float alpha)
	{
		float normalizedRed = red / 255.0;
		float normalizedGreen = green / 255.0;
		float normalizedBlue = blue / 255.0;
		return "#(argb,8,8,3)color(" + normalizedRed.ToString() + "," + normalizedGreen.ToString() + "," + normalizedBlue.ToString() + "," + alpha.ToString() + ",ca)";
	}

	float GetLedStripDefaultBrightness()
	{
		if (GetType().IndexOf("_4m") >= 0)
			return 0.22;
		if (GetType().IndexOf("_2m") >= 0)
			return 0.15;

		return 0.10;
	}

	float GetLedStripDefaultRadius()
	{
		if (GetType().IndexOf("_4m") >= 0)
			return 2.35;
		if (GetType().IndexOf("_2m") >= 0)
			return 1.75;

		return 1.25;
	}

	float GetLedStripDefaultFadeRadius()
	{
		if (GetType().IndexOf("_4m") >= 0)
			return 3.35;
		if (GetType().IndexOf("_2m") >= 0)
			return 2.60;

		return 1.90;
	}

	float GetLedStripLengthMeters()
	{
		if (GetType().IndexOf("_4m") >= 0)
			return 4.0;
		if (GetType().IndexOf("_2m") >= 0)
			return 2.0;

		return 1.0;
	}

	int GetLedStripLightCount()
	{
		if (GetType().IndexOf("_4m") >= 0)
			return 4;
		if (GetType().IndexOf("_2m") >= 0)
			return 3;

		return 2;
	}

	float GetLedStripLightBrightnessDivisor(int lampCount)
	{
		if (lampCount <= 1)
			return 1.0;

		return lampCount;
	}

	float GetLedStripLightXOffset(int lampIndex, int lampCount)
	{
		float lengthMeters = GetLedStripLengthMeters();

		if (lampCount <= 1)
			return 0.0;

		float usableLength = lengthMeters * 0.88;
		float startOffset = usableLength * -0.5;
		float step = usableLength / (lampCount - 1);

		return startOffset + (step * lampIndex);
	}

	void SpawnLedStripPointLights()
	{
		if (!ShouldActivateLedStripLighting())
			return;

		IH_CreateLedStripLightArray();

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), m_LedStripStaticRed, m_LedStripStaticGreen, m_LedStripStaticBlue, m_LedStripColorScale, GetLedStripDefaultBrightness(), GetLedStripDefaultRadius(), GetLedStripDefaultFadeRadius(), 0.0, 0.0, 0.0);
		lightSettings.visibleindaylight = false;
		lightSettings.castshadow = false;
		lightSettings.flarevisible = false;
		lightSettings.totalbrightnessscale = m_LedStripColorScale;
		lightSettings.ambientred = 0.0;
		lightSettings.ambientgreen = 0.0;
		lightSettings.ambientblue = 0.0;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		lightSettings.castshadow = false;
		lightSettings.totalbrightnessscale = m_LedStripColorScale;

		if (lightSettings.lightbrightness <= 0.0 || lightSettings.beamlengthradius <= 0.0)
			return;

		int lampCount = GetLedStripLightCount();
		if (lampCount <= 0)
			return;

		float originalBrightness = lightSettings.lightbrightness;
		lightSettings.lightbrightness = originalBrightness / GetLedStripLightBrightnessDivisor(lampCount);

		for (int lampIndex = 0; lampIndex < lampCount; lampIndex++)
		{
			IH_PointLightObject stripLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
			if (stripLamp)
			{
				float xOffset = GetLedStripLightXOffset(lampIndex, lampCount);
				stripLamp.AttachOnObject(this, Vector(xOffset, 0.08, 0.0));
				stripLamp.ConfigureFromSettings(lightSettings);
				m_LedStripPointLamps.Insert(stripLamp);
			}
		}
	}

	void IH_CreateLedStripLightArray()
	{
		if (!m_LedStripPointLamps)
			m_LedStripPointLamps = new array<IH_PointLightObject>;
	}

	void RefreshLedStripRgbCycle()
	{
		if (IH_IsDayZEditorPreviewObject() || !m_LedStripRgbEnabled || !ShouldActivateLedStripLighting())
		{
			StopLedStripRgbCycle();
			return;
		}

		m_LedStripRgbCycleSpeedSeconds = IH_LightingConfig.GetRgbCycleSpeed(GetType(), IH_LED_STRIP_DEFAULT_RGB_SPEED_SECONDS);
		if (m_LedStripRgbCycleSpeedSeconds <= 0.0)
			m_LedStripRgbCycleSpeedSeconds = IH_LED_STRIP_DEFAULT_RGB_SPEED_SECONDS;

		UpdateLedStripRgb();
		StartLedStripRgbCycle();
	}

	void StartLedStripRgbCycle()
	{
		if (IH_IsDayZEditorPreviewObject() || !ShouldActivateLedStripLighting() || m_LedStripRgbUpdateActive)
			return;

		GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).CallLater(UpdateLedStripRgb, IH_LED_STRIP_RGB_UPDATE_MS, true);
		m_LedStripRgbUpdateActive = true;
	}

	void StopLedStripRgbCycle()
	{
		if (!m_LedStripRgbUpdateActive)
			return;

		if (GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).Remove(UpdateLedStripRgb);

		m_LedStripRgbUpdateActive = false;
		m_LedStripLastRgbPhase = -1;
	}

	void UpdateLedStripRgb()
	{
		if (IH_IsDayZEditorPreviewObject() || !m_LedStripRgbEnabled || !GetGame())
			return;

		if (!ShouldActivateLedStripLighting())
		{
			StopLedStripRgbCycle();
			ClearPointLamp();
			return;
		}

		float red;
		float green;
		float blue;
		float phase;
		GetLedStripRgbColor(red, green, blue, phase);

		if (m_LedStripPointLamps)
		{
			foreach (IH_PointLightObject stripLamp : m_LedStripPointLamps)
			{
				if (stripLamp)
					stripLamp.SetColor(red, green, blue, m_LedStripColorScale);
			}
		}

	}

	void GetLedStripRgbColor(out float red, out float green, out float blue, out float phase)
	{
		int currentTimeMs = GetGame().GetTime();
		int cycleTimeMs = m_LedStripRgbCycleSpeedSeconds * 1000.0;
		if (cycleTimeMs <= 0)
			cycleTimeMs = IH_LED_STRIP_DEFAULT_RGB_SPEED_SECONDS * 1000.0;

		int phaseTimeMs = currentTimeMs % cycleTimeMs;
		phase = phaseTimeMs / (cycleTimeMs * 1.0);

		float hue = phase * 6.0;
		int sector = 0;
		if (hue >= 5.0)
			sector = 5;
		else if (hue >= 4.0)
			sector = 4;
		else if (hue >= 3.0)
			sector = 3;
		else if (hue >= 2.0)
			sector = 2;
		else if (hue >= 1.0)
			sector = 1;

		float localPhase = hue - sector;
		float up = localPhase * 255.0;
		float down = (1.0 - localPhase) * 255.0;

		switch (sector)
		{
			case 0:
				red = 255.0;
				green = up;
				blue = 0.0;
				break;
			case 1:
				red = down;
				green = 255.0;
				blue = 0.0;
				break;
			case 2:
				red = 0.0;
				green = 255.0;
				blue = up;
				break;
			case 3:
				red = 0.0;
				green = down;
				blue = 255.0;
				break;
			case 4:
				red = up;
				green = 0.0;
				blue = 255.0;
				break;
			default:
				red = 255.0;
				green = 0.0;
				blue = down;
				break;
		}
	}

	void ClearPointLamp()
	{
		if (!m_LedStripPointLamps)
			return;

		foreach (IH_PointLightObject stripLamp : m_LedStripPointLamps)
		{
			if (stripLamp)
				stripLamp.Destroy();
		}

		m_LedStripPointLamps.Clear();
	}

	override void EEDelete(EntityAI parent)
	{
		IH_StopTerrainRecoveryChecks();
		StopLedStripRgbCycle();
		ClearPointLamp();
		UnregisterLedStripItem();
		super.EEDelete(parent);
	}
}

class IH_LEDStrip_Red_1m extends IH_LEDStripBase
{
	void IH_LEDStrip_Red_1m()
	{
		ConfigureLedStrip(255.0, 0.0, 0.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Red_1m_Dim.rvmat");
	}
}

class IH_LEDStrip_Green_1m extends IH_LEDStripBase
{
	void IH_LEDStrip_Green_1m()
	{
		ConfigureLedStrip(0.0, 255.0, 0.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Green_1m_Dim.rvmat");
	}
}

class IH_LEDStrip_Blue_1m extends IH_LEDStripBase
{
	void IH_LEDStrip_Blue_1m()
	{
		ConfigureLedStrip(0.0, 20.0, 255.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Blue_1m_Dim.rvmat");
	}
}

class IH_LEDStrip_Cyan_1m extends IH_LEDStripBase
{
	void IH_LEDStrip_Cyan_1m()
	{
		ConfigureLedStrip(0.0, 255.0, 255.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Cyan_1m_Dim.rvmat");
	}
}

class IH_LEDStrip_White_1m extends IH_LEDStripBase
{
	void IH_LEDStrip_White_1m()
	{
		ConfigureLedStrip(255.0, 235.0, 200.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_White_1m_Dim.rvmat");
	}
}

class IH_LEDStrip_RGB_1m extends IH_LEDStripBase
{
	void IH_LEDStrip_RGB_1m()
	{
		ConfigureLedStrip(255.0, 0.0, 0.0, true, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_RGB_StaticWhite_Dim.rvmat");
	}
}

class IH_LEDStrip_Red_2m extends IH_LEDStripBase
{
	void IH_LEDStrip_Red_2m()
	{
		ConfigureLedStrip(255.0, 0.0, 0.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Red.rvmat");
	}
}

class IH_LEDStrip_Green_2m extends IH_LEDStripBase
{
	void IH_LEDStrip_Green_2m()
	{
		ConfigureLedStrip(0.0, 255.0, 0.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Green.rvmat");
	}
}

class IH_LEDStrip_Blue_2m extends IH_LEDStripBase
{
	void IH_LEDStrip_Blue_2m()
	{
		ConfigureLedStrip(0.0, 20.0, 255.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Blue.rvmat");
	}
}

class IH_LEDStrip_Cyan_2m extends IH_LEDStripBase
{
	void IH_LEDStrip_Cyan_2m()
	{
		ConfigureLedStrip(0.0, 255.0, 255.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Cyan.rvmat");
	}
}

class IH_LEDStrip_White_2m extends IH_LEDStripBase
{
	void IH_LEDStrip_White_2m()
	{
		ConfigureLedStrip(255.0, 235.0, 200.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_White.rvmat");
	}
}

class IH_LEDStrip_RGB_2m extends IH_LEDStripBase
{
	void IH_LEDStrip_RGB_2m()
	{
		ConfigureLedStrip(255.0, 0.0, 0.0, true, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_RGB_StaticWhite_Dim.rvmat");
	}
}

class IH_LEDStrip_Red_4m extends IH_LEDStripBase
{
	void IH_LEDStrip_Red_4m()
	{
		ConfigureLedStrip(255.0, 0.0, 0.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Red.rvmat");
	}
}

class IH_LEDStrip_Green_4m extends IH_LEDStripBase
{
	void IH_LEDStrip_Green_4m()
	{
		ConfigureLedStrip(0.0, 255.0, 0.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Green.rvmat");
	}
}

class IH_LEDStrip_Blue_4m extends IH_LEDStripBase
{
	void IH_LEDStrip_Blue_4m()
	{
		ConfigureLedStrip(0.0, 20.0, 255.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Blue.rvmat");
	}
}

class IH_LEDStrip_Cyan_4m extends IH_LEDStripBase
{
	void IH_LEDStrip_Cyan_4m()
	{
		ConfigureLedStrip(0.0, 255.0, 255.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Cyan.rvmat");
	}
}

class IH_LEDStrip_White_4m extends IH_LEDStripBase
{
	void IH_LEDStrip_White_4m()
	{
		ConfigureLedStrip(255.0, 235.0, 200.0, false, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_White.rvmat");
	}
}

class IH_LEDStrip_RGB_4m extends IH_LEDStripBase
{
	void IH_LEDStrip_RGB_4m()
	{
		ConfigureLedStrip(255.0, 0.0, 0.0, true, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_RGB_StaticWhite_Dim.rvmat");
	}
}

class IH_Searchlight_Static extends IH_RotatingBeaconBase
{
	void IH_Searchlight_Static()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 245, 220, 0.25, 0.171875, 120.0, 0.0, -5.0, false, 1.0, 18.0);
	}
}

class IH_Searchlight_Rotating extends IH_RotatingBeaconBase
{
	void IH_Searchlight_Rotating()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnRotatingBeacon(255, 245, 220, 0.25, 0.1796875, 120.0, 18.0, -5.0, false, 1.0, 18.0);
	}
}

class IH_Searchlight_SlowSweep extends IH_SweepingBeaconBase
{
	void IH_Searchlight_SlowSweep()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredSweepPattern()
	{
		SpawnSweepingBeacon(255, 245, 220, 0.25, 0.1796875, 120.0, 66.0, 28.8, 0.55, 22.5, -5.0, 18.0);
	}
}

class IH_Flicker_Fluorescent_Weak extends IH_GenericPointLightBase
{
	void IH_Flicker_Fluorescent_Weak()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SetConfiguredPointFlags(false, true, false, false, 1.0, 1.0);
		SetConfiguredPointDynamics(1.5, 0.01, 0.75, 0.01);
		SpawnConfiguredPointLight(235, 245, 255, 0.2125, 0.007, 8.0, 11.0, 0.35, 0.38, 0.42);
	}
}

class IH_Flicker_Fluorescent_Medium extends IH_GenericPointLightBase
{
	void IH_Flicker_Fluorescent_Medium()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SetConfiguredPointFlags(false, true, false, false, 1.0, 1.0);
		SetConfiguredPointDynamics(3.0, 0.05, 1.5, 0.03);
		SpawnConfiguredPointLight(235, 245, 255, 0.2125, 0.008, 10.0, 13.0, 0.35, 0.38, 0.42);
	}
}

class IH_Flicker_Fluorescent_Strong extends IH_GenericPointLightBase
{
	void IH_Flicker_Fluorescent_Strong()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SetConfiguredPointFlags(false, true, false, false, 1.0, 1.0);
		SetConfiguredPointDynamics(6.0, 0.14, 2.5, 0.07);
		SpawnConfiguredPointLight(235, 245, 255, 0.2125, 0.009, 12.0, 15.0, 0.35, 0.38, 0.42);
	}
}

class IH_Flicker_Fluorescent_Random extends IH_GenericPointLightBase
{
	void IH_Flicker_Fluorescent_Random()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SetConfiguredPointFlags(false, true, false, false, 1.0, 1.0);
		SetConfiguredPointDynamics(8.0, 0.10, 4.0, 0.08);
		SpawnConfiguredPointLight(235, 245, 255, 0.2125, 0.0085, 11.0, 14.0, 0.35, 0.38, 0.42);
	}
}

class IH_Flicker_Fluorescent_Dying extends IH_GenericPointLightBase
{
	void IH_Flicker_Fluorescent_Dying()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SetConfiguredPointFlags(false, true, false, false, 1.0, 1.0);
		SetConfiguredPointDynamics(10.0, 0.22, 3.0, 0.12);
		SpawnConfiguredPointLight(225, 240, 255, 0.20, 0.0075, 10.0, 13.0, 0.30, 0.34, 0.38);
	}
}

class IH_Flicker_House_Outside_Entrance extends IH_GenericPointLightBase
{
	void IH_Flicker_House_Outside_Entrance()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override vector GetPointLightOffset()
	{
		return Vector(0.0, -1.1, 0.0);
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SetConfiguredPointFlags(false, true, true, false, 1.0, 1.0);
		SetConfiguredPointDynamics(0.0, 0.0, 0.0, 0.0);
		SetConfiguredPointTimedPattern({
			343, 312, 90, 156, 90, 281, 90, 2390, 258, 90,
			4390, 242, 90, 156, 539, 90, 90, 90, 90, 258,
			90, 234, 90, 156, 4554, 90, 812, 187, 1547, 5495,
			90, 414, 680, 570, 90, 460
		}, true, 0.25);
		SpawnConfiguredPointLight(222, 197, 78, 0.8, 0.0533, 1.33335, 1.83335, 0.87, 0.77, 0.31);
	}
}

class IH_Alarm_Bunker_RedPulse extends IH_GenericPointLightBase
{
	void IH_Alarm_Bunker_RedPulse()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPointLamp();
		SetConfiguredPointFlags(false, true, false, true, 1.1, 0.0);
		SetConfiguredPointDynamics(0.0, 0.0, 0.0, 0.0);
		SpawnConfiguredPointLight(255, 0, 0, 0.5, 0.05, 3.25, 4.25, 0.125, 0.0, 0.0);
	}
}

class IH_PoliceLightBase extends IH_ConfigurableLightEntityBase
{
	static const int IH_POLICE_DAYLIGHT_VISUAL_UPDATE_MS = 25;

	protected ref array<IH_PointLightObject> m_PoliceLamps;
	protected ref array<int> m_DaylightVisualDurationsMs;
	protected ref array<vector> m_DaylightVisualColors;
	protected int m_DaylightVisualIndex;
	protected float m_DaylightVisualElapsedMs;
	protected bool m_DaylightVisualActive;

	void IH_PoliceLightBase()
	{
		m_PoliceLamps = new array<IH_PointLightObject>;

#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
	}

	protected string BuildLampAssetName(string suffix)
	{
		return GetType() + suffix;
	}

	override bool ShouldHideConfiguredModel()
	{
		if (IH_IsDayZEditorPreviewObject())
			return false;

		if (GetType().IndexOf("RoadWarning_") == 0)
			return IH_LightingConfig.ResolveHideModel(BuildLampAssetName("_Center"), false);

		return IH_LightingConfig.ResolveHideModel(BuildLampAssetName("_Left"), false) || IH_LightingConfig.ResolveHideModel(BuildLampAssetName("_Right"), false);
	}

	protected void ClearPoliceLamps()
	{
		StopDaylightVisualPattern();

		if (!m_PoliceLamps)
			return;

		foreach (IH_PointLightObject policeLamp : m_PoliceLamps)
		{
			if (policeLamp)
				policeLamp.Destroy();
		}

		m_PoliceLamps.Clear();
	}

	protected bool ShouldUseDaylightMaterialVisual()
	{
		return IH_ShouldCreateClientLighting() && !IH_IsDayZEditorPreviewObject() && IH_LightingConfig.ShouldUseDaytimePoliceMaterialVisual(GetType());
	}

	protected ref array<vector> BuildCombinedDaylightVisualColors(array<vector> leftColors, array<vector> rightColors)
	{
		ref array<vector> combinedColors = new array<vector>;
		int colorCount = 0;

		if (leftColors)
			colorCount = leftColors.Count();
		if (rightColors && rightColors.Count() > colorCount)
			colorCount = rightColors.Count();

		for (int colorIndex = 0; colorIndex < colorCount; colorIndex++)
		{
			vector leftColor = Vector(0.0, 0.0, 0.0);
			vector rightColor = Vector(0.0, 0.0, 0.0);

			if (leftColors && colorIndex < leftColors.Count())
				leftColor = leftColors.Get(colorIndex);
			if (rightColors && colorIndex < rightColors.Count())
				rightColor = rightColors.Get(colorIndex);

			if (IsDaylightVisualColorActive(leftColor))
				combinedColors.Insert(leftColor);
			else
				combinedColors.Insert(rightColor);
		}

		return combinedColors;
	}

	protected bool IsDaylightVisualColorActive(vector color)
	{
		return color[0] > 0.01 || color[1] > 0.01 || color[2] > 0.01;
	}

	protected void StartDaylightVisualPattern(array<int> patternDurationsMs, array<vector> patternColors)
	{
		StopDaylightVisualPattern();

		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject() || !patternDurationsMs || !patternColors || patternDurationsMs.Count() == 0 || patternDurationsMs.Count() != patternColors.Count())
			return;

		m_DaylightVisualDurationsMs = new array<int>;
		m_DaylightVisualColors = new array<vector>;

		foreach (int durationMs : patternDurationsMs)
		{
			int visualDurationMs = durationMs;
			if (visualDurationMs < IH_POLICE_DAYLIGHT_VISUAL_UPDATE_MS)
				visualDurationMs = IH_POLICE_DAYLIGHT_VISUAL_UPDATE_MS;

			m_DaylightVisualDurationsMs.Insert(visualDurationMs);
		}

		foreach (vector color : patternColors)
		{
			m_DaylightVisualColors.Insert(color);
		}

		m_DaylightVisualIndex = 0;
		m_DaylightVisualElapsedMs = 0.0;
		m_DaylightVisualActive = true;
		ApplyDaylightVisualColor(m_DaylightVisualColors.Get(m_DaylightVisualIndex));
		GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).CallLater(UpdateDaylightVisualPattern, IH_POLICE_DAYLIGHT_VISUAL_UPDATE_MS, true);
	}

	protected void StopDaylightVisualPattern()
	{
		if (m_DaylightVisualActive && GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_GAMEPLAY).Remove(UpdateDaylightVisualPattern);

		m_DaylightVisualActive = false;
		m_DaylightVisualIndex = 0;
		m_DaylightVisualElapsedMs = 0.0;
		m_DaylightVisualDurationsMs = null;
		m_DaylightVisualColors = null;

		if (IH_ShouldCreateClientLighting() && !IH_IsDayZEditorPreviewObject())
			ApplyDaylightVisualDefault();
	}

	protected void UpdateDaylightVisualPattern()
	{
		if (!m_DaylightVisualActive || !m_DaylightVisualDurationsMs || !m_DaylightVisualColors || m_DaylightVisualDurationsMs.Count() == 0)
			return;

		m_DaylightVisualElapsedMs = m_DaylightVisualElapsedMs + IH_POLICE_DAYLIGHT_VISUAL_UPDATE_MS;
		int currentDurationMs = m_DaylightVisualDurationsMs.Get(m_DaylightVisualIndex);

		while (m_DaylightVisualElapsedMs >= currentDurationMs)
		{
			m_DaylightVisualElapsedMs = m_DaylightVisualElapsedMs - currentDurationMs;
			m_DaylightVisualIndex++;
			if (m_DaylightVisualIndex >= m_DaylightVisualDurationsMs.Count())
				m_DaylightVisualIndex = 0;

			currentDurationMs = m_DaylightVisualDurationsMs.Get(m_DaylightVisualIndex);
			ApplyDaylightVisualColor(m_DaylightVisualColors.Get(m_DaylightVisualIndex));
		}
	}

	protected void ApplyDaylightVisualDefault()
	{
		SetObjectTexture(0, "#(argb,8,8,3)color(1.000000,1.000000,1.000000,1.000000,co)");
		SetObjectMaterial(0, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_RGB_StaticWhite_Dim.rvmat");
	}

	protected void ApplyDaylightVisualColor(vector color)
	{
		if (!IsDaylightVisualColorActive(color))
		{
			SetObjectTexture(0, "#(argb,8,8,3)color(0.000000,0.000000,0.000000,0.000000,co)");
			SetObjectMaterial(0, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_Off.rvmat");
			return;
		}

		float red = color[0];
		float green = color[1];
		float blue = color[2];

		if (blue > red && blue > green)
		{
			SetObjectTexture(0, "#(argb,8,8,3)color(0.000000,0.078431,1.000000,1.000000,ca)");
			SetObjectMaterial(0, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_DaylightBlue.rvmat");
			return;
		}

		if (green > red && green > blue)
		{
			SetObjectTexture(0, "#(argb,8,8,3)color(0.000000,1.000000,0.000000,1.000000,ca)");
			SetObjectMaterial(0, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_DaylightGreen.rvmat");
			return;
		}

		if (red > 0.01 && green > 0.01 && blue < 0.01)
		{
			SetObjectTexture(0, "#(argb,8,8,3)color(1.000000,0.611765,0.000000,1.000000,ca)");
			SetObjectMaterial(0, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_DaylightAmber.rvmat");
			return;
		}

		SetObjectTexture(0, "#(argb,8,8,3)color(1.000000,0.000000,0.000000,1.000000,ca)");
		SetObjectMaterial(0, "IronhordeLighting/data/materials/ledstrip/IH_LEDStrip_DaylightRed.rvmat");
	}

	protected ref array<int> BuildBurstLeadDurations(int flashOnMs, int flashGapMs, int switchPauseMs = 0)
	{
		ref array<int> patternDurationsMs = new array<int>;
		int otherSideBurstDurationMs = (flashOnMs * 6) + (flashGapMs * 5);

		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(switchPauseMs);
		patternDurationsMs.Insert(otherSideBurstDurationMs + switchPauseMs);
		return patternDurationsMs;
	}

	protected ref array<int> BuildBurstFollowDurations(int flashOnMs, int flashGapMs, int switchPauseMs = 0)
	{
		ref array<int> patternDurationsMs = new array<int>;
		int leadingBurstDurationMs = (flashOnMs * 6) + (flashGapMs * 5);

		patternDurationsMs.Insert(leadingBurstDurationMs);
		patternDurationsMs.Insert(switchPauseMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(switchPauseMs);
		return patternDurationsMs;
	}

	protected vector GetPoliceFlashColor(bool useRedFlash, int colorMode = 0)
	{
		if (colorMode == 1)
			return Vector(255.0, 0.0, 0.0);
		if (colorMode == 2)
			return Vector(0.0, 40.0, 255.0);
		if (useRedFlash)
			return Vector(255.0, 0.0, 0.0);

		return Vector(0.0, 40.0, 255.0);
	}

	protected ref array<vector> BuildBurstLeadColors(int colorMode = 0)
	{
		ref array<vector> patternColors = new array<vector>;

		patternColors.Insert(GetPoliceFlashColor(true, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(false, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(true, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(false, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(true, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(false, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		return patternColors;
	}

	protected ref array<vector> BuildBurstFollowColors(int colorMode = 0)
	{
		ref array<vector> patternColors = new array<vector>;

		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(true, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(false, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(true, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(false, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(true, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		patternColors.Insert(GetPoliceFlashColor(false, colorMode));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		return patternColors;
	}

	protected ref array<int> BuildWarningDurations(int onMs, int offMs)
	{
		ref array<int> patternDurationsMs = new array<int>;
		patternDurationsMs.Insert(onMs);
		patternDurationsMs.Insert(offMs);
		return patternDurationsMs;
	}

	protected ref array<vector> BuildWarningColors(float red, float green, float blue)
	{
		ref array<vector> patternColors = new array<vector>;
		patternColors.Insert(Vector(red, green, blue));
		patternColors.Insert(Vector(0.0, 0.0, 0.0));
		return patternColors;
	}

	protected void SpawnPoliceLamp(string assetSuffix, vector offset, float colorScale, float brightness, float radius, float fadeRadius, float ambientRed, float ambientGreen, float ambientBlue, array<int> timedColorDurationsMs, array<vector> timedColorPattern)
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(BuildLampAssetName(assetSuffix), 255, 0, 0, colorScale, brightness, radius, fadeRadius, ambientRed, ambientGreen, ambientBlue);
		lightSettings.visibleindaylight = true;
		lightSettings.castshadow = false;
		lightSettings.flarevisible = true;
		lightSettings.strobeenabled = false;
		lightSettings.signalpatternenabled = false;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		IH_PointLightObject policeLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!policeLamp)
		{
			Print("[IronhordeLighting][ERROR] Failed to create police lamp " + lightSettings.assetname);
			return;
		}

		policeLamp.AttachOnObject(this, offset);
		policeLamp.ConfigureFromSettings(lightSettings);
		if (timedColorDurationsMs && timedColorPattern && timedColorDurationsMs.Count() > 0 && timedColorDurationsMs.Count() == timedColorPattern.Count())
			policeLamp.ConfigureTimedColorPattern(timedColorDurationsMs, timedColorPattern);

		m_PoliceLamps.Insert(policeLamp);
	}

	protected void SpawnPoliceLampPair(int flashOnMs, int flashGapMs, float brightness, float radius, float fadeRadius, int switchPauseMs = 0, int colorMode = 0)
	{
		ref array<int> leftDurationsMs = BuildBurstLeadDurations(flashOnMs, flashGapMs, switchPauseMs);
		ref array<int> rightDurationsMs = BuildBurstFollowDurations(flashOnMs, flashGapMs, switchPauseMs);
		ref array<vector> leftColors = BuildBurstLeadColors(colorMode);
		ref array<vector> rightColors = BuildBurstFollowColors(colorMode);

		if (ShouldUseDaylightMaterialVisual())
		{
			StartDaylightVisualPattern(leftDurationsMs, BuildCombinedDaylightVisualColors(leftColors, rightColors));
			if (IH_LightingConfig.ResolveFlareVisible(BuildLampAssetName("_Left"), true))
				SpawnPoliceLamp("_Left", Vector(-0.32, 0.08, 0.0), 0.9, brightness, radius, fadeRadius, 0.0, 0.0, 0.0, leftDurationsMs, leftColors);
			if (IH_LightingConfig.ResolveFlareVisible(BuildLampAssetName("_Right"), true))
				SpawnPoliceLamp("_Right", Vector(0.32, 0.08, 0.0), 0.9, brightness, radius, fadeRadius, 0.0, 0.0, 0.0, rightDurationsMs, rightColors);
			return;
		}

		SpawnPoliceLamp("_Left", Vector(-0.32, 0.08, 0.0), 0.9, brightness, radius, fadeRadius, 0.0, 0.0, 0.0, leftDurationsMs, leftColors);
		SpawnPoliceLamp("_Right", Vector(0.32, 0.08, 0.0), 0.9, brightness, radius, fadeRadius, 0.0, 0.0, 0.0, rightDurationsMs, rightColors);
	}

	protected void SpawnRoadWarningLamp(float red, float green, float blue, int onMs, int offMs, float brightness = 0.0675, float radius = 3.375, float fadeRadius = 4.6875)
	{
		ref array<int> patternDurationsMs = BuildWarningDurations(onMs, offMs);
		ref array<vector> patternColors = BuildWarningColors(red, green, blue);

		SpawnPoliceLamp("_Center", Vector(0.0, 0.3, 0.0), 0.9, brightness, radius, fadeRadius, 0.0, 0.0, 0.0, patternDurationsMs, patternColors);
	}

	override void EEDelete(EntityAI parent)
	{
		ClearPoliceLamps();
		super.EEDelete(parent);
	}
}

class IH_PoliceLight_Static_Forward_Flash_Base extends IH_Searchlight_Static
{
	protected ref array<int> BuildForwardFlashDurations(int flashOnMs, int flashGapMs, int switchPauseMs = 0)
	{
		ref array<int> patternDurationsMs = new array<int>;
		int otherSideBurstDurationMs = (flashOnMs * 6) + (flashGapMs * 5);

		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(flashGapMs);
		patternDurationsMs.Insert(flashOnMs);
		patternDurationsMs.Insert(switchPauseMs);
		patternDurationsMs.Insert(otherSideBurstDurationMs + switchPauseMs);
		return patternDurationsMs;
	}

	protected void SpawnForwardFlashSearchlight(float red, float green, float blue, int flashOnMs, int flashGapMs, int switchPauseMs = 0)
	{
		ref array<int> patternDurationsMs = BuildForwardFlashDurations(flashOnMs, flashGapMs, switchPauseMs);
		SpawnLayeredRotatingBeacon(red, green, blue, 0.45, 0.55, 90.0, 42.0, 16.0, 0.0, -4.0, 38.0);
		SetBeaconRotationEnabled(false);
		ConfigureBeaconTimedPattern(patternDurationsMs);
	}
}

class IH_PoliceLight_Static_Forward_Flash_Red_01 extends IH_PoliceLight_Static_Forward_Flash_Base
{
	void IH_PoliceLight_Static_Forward_Flash_Red_01()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultYMinus12Z90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnForwardFlashSearchlight(255, 0, 0, 55, 40, 400);
	}
}

class IH_PoliceLight_Static_Forward_Flash_Red_02 extends IH_PoliceLight_Static_Forward_Flash_Base
{
	void IH_PoliceLight_Static_Forward_Flash_Red_02()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultYMinus12Z90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnForwardFlashSearchlight(255, 0, 0, 120, 90);
	}
}

class IH_PoliceLight_Static_Forward_Flash_Blue_01 extends IH_PoliceLight_Static_Forward_Flash_Base
{
	void IH_PoliceLight_Static_Forward_Flash_Blue_01()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultYMinus12Z90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnForwardFlashSearchlight(0, 40, 255, 55, 40, 400);
	}
}

class IH_PoliceLight_Static_Forward_Flash_Blue_02 extends IH_PoliceLight_Static_Forward_Flash_Base
{
	void IH_PoliceLight_Static_Forward_Flash_Blue_02()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultYMinus12Z90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnForwardFlashSearchlight(0, 40, 255, 120, 90);
	}
}

class IH_PoliceLight_Static_Forward_Flash_White_01 extends IH_PoliceLight_Static_Forward_Flash_Base
{
	void IH_PoliceLight_Static_Forward_Flash_White_01()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultYMinus12Z90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnForwardFlashSearchlight(255, 255, 255, 55, 40, 400);
	}
}

class IH_PoliceLight_Static_Forward_Flash_White_02 extends IH_PoliceLight_Static_Forward_Flash_Base
{
	void IH_PoliceLight_Static_Forward_Flash_White_02()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultYMinus12Z90();
#endif
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void SpawnConfiguredBeaconPattern()
	{
		SpawnForwardFlashSearchlight(255, 255, 255, 120, 90);
	}
}

class IH_PoliceLight_US_Classic extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_Classic()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(55, 40, 0.095, 4.75, 6.5, 400);
	}
}

class IH_PoliceLight_US_FastAlt extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_FastAlt()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(60, 45, 0.0925, 4.5, 6.25);
	}
}

class IH_PoliceLight_US_Classic_RedOnly extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_Classic_RedOnly()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(55, 40, 0.095, 4.75, 6.5, 400, 1);
	}
}

class IH_PoliceLight_US_FastAlt_RedOnly extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_FastAlt_RedOnly()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(60, 45, 0.0925, 4.5, 6.25, 0, 1);
	}
}

class IH_PoliceLight_US_SlowAlt extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_SlowAlt()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(120, 90, 0.0925, 4.5, 6.25);
	}
}

class IH_PoliceLight_US_SlowAlt_RedOnly extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_SlowAlt_RedOnly()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(120, 90, 0.0925, 4.5, 6.25, 0, 1);
	}
}

class IH_PoliceLight_US_CrossPhase extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_CrossPhase()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(35, 25, 0.0825, 4.25, 5.75);
	}
}

class IH_PoliceLight_US_CrossPhase_RedOnly extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_CrossPhase_RedOnly()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(35, 25, 0.0825, 4.25, 5.75, 0, 1);
	}
}

class IH_PoliceLight_US_Classic_BlueOnly extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_Classic_BlueOnly()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(55, 40, 0.095, 4.75, 6.5, 400, 2);
	}
}

class IH_PoliceLight_US_FastAlt_BlueOnly extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_FastAlt_BlueOnly()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(60, 45, 0.0925, 4.5, 6.25, 0, 2);
	}
}

class IH_PoliceLight_US_SlowAlt_BlueOnly extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_SlowAlt_BlueOnly()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(120, 90, 0.0925, 4.5, 6.25, 0, 2);
	}
}

class IH_PoliceLight_US_CrossPhase_BlueOnly extends IH_PoliceLightBase
{
	void IH_PoliceLight_US_CrossPhase_BlueOnly()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnPoliceLampPair(35, 25, 0.0825, 4.25, 5.75, 0, 2);
	}
}

class RoadWarning_Yellow_01 extends IH_PoliceLightBase
{
	void RoadWarning_Yellow_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 255.0, 0.0, 3000, 3000);
	}
}

class RoadWarning_Yellow_02 extends IH_PoliceLightBase
{
	void RoadWarning_Yellow_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 255.0, 0.0, 2000, 2000);
	}
}

class RoadWarning_Yellow_03 extends IH_PoliceLightBase
{
	void RoadWarning_Yellow_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 255.0, 0.0, 1000, 1000);
	}
}

class RoadWarning_Yellow_04 extends IH_PoliceLightBase
{
	void RoadWarning_Yellow_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 255.0, 0.0, 500, 500);
	}
}

class RoadWarning_Orange_01 extends IH_PoliceLightBase
{
	void RoadWarning_Orange_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 60.0, 0.0, 3000, 3000);
	}
}

class RoadWarning_Orange_02 extends IH_PoliceLightBase
{
	void RoadWarning_Orange_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 60.0, 0.0, 2000, 2000);
	}
}

class RoadWarning_Orange_03 extends IH_PoliceLightBase
{
	void RoadWarning_Orange_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 60.0, 0.0, 1000, 1000);
	}
}

class RoadWarning_Orange_04 extends IH_PoliceLightBase
{
	void RoadWarning_Orange_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 60.0, 0.0, 500, 500);
	}
}

class RoadWarning_Red_01 extends IH_PoliceLightBase
{
	void RoadWarning_Red_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 0.0, 0.0, 3000, 3000);
	}
}

class RoadWarning_Red_02 extends IH_PoliceLightBase
{
	void RoadWarning_Red_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 0.0, 0.0, 2000, 2000);
	}
}

class RoadWarning_Red_03 extends IH_PoliceLightBase
{
	void RoadWarning_Red_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 0.0, 0.0, 1000, 1000);
	}
}

class RoadWarning_Red_04 extends IH_PoliceLightBase
{
	void RoadWarning_Red_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override void RefreshConfiguredLight()
	{
		ClearPoliceLamps();
		SpawnRoadWarningLamp(255.0, 0.0, 0.0, 500, 500);
	}
}

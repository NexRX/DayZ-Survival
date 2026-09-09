class IH_StaticColorBase extends IH_ConfigurableLightEntityBase
{
	protected IH_PointLightObject m_StaticLamp;

	void IH_StaticColorBase()
	{
#ifdef DayZEditor
		IH_RequestDayZEditorDefaultZ90();
#endif
	}

	protected vector GetStaticColor()
	{
		return Vector(255.0, 0.0, 0.0);
	}

	protected int GetStaticTier()
	{
		return 1;
	}

	protected float GetStaticColorScale()
	{
		return 0.9;
	}

	protected float GetStaticBrightness()
	{
		switch (GetStaticTier())
		{
			case 2:
				return 0.06;
			case 3:
				return 0.09;
			case 4:
				return 0.12;
		}

		return 0.03;
	}

	protected float GetStaticRadius()
	{
		switch (GetStaticTier())
		{
			case 2:
				return 4.0;
			case 3:
				return 5.5;
			case 4:
				return 7.0;
		}

		return 2.5;
	}

	protected float GetStaticFadeRadius()
	{
		switch (GetStaticTier())
		{
			case 2:
				return 5.75;
			case 3:
				return 7.75;
			case 4:
				return 9.75;
		}

		return 3.75;
	}

	protected vector GetStaticAmbientColor()
	{
		return Vector(0.0, 0.0, 0.0);
	}

	protected vector GetStaticLampOffset()
	{
		return Vector(0.0, 0.3, 0.0);
	}

	protected void ClearStaticLamp()
	{
		if (m_StaticLamp)
		{
			m_StaticLamp.Destroy();
			m_StaticLamp = null;
		}
	}

	protected void SpawnStaticLamp()
	{
		if (!IH_ShouldCreateClientLighting() || IH_IsDayZEditorPreviewObject())
			return;

		vector staticColor = GetStaticColor();
		vector ambientColor = GetStaticAmbientColor();
		IH_LightConfigEntry lightSettings = IH_CreatePointDefaults(GetType(), staticColor[0], staticColor[1], staticColor[2], GetStaticColorScale(), GetStaticBrightness(), GetStaticRadius(), GetStaticFadeRadius(), ambientColor[0], ambientColor[1], ambientColor[2]);
		lightSettings.visibleindaylight = true;
		lightSettings.castshadow = false;
		lightSettings.flarevisible = true;
		lightSettings.strobeenabled = false;
		lightSettings.signalpatternenabled = false;
		lightSettings = IH_LightingConfig.ResolveDefaults(lightSettings);
		m_StaticLamp = IH_PointLightObject.Cast(ScriptedLightBase.CreateLight(IH_PointLightObject, "0 0 0"));
		if (!m_StaticLamp)
		{
			Print("[IronhordeLighting][ERROR] Failed to create static lamp for " + GetType());
			return;
		}

		m_StaticLamp.AttachOnObject(this, GetStaticLampOffset());
		m_StaticLamp.ConfigureFromSettings(lightSettings);
	}

	override void RefreshConfiguredLight()
	{
		ClearStaticLamp();
		SpawnStaticLamp();
	}

	override void EEDelete(EntityAI parent)
	{
		ClearStaticLamp();
		super.EEDelete(parent);
	}
}

class IH_StaticRedBase extends IH_StaticColorBase
{
	override vector GetStaticColor()
	{
		return Vector(255.0, 0.0, 0.0);
	}
}

class IH_StaticGreenBase extends IH_StaticColorBase
{
	override vector GetStaticColor()
	{
		return Vector(0.0, 255.0, 0.0);
	}
}

class IH_StaticYellowBase extends IH_StaticColorBase
{
	override vector GetStaticColor()
	{
		return Vector(255.0, 255.0, 0.0);
	}
}

class IH_StaticOrangeBase extends IH_StaticColorBase
{
	override vector GetStaticColor()
	{
		return Vector(255.0, 156.0, 0.0);
	}
}

class IH_StaticBlueBase extends IH_StaticColorBase
{
	override vector GetStaticColor()
	{
		return Vector(0.0, 0.0, 255.0);
	}
}

class IH_StaticLightBlueBase extends IH_StaticColorBase
{
	override vector GetStaticColor()
	{
		return Vector(0.0, 168.0, 255.0);
	}
}

class IH_StaticPinkBase extends IH_StaticColorBase
{
	override vector GetStaticColor()
	{
		return Vector(255.0, 0.0, 255.0);
	}
}

class IH_StaticUVBase extends IH_StaticColorBase
{
	override vector GetStaticColor()
	{
		return Vector(144.0, 20.0, 184.0);
	}
}

class IH_Static_Red_01 extends IH_StaticRedBase
{
	void IH_Static_Red_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}
}

class IH_Static_Red_02 extends IH_StaticRedBase
{
	void IH_Static_Red_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 2;
	}
}

class IH_Static_Red_03 extends IH_StaticRedBase
{
	void IH_Static_Red_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 3;
	}
}

class IH_Static_Red_04 extends IH_StaticRedBase
{
	void IH_Static_Red_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 4;
	}
}

class IH_Static_Green_01 extends IH_StaticGreenBase
{
	void IH_Static_Green_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}
}

class IH_Static_Green_02 extends IH_StaticGreenBase
{
	void IH_Static_Green_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 2;
	}
}

class IH_Static_Green_03 extends IH_StaticGreenBase
{
	void IH_Static_Green_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 3;
	}
}

class IH_Static_Green_04 extends IH_StaticGreenBase
{
	void IH_Static_Green_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 4;
	}
}

class IH_Static_Yellow_01 extends IH_StaticYellowBase
{
	void IH_Static_Yellow_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}
}

class IH_Static_Yellow_02 extends IH_StaticYellowBase
{
	void IH_Static_Yellow_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 2;
	}
}

class IH_Static_Yellow_03 extends IH_StaticYellowBase
{
	void IH_Static_Yellow_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 3;
	}
}

class IH_Static_Yellow_04 extends IH_StaticYellowBase
{
	void IH_Static_Yellow_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 4;
	}
}

class IH_Static_Orange_01 extends IH_StaticOrangeBase
{
	void IH_Static_Orange_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}
}

class IH_Static_Orange_02 extends IH_StaticOrangeBase
{
	void IH_Static_Orange_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 2;
	}
}

class IH_Static_Orange_03 extends IH_StaticOrangeBase
{
	void IH_Static_Orange_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 3;
	}
}

class IH_Static_Orange_04 extends IH_StaticOrangeBase
{
	void IH_Static_Orange_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 4;
	}
}

class IH_Static_Blue_01 extends IH_StaticBlueBase
{
	void IH_Static_Blue_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}
}

class IH_Static_Blue_02 extends IH_StaticBlueBase
{
	void IH_Static_Blue_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 2;
	}
}

class IH_Static_Blue_03 extends IH_StaticBlueBase
{
	void IH_Static_Blue_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 3;
	}
}

class IH_Static_Blue_04 extends IH_StaticBlueBase
{
	void IH_Static_Blue_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 4;
	}
}

class IH_Static_LightBlue_01 extends IH_StaticLightBlueBase
{
	void IH_Static_LightBlue_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}
}

class IH_Static_LightBlue_02 extends IH_StaticLightBlueBase
{
	void IH_Static_LightBlue_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 2;
	}
}

class IH_Static_LightBlue_03 extends IH_StaticLightBlueBase
{
	void IH_Static_LightBlue_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 3;
	}
}

class IH_Static_LightBlue_04 extends IH_StaticLightBlueBase
{
	void IH_Static_LightBlue_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 4;
	}
}

class IH_Static_Pink_01 extends IH_StaticPinkBase
{
	void IH_Static_Pink_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}
}

class IH_Static_Pink_02 extends IH_StaticPinkBase
{
	void IH_Static_Pink_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 2;
	}
}

class IH_Static_Pink_03 extends IH_StaticPinkBase
{
	void IH_Static_Pink_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 3;
	}
}

class IH_Static_Pink_04 extends IH_StaticPinkBase
{
	void IH_Static_Pink_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 4;
	}
}

class IH_Static_UV_01 extends IH_StaticUVBase
{
	void IH_Static_UV_01()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}
}

class IH_Static_UV_02 extends IH_StaticUVBase
{
	void IH_Static_UV_02()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 2;
	}
}

class IH_Static_UV_03 extends IH_StaticUVBase
{
	void IH_Static_UV_03()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 3;
	}
}

class IH_Static_UV_04 extends IH_StaticUVBase
{
	void IH_Static_UV_04()
	{
		RegisterConfigurableLight();
		RefreshConfiguredLight();
	}

	override int GetStaticTier()
	{
		return 4;
	}
}

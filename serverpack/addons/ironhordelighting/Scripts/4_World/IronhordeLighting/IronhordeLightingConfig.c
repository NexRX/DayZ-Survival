class IH_LightConfigEntry
{
	string assetname;
	string lighttype;
	float redcolor;
	float greencolor;
	float bluecolor;
	float totalbrightnessscale;
	float lightbrightness;
	float beamlengthradius;
	float midbeamlengthradius;
	float corebeamlengthradius;
	float rotationspeed;
	float downwardpitchangle;
	bool pulsingenabled;
	float pulsespeed;
	float beamwidthangle;
	float fadeoutradius;
	bool visibleindaylight;
	bool castshadow;
	bool flarevisible;
	bool hidemodel;
	float ambientred;
	float ambientgreen;
	float ambientblue;
	bool strobeenabled;
	float strobespeed;
	float strobedelay;
	bool signalpatternenabled;
	float flickerspeed;
	float flickeramplitude;
	float shadowspeed;
	float shadowamplitude;
	float rgbcyclespeedseconds;
};

class IH_LightingNetworkFlareEntry
{
	string assetname;
	bool flarevisible;
};

class IH_LightingNetworkHideModelConfig
{
	ref array<string> hiddenmodels;

	void IH_LightingNetworkHideModelConfig()
	{
		hiddenmodels = new array<string>;
	}
};

class IH_LightingNetworkConfig
{
	int lightingconfig;
	float lighthousebeamwidthangle;
	bool defaultflarevisible;
	ref array<string> flareexceptions;
	ref array<ref IH_LightConfigEntry> lights;
	ref array<ref IH_LightingNetworkFlareEntry> flares;

	void IH_LightingNetworkConfig()
	{
		flareexceptions = new array<string>;
		lights = new array<ref IH_LightConfigEntry>;
		flares = new array<ref IH_LightingNetworkFlareEntry>;
	}
};

enum IH_LightingRpc
{
	RequestConfig = 470101,
	ReceiveConfig,
	ReceiveHideModelConfig
};

class IH_LightingNetworkPayloadAssembler
{
	static const int MAX_CHUNK_SIZE = 512;
	static const int MAX_CHUNK_COUNT = 4096;

	protected string m_PayloadBuffer;
	protected int m_ExpectedChunkCount;
	protected int m_NextChunkIndex;

	void IH_LightingNetworkPayloadAssembler()
	{
		Reset();
	}

	void Reset()
	{
		m_PayloadBuffer = "";
		m_ExpectedChunkCount = 0;
		m_NextChunkIndex = 0;
	}

	bool AddChunk(int chunkIndex, int chunkCount, string payloadChunk, out string completedPayload)
	{
		completedPayload = "";

		if (chunkCount < 1 || chunkCount > MAX_CHUNK_COUNT || chunkIndex < 0 || chunkIndex >= chunkCount)
		{
			Reset();
			return false;
		}

		if (payloadChunk.Length() > MAX_CHUNK_SIZE)
		{
			Reset();
			return false;
		}

		if (chunkIndex == 0)
		{
			Reset();
			m_ExpectedChunkCount = chunkCount;
		}

		if (m_ExpectedChunkCount != chunkCount || m_NextChunkIndex != chunkIndex)
		{
			Reset();
			return false;
		}

		m_PayloadBuffer += payloadChunk;
		m_NextChunkIndex++;
		if (m_NextChunkIndex < m_ExpectedChunkCount)
			return false;

		completedPayload = m_PayloadBuffer;
		Reset();
		return completedPayload != "";
	}
};

class IH_LightingConfig
{
	static const string PROFILE_CONFIG_DIRECTORY = "$profile:\\IronhordeLighting";
	static const string PROFILE_CONFIG_PATH = "$profile:\\IronhordeLighting\\ironhordelighting.json";
	static const int PROFILE_CONFIG_MAX_FILE_SIZE = 100000000;
	static const float FULL_DARK_DAYTIME_LIGHTING_COMPENSATION = 0.75;
	static const float FULL_DARK_DAYTIME_RADIUS_COMPENSATION = 0.85;
	static const float DAYTIME_VISIBILITY_BRIGHTNESS_BOOST = 1.6;
	static const float DAYTIME_VISIBILITY_RADIUS_BOOST = 1.15;
	static const float DAYTIME_FLASHING_VISUAL_BRIGHTNESS_BOOST = 3.0;
	static const float DAYTIME_FLASHING_VISUAL_RADIUS_SCALE = 0.10;
	static const float LIGHTHOUSE_DEFAULT_BEAM_WIDTH = 22.5;
	static const int NETWORK_RPC_CHUNK_SIZE = 512;

	int lightingconfig;
	ref array<ref IH_LightConfigEntry> lights;
	static ref IH_LightingConfig s_ConfigInstance;
	static ref array<ref IH_LightingNetworkFlareEntry> s_NetworkFlareSettings;
	static ref array<string> s_NetworkFlareExceptions;
	static bool s_HasCompactNetworkFlareSettings;
	static bool s_NetworkDefaultFlareVisible;
	static ref array<string> s_NetworkHiddenModels;
	static bool s_HasNetworkHideModelSettings;
	static bool s_HasNetworkLighthouseBeamWidth;
	static float s_NetworkLighthouseBeamWidth;
	static bool s_HideMissingDefaultModels;
	static ref IH_LightingNetworkPayloadAssembler s_NetworkConfigPayloadAssembler;
	static ref IH_LightingNetworkPayloadAssembler s_NetworkHideModelPayloadAssembler;

	void IH_LightingConfig()
	{
		lightingconfig = 0;
		lights = new array<ref IH_LightConfigEntry>;
	}

	static IH_LightingConfig Get()
	{
		if (!s_ConfigInstance)
		{
			s_ConfigInstance = new IH_LightingConfig();
			s_ConfigInstance.Initialize();
		}

		return s_ConfigInstance;
	}

	void Initialize()
	{
		if (ShouldUseProfileConfig())
			LoadProfileConfig();
	}

	static bool ShouldUseProfileConfig()
	{
#ifdef DayZEditor
		if (GetEditor())
			return false;
#endif

		if (!GetGame())
			return true;

		if (!GetGame().IsMultiplayer())
			return true;

		return GetGame().IsServer();
	}

	static bool IsNetworkClient()
	{
		if (!GetGame())
			return false;

		return GetGame().IsMultiplayer() && GetGame().IsClient() && !GetGame().IsServer();
	}

	static IH_LightConfigEntry ResolveDefaults(IH_LightConfigEntry defaultSettings)
	{
		float brightnessMultiplier = Get().GetBrightnessMultiplier();
		float radiusMultiplier = Get().GetRadiusMultiplier();
		bool forceVisibleDuringDaylight = ShouldForceDaytimeVisibility(defaultSettings.assetname);
		if (ShouldApplyDaytimeFlashingVisualBoost(defaultSettings.assetname))
		{
			brightnessMultiplier = brightnessMultiplier * DAYTIME_FLASHING_VISUAL_BRIGHTNESS_BOOST;
			radiusMultiplier = radiusMultiplier * DAYTIME_FLASHING_VISUAL_RADIUS_SCALE;
		}
		else if (ShouldApplyDaytimeVisibilityBoost(defaultSettings.assetname))
		{
			brightnessMultiplier = brightnessMultiplier * DAYTIME_VISIBILITY_BRIGHTNESS_BOOST;
			radiusMultiplier = radiusMultiplier * DAYTIME_VISIBILITY_RADIUS_BOOST;
		}

		IH_LightConfigEntry configuredSettings = Get().FindLight(defaultSettings.assetname);
		IH_LightConfigEntry resolvedSettings;
		if (configuredSettings)
		{
			if (ShouldPreferRuntimeDefaults(defaultSettings.assetname))
				resolvedSettings = CreateAdjustedLightSettings(defaultSettings, brightnessMultiplier, radiusMultiplier, forceVisibleDuringDaylight);
			else
				resolvedSettings = CreateAdjustedLightSettings(configuredSettings, brightnessMultiplier, radiusMultiplier, forceVisibleDuringDaylight);
		}
		else
		{
			resolvedSettings = CreateAdjustedLightSettings(defaultSettings, brightnessMultiplier, radiusMultiplier, forceVisibleDuringDaylight);
		}

		if (resolvedSettings && NormalizeAssetName(defaultSettings.assetname) == "IH_Rotating_Lighthouse")
		{
			if (configuredSettings)
				resolvedSettings.beamwidthangle = configuredSettings.beamwidthangle;
			else
			{
				float networkLighthouseBeamWidth;
				if (TryGetNetworkLighthouseBeamWidth(networkLighthouseBeamWidth))
					resolvedSettings.beamwidthangle = networkLighthouseBeamWidth;
			}
		}

		if (resolvedSettings)
		{
			resolvedSettings.flarevisible = ResolveFlareVisible(defaultSettings.assetname, resolvedSettings.flarevisible);
			resolvedSettings.hidemodel = ResolveHideModel(defaultSettings.assetname, resolvedSettings.hidemodel);
		}

		return resolvedSettings;
	}

	static bool ResolveFlareVisible(string assetName, bool defaultFlareVisible)
	{
		bool resolvedFlareVisible = defaultFlareVisible;
		IH_LightConfigEntry configuredSettings = Get().FindLight(assetName);
		if (configuredSettings)
			resolvedFlareVisible = configuredSettings.flarevisible;

		bool networkFlareVisible;
		if (TryGetNetworkFlareVisible(assetName, networkFlareVisible))
			resolvedFlareVisible = networkFlareVisible;

		return resolvedFlareVisible;
	}

	static bool ResolveHideModel(string assetName, bool defaultHideModel = false)
	{
		bool resolvedHideModel = defaultHideModel;
		IH_LightConfigEntry configuredSettings = Get().FindLight(assetName);
		if (configuredSettings)
			resolvedHideModel = configuredSettings.hidemodel;

		bool networkHideModel;
		if (TryGetNetworkHideModel(assetName, networkHideModel))
			resolvedHideModel = networkHideModel;

		return resolvedHideModel;
	}

	static IH_LightConfigEntry CreateAdjustedLightSettings(IH_LightConfigEntry sourceSettings, float brightnessMultiplier = 1.0, float radiusMultiplier = 1.0, bool forceVisibleDuringDaylight = false)
	{
		if (!sourceSettings)
			return null;

		IH_LightConfigEntry adjustedSettings = new IH_LightConfigEntry();
		adjustedSettings.assetname = sourceSettings.assetname;
		adjustedSettings.lighttype = sourceSettings.lighttype;
		adjustedSettings.redcolor = sourceSettings.redcolor;
		adjustedSettings.greencolor = sourceSettings.greencolor;
		adjustedSettings.bluecolor = sourceSettings.bluecolor;
		adjustedSettings.totalbrightnessscale = sourceSettings.totalbrightnessscale * brightnessMultiplier;
		adjustedSettings.lightbrightness = sourceSettings.lightbrightness * brightnessMultiplier;
		adjustedSettings.beamlengthradius = sourceSettings.beamlengthradius * radiusMultiplier;
		adjustedSettings.midbeamlengthradius = sourceSettings.midbeamlengthradius * radiusMultiplier;
		adjustedSettings.corebeamlengthradius = sourceSettings.corebeamlengthradius * radiusMultiplier;
		adjustedSettings.rotationspeed = sourceSettings.rotationspeed;
		adjustedSettings.downwardpitchangle = sourceSettings.downwardpitchangle;
		adjustedSettings.pulsingenabled = sourceSettings.pulsingenabled;
		adjustedSettings.pulsespeed = sourceSettings.pulsespeed;
		adjustedSettings.beamwidthangle = sourceSettings.beamwidthangle;
		adjustedSettings.fadeoutradius = sourceSettings.fadeoutradius * radiusMultiplier;
		adjustedSettings.visibleindaylight = sourceSettings.visibleindaylight || forceVisibleDuringDaylight;
		adjustedSettings.castshadow = sourceSettings.castshadow;
		adjustedSettings.flarevisible = sourceSettings.flarevisible;
		adjustedSettings.hidemodel = sourceSettings.hidemodel;
		adjustedSettings.ambientred = sourceSettings.ambientred * brightnessMultiplier;
		adjustedSettings.ambientgreen = sourceSettings.ambientgreen * brightnessMultiplier;
		adjustedSettings.ambientblue = sourceSettings.ambientblue * brightnessMultiplier;
		adjustedSettings.strobeenabled = sourceSettings.strobeenabled;
		adjustedSettings.strobespeed = sourceSettings.strobespeed;
		adjustedSettings.strobedelay = sourceSettings.strobedelay;
		adjustedSettings.signalpatternenabled = sourceSettings.signalpatternenabled;
		adjustedSettings.flickerspeed = sourceSettings.flickerspeed;
		adjustedSettings.flickeramplitude = sourceSettings.flickeramplitude;
		adjustedSettings.shadowspeed = sourceSettings.shadowspeed;
		adjustedSettings.shadowamplitude = sourceSettings.shadowamplitude;
		adjustedSettings.rgbcyclespeedseconds = sourceSettings.rgbcyclespeedseconds;
		return adjustedSettings;
	}

	float GetBrightnessMultiplier()
	{
		if (IH_UndergroundVisibilityManager.IsFullDarkUndergroundDaytimeActive())
			return FULL_DARK_DAYTIME_LIGHTING_COMPENSATION;

		if (IH_UndergroundVisibilityManager.IsFullDarkUndergroundActive())
			return 1.0;

		if (lightingconfig == 1)
			return 2.0;

		return 1.0;
	}

	float GetRadiusMultiplier()
	{
		if (IH_UndergroundVisibilityManager.IsFullDarkUndergroundDaytimeActive())
			return FULL_DARK_DAYTIME_RADIUS_COMPENSATION;

		return 1.0;
	}

	static bool ShouldForceDaytimeVisibility(string assetName)
	{
		if (IH_UndergroundVisibilityManager.IsFullDarkUndergroundActive())
			return false;
		if (!IH_UndergroundVisibilityManager.IsWorldDaytimeActive())
			return false;

		string normalizedAssetName = NormalizeAssetName(assetName);
		if (normalizedAssetName == "IH_Blinking_Tower_BeaconLight")
			return false;
		if (normalizedAssetName == "IH_Rotating_Lighthouse")
			return false;
		if (normalizedAssetName == "IH_Alarm_Bunker_RedPulse")
			return false;
		if (normalizedAssetName == "IH_Candle")
			return false;
		if (normalizedAssetName == "IH_Decorative_Candle_01")
			return false;
		if (normalizedAssetName == "IH_Decorative_Candle_02")
			return false;
		if (normalizedAssetName == "IH_Decorative_Candle_03")
			return false;
		if (normalizedAssetName == "IH_Decorative_Lantern_01")
			return false;
		if (normalizedAssetName == "IH_Decorative_Lantern_02")
			return false;
		if (normalizedAssetName == "IH_Decorative_Walltorch_01")
			return false;
		if (normalizedAssetName == "IH_Decorative_GasLamp")
			return false;
		if (normalizedAssetName == "IH_Decorative_LuxuryLamp")
			return false;
		if (normalizedAssetName == "IH_Heat_BurningBodies")
			return false;
		if (normalizedAssetName == "IH_Heat_Campfire")
			return false;

		if (normalizedAssetName == "IH_Blinking_Airfield_LandingLight")
			return true;
		if (normalizedAssetName.IndexOf("IH_Rotating_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_Searchlight_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_PoliceLight_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("RoadWarning_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_Static_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_LEDStrip_") == 0)
			return true;

		return false;
	}

	static bool ShouldApplyDaytimeVisibilityBoost(string assetName)
	{
		if (!ShouldForceDaytimeVisibility(assetName))
			return false;

		string normalizedAssetName = NormalizeAssetName(assetName);
		if (IsDaytimeDynamicFlashingLight(normalizedAssetName))
			return false;

		if (ShouldApplyDaytimeFlashingVisualBoost(normalizedAssetName))
			return false;

		return true;
	}

	static bool ShouldApplyDaytimeFlashingVisualBoost(string assetName)
	{
		return false;
	}

	static bool IsDaytimeDynamicFlashingLight(string assetName)
	{
		string normalizedAssetName = NormalizeAssetName(assetName);
		if (normalizedAssetName == "IH_Blinking_Airfield_LandingLight")
			return true;
		if (normalizedAssetName.IndexOf("IH_Rotating_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_Searchlight_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_PoliceLight_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("RoadWarning_") == 0)
			return true;

		return false;
	}

	static bool ShouldUseDaytimePoliceMaterialVisual(string assetName)
	{
		if (IH_UndergroundVisibilityManager.IsFullDarkUndergroundActive())
			return false;
		if (!IH_UndergroundVisibilityManager.IsWorldDaytimeActive())
			return false;

		return NormalizeAssetName(assetName).IndexOf("IH_PoliceLight_US_") == 0;
	}

	static float GetRgbCycleSpeed(string assetName, float defaultSpeed)
	{
		IH_LightConfigEntry configuredSettings = Get().FindLight(assetName);
		if (configuredSettings && configuredSettings.rgbcyclespeedseconds > 0.0)
			return configuredSettings.rgbcyclespeedseconds;

		return defaultSpeed;
	}

	static bool ShouldPreferRuntimeDefaults(string assetName)
	{
		string normalizedAssetName = NormalizeAssetName(assetName);
		if (normalizedAssetName.IndexOf("IH_Industrial_Light_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_Hangar_Lamp_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_LightSource_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_Rotating_Red_") == 0)
			return true;
		if (normalizedAssetName == "IH_Rotating_Amber_01")
			return true;
		if (normalizedAssetName == "IH_Rotating_Amber_02")
			return true;
		if (normalizedAssetName == "IH_Rotating_Blue")
			return true;
		if (normalizedAssetName == "IH_Rotating_Green")
			return true;
		if (normalizedAssetName == "IH_Rotating_Lighthouse")
			return true;
		if (normalizedAssetName.IndexOf("IH_Town_LightPole_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_Industrial_LightPole_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_Searchlight_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_PoliceLight_Static_Forward_Flash_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_Flicker_") == 0)
			return true;
		if (normalizedAssetName.IndexOf("IH_LEDStrip_") == 0)
			return true;
		if (normalizedAssetName == "IH_Candle")
			return true;
		if (normalizedAssetName == "IH_Alarm_Bunker_RedPulse")
			return true;
		if (normalizedAssetName == "IH_Heat_BurningBodies")
			return true;
		if (normalizedAssetName == "IH_Heat_Campfire")
			return true;

		return false;
	}

	static void RequestConfigFromServer()
	{
		if (!IsNetworkClient())
			return;

		GetGame().RPCSingleParam(null, IH_LightingRpc.RequestConfig, new Param1<int>(1), true);
	}

	static void SendConfigToClient(PlayerIdentity recipient)
	{
		if (!recipient)
			return;

		string networkPayload;
		if (Get().BuildNetworkPayload(networkPayload))
			SendNetworkPayload(recipient, IH_LightingRpc.ReceiveConfig, networkPayload);

		string hideModelPayload;
		if (Get().BuildNetworkHideModelPayload(hideModelPayload))
			SendNetworkPayload(recipient, IH_LightingRpc.ReceiveHideModelConfig, hideModelPayload);
	}

	protected static void SendNetworkPayload(PlayerIdentity recipient, int rpcType, string networkPayload)
	{
		if (!recipient || networkPayload == "")
			return;

		int payloadLength = networkPayload.Length();
		int chunkCount = 0;
		int remainingLength = payloadLength;
		while (remainingLength > 0)
		{
			chunkCount++;
			remainingLength -= NETWORK_RPC_CHUNK_SIZE;
		}

		for (int chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++)
		{
			int chunkOffset = chunkIndex * NETWORK_RPC_CHUNK_SIZE;
			int chunkLength = NETWORK_RPC_CHUNK_SIZE;
			int remainingPayloadLength = payloadLength - chunkOffset;
			if (remainingPayloadLength < chunkLength)
				chunkLength = remainingPayloadLength;
			string payloadChunk = networkPayload.Substring(chunkOffset, chunkLength);
			GetGame().RPCSingleParam(null, rpcType, new Param3<int,int,string>(chunkIndex, chunkCount, payloadChunk), true, recipient);
		}
	}

	static void ApplyNetworkPayload(string networkPayload)
	{
		Get().LoadNetworkPayload(networkPayload);
	}

	static void ApplyNetworkHideModelPayload(string networkPayload)
	{
		Get().LoadNetworkHideModelPayload(networkPayload);
	}

	static void ApplyNetworkPayloadChunk(int rpcType, int chunkIndex, int chunkCount, string payloadChunk)
	{
		string completedPayload;
		if (rpcType == IH_LightingRpc.ReceiveConfig)
		{
			if (!s_NetworkConfigPayloadAssembler)
				s_NetworkConfigPayloadAssembler = new IH_LightingNetworkPayloadAssembler();

			if (s_NetworkConfigPayloadAssembler.AddChunk(chunkIndex, chunkCount, payloadChunk, completedPayload))
				ApplyNetworkPayload(completedPayload);
		}
		else if (rpcType == IH_LightingRpc.ReceiveHideModelConfig)
		{
			if (!s_NetworkHideModelPayloadAssembler)
				s_NetworkHideModelPayloadAssembler = new IH_LightingNetworkPayloadAssembler();

			if (s_NetworkHideModelPayloadAssembler.AddChunk(chunkIndex, chunkCount, payloadChunk, completedPayload))
				ApplyNetworkHideModelPayload(completedPayload);
		}
	}

	static void ResetNetworkPayloadAssemblers()
	{
		if (s_NetworkConfigPayloadAssembler)
			s_NetworkConfigPayloadAssembler.Reset();
		if (s_NetworkHideModelPayloadAssembler)
			s_NetworkHideModelPayloadAssembler.Reset();
	}

	bool BuildNetworkPayload(out string jsonPayload)
	{
		IH_LightingNetworkConfig networkConfig = new IH_LightingNetworkConfig();
		networkConfig.lightingconfig = lightingconfig;
		networkConfig.lighthousebeamwidthangle = LIGHTHOUSE_DEFAULT_BEAM_WIDTH;

		IH_LightConfigEntry lighthouseSettings = FindLight("IH_Rotating_Lighthouse");
		if (lighthouseSettings)
			networkConfig.lighthousebeamwidthangle = lighthouseSettings.beamwidthangle;

		IH_LightConfigEntry gasLampSettings = FindLight("IH_Decorative_GasLamp");
		if (gasLampSettings)
			networkConfig.lights.Insert(CreateAdjustedLightSettings(gasLampSettings));

		IH_LightConfigEntry decorativeCandleSettings = FindLight("IH_Decorative_Candle_01");
		if (decorativeCandleSettings)
			networkConfig.lights.Insert(CreateAdjustedLightSettings(decorativeCandleSettings));

		IH_LightConfigEntry decorativeCandle02Settings = FindLight("IH_Decorative_Candle_02");
		if (decorativeCandle02Settings)
			networkConfig.lights.Insert(CreateAdjustedLightSettings(decorativeCandle02Settings));

		IH_LightConfigEntry decorativeCandle03Settings = FindLight("IH_Decorative_Candle_03");
		if (decorativeCandle03Settings)
			networkConfig.lights.Insert(CreateAdjustedLightSettings(decorativeCandle03Settings));

		IH_LightConfigEntry decorativeLantern01Settings = FindLight("IH_Decorative_Lantern_01");
		if (decorativeLantern01Settings)
			networkConfig.lights.Insert(CreateAdjustedLightSettings(decorativeLantern01Settings));

		IH_LightConfigEntry decorativeLantern02Settings = FindLight("IH_Decorative_Lantern_02");
		if (decorativeLantern02Settings)
			networkConfig.lights.Insert(CreateAdjustedLightSettings(decorativeLantern02Settings));

		IH_LightConfigEntry decorativeWalltorch01Settings = FindLight("IH_Decorative_Walltorch_01");
		if (decorativeWalltorch01Settings)
			networkConfig.lights.Insert(CreateAdjustedLightSettings(decorativeWalltorch01Settings));

		IH_LightConfigEntry luxuryLampSettings = FindLight("IH_Decorative_LuxuryLamp");
		if (luxuryLampSettings)
			networkConfig.lights.Insert(CreateAdjustedLightSettings(luxuryLampSettings));

		ref array<string> uniqueAssetNames = new array<string>;
		ref array<bool> uniqueFlareValues = new array<bool>;
		foreach (IH_LightConfigEntry lightSettings : lights)
		{
			if (!lightSettings)
				continue;

			string normalizedAssetName = NormalizeAssetName(lightSettings.assetname);
			int existingAssetIndex = uniqueAssetNames.Find(normalizedAssetName);
			if (existingAssetIndex >= 0)
				continue;

			uniqueAssetNames.Insert(normalizedAssetName);
			uniqueFlareValues.Insert(lightSettings.flarevisible);
		}

		int visibleFlareCount = 0;
		foreach (bool flareVisible : uniqueFlareValues)
		{
			if (flareVisible)
				visibleFlareCount++;
		}

		networkConfig.defaultflarevisible = visibleFlareCount >= (uniqueFlareValues.Count() - visibleFlareCount);
		for (int flareIndex = 0; flareIndex < uniqueAssetNames.Count(); flareIndex++)
		{
			if (uniqueFlareValues.Get(flareIndex) != networkConfig.defaultflarevisible)
				networkConfig.flareexceptions.Insert(uniqueAssetNames.Get(flareIndex));
		}

		string serializedPayload;
		string errorMessage;
		if (!JsonFileLoader<IH_LightingNetworkConfig>.MakeData(networkConfig, serializedPayload, errorMessage, false))
			return false;

		NormalizeBooleanJson(serializedPayload, jsonPayload);
		return true;
	}

	bool BuildNetworkHideModelPayload(out string jsonPayload)
	{
		IH_LightingNetworkHideModelConfig networkConfig = new IH_LightingNetworkHideModelConfig();
		foreach (IH_LightConfigEntry lightSettings : lights)
		{
			if (!lightSettings || !lightSettings.hidemodel)
				continue;

			string normalizedAssetName = NormalizeAssetName(lightSettings.assetname);
			if (networkConfig.hiddenmodels.Find(normalizedAssetName) < 0)
				networkConfig.hiddenmodels.Insert(normalizedAssetName);
		}

		string errorMessage;
		return JsonFileLoader<IH_LightingNetworkHideModelConfig>.MakeData(networkConfig, jsonPayload, errorMessage, false);
	}

	static bool TryGetNetworkFlareVisible(string assetName, out bool flareVisible)
	{
		string normalizedAssetName = NormalizeAssetName(assetName);
		if (s_HasCompactNetworkFlareSettings)
		{
			flareVisible = s_NetworkDefaultFlareVisible;
			if (s_NetworkFlareExceptions && s_NetworkFlareExceptions.Find(normalizedAssetName) >= 0)
				flareVisible = !s_NetworkDefaultFlareVisible;

			return true;
		}

		if (!s_NetworkFlareSettings)
			return false;

		foreach (IH_LightingNetworkFlareEntry flareSettings : s_NetworkFlareSettings)
		{
			if (flareSettings && flareSettings.assetname == normalizedAssetName)
			{
				flareVisible = flareSettings.flarevisible;
				return true;
			}
		}

		return false;
	}

	static bool TryGetNetworkHideModel(string assetName, out bool hideModel)
	{
		if (!s_HasNetworkHideModelSettings)
			return false;

		hideModel = false;
		string normalizedAssetName = NormalizeAssetName(assetName);
		if (s_NetworkHiddenModels && s_NetworkHiddenModels.Find(normalizedAssetName) >= 0)
			hideModel = true;

		return true;
	}

	static bool TryGetNetworkLighthouseBeamWidth(out float beamWidth)
	{
		if (!s_HasNetworkLighthouseBeamWidth)
			return false;

		beamWidth = s_NetworkLighthouseBeamWidth;
		return true;
	}

	bool BuildJsonPayload(out string jsonPayload)
	{
		string serializedPayload;
		string errorMessage;
		if (!JsonFileLoader<IH_LightingConfig>.MakeData(this, serializedPayload, errorMessage, true))
		{
			Print("[IronhordeLighting][ERROR] Failed to serialize lighting config: " + errorMessage);
			return false;
		}

		NormalizeBooleanJson(serializedPayload, jsonPayload);
		return true;
	}

	static bool NormalizeBooleanJson(string sourceJson, out string normalizedJson)
	{
		ref TStringArray normalizedParts = new TStringArray;
		int sourceLength = sourceJson.Length();
		int copyStart = 0;
		int index = 0;
		bool changed = false;

		while (index < sourceLength)
		{
			if (sourceJson.Get(index) != "\"")
			{
				index++;
				continue;
			}

			int fieldNameEnd = FindJsonStringEnd(sourceJson, index);
			if (fieldNameEnd < 0)
				break;

			string fieldName = sourceJson.Substring(index + 1, fieldNameEnd - index - 1);
			int colonIndex = fieldNameEnd + 1;
			while (colonIndex < sourceLength && IsJsonWhitespace(sourceJson.Get(colonIndex)))
				colonIndex++;

			if (!IsBooleanConfigField(fieldName) || colonIndex >= sourceLength || sourceJson.Get(colonIndex) != ":")
			{
				index = fieldNameEnd + 1;
				continue;
			}

			int valueIndex = colonIndex + 1;
			while (valueIndex < sourceLength && IsJsonWhitespace(sourceJson.Get(valueIndex)))
				valueIndex++;

			if (valueIndex >= sourceLength || (sourceJson.Get(valueIndex) != "0" && sourceJson.Get(valueIndex) != "1"))
			{
				index = fieldNameEnd + 1;
				continue;
			}

			int terminatorIndex = valueIndex + 1;
			while (terminatorIndex < sourceLength && IsJsonWhitespace(sourceJson.Get(terminatorIndex)))
				terminatorIndex++;

			if (!IsJsonValueTerminator(sourceJson, terminatorIndex))
			{
				index = valueIndex + 1;
				continue;
			}

			normalizedParts.Insert(sourceJson.Substring(copyStart, valueIndex - copyStart));
			if (sourceJson.Get(valueIndex) == "1")
				normalizedParts.Insert("true");
			else
				normalizedParts.Insert("false");

			copyStart = valueIndex + 1;
			index = copyStart;
			changed = true;
		}

		if (!changed)
		{
			normalizedJson = sourceJson;
			return false;
		}

		if (copyStart < sourceLength)
			normalizedParts.Insert(sourceJson.Substring(copyStart, sourceLength - copyStart));

		normalizedJson = string.Join("", normalizedParts);
		return true;
	}

	static int FindJsonStringEnd(string jsonData, int openingQuoteIndex)
	{
		bool escaped = false;
		for (int index = openingQuoteIndex + 1; index < jsonData.Length(); index++)
		{
			string character = jsonData.Get(index);
			if (character == "\"" && !escaped)
				return index;

			if (character == "\\")
				escaped = !escaped;
			else
				escaped = false;
		}

		return -1;
	}

	static bool IsLighthouseBeamWidthMissing(string configJson)
	{
		string assetNameKey = "\"assetname\"";
		int searchIndex = 0;
		while (searchIndex < configJson.Length())
		{
			int assetNameKeyIndex = configJson.IndexOfFrom(searchIndex, assetNameKey);
			if (assetNameKeyIndex < 0)
				return false;

			int colonIndex = assetNameKeyIndex + assetNameKey.Length();
			while (colonIndex < configJson.Length() && IsJsonWhitespace(configJson.Get(colonIndex)))
				colonIndex++;

			if (colonIndex >= configJson.Length() || configJson.Get(colonIndex) != ":")
			{
				searchIndex = assetNameKeyIndex + assetNameKey.Length();
				continue;
			}

			int valueStartIndex = colonIndex + 1;
			while (valueStartIndex < configJson.Length() && IsJsonWhitespace(configJson.Get(valueStartIndex)))
				valueStartIndex++;

			if (valueStartIndex >= configJson.Length() || configJson.Get(valueStartIndex) != "\"")
			{
				searchIndex = valueStartIndex + 1;
				continue;
			}

			int valueEndIndex = FindJsonStringEnd(configJson, valueStartIndex);
			if (valueEndIndex < 0)
				return false;

			string assetName = configJson.Substring(valueStartIndex + 1, valueEndIndex - valueStartIndex - 1);
			if (NormalizeAssetName(assetName) == "IH_Rotating_Lighthouse")
			{
				string configBeforeEntry = configJson.Substring(0, assetNameKeyIndex);
				int entryStartIndex = configBeforeEntry.LastIndexOf("{");
				int entryEndIndex = configJson.IndexOfFrom(valueEndIndex, "}");
				if (entryStartIndex < 0 || entryEndIndex < 0)
					return true;

				string lighthouseEntryJson = configJson.Substring(entryStartIndex, entryEndIndex - entryStartIndex + 1);
				return !JsonObjectHasProperty(lighthouseEntryJson, "beamwidthangle");
			}

			searchIndex = valueEndIndex + 1;
		}

		return false;
	}

	static bool TryGetLightEntryJson(string configJson, string requestedAssetName, out string lightEntryJson)
	{
		lightEntryJson = "";
		string normalizedRequestedAssetName = NormalizeAssetName(requestedAssetName);
		string assetNameKey = "\"assetname\"";
		int searchIndex = 0;
		while (searchIndex < configJson.Length())
		{
			int assetNameKeyIndex = configJson.IndexOfFrom(searchIndex, assetNameKey);
			if (assetNameKeyIndex < 0)
				return false;

			int colonIndex = assetNameKeyIndex + assetNameKey.Length();
			while (colonIndex < configJson.Length() && IsJsonWhitespace(configJson.Get(colonIndex)))
				colonIndex++;

			if (colonIndex >= configJson.Length() || configJson.Get(colonIndex) != ":")
			{
				searchIndex = assetNameKeyIndex + assetNameKey.Length();
				continue;
			}

			int valueStartIndex = colonIndex + 1;
			while (valueStartIndex < configJson.Length() && IsJsonWhitespace(configJson.Get(valueStartIndex)))
				valueStartIndex++;

			if (valueStartIndex >= configJson.Length() || configJson.Get(valueStartIndex) != "\"")
			{
				searchIndex = valueStartIndex + 1;
				continue;
			}

			int valueEndIndex = FindJsonStringEnd(configJson, valueStartIndex);
			if (valueEndIndex < 0)
				return false;

			string assetName = configJson.Substring(valueStartIndex + 1, valueEndIndex - valueStartIndex - 1);
			if (NormalizeAssetName(assetName) == normalizedRequestedAssetName)
			{
				string configBeforeEntry = configJson.Substring(0, assetNameKeyIndex);
				int entryStartIndex = configBeforeEntry.LastIndexOf("{");
				int entryEndIndex = configJson.IndexOfFrom(valueEndIndex, "}");
				if (entryStartIndex < 0 || entryEndIndex < 0)
					return false;

				lightEntryJson = configJson.Substring(entryStartIndex, entryEndIndex - entryStartIndex + 1);
				return true;
			}

			searchIndex = valueEndIndex + 1;
		}

		return false;
	}

	static bool IsAnyLightEntryMissingProperty(string configJson, string propertyName)
	{
		string assetNameKey = "\"assetname\"";
		int searchIndex = 0;
		while (searchIndex < configJson.Length())
		{
			int assetNameKeyIndex = configJson.IndexOfFrom(searchIndex, assetNameKey);
			if (assetNameKeyIndex < 0)
				return false;

			string configBeforeEntry = configJson.Substring(0, assetNameKeyIndex);
			int entryStartIndex = configBeforeEntry.LastIndexOf("{");
			int entryEndIndex = configJson.IndexOfFrom(assetNameKeyIndex + assetNameKey.Length(), "}");
			if (entryStartIndex < 0 || entryEndIndex < 0)
				return false;

			string lightEntryJson = configJson.Substring(entryStartIndex, entryEndIndex - entryStartIndex + 1);
			if (!JsonObjectHasProperty(lightEntryJson, propertyName))
				return true;

			searchIndex = entryEndIndex + 1;
		}

		return false;
	}

	static bool JsonObjectHasProperty(string objectJson, string propertyName)
	{
		int index = 0;
		while (index < objectJson.Length())
		{
			if (objectJson.Get(index) != "\"")
			{
				index++;
				continue;
			}

			int propertyNameEnd = FindJsonStringEnd(objectJson, index);
			if (propertyNameEnd < 0)
				return false;

			string candidatePropertyName = objectJson.Substring(index + 1, propertyNameEnd - index - 1);
			int colonIndex = propertyNameEnd + 1;
			while (colonIndex < objectJson.Length() && IsJsonWhitespace(objectJson.Get(colonIndex)))
				colonIndex++;

			if (candidatePropertyName == propertyName && colonIndex < objectJson.Length() && objectJson.Get(colonIndex) == ":")
				return true;

			index = propertyNameEnd + 1;
		}

		return false;
	}

	static bool IsBooleanConfigField(string fieldName)
	{
		if (fieldName == "pulsingenabled")
			return true;
		if (fieldName == "visibleindaylight")
			return true;
		if (fieldName == "castshadow")
			return true;
		if (fieldName == "flarevisible")
			return true;
		if (fieldName == "defaultflarevisible")
			return true;
		if (fieldName == "hidemodel")
			return true;
		if (fieldName == "strobeenabled")
			return true;
		if (fieldName == "signalpatternenabled")
			return true;

		return false;
	}

	static bool IsJsonWhitespace(string character)
	{
		return character == " " || character == "\t" || character == "\r" || character == "\n";
	}

	static bool IsJsonValueTerminator(string jsonData, int index)
	{
		if (index >= jsonData.Length())
			return true;

		string character = jsonData.Get(index);
		return character == "," || character == "}" || character == "]";
	}

	static bool ReadProfileConfigData(out string configJson, out string errorMessage)
	{
		FileHandle handle = OpenFile(PROFILE_CONFIG_PATH, FileMode.READ);
		if (handle == 0)
		{
			errorMessage = "Cannot open profile lighting config for reading";
			return false;
		}

		ReadFile(handle, configJson, PROFILE_CONFIG_MAX_FILE_SIZE);
		CloseFile(handle);
		return true;
	}

	static bool WriteProfileConfigData(string configJson, out string errorMessage)
	{
		FileHandle handle = OpenFile(PROFILE_CONFIG_PATH, FileMode.WRITE);
		if (handle == 0)
		{
			errorMessage = "Cannot open profile lighting config for writing";
			return false;
		}

		FPrint(handle, configJson);
		CloseFile(handle);
		return true;
	}

	void LoadNetworkPayload(string networkPayload)
	{
		string normalizedNetworkPayload;
		NormalizeBooleanJson(networkPayload, normalizedNetworkPayload);
		bool hasNetworkLighthouseBeamWidth = JsonObjectHasProperty(normalizedNetworkPayload, "lighthousebeamwidthangle");
		bool hasCompactNetworkFlareSettings = JsonObjectHasProperty(normalizedNetworkPayload, "defaultflarevisible") && JsonObjectHasProperty(normalizedNetworkPayload, "flareexceptions");
		bool hasNetworkLampSettings = JsonObjectHasProperty(normalizedNetworkPayload, "lights");

		IH_LightingNetworkConfig networkConfig = new IH_LightingNetworkConfig();
		string errorMessage;
		if (!JsonFileLoader<IH_LightingNetworkConfig>.LoadData(normalizedNetworkPayload, networkConfig, errorMessage) || !networkConfig)
			return;

		lightingconfig = networkConfig.lightingconfig;
		s_NetworkLighthouseBeamWidth = LIGHTHOUSE_DEFAULT_BEAM_WIDTH;
		if (hasNetworkLighthouseBeamWidth)
			s_NetworkLighthouseBeamWidth = networkConfig.lighthousebeamwidthangle;
		s_HasNetworkLighthouseBeamWidth = true;

		if (lightingconfig != 1)
			lightingconfig = 0;

		s_HasCompactNetworkFlareSettings = hasCompactNetworkFlareSettings;
		s_NetworkDefaultFlareVisible = networkConfig.defaultflarevisible;
		s_NetworkFlareExceptions = new array<string>;
		if (hasCompactNetworkFlareSettings && networkConfig.flareexceptions)
		{
			foreach (string flareExceptionAssetName : networkConfig.flareexceptions)
			{
				string normalizedExceptionAssetName = NormalizeAssetName(flareExceptionAssetName);
				if (s_NetworkFlareExceptions.Find(normalizedExceptionAssetName) < 0)
					s_NetworkFlareExceptions.Insert(normalizedExceptionAssetName);
			}
		}

		s_NetworkFlareSettings = new array<ref IH_LightingNetworkFlareEntry>;
		if (!hasCompactNetworkFlareSettings && networkConfig.flares)
		{
			foreach (IH_LightingNetworkFlareEntry flareSettings : networkConfig.flares)
			{
				if (!flareSettings)
					continue;

				flareSettings.assetname = NormalizeAssetName(flareSettings.assetname);
				s_NetworkFlareSettings.Insert(flareSettings);
			}
		}

		if (hasNetworkLampSettings)
			ApplyNetworkLampSettings(networkConfig.lights);

		IH_ConfigurableLightEntityBase.RefreshAllConfigurableLights();
		IH_LEDStripBase.RefreshAllLedStripItems();
	}

	void ApplyNetworkLampSettings(array<ref IH_LightConfigEntry> networkLightSettings)
	{
		for (int lightIndex = lights.Count() - 1; lightIndex >= 0; lightIndex--)
		{
			IH_LightConfigEntry existingSettings = lights.Get(lightIndex);
			if (!existingSettings)
				continue;

			string existingAssetName = NormalizeAssetName(existingSettings.assetname);
			if (existingAssetName == "IH_Decorative_Candle_01" || existingAssetName == "IH_Decorative_Candle_02" || existingAssetName == "IH_Decorative_Candle_03" || existingAssetName == "IH_Decorative_Lantern_01" || existingAssetName == "IH_Decorative_Lantern_02" || existingAssetName == "IH_Decorative_Walltorch_01" || existingAssetName == "IH_Decorative_GasLamp" || existingAssetName == "IH_Decorative_LuxuryLamp")
				lights.Remove(lightIndex);
		}

		if (!networkLightSettings)
			return;

		foreach (IH_LightConfigEntry networkSettings : networkLightSettings)
		{
			if (!networkSettings)
				continue;

			string normalizedAssetName = NormalizeAssetName(networkSettings.assetname);
			if (normalizedAssetName != "IH_Decorative_Candle_01" && normalizedAssetName != "IH_Decorative_Candle_02" && normalizedAssetName != "IH_Decorative_Candle_03" && normalizedAssetName != "IH_Decorative_Lantern_01" && normalizedAssetName != "IH_Decorative_Lantern_02" && normalizedAssetName != "IH_Decorative_Walltorch_01" && normalizedAssetName != "IH_Decorative_GasLamp" && normalizedAssetName != "IH_Decorative_LuxuryLamp")
				continue;

			IH_LightConfigEntry copiedSettings = CreateAdjustedLightSettings(networkSettings);
			copiedSettings.assetname = normalizedAssetName;
			lights.Insert(copiedSettings);
		}
	}

	void LoadNetworkHideModelPayload(string networkPayload)
	{
		IH_LightingNetworkHideModelConfig networkConfig = new IH_LightingNetworkHideModelConfig();
		string errorMessage;
		if (!JsonFileLoader<IH_LightingNetworkHideModelConfig>.LoadData(networkPayload, networkConfig, errorMessage) || !networkConfig)
			return;

		s_NetworkHiddenModels = new array<string>;
		if (networkConfig.hiddenmodels)
		{
			foreach (string assetName : networkConfig.hiddenmodels)
			{
				string normalizedAssetName = NormalizeAssetName(assetName);
				if (s_NetworkHiddenModels.Find(normalizedAssetName) < 0)
					s_NetworkHiddenModels.Insert(normalizedAssetName);
			}
		}

		s_HasNetworkHideModelSettings = true;
		IH_ConfigurableLightEntityBase.RefreshAllConfigurableLights();
		IH_LEDStripBase.RefreshAllLedStripItems();
	}

	void LoadProfileConfig()
	{
		MakeDirectory(PROFILE_CONFIG_DIRECTORY);

		bool hasExistingConfig = FileExist(PROFILE_CONFIG_PATH);
		bool booleanMigrationPendingSave = false;
		bool lighthouseBeamWidthAdded = false;
		bool hideModelPropertiesAdded = false;
		bool hasGasLampEntryJson = false;
		bool hasLuxuryLampEntryJson = false;
		string gasLampEntryJson;
		string luxuryLampEntryJson;
		if (hasExistingConfig)
		{
			string configJson;
			string normalizedConfigJson;
			string errorMessage;
			if (ReadProfileConfigData(configJson, errorMessage))
			{
				bool lighthouseBeamWidthMissing = IsLighthouseBeamWidthMissing(configJson);
				bool hideModelPropertyMissing = IsAnyLightEntryMissingProperty(configJson, "hidemodel");
				hasGasLampEntryJson = TryGetLightEntryJson(configJson, "IH_Decorative_GasLamp", gasLampEntryJson);
				hasLuxuryLampEntryJson = TryGetLightEntryJson(configJson, "IH_Decorative_LuxuryLamp", luxuryLampEntryJson);
				booleanMigrationPendingSave = NormalizeBooleanJson(configJson, normalizedConfigJson);

				IH_LightingConfig loadedConfig = new IH_LightingConfig();
				if (JsonFileLoader<IH_LightingConfig>.LoadData(normalizedConfigJson, loadedConfig, errorMessage) && loadedConfig)
				{
					lightingconfig = loadedConfig.lightingconfig;
					lights = loadedConfig.lights;
					if (!lights)
						lights = new array<ref IH_LightConfigEntry>;

					if (hideModelPropertyMissing)
						hideModelPropertiesAdded = true;

					if (lighthouseBeamWidthMissing)
					{
						IH_LightConfigEntry lighthouseSettings = FindLight("IH_Rotating_Lighthouse");
						if (lighthouseSettings)
						{
							lighthouseSettings.beamwidthangle = LIGHTHOUSE_DEFAULT_BEAM_WIDTH;
							lighthouseBeamWidthAdded = true;
						}
					}

					if (booleanMigrationPendingSave)
					{
						string migrationSaveError;
						if (WriteProfileConfigData(normalizedConfigJson, migrationSaveError))
						{
							booleanMigrationPendingSave = false;
						}
						else
						{
							Print("[IronhordeLighting][ERROR] Failed to save migrated profile lighting config: " + migrationSaveError);
						}
					}
				}
				else
				{
					Print("[IronhordeLighting][ERROR] Failed to load profile lighting config: " + errorMessage);
					lights = new array<ref IH_LightConfigEntry>;
				}
			}
			else
			{
				Print("[IronhordeLighting][ERROR] Failed to read profile lighting config: " + errorMessage);
				lights = new array<ref IH_LightConfigEntry>;
			}
		}

		bool isChanged = lighthouseBeamWidthAdded || hideModelPropertiesAdded;
		isChanged = NormalizeLoadedAssetNames() || isChanged;
		isChanged = RemoveDuplicateAssetNames() || isChanged;
		if (hasGasLampEntryJson)
			isChanged = FillMissingLampProperties("IH_Decorative_GasLamp", gasLampEntryJson, BuildGasLampDefault()) || isChanged;
		if (hasLuxuryLampEntryJson)
			isChanged = FillMissingLampProperties("IH_Decorative_LuxuryLamp", luxuryLampEntryJson, BuildLuxuryLampDefault()) || isChanged;
		isChanged = FillMissingDefaults(hasExistingConfig) || isChanged;

		if (lightingconfig != 1)
			lightingconfig = 0;

		if (!hasExistingConfig || isChanged || booleanMigrationPendingSave)
			SaveProfileConfig();
	}

	void SaveProfileConfig()
	{
		string configJson;
		if (!BuildJsonPayload(configJson))
			return;

		string errorMessage;
		if (!WriteProfileConfigData(configJson, errorMessage))
			Print("[IronhordeLighting][ERROR] Failed to save profile lighting config: " + errorMessage);
	}

	IH_LightConfigEntry FindLight(string assetName)
	{
		string normalizedAssetName = NormalizeAssetName(assetName);

		foreach (IH_LightConfigEntry lightSetting : lights)
		{
			if (lightSetting && NormalizeAssetName(lightSetting.assetname) == normalizedAssetName)
				return lightSetting;
		}

		return null;
	}

	bool FillMissingLampProperties(string assetName, string originalEntryJson, IH_LightConfigEntry defaultSettings)
	{
		IH_LightConfigEntry lightSettings = FindLight(assetName);
		if (!lightSettings || !defaultSettings)
			return false;

		bool changed = false;
		if (!JsonObjectHasProperty(originalEntryJson, "lighttype")) { lightSettings.lighttype = defaultSettings.lighttype; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "redcolor")) { lightSettings.redcolor = defaultSettings.redcolor; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "greencolor")) { lightSettings.greencolor = defaultSettings.greencolor; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "bluecolor")) { lightSettings.bluecolor = defaultSettings.bluecolor; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "totalbrightnessscale")) { lightSettings.totalbrightnessscale = defaultSettings.totalbrightnessscale; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "lightbrightness")) { lightSettings.lightbrightness = defaultSettings.lightbrightness; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "beamlengthradius")) { lightSettings.beamlengthradius = defaultSettings.beamlengthradius; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "midbeamlengthradius")) { lightSettings.midbeamlengthradius = defaultSettings.midbeamlengthradius; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "corebeamlengthradius")) { lightSettings.corebeamlengthradius = defaultSettings.corebeamlengthradius; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "rotationspeed")) { lightSettings.rotationspeed = defaultSettings.rotationspeed; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "downwardpitchangle")) { lightSettings.downwardpitchangle = defaultSettings.downwardpitchangle; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "pulsingenabled")) { lightSettings.pulsingenabled = defaultSettings.pulsingenabled; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "pulsespeed")) { lightSettings.pulsespeed = defaultSettings.pulsespeed; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "beamwidthangle")) { lightSettings.beamwidthangle = defaultSettings.beamwidthangle; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "fadeoutradius")) { lightSettings.fadeoutradius = defaultSettings.fadeoutradius; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "visibleindaylight")) { lightSettings.visibleindaylight = defaultSettings.visibleindaylight; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "castshadow")) { lightSettings.castshadow = defaultSettings.castshadow; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "flarevisible")) { lightSettings.flarevisible = defaultSettings.flarevisible; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "hidemodel")) { lightSettings.hidemodel = defaultSettings.hidemodel; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "ambientred")) { lightSettings.ambientred = defaultSettings.ambientred; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "ambientgreen")) { lightSettings.ambientgreen = defaultSettings.ambientgreen; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "ambientblue")) { lightSettings.ambientblue = defaultSettings.ambientblue; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "strobeenabled")) { lightSettings.strobeenabled = defaultSettings.strobeenabled; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "strobespeed")) { lightSettings.strobespeed = defaultSettings.strobespeed; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "strobedelay")) { lightSettings.strobedelay = defaultSettings.strobedelay; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "signalpatternenabled")) { lightSettings.signalpatternenabled = defaultSettings.signalpatternenabled; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "flickerspeed")) { lightSettings.flickerspeed = defaultSettings.flickerspeed; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "flickeramplitude")) { lightSettings.flickeramplitude = defaultSettings.flickeramplitude; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "shadowspeed")) { lightSettings.shadowspeed = defaultSettings.shadowspeed; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "shadowamplitude")) { lightSettings.shadowamplitude = defaultSettings.shadowamplitude; changed = true; }
		if (!JsonObjectHasProperty(originalEntryJson, "rgbcyclespeedseconds")) { lightSettings.rgbcyclespeedseconds = defaultSettings.rgbcyclespeedseconds; changed = true; }

		return changed;
	}

	bool NormalizeLoadedAssetNames()
	{
		bool changed = false;

		foreach (IH_LightConfigEntry lightSetting : lights)
		{
			if (!lightSetting)
				continue;

			string normalizedAssetName = NormalizeAssetName(lightSetting.assetname);
			if (lightSetting.assetname != normalizedAssetName)
			{
				lightSetting.assetname = normalizedAssetName;
				changed = true;
			}
		}

		return changed;
	}

	bool RemoveDuplicateAssetNames()
	{
		bool changed = false;

		for (int index = lights.Count() - 1; index >= 0; index--)
		{
			IH_LightConfigEntry candidate = lights.Get(index);
			if (!candidate)
			{
				lights.Remove(index);
				changed = true;
				continue;
			}

			string candidateName = NormalizeAssetName(candidate.assetname);
			for (int compareIndex = 0; compareIndex < index; compareIndex++)
			{
				IH_LightConfigEntry existingSetting = lights.Get(compareIndex);
				if (existingSetting && NormalizeAssetName(existingSetting.assetname) == candidateName)
				{
					lights.Remove(index);
					changed = true;
					break;
				}
			}
		}

		return changed;
	}

	bool FillMissingDefaults(bool hideMissingDefaultModels = false)
	{
		s_HideMissingDefaultModels = hideMissingDefaultModels;
		bool changed = false;
		IH_LightConfigEntry lightDefaults;

		if (!FindLight("IH_Fireflies"))
		{
			lightDefaults = NewBaseDefault("IH_Fireflies", "particle");
			lights.Insert(lightDefaults);
			changed = true;
		}

		lightDefaults = CreatePointDefault("IH_Candle", 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02); changed = true; }
		changed = AddDecorativeCandleDefault() || changed;
		changed = AddDecorativeCandle02Default() || changed;
		changed = AddDecorativeCandle03Default() || changed;
		changed = AddDecorativeLantern01Default() || changed;
		changed = AddDecorativeLantern02Default() || changed;
		changed = AddDecorativeWalltorch01Default() || changed;
		changed = AddGasLampDefault() || changed;
		lightDefaults = CreatePointDefault("IH_Blinking_Airfield_LandingLight", 10, 255, 10, 1.0, 1.0, 1.0, 3.0, 0.0, 0.0, 0.0);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, true, true, true, false, true); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Blinking_Tower_BeaconLight", 255, 0, 0, 1.0, 4.0, 5.0, 8.0, 0.0, 0.0, 0.0);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, true, true, true, true, false); ConfigurePointDynamics(lightDefaults, 6.0, 0.5); changed = true; }
		lightDefaults = CreatePointDefault("IH_Heat_BurningBodies", 255, 145, 45, 0.25, 0.1, 0.5, 2.0, 0.22, 0.09, 0.025);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02); changed = true; }
		lightDefaults = CreatePointDefault("IH_Heat_Campfire", 255, 145, 45, 0.25, 0.1, 0.5, 2.0, 0.22, 0.09, 0.025);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02); changed = true; }

		lightDefaults = CreatePointDefault("IH_Industrial_Light_01", 255, 200, 128, 0.8, 0.0533, 2.6667, 3.6667, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_Light_02", 255, 200, 128, 0.8, 0.08, 4.0, 5.5, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_Light_03", 255, 200, 128, 0.8, 0.12, 8.0, 10.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_Light_04", 255, 200, 128, 0.8, 0.18, 13.0, 16.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_Light_05", 255, 200, 128, 0.8, 0.24, 20.0, 24.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_Light_06", 255, 200, 128, 0.8, 0.3, 30.0, 30.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }

		lightDefaults = CreatePointDefault("IH_Hangar_Lamp_01", 255, 200, 128, 0.8, 0.0533, 2.6667, 3.6667, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Hangar_Lamp_02", 255, 200, 128, 0.8, 0.08, 4.0, 5.5, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Hangar_Lamp_03", 255, 200, 128, 0.8, 0.12, 8.0, 10.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Hangar_Lamp_04", 255, 200, 128, 0.8, 0.18, 13.0, 16.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Hangar_Lamp_05", 255, 200, 128, 0.8, 0.24, 20.0, 24.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Hangar_Lamp_06", 255, 200, 128, 0.8, 0.3, 30.0, 30.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }

		lightDefaults = CreatePointDefault("IH_LightSource_01", 255, 200, 128, 0.8, 0.0533, 2.6667, 3.6667, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		changed = AddLuxuryLampDefault() || changed;
		lightDefaults = CreatePointDefault("IH_LightSource_02", 255, 200, 128, 0.8, 0.08, 4.0, 5.5, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_LightSource_03", 255, 200, 128, 0.8, 0.12, 8.0, 10.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_LightSource_04", 255, 200, 128, 0.8, 0.18, 13.0, 16.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_LightSource_05", 255, 200, 128, 0.8, 0.24, 20.0, 24.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_LightSource_06", 255, 200, 128, 0.8, 0.3, 30.0, 30.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Flicker_House_Outside_Entrance", 222, 197, 78, 0.8, 0.0533, 1.33335, 1.83335, 0.87, 0.77, 0.31);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }


		changed = AddRotatingDefault("IH_Rotating_Red_01", 255, 0, 0, 0.40, 1.00117, 3.33356, 60.0, 0.0, true, 5.0, 12.0) || changed;
		changed = AddRotatingDefault("IH_Rotating_Red_02", 255, 0, 0, 0.525, 1.83431, 6.11130, 85.0, 0.0, true, 5.3333, 17.5) || changed;
		changed = AddRotatingDefault("IH_Rotating_Red_03", 255, 0, 0, 0.65, 2.66745, 8.88904, 110.0, 0.0, true, 5.6667, 23.0) || changed;
		changed = AddRotatingDefault("IH_Rotating_Red_04", 255, 0, 0, 0.775, 3.50058, 11.66678, 135.0, 0.0, true, 6.0, 28.5) || changed;
		changed = AddRotatingDefault("IH_Rotating_Red_05", 255, 0, 0, 0.90, 4.33372, 14.44452, 160.0, 0.0, true, 6.3333, 34.0) || changed;
		changed = AddRotatingDefault("IH_Rotating_Red_06", 255, 0, 0, 1.025, 5.16686, 17.22226, 185.0, 0.0, true, 6.6667, 39.5) || changed;
		changed = AddRotatingDefault("IH_Rotating_Red_07", 255, 0, 0, 1.15, 6.0, 20.0, 210.0, 0.0, true, 7.0, 45.0) || changed;
		changed = AddRotatingDefault("IH_Rotating_Amber_01", 255, 130, 0, 1.0, 1.50, 11.67, 90.0, 0.0, true, 5.0, 90.0) || changed;
		changed = AddRotatingDefault("IH_Rotating_Amber_02", 255, 130, 0, 1.0, 5.0, 40.0, 180.0, 0.0, true, 7.0, 90.0) || changed;
		changed = AddRotatingDefault("IH_Rotating_Blue", 50, 120, 255, 1.0, 4.5, 35.0, 110.0, 0.0, true, 5.0, 90.0) || changed;
		changed = AddRotatingDefault("IH_Rotating_Green", 0, 255, 90, 1.0, 4.0, 35.0, 90.0, 0.0, true, 5.0, 90.0) || changed;
		changed = AddLayeredRotatingDefault("IH_Rotating_Lighthouse", 255, 255, 255, 1.0, 0.0444, 1000.0, 500.0, 175.0, 12.0, -4.0, LIGHTHOUSE_DEFAULT_BEAM_WIDTH) || changed;

		lightDefaults = CreatePointDefault("IH_Town_LightPole_01", 255, 200, 128, 0.5, 0.06428, 16.9, 9.0625, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Town_LightPole_02", 255, 200, 128, 0.5, 0.08342, 21.52, 11.65, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Town_LightPole_03", 255, 200, 128, 0.5, 0.10257, 26.14, 14.2375, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Town_LightPole_04", 255, 200, 128, 0.5, 0.12171, 30.76, 16.825, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Town_LightPole_05", 255, 200, 128, 0.5, 0.14086, 35.38, 19.4125, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Town_LightPole_06", 255, 200, 128, 0.5, 0.160, 40.0, 22.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, true, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_LightPole_01", 255, 230, 160, 0.5, 0.06428, 45.75, 22.2375, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_LightPole_02", 255, 230, 160, 0.5, 0.08342, 58.2, 28.59, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_LightPole_03", 255, 230, 160, 0.5, 0.10257, 70.65, 34.9425, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_LightPole_04", 255, 230, 160, 0.5, 0.12171, 83.1, 41.295, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_LightPole_05", 255, 230, 160, 0.5, 0.14086, 95.55, 47.6475, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }
		lightDefaults = CreatePointDefault("IH_Industrial_LightPole_06", 255, 230, 160, 0.5, 0.160, 108.0, 54.0, 1.0, 0.9, 0.8);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0); changed = true; }

		changed = AddRotatingDefault("IH_Searchlight_Static", 255, 245, 220, 0.25, 0.171875, 120.0, 0.0, -5.0, false, 1.0, 18.0) || changed;
		changed = AddRotatingDefault("IH_Searchlight_Rotating", 255, 245, 220, 0.25, 0.1796875, 120.0, 18.0, -5.0, false, 1.0, 18.0) || changed;
		changed = AddRotatingDefault("IH_Searchlight_SlowSweep", 255, 245, 220, 0.25, 0.1796875, 120.0, 0.55, -5.0, false, 1.0, 18.0) || changed;
		changed = AddLayeredRotatingDefault("IH_PoliceLight_Static_Forward_Flash_Red_01", 255, 0, 0, 0.45, 0.55, 90.0, 42.0, 16.0, 0.0, -4.0, 38.0) || changed;
		changed = AddLayeredRotatingDefault("IH_PoliceLight_Static_Forward_Flash_Red_02", 255, 0, 0, 0.45, 0.55, 90.0, 42.0, 16.0, 0.0, -4.0, 38.0) || changed;
		changed = AddLayeredRotatingDefault("IH_PoliceLight_Static_Forward_Flash_Blue_01", 0, 40, 255, 0.45, 0.55, 90.0, 42.0, 16.0, 0.0, -4.0, 38.0) || changed;
		changed = AddLayeredRotatingDefault("IH_PoliceLight_Static_Forward_Flash_Blue_02", 0, 40, 255, 0.45, 0.55, 90.0, 42.0, 16.0, 0.0, -4.0, 38.0) || changed;
		changed = AddLayeredRotatingDefault("IH_PoliceLight_Static_Forward_Flash_White_01", 255, 255, 255, 0.45, 0.55, 90.0, 42.0, 16.0, 0.0, -4.0, 38.0) || changed;
		changed = AddLayeredRotatingDefault("IH_PoliceLight_Static_Forward_Flash_White_02", 255, 255, 255, 0.45, 0.55, 90.0, 42.0, 16.0, 0.0, -4.0, 38.0) || changed;


		lightDefaults = CreatePointDefault("IH_Flicker_Fluorescent_Weak", 235, 245, 255, 0.2125, 0.007, 8.0, 11.0, 0.35, 0.38, 0.42);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 1.5, 0.01, 0.75, 0.01); changed = true; }
		lightDefaults = CreatePointDefault("IH_Flicker_Fluorescent_Medium", 235, 245, 255, 0.2125, 0.008, 10.0, 13.0, 0.35, 0.38, 0.42);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 3.0, 0.05, 1.5, 0.03); changed = true; }
		lightDefaults = CreatePointDefault("IH_Flicker_Fluorescent_Strong", 235, 245, 255, 0.2125, 0.009, 12.0, 15.0, 0.35, 0.38, 0.42);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 6.0, 0.14, 2.5, 0.07); changed = true; }
		lightDefaults = CreatePointDefault("IH_Flicker_Fluorescent_Random", 235, 245, 255, 0.2125, 0.0085, 11.0, 14.0, 0.35, 0.38, 0.42);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 8.0, 0.10, 4.0, 0.08); changed = true; }
		lightDefaults = CreatePointDefault("IH_Flicker_Fluorescent_Dying", 225, 240, 255, 0.20, 0.0075, 10.0, 13.0, 0.30, 0.34, 0.38);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, false, false); ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 10.0, 0.22, 3.0, 0.12); changed = true; }


		lightDefaults = CreatePointDefault("IH_Alarm_Bunker_RedPulse", 255, 0, 0, 0.5, 0.05, 3.25, 4.25, 0.125, 0.0, 0.0);
		if (lightDefaults) { ConfigurePointFlags(lightDefaults, false, true, false, true, false); ConfigurePointDynamics(lightDefaults, 1.1, 0.0); changed = true; }

		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_Classic_Left", 255, 0, 0, 0.9, 0.095, 4.75, 6.5, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_Classic_Right", 255, 0, 0, 0.9, 0.095, 4.75, 6.5, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_FastAlt_Left", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_FastAlt_Right", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_SlowAlt_Left", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_SlowAlt_Right", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_CrossPhase_Left", 255, 0, 0, 0.9, 0.0825, 4.25, 5.75, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_CrossPhase_Right", 255, 0, 0, 0.9, 0.0825, 4.25, 5.75, 0.0, 0.0, 0.0) || changed;

		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_Classic_RedOnly_Left", 255, 0, 0, 0.9, 0.095, 4.75, 6.5, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_Classic_RedOnly_Right", 255, 0, 0, 0.9, 0.095, 4.75, 6.5, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_FastAlt_RedOnly_Left", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_FastAlt_RedOnly_Right", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_SlowAlt_RedOnly_Left", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_SlowAlt_RedOnly_Right", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_CrossPhase_RedOnly_Left", 255, 0, 0, 0.9, 0.0825, 4.25, 5.75, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_CrossPhase_RedOnly_Right", 255, 0, 0, 0.9, 0.0825, 4.25, 5.75, 0.0, 0.0, 0.0) || changed;

		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_Classic_BlueOnly_Left", 255, 0, 0, 0.9, 0.095, 4.75, 6.5, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_Classic_BlueOnly_Right", 255, 0, 0, 0.9, 0.095, 4.75, 6.5, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_FastAlt_BlueOnly_Left", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_FastAlt_BlueOnly_Right", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_SlowAlt_BlueOnly_Left", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_SlowAlt_BlueOnly_Right", 255, 0, 0, 0.9, 0.0925, 4.5, 6.25, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_CrossPhase_BlueOnly_Left", 255, 0, 0, 0.9, 0.0825, 4.25, 5.75, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("IH_PoliceLight_US_CrossPhase_BlueOnly_Right", 255, 0, 0, 0.9, 0.0825, 4.25, 5.75, 0.0, 0.0, 0.0) || changed;

		changed = AddPointDefaultWithFlags("RoadWarning_Yellow_01_Center", 255, 255, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Yellow_02_Center", 255, 255, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Yellow_03_Center", 255, 255, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Yellow_04_Center", 255, 255, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Orange_01_Center", 255, 60, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Orange_02_Center", 255, 60, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Orange_03_Center", 255, 60, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Orange_04_Center", 255, 60, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Red_01_Center", 255, 0, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Red_02_Center", 255, 0, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Red_03_Center", 255, 0, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;
		changed = AddPointDefaultWithFlags("RoadWarning_Red_04_Center", 255, 0, 0, 0.9, 0.0675, 3.375, 4.6875, 0.0, 0.0, 0.0) || changed;

		changed = AddStaticColorDefault("IH_Static_Red_01", 255, 0, 0, 1) || changed;
		changed = AddStaticColorDefault("IH_Static_Red_02", 255, 0, 0, 2) || changed;
		changed = AddStaticColorDefault("IH_Static_Red_03", 255, 0, 0, 3) || changed;
		changed = AddStaticColorDefault("IH_Static_Red_04", 255, 0, 0, 4) || changed;
		changed = AddStaticColorDefault("IH_Static_Green_01", 0, 255, 0, 1) || changed;
		changed = AddStaticColorDefault("IH_Static_Green_02", 0, 255, 0, 2) || changed;
		changed = AddStaticColorDefault("IH_Static_Green_03", 0, 255, 0, 3) || changed;
		changed = AddStaticColorDefault("IH_Static_Green_04", 0, 255, 0, 4) || changed;
		changed = AddStaticColorDefault("IH_Static_Yellow_01", 255, 255, 0, 1) || changed;
		changed = AddStaticColorDefault("IH_Static_Yellow_02", 255, 255, 0, 2) || changed;
		changed = AddStaticColorDefault("IH_Static_Yellow_03", 255, 255, 0, 3) || changed;
		changed = AddStaticColorDefault("IH_Static_Yellow_04", 255, 255, 0, 4) || changed;
		changed = AddStaticColorDefault("IH_Static_Orange_01", 255, 156, 0, 1) || changed;
		changed = AddStaticColorDefault("IH_Static_Orange_02", 255, 156, 0, 2) || changed;
		changed = AddStaticColorDefault("IH_Static_Orange_03", 255, 156, 0, 3) || changed;
		changed = AddStaticColorDefault("IH_Static_Orange_04", 255, 156, 0, 4) || changed;
		changed = AddStaticColorDefault("IH_Static_Blue_01", 0, 0, 255, 1) || changed;
		changed = AddStaticColorDefault("IH_Static_Blue_02", 0, 0, 255, 2) || changed;
		changed = AddStaticColorDefault("IH_Static_Blue_03", 0, 0, 255, 3) || changed;
		changed = AddStaticColorDefault("IH_Static_Blue_04", 0, 0, 255, 4) || changed;
		changed = AddStaticColorDefault("IH_Static_LightBlue_01", 0, 168, 255, 1) || changed;
		changed = AddStaticColorDefault("IH_Static_LightBlue_02", 0, 168, 255, 2) || changed;
		changed = AddStaticColorDefault("IH_Static_LightBlue_03", 0, 168, 255, 3) || changed;
		changed = AddStaticColorDefault("IH_Static_LightBlue_04", 0, 168, 255, 4) || changed;
		changed = AddStaticColorDefault("IH_Static_Pink_01", 255, 0, 255, 1) || changed;
		changed = AddStaticColorDefault("IH_Static_Pink_02", 255, 0, 255, 2) || changed;
		changed = AddStaticColorDefault("IH_Static_Pink_03", 255, 0, 255, 3) || changed;
		changed = AddStaticColorDefault("IH_Static_Pink_04", 255, 0, 255, 4) || changed;
		changed = AddStaticColorDefault("IH_Static_UV_01", 144, 20, 184, 1) || changed;
		changed = AddStaticColorDefault("IH_Static_UV_02", 144, 20, 184, 2) || changed;
		changed = AddStaticColorDefault("IH_Static_UV_03", 144, 20, 184, 3) || changed;
		changed = AddStaticColorDefault("IH_Static_UV_04", 144, 20, 184, 4) || changed;

		changed = AddLedStripDefault("IH_LEDStrip_Red_1m", 255, 0, 0, 0.100, 1.25, 1.90, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Green_1m", 0, 255, 0, 0.100, 1.25, 1.90, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Blue_1m", 0, 20, 255, 0.100, 1.25, 1.90, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Cyan_1m", 0, 255, 255, 0.100, 1.25, 1.90, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_White_1m", 255, 235, 200, 0.100, 1.25, 1.90, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_RGB_1m", 255, 0, 0, 0.100, 1.25, 1.90, 10.0) || changed;

		changed = AddLedStripDefault("IH_LEDStrip_Red_2m", 255, 0, 0, 0.150, 1.75, 2.60, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Green_2m", 0, 255, 0, 0.150, 1.75, 2.60, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Blue_2m", 0, 20, 255, 0.150, 1.75, 2.60, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Cyan_2m", 0, 255, 255, 0.150, 1.75, 2.60, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_White_2m", 255, 235, 200, 0.150, 1.75, 2.60, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_RGB_2m", 255, 0, 0, 0.150, 1.75, 2.60, 10.0) || changed;

		changed = AddLedStripDefault("IH_LEDStrip_Red_4m", 255, 0, 0, 0.220, 2.35, 3.35, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Green_4m", 0, 255, 0, 0.220, 2.35, 3.35, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Blue_4m", 0, 20, 255, 0.220, 2.35, 3.35, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_Cyan_4m", 0, 255, 255, 0.220, 2.35, 3.35, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_White_4m", 255, 235, 200, 0.220, 2.35, 3.35, 0.0) || changed;
		changed = AddLedStripDefault("IH_LEDStrip_RGB_4m", 255, 0, 0, 0.220, 2.35, 3.35, 10.0) || changed;

		s_HideMissingDefaultModels = false;
		return changed;
	}

	bool AddLedStripDefault(string assetName, float red, float green, float blue, float brightness, float radius, float fadeRadius, float rgbCycleSpeedSeconds)
	{
		IH_LightConfigEntry lightDefaults = FindLight(assetName);
		if (lightDefaults)
		{
			if (lightDefaults.lighttype == "ledstrip")
				return false;

			ConfigureLedStripDefaultEntry(lightDefaults, assetName, red, green, blue, brightness, radius, fadeRadius, rgbCycleSpeedSeconds);
			return true;
		}

		lightDefaults = NewBaseDefault(assetName, "ledstrip");
		ConfigureLedStripDefaultEntry(lightDefaults, assetName, red, green, blue, brightness, radius, fadeRadius, rgbCycleSpeedSeconds);
		lights.Insert(lightDefaults);
		return true;
	}

	void ConfigureLedStripDefaultEntry(IH_LightConfigEntry lightDefaults, string assetName, float red, float green, float blue, float brightness, float radius, float fadeRadius, float rgbCycleSpeedSeconds)
	{
		lightDefaults.assetname = assetName;
		lightDefaults.lighttype = "ledstrip";
		lightDefaults.redcolor = red;
		lightDefaults.greencolor = green;
		lightDefaults.bluecolor = blue;
		lightDefaults.totalbrightnessscale = 0.32;
		lightDefaults.lightbrightness = brightness;
		lightDefaults.beamlengthradius = radius;
		lightDefaults.midbeamlengthradius = 0.0;
		lightDefaults.corebeamlengthradius = 0.0;
		lightDefaults.rotationspeed = 0.0;
		lightDefaults.downwardpitchangle = 0.0;
		lightDefaults.pulsingenabled = false;
		lightDefaults.pulsespeed = 1.0;
		lightDefaults.beamwidthangle = 0.0;
		lightDefaults.fadeoutradius = fadeRadius;
		lightDefaults.ambientred = (red / 255.0) * 0.28;
		lightDefaults.ambientgreen = (green / 255.0) * 0.28;
		lightDefaults.ambientblue = (blue / 255.0) * 0.28;
		ConfigurePointFlags(lightDefaults, false, false, true, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0);
		ConfigureRgbCycleSpeed(lightDefaults, rgbCycleSpeedSeconds);
	}

	bool AddRotatingDefault(string assetName, float red, float green, float blue, float colorScale, float brightness, float radius, float rotationSpeed, float pitch, bool usePulse, float pulseRate, float spotAngle)
	{
		if (FindLight(assetName))
			return false;

		IH_LightConfigEntry lightDefaults = NewBaseDefault(assetName, "rotating");
		lightDefaults.redcolor = red;
		lightDefaults.greencolor = green;
		lightDefaults.bluecolor = blue;
		lightDefaults.totalbrightnessscale = colorScale;
		lightDefaults.lightbrightness = brightness;
		lightDefaults.beamlengthradius = radius;
		lightDefaults.rotationspeed = rotationSpeed;
		lightDefaults.downwardpitchangle = pitch;
		lightDefaults.pulsingenabled = usePulse;
		lightDefaults.pulsespeed = pulseRate;
		lightDefaults.beamwidthangle = spotAngle;
		lights.Insert(lightDefaults);
		return true;
	}

	bool AddLayeredRotatingDefault(string assetName, float red, float green, float blue, float colorScale, float brightness, float longRadius, float midRadius, float coreRadius, float rotationSpeed, float pitch, float spotAngle)
	{
		if (FindLight(assetName))
			return false;

		IH_LightConfigEntry lightDefaults = NewBaseDefault(assetName, "layeredrotating");
		lightDefaults.redcolor = red;
		lightDefaults.greencolor = green;
		lightDefaults.bluecolor = blue;
		lightDefaults.totalbrightnessscale = colorScale;
		lightDefaults.lightbrightness = brightness;
		lightDefaults.beamlengthradius = longRadius;
		lightDefaults.midbeamlengthradius = midRadius;
		lightDefaults.corebeamlengthradius = coreRadius;
		lightDefaults.rotationspeed = rotationSpeed;
		lightDefaults.downwardpitchangle = pitch;
		lightDefaults.pulsingenabled = false;
		lightDefaults.pulsespeed = 1.0;
		lightDefaults.beamwidthangle = spotAngle;
		lights.Insert(lightDefaults);
		return true;
	}

	IH_LightConfigEntry CreatePointDefault(string assetName, float red, float green, float blue, float colorScale, float brightness, float radius, float fadeRadius, float ambientRed, float ambientGreen, float ambientBlue)
	{
		if (FindLight(assetName))
			return null;

		IH_LightConfigEntry lightDefaults = BuildPointDefault(assetName, red, green, blue, colorScale, brightness, radius, fadeRadius, ambientRed, ambientGreen, ambientBlue);
		lights.Insert(lightDefaults);
		return lightDefaults;
	}

	IH_LightConfigEntry BuildPointDefault(string assetName, float red, float green, float blue, float colorScale, float brightness, float radius, float fadeRadius, float ambientRed, float ambientGreen, float ambientBlue)
	{
		IH_LightConfigEntry lightDefaults = NewBaseDefault(assetName, "point");
		lightDefaults.redcolor = red;
		lightDefaults.greencolor = green;
		lightDefaults.bluecolor = blue;
		lightDefaults.totalbrightnessscale = colorScale;
		lightDefaults.lightbrightness = brightness;
		lightDefaults.beamlengthradius = radius;
		lightDefaults.fadeoutradius = fadeRadius;
		lightDefaults.ambientred = ambientRed;
		lightDefaults.ambientgreen = ambientGreen;
		lightDefaults.ambientblue = ambientBlue;
		return lightDefaults;
	}

	IH_LightConfigEntry BuildGasLampDefault()
	{
		IH_LightConfigEntry lightDefaults = BuildPointDefault("IH_Decorative_GasLamp", 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		ConfigurePointFlags(lightDefaults, false, true, false, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 0.0740667, 0.05, 0.0370333, 0.02);
		lightDefaults.hidemodel = false;
		return lightDefaults;
	}

	IH_LightConfigEntry BuildDecorativeCandleDefault()
	{
		IH_LightConfigEntry lightDefaults = BuildPointDefault("IH_Decorative_Candle_01", 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		ConfigurePointFlags(lightDefaults, false, true, false, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02);
		lightDefaults.hidemodel = false;
		return lightDefaults;
	}

	IH_LightConfigEntry BuildDecorativeCandle02Default()
	{
		IH_LightConfigEntry lightDefaults = BuildPointDefault("IH_Decorative_Candle_02", 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		ConfigurePointFlags(lightDefaults, false, true, false, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02);
		lightDefaults.hidemodel = false;
		return lightDefaults;
	}

	IH_LightConfigEntry BuildDecorativeCandle03Default()
	{
		IH_LightConfigEntry lightDefaults = BuildPointDefault("IH_Decorative_Candle_03", 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		ConfigurePointFlags(lightDefaults, false, true, false, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02);
		lightDefaults.hidemodel = false;
		return lightDefaults;
	}

	IH_LightConfigEntry BuildDecorativeLantern01Default()
	{
		IH_LightConfigEntry lightDefaults = BuildPointDefault("IH_Decorative_Lantern_01", 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		ConfigurePointFlags(lightDefaults, false, true, false, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02);
		lightDefaults.hidemodel = false;
		return lightDefaults;
	}

	IH_LightConfigEntry BuildDecorativeLantern02Default()
	{
		IH_LightConfigEntry lightDefaults = BuildPointDefault("IH_Decorative_Lantern_02", 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		ConfigurePointFlags(lightDefaults, false, true, false, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02);
		lightDefaults.hidemodel = false;
		return lightDefaults;
	}

	IH_LightConfigEntry BuildDecorativeWalltorch01Default()
	{
		IH_LightConfigEntry lightDefaults = BuildPointDefault("IH_Decorative_Walltorch_01", 255, 200, 80, 0.25, 0.1, 0.5, 2.0, 0.2, 0.15, 0.05);
		ConfigurePointFlags(lightDefaults, false, true, false, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0, 2.0, 0.05, 1.0, 0.02);
		lightDefaults.hidemodel = false;
		return lightDefaults;
	}

	IH_LightConfigEntry BuildLuxuryLampDefault()
	{
		IH_LightConfigEntry lightDefaults = BuildPointDefault("IH_Decorative_LuxuryLamp", 255, 200, 128, 0.8, 0.0533, 2.6667, 3.6667, 1.0, 0.9, 0.8);
		ConfigurePointFlags(lightDefaults, false, true, true, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0);
		lightDefaults.hidemodel = false;
		return lightDefaults;
	}

	bool AddGasLampDefault()
	{
		if (FindLight("IH_Decorative_GasLamp"))
			return false;

		lights.Insert(BuildGasLampDefault());
		return true;
	}

	bool AddDecorativeCandleDefault()
	{
		if (FindLight("IH_Decorative_Candle_01"))
			return false;

		lights.Insert(BuildDecorativeCandleDefault());
		return true;
	}

	bool AddDecorativeCandle02Default()
	{
		if (FindLight("IH_Decorative_Candle_02"))
			return false;

		lights.Insert(BuildDecorativeCandle02Default());
		return true;
	}

	bool AddDecorativeCandle03Default()
	{
		if (FindLight("IH_Decorative_Candle_03"))
			return false;

		lights.Insert(BuildDecorativeCandle03Default());
		return true;
	}

	bool AddDecorativeLantern01Default()
	{
		if (FindLight("IH_Decorative_Lantern_01"))
			return false;

		lights.Insert(BuildDecorativeLantern01Default());
		return true;
	}

	bool AddDecorativeLantern02Default()
	{
		if (FindLight("IH_Decorative_Lantern_02"))
			return false;

		lights.Insert(BuildDecorativeLantern02Default());
		return true;
	}

	bool AddDecorativeWalltorch01Default()
	{
		if (FindLight("IH_Decorative_Walltorch_01"))
			return false;

		lights.Insert(BuildDecorativeWalltorch01Default());
		return true;
	}

	bool AddLuxuryLampDefault()
	{
		if (FindLight("IH_Decorative_LuxuryLamp"))
			return false;

		lights.Insert(BuildLuxuryLampDefault());
		return true;
	}

	bool AddPointDefaultWithFlags(string assetName, float red, float green, float blue, float colorScale, float brightness, float radius, float fadeRadius, float ambientRed, float ambientGreen, float ambientBlue)
	{
		IH_LightConfigEntry lightDefaults = CreatePointDefault(assetName, red, green, blue, colorScale, brightness, radius, fadeRadius, ambientRed, ambientGreen, ambientBlue);
		if (!lightDefaults)
			return false;

		ConfigurePointFlags(lightDefaults, true, false, true, false, false);
		ConfigurePointDynamics(lightDefaults, 1.0, 1.0);
		return true;
	}

	bool AddStaticColorDefault(string assetName, float red, float green, float blue, int brightnessTier)
	{
		float brightness = 0.03;
		float radius = 2.5;
		float fadeRadius = 3.75;

		switch (brightnessTier)
		{
			case 2:
				brightness = 0.06;
				radius = 4.0;
				fadeRadius = 5.75;
				break;
			case 3:
				brightness = 0.09;
				radius = 5.5;
				fadeRadius = 7.75;
				break;
			case 4:
				brightness = 0.12;
				radius = 7.0;
				fadeRadius = 9.75;
				break;
		}

		return AddPointDefaultWithFlags(assetName, red, green, blue, 0.9, brightness, radius, fadeRadius, 0.0, 0.0, 0.0);
	}

	void ConfigurePointFlags(IH_LightConfigEntry lightDefaults, bool visibleDuringDaylight, bool castShadow, bool flareVisible, bool strobeEnabled, bool signalPatternEnabled)
	{
		lightDefaults.visibleindaylight = visibleDuringDaylight;
		lightDefaults.castshadow = castShadow;
		lightDefaults.flarevisible = flareVisible;
		lightDefaults.strobeenabled = strobeEnabled;
		lightDefaults.signalpatternenabled = signalPatternEnabled;
	}

	void ConfigurePointDynamics(IH_LightConfigEntry lightDefaults, float strobeSpeed, float strobeDelay, float flickerSpeed = 0.0, float flickerAmplitude = 0.0, float shadowSpeed = 0.0, float shadowAmplitude = 0.0)
	{
		lightDefaults.strobespeed = strobeSpeed;
		lightDefaults.strobedelay = strobeDelay;
		lightDefaults.flickerspeed = flickerSpeed;
		lightDefaults.flickeramplitude = flickerAmplitude;
		lightDefaults.shadowspeed = shadowSpeed;
		lightDefaults.shadowamplitude = shadowAmplitude;
	}

	void ConfigureRgbCycleSpeed(IH_LightConfigEntry lightDefaults, float cycleSpeedSeconds)
	{
		lightDefaults.rgbcyclespeedseconds = cycleSpeedSeconds;
	}

	IH_LightConfigEntry NewBaseDefault(string assetName, string lightType)
	{
		IH_LightConfigEntry lightDefaults = new IH_LightConfigEntry();
		lightDefaults.assetname = assetName;
		lightDefaults.lighttype = lightType;
		lightDefaults.totalbrightnessscale = 1.0;
		lightDefaults.downwardpitchangle = -12.0;
		lightDefaults.pulsingenabled = true;
		lightDefaults.pulsespeed = 5.0;
		lightDefaults.beamwidthangle = 90.0;
		lightDefaults.fadeoutradius = 0.0;
		lightDefaults.visibleindaylight = false;
		lightDefaults.castshadow = true;
		lightDefaults.flarevisible = true;
		lightDefaults.hidemodel = s_HideMissingDefaultModels;
		return lightDefaults;
	}

	static string NormalizeAssetName(string assetName)
	{
		switch (assetName)
		{
			case "GasLamp":
				return "IH_Decorative_GasLamp";
			case "LuxuryLamp":
				return "IH_Decorative_LuxuryLamp";
			case "IH_Candle_With_Light":
				return "IH_Candle";
			case "IH_Airfield_LandingLight":
				return "IH_Blinking_Airfield_LandingLight";
			case "IH_Tower_BeaconLight":
				return "IH_Blinking_Tower_BeaconLight";
			case "IH_BurningBodies":
				return "IH_Heat_BurningBodies";
			case "IH_Campfire_With_Heat":
				return "IH_Heat_Campfire";
			case "IH_Industrial_Light":
				return "IH_Industrial_Light_01";
			case "IH_Industrial_Light_Larger_Radius":
				return "IH_Industrial_Light_02";
			case "IH_Industrial_Light_Brighter1":
				return "IH_Industrial_Light_03";
			case "IH_Industrial_Light_Brighter1_Larger_Radius":
				return "IH_Industrial_Light_04";
			case "IH_Industrial_Light_Brighter2":
				return "IH_Industrial_Light_05";
			case "IH_Industrial_Light_Brighter2_Larger_Radius":
				return "IH_Industrial_Light_06";
			case "IH_Hangar_Lamp":
				return "IH_Hangar_Lamp_01";
			case "IH_Hangar_Lamp_Larger_Radius":
				return "IH_Hangar_Lamp_02";
			case "IH_Hangar_Lamp_Brighter1":
				return "IH_Hangar_Lamp_03";
			case "IH_Hangar_Lamp_Brighter1_Larger_Radius":
				return "IH_Hangar_Lamp_04";
			case "IH_Hangar_Lamp_Brighter2":
				return "IH_Hangar_Lamp_05";
			case "IH_Hangar_Lamp_Brighter2_Larger_Radius":
				return "IH_Hangar_Lamp_06";
			case "IH_Rotating_RedBeacon":
				return "IH_Rotating_Red_01";
			case "IH_Rotating_RedBeacon_Fast":
				return "IH_Rotating_Red_02";
			case "IH_Rotating_RedBeacon_Fast_Half_Beam":
				return "IH_Rotating_Red_03";
			case "IH_Rotating_RedBeacon_Fast_Quarter_Beam":
				return "IH_Rotating_Red_04";
			case "IH_Rotating_RedBeacon_Slow":
				return "IH_Rotating_Red_05";
			case "IH_Rotating_RedBeacon_Wide":
				return "IH_Rotating_Red_06";
			case "IH_Rotating_RedBeacon_BunkerAlarm":
				return "IH_Rotating_Red_07";
			case "IH_Rotating_AmberBeacon":
				return "IH_Rotating_Amber_01";
			case "IH_Rotating_AmberBeacon_Fast":
				return "IH_Rotating_Amber_02";
			case "IH_Rotating_BlueBeacon":
				return "IH_Rotating_Blue";
			case "IH_Rotating_GreenBeacon":
				return "IH_Rotating_Green";
			case "IH_Rotating_LighthouseBeam":
				return "IH_Rotating_Lighthouse";
			case "IH_LightPole":
			case "IH_LightPole_01":
				return "IH_Town_LightPole_01";
			case "IH_Airfield_LightPole":
			case "IH_LightPole_02":
				return "IH_Industrial_LightPole_01";
		}

		return assetName;
	}
};

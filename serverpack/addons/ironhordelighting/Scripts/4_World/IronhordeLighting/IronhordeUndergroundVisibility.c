class IH_UndergroundVisibilityEntry
{
	ScriptedLightBase light;
	bool baseVisibleDuringDaylight;
	bool forcedVisible;

	void IH_UndergroundVisibilityEntry(ScriptedLightBase lightSource, bool baseVisible)
	{
		light = lightSource;
		baseVisibleDuringDaylight = baseVisible;
	}
}

class IH_UndergroundVisibilityManager
{
	static const int CHECK_INTERVAL_MS = 2000;
	static ref array<ref IH_UndergroundVisibilityEntry> s_Lights;
	static bool s_CheckStarted;
	static bool s_ForceVisible;
	static bool s_FullDarkDaytime;
	static bool s_IsDaytime;
	static bool s_StateInitialized;

	static void RegisterLight(ScriptedLightBase lightSource, bool baseVisibleDuringDaylight)
	{
		if (!lightSource || !GetGame() || (!GetGame().IsClient() && GetGame().IsMultiplayer()))
			return;

		EnsureStarted();

		IH_UndergroundVisibilityEntry entry = FindEntry(lightSource);
		if (!entry)
		{
			entry = new IH_UndergroundVisibilityEntry(lightSource, baseVisibleDuringDaylight);
			s_Lights.Insert(entry);
		}
		else
		{
			entry.baseVisibleDuringDaylight = baseVisibleDuringDaylight;
		}

		ApplyEntry(entry, s_ForceVisible);
	}

	static void UnregisterLight(ScriptedLightBase lightSource)
	{
		if (!s_Lights || !lightSource)
			return;

		for (int index = s_Lights.Count() - 1; index >= 0; index--)
		{
			IH_UndergroundVisibilityEntry entry = s_Lights.Get(index);
			if (!entry || entry.light == lightSource)
				s_Lights.Remove(index);
		}
	}

	protected static IH_UndergroundVisibilityEntry FindEntry(ScriptedLightBase lightSource)
	{
		if (!s_Lights)
			s_Lights = new array<ref IH_UndergroundVisibilityEntry>;

		foreach (IH_UndergroundVisibilityEntry entry : s_Lights)
		{
			if (entry && entry.light == lightSource)
				return entry;
		}

		return null;
	}

	protected static void EnsureStarted()
	{
		if (!s_Lights)
			s_Lights = new array<ref IH_UndergroundVisibilityEntry>;

		if (s_CheckStarted || !GetGame())
			return;

		s_CheckStarted = true;
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(CheckVisibilityState, CHECK_INTERVAL_MS, true);
		CheckVisibilityState();
	}

	static void Reset()
	{
		if (s_CheckStarted && GetGame())
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(CheckVisibilityState);

		if (s_Lights)
			s_Lights.Clear();

		s_CheckStarted = false;
		s_ForceVisible = false;
		s_FullDarkDaytime = false;
		s_IsDaytime = false;
		s_StateInitialized = false;
	}

	static void CheckVisibilityState()
	{
		bool shouldForceVisible = IsInFullDarkUnderground();
		bool shouldUseDaytime = IsWorldDaytime();
		bool shouldUseFullDarkDaytime = shouldForceVisible && shouldUseDaytime;

		if (!s_StateInitialized)
		{
			s_ForceVisible = shouldForceVisible;
			s_FullDarkDaytime = shouldUseFullDarkDaytime;
			s_IsDaytime = shouldUseDaytime;
			s_StateInitialized = true;
			ApplyAll(shouldForceVisible);
			return;
		}

		if (shouldForceVisible == s_ForceVisible && shouldUseFullDarkDaytime == s_FullDarkDaytime && shouldUseDaytime == s_IsDaytime)
			return;

		s_ForceVisible = shouldForceVisible;
		s_FullDarkDaytime = shouldUseFullDarkDaytime;
		s_IsDaytime = shouldUseDaytime;
		IH_ConfigurableLightEntityBase.RefreshAllConfigurableLights();
		ApplyAll(shouldForceVisible);
	}

	static bool IsFullDarkUndergroundActive()
	{
		return s_ForceVisible || IsInFullDarkUnderground();
	}

	static bool IsFullDarkUndergroundDaytimeActive()
	{
		return s_FullDarkDaytime || (IsInFullDarkUnderground() && IsWorldDaytime());
	}

	static bool IsWorldDaytimeActive()
	{
		return s_IsDaytime || IsWorldDaytime();
	}

	protected static void ApplyAll(bool forceVisible)
	{
		if (!s_Lights)
			return;

		for (int index = s_Lights.Count() - 1; index >= 0; index--)
		{
			IH_UndergroundVisibilityEntry entry = s_Lights.Get(index);
			if (!entry || !entry.light)
			{
				s_Lights.Remove(index);
				continue;
			}

			ApplyEntry(entry, forceVisible);
		}
	}

	protected static void ApplyEntry(IH_UndergroundVisibilityEntry entry, bool forceVisible)
	{
		if (!entry || !entry.light)
			return;

		if (forceVisible)
		{
			entry.light.SetVisibleDuringDaylight(true);
			entry.forcedVisible = true;
			return;
		}

		if (entry.forcedVisible || entry.light.IsVisibleDuringDaylight() != entry.baseVisibleDuringDaylight)
			entry.light.SetVisibleDuringDaylight(entry.baseVisibleDuringDaylight);

		entry.forcedVisible = false;
	}

	protected static bool IsInFullDarkUnderground()
	{
		if (!GetGame() || !GetGame().GetWorld())
			return false;

		PlayerBase player = PlayerBase.Cast(GetGame().GetPlayer());
		if (!player)
			return false;

		return player.m_UndergroundPresence > EUndergroundPresence.NONE && GetGame().GetWorld().GetEyeAccom() <= 0.001;
	}

	protected static bool IsWorldDaytime()
	{
		if (!GetGame() || !GetGame().GetWorld())
			return false;

		int year;
		int month;
		int day;
		int hour;
		int minute;
		GetGame().GetWorld().GetDate(year, month, day, hour, minute);
		return hour >= 5 && hour < 21;
	}
}

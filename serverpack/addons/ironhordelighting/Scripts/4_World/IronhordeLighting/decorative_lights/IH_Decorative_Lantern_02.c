class IH_Decorative_Lantern_02 extends IH_CandleEffectsBase
{
	void IH_Decorative_Lantern_02()
	{
		InitializeCandleEffects(true);
	}

	vector GetDecorativeLantern02EffectPosition()
	{
		return GetMemoryPointPos("light_pos");
	}

	override vector GetCandleFlamePosition()
	{
		return GetDecorativeLantern02EffectPosition();
	}

	override vector GetCandleLightPosition()
	{
		return GetDecorativeLantern02EffectPosition();
	}
}

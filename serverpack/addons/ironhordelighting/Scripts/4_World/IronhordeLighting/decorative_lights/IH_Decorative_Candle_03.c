class IH_Decorative_Candle_03 extends IH_CandleEffectsBase
{
	void IH_Decorative_Candle_03()
	{
		InitializeCandleEffects(true);
	}

	vector GetDecorativeCandleWickPosition()
	{
		return Vector(0.0, 0.0, -0.177368);
	}

	override vector GetCandleFlamePosition()
	{
		return GetDecorativeCandleWickPosition();
	}

	override vector GetCandleLightPosition()
	{
		return GetDecorativeCandleWickPosition();
	}
}

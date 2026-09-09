class IH_Decorative_Candle_02 extends IH_CandleEffectsBase
{
	void IH_Decorative_Candle_02()
	{
		InitializeCandleEffects(true);
	}

	vector GetDecorativeCandleWickPosition()
	{
		return Vector(-0.030257, 0.008118, 0.444432);
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

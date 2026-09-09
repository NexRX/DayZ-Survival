class IH_Decorative_Candle_01 extends IH_CandleEffectsBase
{
	void IH_Decorative_Candle_01()
	{
		InitializeCandleEffects(true);
	}

	vector GetDecorativeCandleWickPosition()
	{
		return Vector(0.0, 0.0, 0.676375);
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

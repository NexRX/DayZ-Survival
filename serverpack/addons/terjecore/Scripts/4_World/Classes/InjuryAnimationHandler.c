modded class InjuryAnimationHandler
{
	int TerjeInjuryLevelToValue(eInjuryHandlerLevels level)
	{
		if (level == eInjuryHandlerLevels.PRISTINE)
		{
			return 0;
		}
		else if (level == eInjuryHandlerLevels.WORN)
		{
			return 1;
		}
		else if (level == eInjuryHandlerLevels.DAMAGED)
		{
			return 2;
		}
		else if (level == eInjuryHandlerLevels.BADLY_DAMAGED)
		{
			return 3;
		}
		else
		{
			return 4;
		}
	}
}
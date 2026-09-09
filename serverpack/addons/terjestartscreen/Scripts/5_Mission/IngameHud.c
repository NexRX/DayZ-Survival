modded class IngameHud
{
	int TERJE_BADGE_SOULS = -1;

	override void InitBadgesAndNotifiers()
	{
		super.InitBadgesAndNotifiers();
		
		TERJE_BADGE_SOULS = RegisterTerjeBadgetWidget(TerjePlayerSoulsAccessor.SOULS_BADGE, "TerjeSouls", TerjeBadgeType.COUNTER);
	}
}

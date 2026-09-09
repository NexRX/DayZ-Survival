modded class TerjeStartScreenPagesFactory
{
	override void CreateTerjeStartScreenPages(TerjeWidgetMultitab multitabWidget)
	{
		super.CreateTerjeStartScreenPages(multitabWidget);
		
		multitabWidget.CreateTabWidgetEx("rules", TerjeStartScreenPageRules);
		multitabWidget.CreateTabWidgetEx("name", TerjeStartScreenPageName);
		multitabWidget.CreateTabWidgetEx("face", TerjeStartScreenPageFace);
		multitabWidget.CreateTabWidgetEx("skills", TerjeStartScreenPageSkills);
		multitabWidget.CreateTabWidgetEx("overview", TerjeStartScreenPageOverview);
		multitabWidget.CreateTabWidgetEx("loadout", TerjeStartScreenPageLoadout);
		multitabWidget.CreateTabWidgetEx("map", TerjeStartScreenPageMap);
	}
}
class TerjeWidgetEmpty : TerjeWidgetBase
{
	TerjeWidgetBase CreateContentWidget(typename name)
	{
		return CreateTerjeWidget(name);
	}
}
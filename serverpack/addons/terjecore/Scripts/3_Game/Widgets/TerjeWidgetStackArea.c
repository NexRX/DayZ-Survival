class TerjeWidgetStackArea : TerjeWidgetBase
{
	override void OnInit()
	{
		super.OnInit();
		RecalculateLayout();
	}
	
	override string GetNativeLayout()
	{
		return "TerjeCore/Layouts/TerjeWidgetStackArea.layout";
	}
	
	void RecalculateLayout()
	{
		PushPostCommand(new TerjeWidgetCommand_StackAreaRecalc());
	}
	
	void RecalculateLayoutImmediately()
	{
		GetNativeWidget().Update();
	}
	
	void Clear()
	{
		DestroyAllChildren();
	}
	
	TerjeWidgetBase CreateChildWidget(typename name)
	{
		return CreateTerjeWidget(name);
	}
	
	override void OnCommand(TerjeWidgetCommand command, float timeslice)
	{
		super.OnCommand(command, timeslice);
		
		if (command.IsInherited(TerjeWidgetCommand_StackAreaRecalc))
		{
			RecalculateLayoutImmediately();
			return;
		}
	}
}

class TerjeWidgetCommand_StackAreaRecalc : TerjeWidgetCommand
{
}
class TerjeWidgetScrollArea : TerjeWidgetBase
{
	protected Widget m_contentWidget;
	
	override void OnCreate(Widget parent)
	{
		super.OnCreate(parent);
		m_contentWidget = GetNativeWidget().FindAnyWidget("TerjeWidgetGrid");
	}
	
	override void OnInit()
	{
		super.OnInit();
		RecalculateLayout();
	}
	
	override string GetNativeLayout()
	{
		return "TerjeCore/Layouts/TerjeWidgetScrollArea.layout";
	}
	
	float GetContentAreaWidth()
	{
		return ScrollWidget.Cast(GetNativeWidget()).GetContentWidth();
	}
	
	void RecalculateLayout()
	{
		PushPostCommand(new TerjeWidgetCommand_ScrollAreaRecalc());
	}
	
	void RecalculateLayoutImmediately()
	{
		m_contentWidget.Update();
	}
	
	void Clear()
	{
		DestroyAllChildren();
		ScrollToPos(0);
	}
	
	TerjeWidgetBase CreateChildWidget(typename name)
	{
		return CreateTerjeWidgetEx(name, m_contentWidget);
	}
	
	override void OnCommand(TerjeWidgetCommand command, float timeslice)
	{
		super.OnCommand(command, timeslice);
		
		if (command.IsInherited(TerjeWidgetCommand_ScrollAreaRecalc))
		{
			RecalculateLayoutImmediately();
			return;
		}
		else if (command.IsInherited(TerjeWidgetCommand_ScrollToPos))
		{
			ScrollToPosImmediately((TerjeWidgetCommand_ScrollToPos.Cast(command)).m_value);
			return;
		}
	}
	
	float GetScrollPos()
	{
		return ScrollWidget.Cast(GetNativeWidget()).GetVScrollPos01();
	}
	
	void ScrollToPos(float pos)
	{
		PushCommand(new TerjeWidgetCommand_ScrollToPos(pos));
	}
	
	void ScrollToPosImmediately(float pos)
	{
		ScrollWidget.Cast(GetNativeWidget()).VScrollToPos01(pos);
	}
	
	bool IsScrollVisible()
	{
		return ScrollWidget.Cast(GetNativeWidget()).IsScrollbarVisible();
	}
}

class TerjeWidgetCommand_ScrollAreaRecalc : TerjeWidgetCommand
{
}

class TerjeWidgetCommand_ScrollToPos : TerjeWidgetCommand
{
	float m_value;
	
	void TerjeWidgetCommand_ScrollToPos(float value)
	{
		m_value = value;
	}
}
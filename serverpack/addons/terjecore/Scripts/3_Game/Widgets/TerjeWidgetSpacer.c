class TerjeWidgetSpacer : TerjeWidgetBase
{
	void SetSpacing(float size)
	{
		PushCommand(new TerjeWidgetCommand_SpacerSize(size));
	}
	
	void SetSpacingImmediately(float size)
	{
	
	}
	
	override void OnCommand(TerjeWidgetCommand command, float timeslice)
	{
		super.OnCommand(command, timeslice);
		
		if (command.IsInherited(TerjeWidgetCommand_SpacerSize))
		{
			SetSpacingImmediately(TerjeWidgetCommand_SpacerSize.Cast(command).m_size);
			return;
		}
	}
}

class TerjeWidgetSpacerH : TerjeWidgetSpacer
{
	override string GetNativeLayout()
	{
		return "TerjeCore/Layouts/TerjeWidgetSpacerH.layout";
	}
	
	override void SetSpacingImmediately(float size)
	{
		float w;
		float h;
		GetNativeWidget().GetSize(w, h);
		GetNativeWidget().SetSize(w, size);
	}
}

class TerjeWidgetSpacerV : TerjeWidgetSpacer
{
	override string GetNativeLayout()
	{
		return "TerjeCore/Layouts/TerjeWidgetTextSmallV.layout";
	}
	
	override void SetSpacingImmediately(float size)
	{
		float w;
		float h;
		GetNativeWidget().GetSize(w, h);
		GetNativeWidget().SetSize(size, h);
	}
}

class TerjeWidgetCommand_SpacerSize : TerjeWidgetCommand
{
	float m_size;
	
	void TerjeWidgetCommand_SpacerSize(float size)
	{
		m_size = size;
	}
}
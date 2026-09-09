class TerjeWidgetImage : TerjeWidgetBase
{
	void SetImage(string path)
	{
		PushCommand(new TerjeWidgetCommand_Image(path));
	}
	
	void SetImageImmediately(string path)
	{
		ImageWidget.Cast(GetNativeWidget()).LoadImageFile(0, path);
	}

	override string GetNativeLayout()
	{
		return "TerjeCore/Layouts/TerjeWidgetImage.layout";
	}
	
	override void OnCommand(TerjeWidgetCommand command, float timeslice)
	{
		super.OnCommand(command, timeslice);
		
		if (command.IsInherited(TerjeWidgetCommand_Image))
		{
			SetImageImmediately(TerjeWidgetCommand_Image.Cast(command).m_path);
			return;
		}
	}
}

class TerjeWidgetCommand_Image : TerjeWidgetCommand
{
	string m_path;
	
	void TerjeWidgetCommand_Image(string path)
	{
		m_path = path;
	}
}
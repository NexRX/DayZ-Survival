modded class InspectMenuNew
{
	override Widget Init()
	{
		Widget rootWidget = super.Init();
		Widget textDescWidget = rootWidget.FindAnyWidget("ItemDescWidget");
		if (textDescWidget && !textDescWidget.IsInherited(RichTextWidget) && textDescWidget.IsInherited(TextWidget))
		{
			// Replace TextWidget to RichTextWidget
			float left;
			float top;
			textDescWidget.GetScreenPos(left, top);
			
			float width;
			float height;
			textDescWidget.GetScreenSize(width, height);

			Widget parent = textDescWidget.GetParent();
			if (parent)
			{
				RichTextWidget newTextWidget = RichTextWidget.Cast(GetGame().GetWorkspace().CreateWidgets("TerjeCore/Layouts/RichTextInspectWidget.layout", parent));
				if (newTextWidget)
				{
					parent.RemoveChild(textDescWidget);
					newTextWidget.SetName("ItemDescWidget");
					newTextWidget.SetScreenPos(left, top);
					newTextWidget.SetScreenSize(width, height);
					newTextWidget.SetTextExactSize(24);
					newTextWidget.Update();
				}
			}
		}
		
		return rootWidget;
	}
}
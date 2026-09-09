class TerjeWidgetsHelper
{
	static void DumpWidget(Widget w)
	{
		float left;
		float top;
		float width;
		float height;
		string typeId = w.GetTypeName() + "TypeID";
		int flags = w.GetFlags();
		int color = w.GetColor();
		int sort = w.GetSort();
		w.GetPos(left, top);
		w.GetSize(width, height);

		int leftInt = (int)left;
		int topInt = (int)top;
		int widthInt = (int)width;
		int heightInt = (int)height;

		string fncArgs = typeId + ", " + leftInt + ", " + topInt + ", " + widthInt + ", " + heightInt + ", " + flags + ", " + color + ", " + sort + ", NULL";
		TerjeLog_Info("========= WIDGET DUMP BEGIN =========");
		TerjeLog_Info("GetGame().GetWorkspace().CreateWidget(" + fncArgs + ");");
		TerjeLog_Info("========== WIDGET DUMP END ==========");
	}
}
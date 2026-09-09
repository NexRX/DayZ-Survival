class TerjeTextFileStreamWriter : TerjeTextStreamWriter
{
	FileHandle m_Handle;
	
	void TerjeTextFileStreamWriter(string path)
	{
		m_Handle = OpenFile(path, FileMode.WRITE);
	}
	
	override void Write(string data)
	{
		FPrint(m_Handle, data);
	}
	
	override void WriteLine(string data)
	{
		FPrintln(m_Handle, data);
	}
	
	override bool IsOpen()
	{
		return m_Handle != 0;
	}
	
	override void Close()
	{
		if (IsOpen())
		{
			CloseFile(m_Handle);
		}
	}
}
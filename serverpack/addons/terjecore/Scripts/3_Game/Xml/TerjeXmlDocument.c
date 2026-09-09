class TerjeXmlDocument : TerjeXmlBase
{
	void DeepCopy(TerjeXmlDocument dst, bool copyChildren, bool copyComments)
	{
		dst.ClearChildren();
		if (this.HasChildren())
		{
			for (int childId = 0; childId < this.GetChildrenCount(); childId++)
			{
				TerjeXmlObject srcChild = this.GetChild(childId);
				if (copyComments || !srcChild.IsCommentNode())
				{
					srcChild.DeepCopy(dst.CreateChild(""), copyChildren, copyComments);
				}
			}
		}
	}
	
	bool Binarize(Serializer ctx)
	{
		int childrenCount = this.GetChildrenCount();
		if (!ctx.Write(childrenCount))
			return false;
		
		for (int childId = 0; childId < childrenCount; childId++)
		{
			if (!this.GetChild(childId).Binarize(ctx))
				return false;
		}
		
		return true;
	}
	
	bool Unbinarize(Serializer ctx)
	{
		int childrenCount;
		if (!ctx.Read(childrenCount))
			return false;
		
		for (int childId = 0; childId < childrenCount; childId++)
		{
			TerjeXmlObject child = CreateChild(string.Empty);
			if (!child.Unbinarize(ctx))
				return false;
		}
		
		return true;
	}
	
	bool DeserializeFromFile(string path)
	{
		TerjeTextFileStreamReader stream = new TerjeTextFileStreamReader(path);
		if (!stream.IsOpen())
		{
			TerjeLog_Error("Failed to open file for reading: " + path);
			return false;
		}
		
		bool result = DeserializeFromStream(stream);
		stream.Close();
		return result;
	}
	
	bool DeserializeFromStream(TerjeTextStreamReader stream)
	{
		string payload;
		m_Children = new array<ref TerjeXmlObject>;
		while (stream.ReadTo("<", payload))
		{
			if (TerjeXmlObject.HasTokensInString(payload))
			{
				TerjeXmlObject.ThrowParsingError(stream, "Invalid payload: " + payload);
			}
			
			ref TerjeXmlObject node = new TerjeXmlObject;
			if (node.Deserialize(stream))
			{
				m_Children.Insert(node);
			}
			else
			{
				return false;
			}
		}
		
		return true;
	}
	
	void SerializeToFile(string path, bool useIntents = true)
	{
		TerjeTextFileStreamWriter stream = new TerjeTextFileStreamWriter(path);
		if (!stream.IsOpen())
		{
			TerjeLog_Error("Failed to open file for writing: " + path);
			return;
		}
		
		SerializeToStream(stream, useIntents);
		stream.Close();
	}
	
	void SerializeToStream(TerjeTextStreamWriter stream, bool useIntents = false)
	{
		if (m_Children != null)
		{
			foreach (ref TerjeXmlObject node : m_Children)
			{
				node.Serialize(stream, useIntents);
			}
		}
	}
}
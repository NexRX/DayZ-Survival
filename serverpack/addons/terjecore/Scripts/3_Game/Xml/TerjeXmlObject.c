class TerjeXmlObject : TerjeXmlBase
{
	protected string m_Name = string.Empty;
	protected string m_Value = string.Empty;
	protected string m_Extra = string.Empty;
	protected ref map<string, string> m_Attributes = null;
	protected ref array<string> m_AttributesOrder = null;
	
	void Clear()
	{
		m_Name = string.Empty;
		m_Value = string.Empty;
		m_Extra = string.Empty;
		m_Attributes = null;
		m_AttributesOrder = null;
		ClearChildren();
	}
	
	void SetName(string name)
	{
		m_Name = name;
	}
	
	string GetName()
	{
		return m_Name;
	}
	
	void SetValue(string value)
	{
		m_Value = value;
	}
	
	string GetValue()
	{
		return m_Value;
	}
	
	bool HasValue()
	{
		return m_Value.Length() > 0;
	}
	
	void SetExtra(string extra)
	{
		m_Extra = extra;
	}
	
	string GetExtra()
	{
		return m_Extra;
	}
	
	bool IsObjectNode()
	{
		return GetExtra().Length() == 0;
	}
	
	bool IsManifestNode()
	{
		return GetExtra() == "manifest";
	}
	
	bool IsCommentNode()
	{
		return GetExtra() == "comment";
	}
	
	void ClearAttributes()
	{
		m_Attributes = null;
		m_AttributesOrder = null;
	}
	
	void SetAttribute(string name, string value)
	{
		if (m_Attributes == null)
		{
			m_Attributes = new map<string, string>;
			m_AttributesOrder = new array<string>;
		}
		
		if (!m_Attributes.Contains(name))
		{
			m_AttributesOrder.Insert(name);
		}
		
		m_Attributes.Set(name, value);
	}
	
	void RemoveAttribute(string name)
	{
		if (m_Attributes != null)
		{
			m_Attributes.Remove(name);
			m_AttributesOrder.RemoveItem(name);
		}
	}
	
	void GetAttribute(int index, out string attrName, out string attrValue)
	{
		attrName = m_AttributesOrder.Get(index);
		attrValue = m_Attributes.Get(attrName);
	}
	
	string GetAttribute(string name)
	{
		string result;
		FindAttribute(name, result);
		return result;
	}
	
	bool FindAttribute(string name, out string value)
	{
		if (m_Attributes != null)
		{
			return m_Attributes.Find(name, value);
		}
		
		value = string.Empty;
		return false;
	}
	
	bool HasAttribute(string name)
	{		
		return m_Attributes != null && m_Attributes.Contains(name);
	}
	
	bool EqualAttribute(string name, string expectedValue)
	{
		string actualValue;
		return FindAttribute(name, actualValue) && (actualValue == expectedValue);
	}
	
	bool HasAttributes()
	{
		return m_Attributes != null && m_Attributes.Count() > 0;
	}
	
	int GetAttributesCount()
	{
		if (m_Attributes != null)
		{
			return m_Attributes.Count();
		}
		
		return 0;
	}
	
	map<string, string> GetAttributes()
	{
		return m_Attributes;
	}
	
	array<string> GetAttributeNames()
	{
		return m_AttributesOrder;
	}
	
	void DeepCopy(TerjeXmlObject dst, bool copyChildren, bool copyComments)
	{
		dst.Clear();
		dst.SetName(this.GetName());
		dst.SetValue(this.GetValue());
		dst.SetExtra(this.GetExtra());
		
		if (this.HasAttributes())
		{
			string attrName;
			string attrValue;
			for (int attrId = 0; attrId < this.GetAttributesCount(); attrId++)
			{
				this.GetAttribute(attrId, attrName, attrValue);
				dst.SetAttribute(attrName, attrValue);
			}
		}
		
		if (copyChildren && this.HasChildren())
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
		if (!ctx.Write(this.m_Name))
			return false;
		
		if (!ctx.Write(this.m_Value))
			return false;
		
		if (!ctx.Write(this.m_Extra))
			return false;
		
		int attrCount = this.GetAttributesCount();
		if (!ctx.Write(attrCount))
			return false;
		
		string attrName;
		string attrValue;
		for (int attrId = 0; attrId < attrCount; attrId++)
		{
			this.GetAttribute(attrId, attrName, attrValue);
			if (!ctx.Write(attrName))
				return false;
			
			if (!ctx.Write(attrValue))
				return false;
		}
		
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
		if (!ctx.Read(this.m_Name))
			return false;
		
		if (!ctx.Read(this.m_Value))
			return false;
		
		if (!ctx.Read(this.m_Extra))
			return false;
		
		int attrCount;
		if (!ctx.Read(attrCount))
			return false;
		
		string attrName;
		string attrValue;
		ClearAttributes();
		for (int attrId = 0; attrId < attrCount; attrId++)
		{
			if (!ctx.Read(attrName))
				return false;
			
			if (!ctx.Read(attrValue))
				return false;
			
			this.SetAttribute(attrName, attrValue);
		}
		
		int childrenCount;
		if (!ctx.Read(childrenCount))
			return false;
		
		ClearChildren();
		for (int childId = 0; childId < childrenCount; childId++)
		{
			TerjeXmlObject child = CreateChild(string.Empty);
			if (!child.Unbinarize(ctx))
				return false;
		}
		
		return true;
	}
	
	void Serialize(TerjeTextStreamWriter stream, bool useIntents = true)
	{
		int intent = -1;
		if (useIntents)
		{
			intent = 0;
		}
		
		PrintToStream(stream, intent);
	}
	
	bool Deserialize(TerjeTextStreamReader stream)
	{
		int lineNumber = 1;
		return ParseFromStream(stream, false, 0, string.Empty);
	}
	
	private void PrintToStream(TerjeTextStreamWriter stream, int intent = 0)
	{
		bool useLinewrap = (intent >= 0);
		if (intent > 0)
		{
			stream.Write(BuildIntent(intent));
		}
		
		stream.Write(ToStringHeader());

		if (IsObjectNode())
		{
			if (HasChildren())
			{
				int newIntent = intent;
				if (useLinewrap)
				{
					stream.WriteLine(string.Empty);
					newIntent = newIntent + 1;
				}
				
				for (int i = 0; i < GetChildrenCount(); i++)
				{
					GetChild(i).PrintToStream(stream, newIntent);
				}
				
				if (intent > 0)
				{
					stream.Write(BuildIntent(intent));
				}
				
				stream.Write(ToStringFooter());
			}
			else if (HasValue())
			{
				stream.Write(GetValue());
				stream.Write(ToStringFooter());
			}
		}
		
		if (useLinewrap)
		{
			stream.WriteLine(string.Empty);
		}
	}
	
	private bool ParseFromStream(TerjeTextStreamReader stream, bool skipFirstToken, int extraType, string extraToken)
	{
		int type = 0;
		string token = string.Empty;
		
		if (skipFirstToken == false)
		{
			type = ParseStringToTokens(stream, token);
			if ((type != 1) || (token != "<"))
			{
				ThrowParsingError(stream, "[0x01] Unexpected tag open token " + token);
				return false;
			}
			
			type = ParseStringToTokens(stream, token);
		}
		else
		{
			type = extraType;
			token = extraToken;
		}
		
		if (type == 1)
		{
			if (token == "!")
			{
				type = ParseStringToTokens(stream, token);
				if ((type != 1) || (token != "--"))
				{
					ThrowParsingError(stream, "[0x02] Invalid comment format");
					return false;
				}
				
				SetExtra("comment");
				
				string commentText;
				if (!stream.ReadTo("-->", commentText))
				{
					ThrowParsingError(stream, "[0x03] Invalid comment format");
					return false;
				}
				
				SetValue(commentText);
				
				type = ParseStringToTokens(stream, token);
				if ((type != 1) || (token != "--"))
				{
					ThrowParsingError(stream, "[0x19] Invalid comment format");
					return false;
				}
				
				type = ParseStringToTokens(stream, token);
				if ((type != 1) || (token != ">"))
				{
					ThrowParsingError(stream, "[0x20] Invalid comment format");
					return false;
				}
				
				return true;
			}
			else if (token == "?")
			{
				SetExtra("manifest");
			}
			else
			{
				ThrowParsingError(stream, "[0x04] Unexpected tag extra " + token);
				return false;
			}
			
			type = ParseStringToTokens(stream, token);
			if (type == 3)
			{
				SetName(token);
			}
			else
			{
				ThrowParsingError(stream, "[0x05] Unexpected tag open token type " + type);
				return false;
			}
		}
		else if (type == 3)
		{
			SetName(token);
		}
		else
		{
			ThrowParsingError(stream, "[0x06] Unexpected tag open token type " + type);
			return false;
		}
		
		while (true)
		{
			string attrName;
			type = ParseStringToTokens(stream, attrName);
			if (type == 1)
			{
				bool closedTag = false;
				if ((attrName == "?") || (attrName == "/"))
				{
					type = ParseStringToTokens(stream, attrName);
					closedTag = true;
				}
				
				if ((type == 1) && (attrName == ">"))
				{
					if (closedTag)
					{
						return true;
					}
					else
					{
						break;
					}
				}
				else
				{
					ThrowParsingError(stream, "[0x07] Unexpected tag close token " + token);
					return false;
				}
			}
			else if (type != 3)
			{
				ThrowParsingError(stream, "[0x08] Unexpected attribute name token type " + type);
				return false;
			}
			
			type = ParseStringToTokens(stream, token);
			if ((type != 1) || (token != "="))
			{
				ThrowParsingError(stream, "[0x09] Invalid attribute equal token " + token);
				return false;
			}
			
			string attrValue;
			type = ParseStringToTokens(stream, attrValue);
			if (type != 2 && type != 4)
			{
				ThrowParsingError(stream, "[0x10] Invalid attribute value token " + token);
				return false;
			}
			
			SetAttribute(attrName, attrValue);
		}

		string bodyValue;
		if (!stream.ReadTo("<", bodyValue))
		{
			ThrowParsingError(stream, "[0x11] Closed tag not found.");
			return false;
		}
		
		if (HasTokensInString(bodyValue))
		{
			SetValue(bodyValue);
			
			type = ParseStringToTokens(stream, token);
			if ((type != 1) || (token != "<"))
			{
				ThrowParsingError(stream, "[0x12] Unexpected tag close token " + token);
				return false;
			}
			
			type = ParseStringToTokens(stream, token);
			if ((type != 1) || (token != "/"))
			{
				ThrowParsingError(stream, "[0x13] Unexpected tag close token " + token);
				return false;
			}
			
			type = ParseStringToTokens(stream, token);
			if ((type != 3) || (token != GetName()))
			{
				ThrowParsingError(stream, "[0x14] Invalid tag close " + token);
				return false;
			}
			
			type = ParseStringToTokens(stream, token);
			if ((type != 1) || (token != ">"))
			{
				ThrowParsingError(stream, "[0x15] Unexpected tag close token " + token);
				return false;
			}
			
			return true;
		}
		
		while (true)
		{
			type = ParseStringToTokens(stream, token);
			if ((type != 1) || (token != "<"))
			{
				ThrowParsingError(stream, "[0x16] Unexpected tag token " + token);
				return false;
			}
			
			type = ParseStringToTokens(stream, token);
			if (token != "/")
			{
				if (CreateChild(token).ParseFromStream(stream, true, type, token))
				{
					continue;
				}
				else
				{
					return false;
				}
			}
			
			type = ParseStringToTokens(stream, token);
			if ((type != 3) || (token != GetName()))
			{
				ThrowParsingError(stream, "[0x17] Invalid tag close " + token);
				return false;
			}
			
			type = ParseStringToTokens(stream, token);
			if ((type != 1) || (token != ">"))
			{
				ThrowParsingError(stream, "[0x18] Unexpected tag close token " + token);
				return false;
			}
			
			return true;
		}
				
		return false;
	}
	
	private string ToStringHeader()
	{
		string result = "<";
		if (m_Extra.Length() > 0)
		{
			if (m_Extra == "manifest")
			{
				result = result + "?";
			}
			else if (m_Extra == "comment")
			{
				return "<!-- " + GetValue() + " -->";
			}
		}
		
		result = result + m_Name;
		if (HasAttributes())
		{
			foreach (string attrName : m_AttributesOrder)
			{
				result = result + " " + attrName + "=\"" + m_Attributes.Get(attrName) + "\"";
			}
		}
		
		if (m_Extra == "manifest")
		{
			result = result + "?";
		}
		else if (!HasChildren() && !HasValue())
		{
			result = result + "/";
		}
		
		return result + ">";
	}
	
	private string ToStringFooter()
	{
		if (HasChildren() || HasValue())
		{
			return "</" + GetName() + ">";
		}
		
		return string.Empty;
	}
	
	private static string BuildIntent(int intent)
	{
		string result = string.Empty;
		for (int i = 0; i < intent; i++)
		{
			result = result + "\t";
		}
		
		return result;
	}
	
	static void ThrowParsingError(TerjeTextStreamReader stream, string message)
	{
		TerjeLog_Error("XML parsing error - line " + stream.GetLineNumber() + "; " + message);
	}
	
	static int ParseStringToTokens(TerjeTextStreamReader stream, out string token)
	{
		int type = 0;
		if (!stream.ReadToken(token, type))
		{
			return 0;
		}
		
		if (type == 5)
		{
			return ParseStringToTokens(stream, token);
		}
		
		return type;
	}
	
	static bool HasTokensInString(string input)
	{
		string token;
		int type;
		
		while (true)
		{
			type = input.ParseStringEx(token);
			if (type == 0)
			{
				return false;
			}
			else if (type != 5)
			{
				return true;
			}
		}
		
		return false;
	}
}
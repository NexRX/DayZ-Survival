class TerjeMathHelper
{
	static string ToDisplayPercent(float value)
	{
		string result = (value * 100.0).ToString();
		if (value > 0)
		{
			result = "+" + result;
		}
		
		int dotIndex = result.IndexOf(".");
		if (dotIndex != -1 && (dotIndex + 3) < result.Length())
		{
			result = result.Substring(0, dotIndex + 3);
		}
		
		return result;
	}
	
	static int ClampInt(int value, int min, int max)
	{
		if (value < min)
		{
			value = min;
		}
		if (value > max)
		{
			value = max;
		}
		return value;
	}
	
	static int MinInt(int value1, int value2)
	{
		if (value1 < value2)
		{
			return value1;
		}
		
		return value2;
	}
	
	static int MaxInt(int value1, int value2)
	{
		if (value1 > value2)
		{
			return value1;
		}
		
		return value2;
	}
	
	static int ParseTimespanFromXml(TerjeXmlObject xmlObject)
	{
		int totalSeconds = 0;
		string attrValue;
		if (xmlObject.FindAttribute("seconds", attrValue))
		{
			totalSeconds = totalSeconds + TerjeMathHelper.ClampInt(attrValue.ToInt(), 0, int.MAX);
		}
		
		if (xmlObject.FindAttribute("minutes", attrValue))
		{
			totalSeconds = totalSeconds + TerjeMathHelper.ClampInt(attrValue.ToInt() * 60, 0, int.MAX);
		}
		
		if (xmlObject.FindAttribute("hours", attrValue))
		{
			totalSeconds = totalSeconds + TerjeMathHelper.ClampInt(attrValue.ToInt() * 3600, 0, int.MAX);
		}
		
		return totalSeconds;
	}
}
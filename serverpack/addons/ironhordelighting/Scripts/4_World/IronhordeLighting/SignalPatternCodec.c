class IH_MorseCodeCharacter
{
	autoptr array<bool> m_SignalPattern;




	array<bool> GetCharacter()
	{
		return m_SignalPattern;
	}




	void SetCharacter(array<bool> signalPattern)
	{
		m_SignalPattern = signalPattern;
	}




	bool IsDot(int signalIndex = 0)
	{
		if (signalIndex >= 0 && signalIndex < m_SignalPattern.Count())
		{
			return !m_SignalPattern.Get(signalIndex);
		}

		return false;
	}




	bool IsDash(int signalIndex = 0)
	{
		if (signalIndex >= 0 && signalIndex < m_SignalPattern.Count())
		{
			return m_SignalPattern.Get(signalIndex);
		}

		return false;
	}

	void IH_MorseCodeCharacter() {}
}

class IH_MorseCodeMessage
{
	autoptr array<ref IH_MorseCodeCharacter> m_EncodedSequence;




	array<ref IH_MorseCodeCharacter> GetMessage()
	{
		return m_EncodedSequence;
	}




	void SetMessage(array<ref IH_MorseCodeCharacter> encodedSequence)
	{
		m_EncodedSequence = encodedSequence;
	}




	IH_MorseCodeCharacter GetCharacter(int messageIndex = 0)
	{
		if (messageIndex >= 0 && messageIndex < m_EncodedSequence.Count())
		{
			return m_EncodedSequence.Get(messageIndex);
		}

		return null;
	}




	void SaveMessage(string profileFileName = "message.json")
	{
		JsonFileLoader<IH_MorseCodeMessage>.JsonSaveFile("$profile:\\IronhordeLighting\\" + profileFileName, this);
	}




	void LoadMessage(string profileFileName = "message.json")
	{
		if (FileExist("$profile:\\IronhordeLighting\\" + profileFileName))
		{
			JsonFileLoader<IH_MorseCodeMessage>.JsonLoadFile("$profile:\\IronhordeLighting\\" + profileFileName, this);
		}
	}

	void IH_MorseCodeMessage() {}
}

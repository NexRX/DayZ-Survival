// This is a helper class for more safe handling of storage in DayZ to prevent crashes when storage is corrupted.
class TerjeStorageHelpers
{
	private static int m_TerjeStorageVersion = -1;
	
	static void WriteMarker(ParamsWriteContext ctx, int marker)
	{
		ctx.Write(marker);
	}
	
	static bool VerifyMarker(ParamsReadContext ctx, int marker)
	{
		int storedValue;
		if (ctx.Read(storedValue) && storedValue == marker)
		{
			return true;
		}
		
		return false;
	}
	
	static bool ReadMarker(ParamsReadContext ctx, out int marker)
	{
		return ctx.Read(marker);
	}
	
	static int GetServerInstanceId()
	{
		return GetGame().ServerConfigGetInt("instanceId");
	}
	
	static string GetServerStoragePath()
	{
		return "$mission:storage_" + GetServerInstanceId();
	}
	
	static int GetTerjeStorageVersion()
	{
		if (!GetGame() || !GetGame().IsDedicatedServer())
		{
			return 1; // Client side, using TerjeV1 by default.
		}
		
		if (m_TerjeStorageVersion == -1) // Server side storage version lazy initialization
		{
			// Check version file
			string versionFile = GetServerStoragePath() + "/data/terje_storage_version.bin";
			if (FileExist(versionFile))
			{
				FileSerializer ctx = new FileSerializer();
				ctx.Open(versionFile, FileMode.READ);
				if (ctx.IsOpen())
				{
					if (ctx.Read(m_TerjeStorageVersion))
					{
						TerjeLog_Info("TERJE_STORAGE_VERSION = " + m_TerjeStorageVersion);
					}
					else
					{
						m_TerjeStorageVersion = -1; // Failed to read
					}
					
					ctx.Close();
				}
			}
		}
		
		// Fix corrupted version file
		if (m_TerjeStorageVersion != 0 && m_TerjeStorageVersion != 1)
		{
			m_TerjeStorageVersion = 0; // Change storage to vanilla behaviour
			TerjeLog_Warning("Failed to read TERJE_STORAGE_VERSION. Using migration mode from vanilla storage format.");
		}
		
		return m_TerjeStorageVersion;
	}
	
	static void SetActualTerjeStorageVersion()
	{
		if (!GetGame() || !GetGame().IsDedicatedServer())
		{
			return; // Client side
		}
		
		if (m_TerjeStorageVersion != 1)
		{
			string versionFile = GetServerStoragePath() + "/data/terje_storage_version.bin";
			if (FileExist(versionFile))
			{
				DeleteFile(versionFile);
			}
			
			FileSerializer ctx = new FileSerializer();
			ctx.Open(versionFile, FileMode.WRITE);
			if (ctx.IsOpen())
			{
				m_TerjeStorageVersion = 1;
				ctx.Write(m_TerjeStorageVersion);
				ctx.Close();
				TerjeLog_Info("TERJE_STORAGE_VERSION SET TO " + m_TerjeStorageVersion);
			}
		}
	}
}

class TerjeStorageBaseContext
{
	protected const int TERJE_CORE_STORE_BEGIN_MARKER = 1982056095;
	protected const int TERJE_CORE_STORE_BOOL_MARKER = -1636320286;
	protected const int TERJE_CORE_STORE_FLOAT_MARKER = -22960621;
	protected const int TERJE_CORE_STORE_INT_MARKER = 1343861325;
	protected const int TERJE_CORE_STORE_STRING_MARKER = -1196514327;
	protected const int TERJE_CORE_STORE_VECTOR_MARKER = -9553199213;
	protected const int TERJE_CORE_STORE_CHILDCTX_MARKER = 3348572084;
	protected const int TERJE_CORE_STORE_END_MARKER = 792826894;
	
	protected ref map<string, bool> m_Booleans = null;
	protected ref map<string, float> m_Floats = null;
	protected ref map<string, int> m_Integers = null;
	protected ref map<string, string> m_Strings = null;
	protected ref map<string, vector> m_Vectors = null;
	protected ref map<string, ref TerjeStorageBaseContext> m_ChildCtxs = null;	
}

class TerjeStorageWritingContext : TerjeStorageBaseContext
{
	void OnStoreSave_Booleans(ParamsWriteContext ctx)
	{
		if (m_Booleans != null)
		{
			TerjeStorageHelpers.WriteMarker(ctx, TERJE_CORE_STORE_BOOL_MARKER);
			ctx.Write(m_Booleans.Count());
			foreach (string bid, bool bval : m_Booleans)
			{
				ctx.Write(bid);
				ctx.Write(bval);
			}
		}
	}
	
	void OnStoreSave_Floats(ParamsWriteContext ctx)
	{
		if (m_Floats != null)
		{
			TerjeStorageHelpers.WriteMarker(ctx, TERJE_CORE_STORE_FLOAT_MARKER);
			ctx.Write(m_Floats.Count());
			foreach (string fid, float fval : m_Floats)
			{
				ctx.Write(fid);
				ctx.Write(fval);
			}
		}
	}
	
	void OnStoreSave_Integers(ParamsWriteContext ctx)
	{
		if (m_Integers != null)
		{
			TerjeStorageHelpers.WriteMarker(ctx, TERJE_CORE_STORE_INT_MARKER);
			ctx.Write(m_Integers.Count());
			foreach (string iid, int ival : m_Integers)
			{
				ctx.Write(iid);
				ctx.Write(ival);
			}
		}
	}
	
	void OnStoreSave_Strings(ParamsWriteContext ctx)
	{
		if (m_Strings != null)
		{
			TerjeStorageHelpers.WriteMarker(ctx, TERJE_CORE_STORE_STRING_MARKER);
			ctx.Write(m_Strings.Count());
			foreach (string sid, string sval : m_Strings)
			{
				ctx.Write(sid);
				ctx.Write(sval);
			}
		}
	}
		
	void OnStoreSave_Vectors(ParamsWriteContext ctx)
	{
		if (m_Vectors != null)
		{
			TerjeStorageHelpers.WriteMarker(ctx, TERJE_CORE_STORE_VECTOR_MARKER);
			ctx.Write(m_Vectors.Count());
			foreach (string sid, vector sval : m_Vectors)
			{
				ctx.Write(sid);
				ctx.Write(sval);
			}
		}
	}
	
	void OnStoreSave_ChildCtxs(ParamsWriteContext ctx)
	{
		if (m_ChildCtxs != null)
		{
			TerjeStorageHelpers.WriteMarker(ctx, TERJE_CORE_STORE_CHILDCTX_MARKER);
			ctx.Write(m_ChildCtxs.Count());
			foreach (string sid, ref TerjeStorageBaseContext cval : m_ChildCtxs)
			{
				ctx.Write(sid);
				TerjeStorageWritingContext.Cast(cval).OnStoreSave(ctx);
			}
		}
	}
	
	void OnStoreSave(ParamsWriteContext ctx)
	{
		TerjeStorageHelpers.WriteMarker(ctx, TERJE_CORE_STORE_BEGIN_MARKER);
		OnStoreSave_Booleans(ctx);
		OnStoreSave_Floats(ctx);
		OnStoreSave_Integers(ctx);
		OnStoreSave_Strings(ctx);
		OnStoreSave_Vectors(ctx);
		OnStoreSave_ChildCtxs(ctx);
		TerjeStorageHelpers.WriteMarker(ctx, TERJE_CORE_STORE_END_MARKER);
	}
	
	void WriteBool(string id, bool value)
	{
		if (m_Booleans == null)
		{
			m_Booleans = new map<string, bool>;
		}
		
		m_Booleans.Set(id, value);
	}
	
	void WriteFloat(string id, float value)
	{
		if (m_Floats == null)
		{
			m_Floats = new map<string, float>;
		}
		
		m_Floats.Set(id, value);
	}
	
	void WriteInt(string id, int value)
	{
		if (m_Integers == null)
		{
			m_Integers = new map<string, int>;
		}
		
		m_Integers.Set(id, value);
	}
	
	void WriteString(string id, string value)
	{
		if (m_Strings == null)
		{
			m_Strings = new map<string, string>;
		}
		
		m_Strings.Set(id, value);
	}
		
	void WriteVector(string id, vector value)
	{
		if (m_Vectors == null)
		{
			m_Vectors = new map<string, vector>;
		}
		
		m_Vectors.Set(id, value);
	}
	
	TerjeStorageWritingContext WriteSubcontext(string id)
	{
		if (m_ChildCtxs == null)
		{
			m_ChildCtxs = new map<string, ref TerjeStorageBaseContext>;
		}
		
		TerjeStorageWritingContext result = new TerjeStorageWritingContext;
		m_ChildCtxs.Set(id, result);
		return result;
	}
}

class TerjeStorageReadingContext : TerjeStorageBaseContext
{
	bool OnStoreLoad_Booleans(ParamsReadContext ctx)
	{
		int count;
		if (!ctx.Read(count))
		{
			return false;
		}
		
		if (count > 0)
		{
			m_Booleans = new map<string, bool>;
			for (int i = 0; i < count; i++)
			{
				string id;
				if (!ctx.Read(id))
				{
					return false;
				}
				
				bool value;
				if (!ctx.Read(value))
				{
					return false;
				}
				
				m_Booleans.Set(id, value);
			}
		}
		
		return true;
	}
	
	bool OnStoreLoad_Floats(ParamsReadContext ctx)
	{
		int count;
		if (!ctx.Read(count))
		{
			return false;
		}
		
		if (count > 0)
		{
			m_Floats = new map<string, float>;
			for (int i = 0; i < count; i++)
			{
				string id;
				if (!ctx.Read(id))
				{
					return false;
				}
				
				float value;
				if (!ctx.Read(value))
				{
					return false;
				}
				
				m_Floats.Set(id, value);
			}
		}
		
		return true;
	}
	
	bool OnStoreLoad_Integers(ParamsReadContext ctx)
	{
		int count;
		if (!ctx.Read(count))
		{
			return false;
		}
		
		if (count > 0)
		{
			m_Integers = new map<string, int>;
			for (int i = 0; i < count; i++)
			{
				string id;
				if (!ctx.Read(id))
				{
					return false;
				}
				
				int value;
				if (!ctx.Read(value))
				{
					return false;
				}
				
				m_Integers.Set(id, value);
			}
		}
		
		return true;
	}
	
	bool OnStoreLoad_Strings(ParamsReadContext ctx)
	{
		int count;
		if (!ctx.Read(count))
		{
			return false;
		}
		
		if (count > 0)
		{
			m_Strings = new map<string, string>;
			for (int i = 0; i < count; i++)
			{
				string id;
				if (!ctx.Read(id))
				{
					return false;
				}
				
				string value;
				if (!ctx.Read(value))
				{
					return false;
				}
				
				m_Strings.Set(id, value);
			}
		}
		
		return true;
	}
		
	bool OnStoreLoad_Vectors(ParamsReadContext ctx)
	{
		int count;
		if (!ctx.Read(count))
		{
			return false;
		}
		
		if (count > 0)
		{
			m_Vectors = new map<string, vector>;
			for (int i = 0; i < count; i++)
			{
				string id;
				if (!ctx.Read(id))
				{
					return false;
				}
				
				vector value;
				if (!ctx.Read(value))
				{
					return false;
				}
				
				m_Vectors.Set(id, value);
			}
		}
		
		return true;
	}
	
	bool OnStoreLoad_ChildCtxs(ParamsReadContext ctx)
	{
		int count;
		if (!ctx.Read(count))
		{
			return false;
		}
		
		if (count > 0)
		{
			m_ChildCtxs = new map<string, ref TerjeStorageBaseContext>;
			for (int i = 0; i < count; i++)
			{
				string id;
				if (!ctx.Read(id))
				{
					return false;
				}
				
				TerjeStorageReadingContext value = new TerjeStorageReadingContext;
				if (!value.OnStoreLoad(ctx))
				{
					return false;
				}
				
				m_ChildCtxs.Set(id, value);
			}
		}
		
		return true;
	}
	
	bool OnStoreLoad(ParamsReadContext ctx)
	{
		if (!TerjeStorageHelpers.VerifyMarker(ctx, TERJE_CORE_STORE_BEGIN_MARKER))
		{
			return false;
		}
		
		int marker;
		while (true)
		{
			if (!TerjeStorageHelpers.ReadMarker(ctx, marker))
			{
				return false;
			}
			
			if (marker == TERJE_CORE_STORE_END_MARKER)
			{
				return true;
			}
			else if (marker == TERJE_CORE_STORE_BOOL_MARKER)
			{
				if (!OnStoreLoad_Booleans(ctx))
				{
					return false;
				}
			}
			else if (marker == TERJE_CORE_STORE_FLOAT_MARKER)
			{
				if (!OnStoreLoad_Floats(ctx))
				{
					return false;
				}
			}
			else if (marker == TERJE_CORE_STORE_INT_MARKER)
			{
				if (!OnStoreLoad_Integers(ctx))
				{
					return false;
				}
			}
			else if (marker == TERJE_CORE_STORE_STRING_MARKER)
			{
				if (!OnStoreLoad_Strings(ctx))
				{
					return false;
				}
			}
			else if (marker == TERJE_CORE_STORE_VECTOR_MARKER)
			{
				if (!OnStoreLoad_Vectors(ctx))
				{
					return false;
				}
			}
			else if (marker == TERJE_CORE_STORE_CHILDCTX_MARKER)
			{
				if (!OnStoreLoad_ChildCtxs(ctx))
				{
					return false;
				}
			}
			else
			{
				return false;
			}
		}
		
		return false;
	}
	
	bool ReadBool(string id, out bool value, bool defaultValue = false)
	{
		if (m_Booleans != null && m_Booleans.Find(id, value))
		{
			return true;
		}
		
		value = defaultValue;
		return false;
	}
	
	bool ReadFloat(string id, out float value, float defaultValue = 0)
	{
		if (m_Floats != null && m_Floats.Find(id, value))
		{
			return true;
		}
		
		value = defaultValue;
		return false;
	}
	
	bool ReadInt(string id, out int value, int defaultValue = 0)
	{
		if (m_Integers != null && m_Integers.Find(id, value))
		{
			return true;
		}
		
		value = defaultValue;
		return false;
	}
	
	bool ReadString(string id, out string value, string defaultValue = "")
	{
		if (m_Strings != null && m_Strings.Find(id, value))
		{
			return true;
		}
		
		value = defaultValue;
		return false;
	}
		
	bool ReadVector(string id, out vector value, vector defaultValue = vector.Zero)
	{
		if (m_Vectors != null && m_Vectors.Find(id, value))
		{
			return true;
		}
		
		value = defaultValue;
		return false;
	}
	
	TerjeStorageReadingContext ReadSubcontext(string id)
	{
		TerjeStorageReadingContext value;
		if (m_ChildCtxs != null && m_ChildCtxs.Find(id, value))
		{
			return value;
		}
		
		return null;
	}
	
	void GetBoolKeysArray(array<string> result)
	{
		if (m_Booleans != null)
		{
			for (int i = 0; i < m_Booleans.Count(); i++)
			{
				result.Insert(m_Booleans.GetKey(i));
			}
		}
	}
	
	void GetFloatKeysArray(array<string> result)
	{
		if (m_Floats != null)
		{
			for (int i = 0; i < m_Floats.Count(); i++)
			{
				result.Insert(m_Floats.GetKey(i));
			}
		}
	}
	
	void GetIntKeysArray(array<string> result)
	{
		if (m_Integers != null)
		{
			for (int i = 0; i < m_Integers.Count(); i++)
			{
				result.Insert(m_Integers.GetKey(i));
			}
		}
	}
	
	void GetStringKeysArray(array<string> result)
	{
		if (m_Strings != null)
		{
			for (int i = 0; i < m_Strings.Count(); i++)
			{
				result.Insert(m_Strings.GetKey(i));
			}
		}
	}
		
	void GetVectorKeysArray(array<string> result)
	{
		if (m_Vectors != null)
		{
			for (int i = 0; i < m_Vectors.Count(); i++)
			{
				result.Insert(m_Vectors.GetKey(i));
			}
		}
	}
		
	void GetSubcontextKeysArray(array<string> result)
	{
		if (m_ChildCtxs != null)
		{
			for (int i = 0; i < m_ChildCtxs.Count(); i++)
			{
				result.Insert(m_ChildCtxs.GetKey(i));
			}
		}
	}
}
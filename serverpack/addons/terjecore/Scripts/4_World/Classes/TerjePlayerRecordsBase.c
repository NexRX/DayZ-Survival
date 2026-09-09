class TerjePlayerRecordsBase
{
	private const int STORE_BEGIN_RW_MARKER = -3539889261;
	private const int STORE_END_RW_MARKER = 1719232123;
	
	protected bool m_dirtySynch = false;
	protected bool m_dirtyServer = false;
	protected ref map<string, ref TerjeRecordBase> m_records = new map<string, ref TerjeRecordBase>;
	protected ref map<string, ref TerjeRecordBase> m_synchRecords = new map<string, ref TerjeRecordBase>;
	protected ref array<ref TerjeRecordBase> m_orderedRecords = new array<ref TerjeRecordBase>;
	
	protected int m_timestampExpireRecord;
	protected int m_timestampInstantRecord;
	protected int m_userVariablesIntRecord;
	
	void OnInit()
	{
		m_timestampExpireRecord = RegisterRecordIntMap("core.tstpe", true);
		m_timestampInstantRecord = RegisterRecordIntMap("core.tstpi", true);
		m_userVariablesIntRecord = RegisterRecordIntMap("core.uvint", true);
	}
	
	bool IsDirtySynch()
	{
		return m_dirtySynch;
	}
	
	bool IsDirtyServer()
	{
		return m_dirtyServer;
	}
	
	void ClearDirtySynch()
	{
		m_dirtySynch = false;
	}
	
	void ClearDirtyServer()
	{
		m_dirtyServer = false;
	}
	
	protected void MarkDirtySynch()
	{
		m_dirtySynch = true;
	}
	
	protected void MarkDirtyServer()
	{
		m_dirtyServer = true;
	}
	
	protected int RegisterRecordString(string id, string defaultValue, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordString(defaultValue, serverOnly));
	}
	
	protected int RegisterRecordInt(string id, int defaultValue, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordInt(defaultValue, serverOnly));
	}
	
	protected int RegisterRecordFloat(string id, float defaultValue, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordFloat(defaultValue, serverOnly));
	}
	
	protected int RegisterRecordBool(string id, bool defaultValue, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordBool(defaultValue, serverOnly));
	}
	
	protected int RegisterRecordStringArray(string id, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordStringArray(serverOnly));
	}
	
	protected int RegisterRecordIntArray(string id, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordIntArray(serverOnly));
	}
	
	protected int RegisterRecordFloatArray(string id, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordFloatArray(serverOnly));
	}
	
	protected int RegisterRecordStringMap(string id, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordStringMap(serverOnly));
	}
	
	protected int RegisterRecordIntMap(string id, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordIntMap(serverOnly));
	}
	
	protected int RegisterRecordFloatMap(string id, bool serverOnly)
	{
		return RegisterRecord(id, new TerjeRecordFloatMap(serverOnly));
	}
	
	protected int RegisterRecord(string id, TerjeRecordBase defaultValue)
	{
		if (!GetGame().IsDedicatedServer() && defaultValue.IsServerOnly())
		{
			return -1;
		}
		
		if (id.Length() == 0 || id.Contains(":") || id.Contains(";"))
		{
			TerjeLog_Error("Invalid record ID '" + id + "' format.");
			return -1;
		}
		
		if (m_records.Contains(id))
		{
			TerjeLog_Error("Record with ID " + id + " already registered.");
			return -1;
		}
		
		m_records.Insert(id, defaultValue);
		
		if (!defaultValue.IsServerOnly())
		{
			m_synchRecords.Insert(id, defaultValue);
		}
		
		return m_orderedRecords.Insert(defaultValue);
	}
	
	// SIMPLE TYPES
	string GetStringValue(int id)
	{
		return TerjeRecordString.Cast(m_orderedRecords.Get(id)).GetValue();
	}
	
	void SetStringValue(int id, string value)
	{
		TerjeRecordString record = TerjeRecordString.Cast(m_orderedRecords.Get(id));
		record.SetValue(value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	int GetIntValue(int id)
	{
		return TerjeRecordInt.Cast(m_orderedRecords.Get(id)).GetValue();
	}
	
	void SetIntValue(int id, int value)
	{
		TerjeRecordInt record = TerjeRecordInt.Cast(m_orderedRecords.Get(id));
		record.SetValue(value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	float GetFloatValue(int id)
	{
		return TerjeRecordFloat.Cast(m_orderedRecords.Get(id)).GetValue();
	}
	
	void SetFloatValue(int id, float value)
	{
		TerjeRecordFloat record = TerjeRecordFloat.Cast(m_orderedRecords.Get(id));
		record.SetValue(value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	bool GetBoolValue(int id)
	{
		return TerjeRecordBool.Cast(m_orderedRecords.Get(id)).GetValue();
	}
	
	void SetBoolValue(int id, bool value)
	{
		TerjeRecordBool record = TerjeRecordBool.Cast(m_orderedRecords.Get(id));
		record.SetValue(value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	// ARRAYS
	int GetArrayValuesCount(int id)
	{
		return TerjeRecordArray.Cast(m_orderedRecords.Get(id)).GetValuesCount();
	}
	
	void ClearArrayValues(int id)
	{
		TerjeRecordArray record = TerjeRecordArray.Cast(m_orderedRecords.Get(id));
		record.ClearValues();
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void RemoveArrayValue(int id, int index)
	{
		TerjeRecordArray record = TerjeRecordArray.Cast(m_orderedRecords.Get(id));
		record.RemoveValue(index);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	string GetStringArrayValue(int id, int index)
	{
		return TerjeRecordStringArray.Cast(m_orderedRecords.Get(id)).GetValue(index);
	}
	
	int GetIntArrayValue(int id, int index)
	{
		return TerjeRecordIntArray.Cast(m_orderedRecords.Get(id)).GetValue(index);
	}
	
	float GetFloatArrayValue(int id, int index)
	{
		return TerjeRecordFloatArray.Cast(m_orderedRecords.Get(id)).GetValue(index);
	}
	
	void SetStringArrayValue(int id, int index, string value)
	{
		TerjeRecordStringArray record = TerjeRecordStringArray.Cast(m_orderedRecords.Get(id));
		record.SetValue(index, value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void SetIntArrayValue(int id, int index, int value)
	{
		TerjeRecordIntArray record = TerjeRecordIntArray.Cast(m_orderedRecords.Get(id));
		record.SetValue(index, value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void SetFloatArrayValue(int id, int index, float value)
	{
		TerjeRecordFloatArray record = TerjeRecordFloatArray.Cast(m_orderedRecords.Get(id));
		record.SetValue(index, value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void AddStringArrayValue(int id, string value)
	{
		TerjeRecordStringArray record = TerjeRecordStringArray.Cast(m_orderedRecords.Get(id));
		record.AddValue(value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void AddIntArrayValue(int id, int value)
	{
		TerjeRecordIntArray record = TerjeRecordIntArray.Cast(m_orderedRecords.Get(id));
		record.AddValue(value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void AddFloatArrayValue(int id, float value)
	{
		TerjeRecordFloatArray record = TerjeRecordFloatArray.Cast(m_orderedRecords.Get(id));
		record.AddValue(value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	// MAPS
	int ContainsMapKey(int id, string key)
	{
		return TerjeRecordMap.Cast(m_orderedRecords.Get(id)).ContainsKey(key);
	}
	
	void ClearMapValues(int id)
	{
		TerjeRecordMap record = TerjeRecordMap.Cast(m_orderedRecords.Get(id));
		record.ClearValues();
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void RemoveMapValue(int id, string key)
	{
		TerjeRecordMap record = TerjeRecordMap.Cast(m_orderedRecords.Get(id));
		record.RemoveValue(key);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	map<string, string> GetStringMapValues(int id)
	{
		return TerjeRecordStringMap.Cast(m_orderedRecords.Get(id)).GetValues();
	}
	
	map<string, int> GetIntMapValues(int id)
	{
		return TerjeRecordIntMap.Cast(m_orderedRecords.Get(id)).GetValues();
	}
	
	map<string, float> GetFloatMapValues(int id)
	{
		return TerjeRecordFloatMap.Cast(m_orderedRecords.Get(id)).GetValues();
	}
	
	void SetStringMapValue(int id, string key, string value)
	{
		TerjeRecordStringMap record = TerjeRecordStringMap.Cast(m_orderedRecords.Get(id));
		record.SetValue(key, value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void SetIntMapValue(int id, string key, int value)
	{
		TerjeRecordIntMap record = TerjeRecordIntMap.Cast(m_orderedRecords.Get(id));
		record.SetValue(key, value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	void SetFloatMapValue(int id, string key, float value)
	{
		TerjeRecordFloatMap record = TerjeRecordFloatMap.Cast(m_orderedRecords.Get(id));
		record.SetValue(key, value);
		if (record.IsDirty())
		{
			MarkDirtyServer();
			if (!record.IsServerOnly())
			{
				MarkDirtySynch();
			}
		}
	}
	
	bool FindStringMapValue(int id, string key, out string value)
	{
		return TerjeRecordStringMap.Cast(m_orderedRecords.Get(id)).FindValue(key, value);
	}
	
	bool FindIntMapValue(int id, string key, out int value)
	{
		return TerjeRecordIntMap.Cast(m_orderedRecords.Get(id)).FindValue(key, value);
	}
	
	bool FindFloatMapValue(int id, string key, out float value)
	{
		return TerjeRecordFloatMap.Cast(m_orderedRecords.Get(id)).FindValue(key, value);
	}
	
	// DEPRECATED
	bool TryGetStringValue(string id, out string value)
	{
		TerjeRecordBase record;
		if (m_records.Find(id, record))
		{
			value = TerjeRecordString.Cast(record).GetValue();
			return true;
		}
		
		return false;
	}
	
	bool TrySetStringValue(string id, string value)
	{
		TerjeRecordBase record;
		if (m_records.Find(id, record))
		{
			TerjeRecordString recordStr = TerjeRecordString.Cast(record);
			if (recordStr)
			{
				recordStr.SetValue(value);
				if (record.IsDirty())
				{
					MarkDirtyServer();
					if (!record.IsServerOnly())
					{
						MarkDirtySynch();
					}
				}
				
				return true;
			}
		}
		
		return false;
	}
	
	bool TryGetIntValue(string id, out int value)
	{
		TerjeRecordBase record;
		if (m_records.Find(id, record))
		{
			value = TerjeRecordInt.Cast(record).GetValue();
			return true;
		}
		
		return false;
	}
	
	bool TrySetIntValue(string id, int value)
	{
		TerjeRecordBase record;
		if (m_records.Find(id, record))
		{
			TerjeRecordInt recordInt = TerjeRecordInt.Cast(record);
			if (recordInt)
			{
				recordInt.SetValue(value);
				if (record.IsDirty())
				{
					MarkDirtyServer();
					if (!record.IsServerOnly())
					{
						MarkDirtySynch();
					}
				}
				
				return true;
			}
		}
		
		return false;
	}
	
	bool TryGetFloatValue(string id, out float value)
	{
		TerjeRecordBase record;
		if (m_records.Find(id, record))
		{
			value = TerjeRecordFloat.Cast(record).GetValue();
			return true;
		}
		
		return false;
	}
	
	bool TrySetFloatValue(string id, float value)
	{
		TerjeRecordBase record;
		if (m_records.Find(id, record))
		{
			TerjeRecordFloat recordFloat = TerjeRecordFloat.Cast(record);
			if (recordFloat)
			{
				recordFloat.SetValue(value);
				if (record.IsDirty())
				{
					MarkDirtyServer();
					if (!record.IsServerOnly())
					{
						MarkDirtySynch();
					}
				}
				
				return true;
			}
		}
		
		return false;
	}
	
	bool TryGetBoolValue(string id, out bool value)
	{
		TerjeRecordBase record;
		if (m_records.Find(id, record))
		{
			value = TerjeRecordBool.Cast(record).GetValue();
			return true;
		}
		
		return false;
	}
	
	bool TrySetBoolValue(string id, bool value)
	{
		TerjeRecordBase record;
		if (m_records.Find(id, record))
		{
			TerjeRecordBool recordBool = TerjeRecordBool.Cast(record);
			if (recordBool)
			{
				recordBool.SetValue(value);
				if (record.IsDirty())
				{
					MarkDirtyServer();
					if (!record.IsServerOnly())
					{
						MarkDirtySynch();
					}
				}
				
				return true;
			}
		}
		
		return false;
	}
	
	string SerializeToString()
	{
		string result = "";
		foreach (string id, ref TerjeRecordBase record : m_records)	
		{
			result = result + id + ":" + record.GetRecordTypeId() + ":" + record.SerializeValue() + ";";
		}
		
		return result;
	}
	
	void DeserializeFromString(string data)
	{
		array<string> parsedRecords();
		data.Split(";", parsedRecords);
		foreach (string parsedRecord : parsedRecords)
		{
			array<string> recordParts();
			parsedRecord.Split(":", recordParts);
			if (recordParts.Count() == 2)
			{
				recordParts.Insert(string.Empty);
			}
			
			if (recordParts.Count() == 3)
			{
				TerjeRecordBase record;
				string recordId = recordParts.Get(0);
				string recordType = recordParts.Get(1);
				string recordValue = recordParts.Get(2);
				if (m_records.Find(recordId, record) && record.GetRecordTypeId() == recordType)
				{
					record.DeserializeValue(recordValue);
				}
			}
		}
		
		MarkDirtySynch();
	}
	
	void OnStoreCopy(TerjePlayerRecordsBase copyFrom)
	{
		if ((copyFrom != null) && (copyFrom.m_records != null))
		{
			ref TerjeRecordBase src;
			foreach (string id, ref TerjeRecordBase dst : m_records)	
			{
				if ((copyFrom.m_records.Find(id, src)) && (src != null) && (dst != null))
				{
					dst.CopyValue(src);
				}
			}
			
			MarkDirtySynch();
		}
	}
	
	bool OnStoreLoad(ParamsReadContext ctx)
	{
		int rwMarkerBegin;
		if (!ctx.Read(rwMarkerBegin))
		{
			TerjeLog_Error("OnStoreLoad Failed to read STORE_BEGIN_RW_MARKER");
			return false;
		}
		
		if (rwMarkerBegin == STORE_BEGIN_RW_MARKER)
		{
			int count;
			if (!ctx.Read(count))
			{
				TerjeLog_Error("OnStoreLoad Invalid COUNT param");
				return false;
			}
			
			for (int index = 0; index < count; index++)
			{
				string recordId;
				if (!ctx.Read(recordId))
				{
					TerjeLog_Error("OnStoreLoad Invalid ID param");
					return false;
				}
				
				string typeId;
				if (!ctx.Read(typeId))
				{
					TerjeLog_Error("OnStoreLoad Invalid TypeID param");
					return false;
				}
				
				TerjeRecordBase record;
				if (m_records.Find(recordId, record) && record.GetRecordTypeId() == typeId)
				{
					if (!record.ReadValue(ctx))
					{
						TerjeLog_Error("OnStoreLoad Invalid VALUE param");
						return false;
					}
				}
				else if (TerjeReadUnknownRecord(typeId, ctx))
				{
					TerjeLog_Warning("OnStoreLoad Skip unknown record: " + recordId);
				}
				else
				{
					TerjeLog_Error("OnStoreLoad Invalid record: " + recordId);
					return false;
				}
			}
		}
		else
		{
			TerjeLog_Error("OnStoreLoad Invalid STORE_BEGIN_RW_MARKER");
			return false;
		}
		
		int rwMarkerEnd;
		if (!ctx.Read(rwMarkerEnd) || rwMarkerEnd != STORE_END_RW_MARKER)
		{
			TerjeLog_Error("OnStoreLoad Invalid STORE_END_RW_MARKER");
			return false;
		}
		
		MarkDirtySynch();
		return true;
	}
	
	void OnStoreSave(ParamsWriteContext ctx)
	{
		ctx.Write(STORE_BEGIN_RW_MARKER);
		ctx.Write(m_records.Count());
		foreach (string id, ref TerjeRecordBase record : m_records)	
		{
			ctx.Write(id);
			ctx.Write(record.GetRecordTypeId());
			record.WriteValue(ctx);
		}
		
		ctx.Write(STORE_END_RW_MARKER);
	}
	
	bool OnStoreSynch(ParamsWriteContext ctx, bool forceSynchAll)
	{
		if (GetGame() && GetGame().IsDedicatedServer() && (forceSynchAll || IsDirtySynch()))
		{
			int headerRecordsCount = 0;
			foreach (string id0, ref TerjeRecordBase record0 : m_synchRecords)	
			{
				if (forceSynchAll || record0.IsDirty())
				{
					headerRecordsCount++;
				}
			}
			
			if (headerRecordsCount > 0)
			{
				ctx.Write(STORE_BEGIN_RW_MARKER);
				ctx.Write(headerRecordsCount);
				foreach (string id1, ref TerjeRecordBase record1 : m_synchRecords)	
				{
					if (forceSynchAll || record1.IsDirty())
					{
						ctx.Write(id1);
						ctx.Write(record1.GetRecordTypeId());
						record1.WriteValue(ctx);
						record1.ClearDirty();
					}
				}
				
				ctx.Write(STORE_END_RW_MARKER);
				return true;
			}
		}
		
		return false;
	}
	
	void SynchWithClient(PlayerBase player, bool forceSynchAll, int rpcId)
	{
		if (GetGame() && GetGame().IsDedicatedServer() && player && player.GetIdentity() && (forceSynchAll || IsDirtySynch()))
		{
			ScriptRPC ctx = new ScriptRPC();
			bool result = this.OnStoreSynch(ctx, forceSynchAll);
			if (forceSynchAll || result)
			{
				ctx.Send(player, rpcId, true, player.GetIdentity());
			}
			
			ClearDirtySynch();
		}
	}
	
	void SetExpirableTimestamp(string name, int value, bool deleteExpired = true)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			SetIntMapValue(m_timestampExpireRecord, name, value);
			
			if (deleteExpired)
			{
				PluginTerjeServertime serverTimePlugin = GetTerjeServertime();
				if (serverTimePlugin)
				{
					array<string> keysToDelete();
					int serverTimesstamp = serverTimePlugin.GetTimestamp();
					map<string, int> timespamps = GetIntMapValues(m_timestampExpireRecord);
					foreach (string iterName, int iterValue : timespamps)
					{
						if (iterValue < serverTimesstamp)
						{
							keysToDelete.Insert(iterName);
						}
					}
					
					foreach (string keyToDel : keysToDelete)
					{
						RemoveMapValue(m_timestampExpireRecord, keyToDel);
					}
				}
			}
		}
	}
	
	void DeleteExpirableTimestamp(string name)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			RemoveMapValue(m_timestampExpireRecord, name);
		}
	}
	
	bool GetExpirableTimestamp(string name, out int value)
	{
		return FindIntMapValue(m_timestampExpireRecord, name, value);
	}
	
	void SetInstantTimestamp(string name, int value)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			SetIntMapValue(m_timestampInstantRecord, name, value);
		}
	}
	
	void DeleteInstantTimestamp(string name)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			RemoveMapValue(m_timestampInstantRecord, name);
		}
	}
	
	bool GetInstantTimestamp(string name, out int value)
	{
		return FindIntMapValue(m_timestampInstantRecord, name, value);
	}
	
	int GetUserVariableInt(string name)
	{
		int result;
		if (FindIntMapValue(m_userVariablesIntRecord, name, result))
		{
			return result;
		}
		
		return 0;
	}
	
	void SetUserVariableInt(string name, int value)
	{
		if (value != 0)
		{
			SetIntMapValue(m_userVariablesIntRecord, name, value);
		}
		else
		{
			RemoveMapValue(m_userVariablesIntRecord, name);
		}
	}
}
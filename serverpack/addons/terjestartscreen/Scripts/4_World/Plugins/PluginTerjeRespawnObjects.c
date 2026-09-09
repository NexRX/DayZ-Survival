class PluginTerjeRespawnObjects : PluginBase 
{
	protected ref set<string> m_idsCollection = new set<string>;
	protected ref map<string, ref map<string, TerjeXmlObject>> m_idsToXmlObjects = new map<string, ref map<string, TerjeXmlObject>>;
	protected ref map<string, ref set<string>> m_idsToClassname = new map<string, ref set<string>>;
	protected ref map<string, ref set<string>> m_classnameToIds = new map<string, ref set<string>>;
	protected ref map<string, ref map<string, ref TerjeRespawnObjectHandler>> m_customHandlers = new map<string, ref map<string, ref TerjeRespawnObjectHandler>>;
	protected Object m_lastLocalObject = null;
	
	override void OnInit()
	{
		if (GetGame().IsClient())
		{
			GetTerjeRPC().RegisterHandler("startscreen.tros", this, "OnTerjeStartScreenRespawnObjectsSynch");
		}
	}
	
	protected void OnTerjeStartScreenRespawnObjectsSynch(ParamsReadContext ctx, PlayerIdentity sender)
	{
		if (GetGame() && GetGame().IsClient())
		{
			m_idsToClassname.Clear();
			m_classnameToIds.Clear();
			
			if (!ctx.Read(m_idsToClassname))
				return;
			
			if (!ctx.Read(m_classnameToIds))
				return;
		}
	}
	
	void RegisterRespawnObjects(string respawnId, TerjeXmlObject objects)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			for (int i = 0; i < objects.GetChildrenCount(); i++)
			{
				string classname;
				TerjeXmlObject obj = objects.GetChild(i);
				if ((obj != null) && (obj.IsObjectNode()) && (obj.GetName() == "Object") && (obj.FindAttribute("classname", classname)))
				{
					m_idsCollection.Insert(respawnId);
					
					if (!m_idsToXmlObjects.Contains(respawnId))
					{
						m_idsToXmlObjects.Insert(respawnId, new map<string, TerjeXmlObject>);
					}
					
					m_idsToXmlObjects.Get(respawnId).Set(classname, obj);
					
					if (!m_idsToClassname.Contains(respawnId))
					{
						m_idsToClassname.Insert(respawnId, new set<string>);
					}
					
					m_idsToClassname.Get(respawnId).Insert(classname);
					
					if (!m_classnameToIds.Contains(classname))
					{
						m_classnameToIds.Insert(classname, new set<string>);
					}
					
					m_classnameToIds.Get(classname).Insert(respawnId);
					
					string handlerClassname;
					if (obj.FindAttribute("handler", handlerClassname))
					{
						typename handlerTypename = handlerClassname.ToType();
						if (handlerTypename)
						{
							if (handlerTypename.IsInherited(TerjeRespawnObjectHandler))
							{
								ref TerjeRespawnObjectHandler handlerObject = TerjeRespawnObjectHandler.Cast(handlerTypename.Spawn());
								if (handlerObject != null)
								{
									ref map<string, ref TerjeRespawnObjectHandler> handlersMap = null;
									if (!m_customHandlers.Find(respawnId, handlersMap))
									{
										handlersMap = new map<string, ref TerjeRespawnObjectHandler>;
										m_customHandlers.Insert(respawnId, handlersMap);
									}
									
									handlersMap.Set(classname, handlerObject);
								}
								else
								{
									TerjeLog_Error("Failed to create handler class '" + handlerClassname + "'.");
								}
							}
							else
							{
								TerjeLog_Error("Handler class '" + handlerClassname + "' should be inherited from 'TerjeRespawnObjectHandler'.");
							}
						}
						else
						{
							TerjeLog_Error("Failed to find a handler class '" + handlerClassname + "'.");
						}
					}
				}
			}
		}
	}
	
	void SendToClient(PlayerIdentity identity)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			TerjeStreamRpc stream;
			GetTerjeRPC().StreamToClient("startscreen.tros", identity, stream);
			stream.Write(m_idsToClassname);
			stream.Write(m_classnameToIds);
			stream.Flush();
		}
	}
		
	void ResetRespawnObjectsOwner(string uid, TerjePlayerProfile profile)
	{
		if (GetGame() && GetGame().IsDedicatedServer() && (profile != null) && (uid != string.Empty))
		{
			foreach (string respawnId : m_idsCollection)
			{
				ResetRespawnObjectOwner(respawnId, uid, profile);
			}
		}
	}
	
	void ResetRespawnObjectOwner(string respawnId, string uid, TerjePlayerProfile profile)
	{
		string classname;
		string metadata;
		vector objectPos;
		vector playerPos;
		vector playerOri;
		if (profile.FindRespawnObjectData(respawnId, classname, metadata, objectPos, playerPos, playerOri))
		{
			array<Object> objects();
			GetGame().GetObjectsAtPosition3D(objectPos, 0.1, objects, null);
			foreach (Object obj : objects)
			{
				ItemBase objItemBase;
				if (obj && (obj.GetType() == classname) && ItemBase.CastTo(objItemBase, obj))
				{
					objItemBase.ResetTerjeRespawnOwner(uid);
				}
			}
		}
	}
	
	bool FindAndValidateRespawnObject(PlayerBase player, string respawnId, out vector playerPos, out vector playerOri)
	{
		if (!GetGame() || !GetGame().IsDedicatedServer())
			return false;
		
		if (!player)
			return false;
		
		if (!player.GetTerjeProfile())
			return false;
		
		string classname;
		string metadata;
		vector objectPos;
		if (!player.GetTerjeProfile().FindRespawnObjectData(respawnId, classname, metadata, objectPos, playerPos, playerOri))
			return false;
		
		TerjeXmlObject xmlObject = FindTerjeXmlObjectServer(respawnId, classname);
		if (!xmlObject)
			return false;
		
		array<Object> objects();
		GetGame().GetObjectsAtPosition3D(objectPos, 0.1, objects, null);
		foreach (Object obj : objects)
		{
			if (obj && (obj.GetType() == classname) && (ValidateRespawnObject(obj, player, respawnId, xmlObject)))
			{
				return true;
			}
		}
		
		return false;
	}
	
	bool ValidateRespawnObject(Object object, PlayerBase player, string respawnId, TerjeXmlObject xmlObject)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			if (xmlObject.EqualAttribute("singleBind", "1"))
			{
				ItemBase objectItemBase;
				if (ItemBase.CastTo(objectItemBase, object) && !objectItemBase.ValidateTerjeRespawnOwner(player))
				{
					return false;
				}
			}
			
			TerjeRespawnObjectHandler handler;
			map<string, ref TerjeRespawnObjectHandler> handlersMap;
			if (m_customHandlers.Find(respawnId, handlersMap) && handlersMap.Find(object.GetType(), handler))
			{
				return handler.RespawnOnObject(player, object, respawnId);
			}
		}
		
		return true;
	}
	
	bool CanSetObjectAsRespawn(Object object, PlayerBase player)
	{
		if (!m_classnameToIds)
			return false;
		
		if (m_classnameToIds.Count() == 0)
			return false;
		
		if (!object)
			return false;
		
		if (!player)
			return false;
		
		EntityAI entityObj = EntityAI.Cast(object);
		if (entityObj && entityObj.GetHierarchyParent())
		{
			return false;
		}
		
		TentBase tentObj = TentBase.Cast(object);
		if (tentObj && (tentObj.GetState() == TentBase.PACKED) && (tentObj.GetState() == tentObj.GetStateLocal()))
		{
			return false;
		}
		
		string classname = object.GetType();
		if (classname == string.Empty)
			return false;
		
		return m_classnameToIds.Contains(classname);
	}
	
	bool SetObjectAsRespawn(Object object, PlayerBase player)
	{
		if (!CanSetObjectAsRespawn(object, player))
			return false;
		
		if (!player.GetTerjeProfile())
			return false;
		
		int result = 0;
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			set<string> respawnIds = null;
			string classname = object.GetType();
			if (!m_classnameToIds.Find(classname, respawnIds))
				return false;
			
			TerjeRespawnObjectHandler handler;
			map<string, ref TerjeRespawnObjectHandler> handlersMap;
			string metadata = GetObjectRespawnMetadata(object, player);
			vector objectPos = object.GetWorldPosition();
			vector playerPos = player.GetWorldPosition();
			vector playerOri = player.GetOrientation();
			foreach (string respawnId : respawnIds)
			{
				TerjeXmlObject xmlData = FindTerjeXmlObjectServer(respawnId, classname);
				if (xmlData)
				{
					bool valid = true;
					ItemBase objectItemBase = null;
					if (xmlData.EqualAttribute("singleBind", "1"))
					{
						if (ItemBase.CastTo(objectItemBase, object) && !objectItemBase.CheckTerjeRespawnOwner(player))
						{
							valid = false;
						}
					}
					
					if (valid && m_customHandlers.Find(respawnId, handlersMap) && handlersMap.Find(classname, handler))
					{
						if (!handler.SetAsRespawnObject(player, object, respawnId))
						{
							valid = false;
						}
					}
					
					if (valid)
					{
						ResetRespawnObjectOwner(respawnId, player.GetCachedID(), player.GetTerjeProfile());
						
						if (objectItemBase != null)
						{
							objectItemBase.SetTerjeRespawnOwner(player);
						}
						
						player.GetTerjeProfile().SetRespawnObjectData(respawnId, classname, metadata, objectPos, playerPos, playerOri);
						result += 1;
					}
				}
			}
		}
		
		return (result > 0);
	}
	
	string GetObjectRespawnMetadata(Object object, PlayerBase player)
	{
		return string.Empty;
	}
	
	void SetLastLocalObject(Object obj)
	{
		if (GetGame() && GetGame().IsClient())
		{
			m_lastLocalObject = obj;
		}
	}
	
	Object GetLastLocalObject()
	{
		if (GetGame() && GetGame().IsClient())
		{
			return m_lastLocalObject;
		}
		
		return null;
	}
	
	protected TerjeXmlObject FindTerjeXmlObjectServer(string respawnId, string classname)
	{
		TerjeXmlObject result;
		map<string, TerjeXmlObject> submap;
		if (m_idsToXmlObjects.Find(respawnId, submap))
		{
			if (submap && submap.Find(classname, result))
			{
				return result;
			}
		}
		
		return null;
	}
}

PluginTerjeRespawnObjects GetPluginTerjeRespawnObjects() 
{
	return PluginTerjeRespawnObjects.Cast(GetPlugin(PluginTerjeRespawnObjects));
}
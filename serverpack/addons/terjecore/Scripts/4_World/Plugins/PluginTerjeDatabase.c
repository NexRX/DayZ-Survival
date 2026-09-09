class PluginTerjeDatabase extends PluginBase
{
	private const int DATABASE_VERSION = 2;
	private const string DATABASE_DIR = "$mission:terje_storage";
	private ref map<string, ref TerjePlayerProfile> m_profiles = null;
	private ref map<string, ref TerjePlayerProfile> m_autosaveCache = null;
	private float m_autosaveTimer = 0;
	
	bool GetPlayerProfile(string uid, out TerjePlayerProfile profile)
	{
		return m_profiles.Find(uid, profile);
	}
	
	void DeletePlayerProfile(string uid)
	{
		m_profiles.Remove(uid);
		m_autosaveCache.Remove(uid);
		
		string path = DATABASE_DIR + "/profiles/" + uid + ".dat";
		if (FileExist(path))
		{
			DeleteFile(path);
		}
	}
	
	override void OnInit()
	{
		if (GetGame().IsDedicatedServer())
		{
			MakeDirectory(DATABASE_DIR);
			MakeDirectory(DATABASE_DIR + "/profiles");
			m_profiles = new map<string, ref TerjePlayerProfile>;
			m_autosaveCache = new map<string, ref TerjePlayerProfile>;
		}
	}
	
	override void OnUpdate(float delta_time)
	{
		super.OnUpdate(delta_time);
		
		if (GetGame().IsDedicatedServer())
		{
			float autosaveInterval;
			if (m_autosaveCache.Count() > 0)
			{
				MapIterator iterator = m_autosaveCache.Begin();
				string iteratorKey = m_autosaveCache.GetIteratorKey(iterator);
				ref TerjePlayerProfile iteratorValue = m_autosaveCache.GetIteratorElement(iterator);
				SaveProfileByIdentity(iteratorValue, iteratorKey);
				m_autosaveCache.Remove(iteratorKey);
			}
			else if (GetTerjeSettingFloat(TerjeSettingsCollection.CORE_DATABASE_AUTOSAVE_INTERVAL, autosaveInterval))
			{
				m_autosaveTimer = m_autosaveTimer + delta_time;
				if (m_autosaveTimer > autosaveInterval)
				{
					m_autosaveTimer = 0;
					foreach (string uid, ref TerjePlayerProfile profile : m_profiles)
					{
						if (profile.IsDirtyServer())
						{
							m_autosaveCache.Set(uid, profile);
						}
					}
				}
			}
		}
	}
	
	void OnPlayerPreloading(PlayerIdentity identity)
	{
		if (GetGame() && GetGame().IsDedicatedServer() && identity != null)
		{
			string uid = identity.GetId();
			if (!m_profiles.Contains(uid))
			{
				string path = DATABASE_DIR + "/profiles/" + uid + ".dat";
				TerjePlayerProfile profile = new TerjePlayerProfile;
				profile.OnInit();
				
				if (FileExist(path))
				{
					if (profile.OnStoreLoadFile(path))
					{
						profile.OnExistProfileLoaded();
						TerjeLog_Info("Profile '" + uid + "' loaded from database.");
					}
					else
					{
						TerjeLog_Error("Failed to load '" + uid + "' profile.");
						DeleteFile(path);
					}
				}
				else
				{
					profile.AddServerFlag("new");
					profile.OnNewProfileCreated();
					TerjeLog_Info("New profile '" + uid + "' created.");
				}
				
				m_profiles.Set(uid, profile);
			}
		}
	}
	
	void OnPlayerConnected(PlayerBase player, PlayerIdentity identity, string uid)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			TerjePlayerProfile oldProfile;
			TerjePlayerProfile newProfile = player.CreateTerjeProfile();
			if (newProfile != null)
			{
				if (m_profiles.Find(uid, oldProfile) && (oldProfile != null))
				{
					newProfile.OnStoreCopy(oldProfile);
					if (oldProfile.HasServerFlag("new"))
					{
						player.OnTerjeProfileFirstCreation();
					}
				}
				else
				{
					string path = DATABASE_DIR + "/profiles/" + uid + ".dat";
					if (FileExist(path))
					{
						if (newProfile.OnStoreLoadFile(path))
						{
							newProfile.OnExistProfileLoaded();
							TerjeLog_Info("Profile '" + uid + "' loaded from database.");
						}
						else
						{
							TerjeLog_Error("Failed to load '" + uid + "' profile.");
							DeleteFile(path);
						}
					}
					else
					{
						newProfile.OnNewProfileCreated();
						player.OnTerjeProfileFirstCreation();
						TerjeLog_Info("New profile '" + uid + "' created.");
					}
				}
				
				m_profiles.Set(uid, newProfile);
			}
		}
	}
	
	void OnPlayerDisconnected(PlayerBase player, PlayerIdentity identity, string uid)
	{
		if (GetGame() && GetGame().IsDedicatedServer())
		{
			ref TerjePlayerProfile profile;
			if (m_profiles.Find(uid, profile) && (profile != null))
			{
				SaveProfileByIdentity(profile, uid);
				m_profiles.Remove(uid);
				m_autosaveCache.Remove(uid);
			}
		}
	}
	
	void SaveProfileByPlayer(PlayerBase player)
	{
		if (player && (player.GetTerjeProfile() != null) && (player.GetCachedID() != string.Empty))
		{
			SaveProfileByIdentity(player.GetTerjeProfile(), player.GetCachedID());
		}
	}
	
	private void SaveProfileByIdentity(TerjePlayerProfile profile, string uid)
	{
		if ((GetGame().IsDedicatedServer()) && (profile != null) && (uid != string.Empty))
		{
			profile.OnStoreSaveFile(DATABASE_DIR + "/profiles/" + uid + ".dat");
			TerjeLog_Info("Profile '" + uid + "' saved to database.");
		}
	}
}

PluginTerjeDatabase GetTerjeDatabase() 
{
	return PluginTerjeDatabase.Cast(GetPlugin(PluginTerjeDatabase));
}

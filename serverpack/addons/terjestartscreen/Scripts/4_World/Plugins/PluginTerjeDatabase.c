modded class PluginTerjeDatabase
{
	override void DeletePlayerProfile(string uid)
	{
		string firstName = string.Empty;
		string lastName = string.Empty;
		TerjePlayerProfile profile;
		if (GetPlayerProfile(uid, profile) && (profile != null))
		{
			firstName = profile.GetFirstName();
			lastName = profile.GetLastName();

			PluginTerjeRespawnObjects pluginTerjeRespawnObjects = GetPluginTerjeRespawnObjects();
			if (pluginTerjeRespawnObjects)
			{
				pluginTerjeRespawnObjects.ResetRespawnObjectsOwner(uid, profile);
			}
		}
		
		super.DeletePlayerProfile(uid);
		
		if ((firstName != string.Empty) && (lastName != string.Empty))
		{
			GetPluginTerjeStartScreen().DeleteCharacterNameIndex(firstName + " " + lastName);
		}
		else if (firstName != string.Empty)
		{
			GetPluginTerjeStartScreen().DeleteCharacterNameIndex(firstName);
		}
	}
}
void main()
{
	//INIT ECONOMY--------------------------------------
	Hive ce = CreateHive();
	if ( ce )
		ce.InitOffline();

	//DATE RESET AFTER ECONOMY INIT-------------------------
	int year, month, day, hour, minute;
	int reset_month = 9, reset_day = 20;
	GetGame().GetWorld().GetDate(year, month, day, hour, minute);

	if ((month == reset_month) && (day < reset_day))
	{
		GetGame().GetWorld().SetDate(year, reset_month, reset_day, hour, minute);
	}
	else
	{
		if ((month == reset_month + 1) && (day > reset_day))
		{
			GetGame().GetWorld().SetDate(year, reset_month, reset_day, hour, minute);
		}
		else
		{
			if ((month < reset_month) || (month > reset_month + 1))
			{
				GetGame().GetWorld().SetDate(year, reset_month, reset_day, hour, minute);
			}
		}
	}
}

class CustomMission: MissionServer
{
	void SetRandomHealth(EntityAI itemEnt)
	{
		if ( itemEnt )
		{
			float rndHlt = Math.RandomFloat( 0.45, 0.65 );
			itemEnt.SetHealth01( "", "", rndHlt );
		}
	}

	override PlayerBase CreateCharacter(PlayerIdentity identity, vector pos, ParamsReadContext ctx, string characterName)
	{
		Entity playerEnt;
		playerEnt = GetGame().CreatePlayer( identity, characterName, pos, 0, "NONE" );
		Class.CastTo( m_player, playerEnt );

		GetGame().SelectPlayer( identity, m_player );

		return m_player;
	}

	/**
	 * Expansion currently starts auto-start quests while its persistence inhibitor
	 * is active. The quest instance reaches STARTED, but its player data remains
	 * NONE and is then offered by every NPC because it has no quest giver IDs.
	 * Repair that state after Expansion finishes its normal player initialization.
	 */
	override void Expansion_OnQuestPlayerInit(ExpansionQuestPersistentData playerQuestData, PlayerIdentity identity)
	{
		super.Expansion_OnQuestPlayerInit(playerQuestData, identity);

		if (!playerQuestData || !identity)
			return;

		ExpansionQuestModule questModule = ExpansionQuestModule.GetModuleInstance();
		if (!questModule)
			return;

		string playerUID = identity.GetId();
		Print("[DZSurvival Quests] Quest player init hook reached: UID=" + playerUID);

		bool repaired;
		map<int, ref ExpansionQuestConfig> questConfigs = questModule.GetQuestConfigs();
		foreach (int questID, ExpansionQuestConfig questConfig: questConfigs)
		{
			if (!questConfig || questConfig.IsGroupQuest() || questConfig.IsAchievement())
				continue;
			if (questConfig.GetQuestGiverIDs().Count() > 0 || questConfig.GetPreQuestIDs().Count() > 0)
				continue;
			if (playerQuestData.GetQuestStateByQuestID(questID) != ExpansionQuestState.NONE)
				continue;

			ExpansionQuest activeQuest = questModule.GetActiveQuestWithKey(playerUID, questID);
			if (!activeQuest)
			{
				Print("[DZSurvival Quests] Auto-start quest has no active instance: ID=" + questID.ToString() + " UID=" + playerUID);
				continue;
			}

			playerQuestData.UpdateQuestState(questID, ExpansionQuestState.STARTED);
			Print("[DZSurvival Quests] Repaired auto-start quest state: ID=" + questID.ToString() + " UID=" + playerUID);
			repaired = true;
		}

		if (repaired)
			questModule.SaveAndSyncQuestData(playerQuestData, playerUID, -1);
	}

	override void StartingEquipSetup(PlayerBase player, bool clothesChosen)
	{
		EntityAI itemClothing;
		EntityAI itemEnt;
		ItemBase itemBs;
		float rand;

		itemClothing = player.FindAttachmentBySlotName( "Body" );
		if ( itemClothing )
		{
			SetRandomHealth( itemClothing );

			itemEnt = itemClothing.GetInventory().CreateInInventory( "BandageDressing" );
			player.SetQuickBarEntityShortcut(itemEnt, 2);

			string chemlightArray[] = { "Chemlight_White", "Chemlight_Yellow", "Chemlight_Green", "Chemlight_Red" };
			int rndIndex = Math.RandomInt( 0, 4 );
			itemEnt = itemClothing.GetInventory().CreateInInventory( chemlightArray[rndIndex] );
			SetRandomHealth( itemEnt );
			player.SetQuickBarEntityShortcut(itemEnt, 1);

			rand = Math.RandomFloatInclusive( 0.0, 1.0 );
			if ( rand < 0.35 )
				itemEnt = player.GetInventory().CreateInInventory( "Apple" );
			else if ( rand > 0.65 )
				itemEnt = player.GetInventory().CreateInInventory( "Pear" );
			else
				itemEnt = player.GetInventory().CreateInInventory( "Plum" );
			player.SetQuickBarEntityShortcut(itemEnt, 3);
			SetRandomHealth( itemEnt );
		}

		itemClothing = player.FindAttachmentBySlotName( "Legs" );
		if ( itemClothing )
			SetRandomHealth( itemClothing );

		itemClothing = player.FindAttachmentBySlotName( "Feet" );
	}
};

Mission CreateCustomMission(string path)
{
	return new CustomMission();
}

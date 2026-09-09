modded class UndergroundStash
{
	private bool m_terjeStashInvisible = false;
	
	override void InitItemVariables()
	{
		super.InitItemVariables();
		RegisterNetSyncVariableBool("m_terjeStashInvisible");
	}
	
	override void OnTerjeStoreSave(TerjeStorageWritingContext ctx)
	{
		super.OnTerjeStoreSave(ctx);
		ctx.WriteBool("hiddenstash", m_terjeStashInvisible);
	}
	
	override void OnTerjeStoreLoad(TerjeStorageReadingContext ctx)
	{
		super.OnTerjeStoreLoad(ctx);
		ctx.ReadBool("hiddenstash", m_terjeStashInvisible);
	}
	
	override void AfterStoreLoad()
	{	
		super.AfterStoreLoad();
		SetSynchDirty();
	}
	
	override void OnVariablesSynchronized()
	{
		super.OnVariablesSynchronized();
		SetInvisible(m_terjeStashInvisible);
	}
	
	void SetTerjeStashInvisible(bool state)
	{
		if (g_Game.IsDedicatedServer())
		{
			m_terjeStashInvisible = state;
			SetSynchDirty();
		}
	}
	
	bool GetTerjeStashInvisible()
	{
		return m_terjeStashInvisible;
	}
}
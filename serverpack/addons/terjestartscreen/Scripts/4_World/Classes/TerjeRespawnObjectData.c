class TerjeRespawnObjectData
{
	string m_Owner = string.Empty;
	vector m_Position = vector.Zero;
	
	bool ValidateOwner(PlayerBase player)
	{
		if (player && player.GetIdentity())
		{
			return player.GetIdentity().GetId() == m_Owner;
		}
		
		return false;
	}
	
	bool ValidatePosition(vector pos)
	{
		return vector.Distance(pos, m_Position) < 0.1;
	}
	
	void OnTerjeStoreSave(TerjeStorageWritingContext ctx)
	{
		ctx.WriteString("tss.respobj.own", m_Owner);
		ctx.WriteVector("tss.respobj.pos", m_Position);
	}
	
	bool OnTerjeStoreLoad(TerjeStorageReadingContext ctx)
	{
		if (!ctx.ReadString("tss.respobj.own", m_Owner))
			return false;
		
		if (!ctx.ReadVector("tss.respobj.pos", m_Position))
			return false;
		
		return true;
	}
}
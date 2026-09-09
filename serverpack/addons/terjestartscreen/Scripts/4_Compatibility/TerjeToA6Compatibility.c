#ifdef A6_SecureContainers
modded class A6_SecureContainer_Base
{
	string TerjeComp_GetOwner() {
		return this.m_OwnerId;
	}
}

modded class PlayerBase
{
	override bool RetrieveSecureContainer()
	{
		if (this.m_terjeStartScreenParams != null)
		{
			return false;
		}
		
		return super.RetrieveSecureContainer();
	}
}

modded class TerjeStartScreenParams
{
	override void OnServerDone(PlayerBase player)
	{
		super.OnServerDone(player);
		if (player && (!player.GetSecureContainer())) {
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Call(player.RetrieveSecureContainer);
		}
	}
}

modded class PluginTerjeDatabase
{
	override void DeletePlayerProfile(string uid)
	{
		super.DeletePlayerProfile(uid);
		
		foreach (A6_SecureContainer_Base container : A6_SecureContainer_Base.All)
		{
			if (container && (container.TerjeComp_GetOwner() == uid))
			{
				container.RemoveOwner();
				
				PlayerBase owner = PlayerBase.Cast(container.GetHierarchyParent());
				if (owner)
				{
					owner.ServerDropEntity(container);
					container.SetPosition(Vector(0, 5000, 0));
				}
			}
		}
	}
}
#endif
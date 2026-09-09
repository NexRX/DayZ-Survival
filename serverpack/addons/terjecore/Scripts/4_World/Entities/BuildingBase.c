modded class BuildingBase
{
	void OnTerjeStoreSave(TerjeStorageWritingContext ctx)
	{
		// A safe context for writing to the server database without the risk of corruption when changing the order of mods.
	}
	
	void OnTerjeStoreLoad(TerjeStorageReadingContext ctx)
	{
		// A safe context for reading from the server database without the risk of corruption when changing the order of mods.
	}
	
	override void OnStoreSave(ParamsWriteContext ctx)
	{
		TerjeStorageHelpers.SetActualTerjeStorageVersion();
		if (TerjeStorageHelpers.GetTerjeStorageVersion() == 1)
		{
			TerjeStorageWritingContext terjeStorageCtx();
			OnTerjeStoreSave(terjeStorageCtx);
			terjeStorageCtx.OnStoreSave(ctx);
		}
		
		super.OnStoreSave(ctx);
	}
	
	override bool OnStoreLoad(ParamsReadContext ctx, int version)
	{
		int terjeStorageVersion = TerjeStorageHelpers.GetTerjeStorageVersion();
		if (terjeStorageVersion == 1)
		{
			TerjeStorageReadingContext terjeStorageCtx();
			if (!terjeStorageCtx.OnStoreLoad(ctx))
			{
				return false;
			}
			
			OnTerjeStoreLoad(terjeStorageCtx);
		}
		
		return super.OnStoreLoad(ctx, version);
	}
}
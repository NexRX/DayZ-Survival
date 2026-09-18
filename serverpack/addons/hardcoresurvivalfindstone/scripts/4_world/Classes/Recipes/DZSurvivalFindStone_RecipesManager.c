modded class PluginRecipesManager
{
	override void RegisterRecipies()
	{
		super.RegisterRecipies();
		RegisterRecipe(new SharpenSmallStone);

		RegisterRecipe(new HandDrillKitFromBirchBark);
		RegisterRecipe(new HandDrillKitFromOakBark);
	}
};

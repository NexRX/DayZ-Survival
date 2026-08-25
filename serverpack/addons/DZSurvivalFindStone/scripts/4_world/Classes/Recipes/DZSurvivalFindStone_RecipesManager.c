// DZSurvivalFindStone_RecipesManager.c
//
// Registers SharpenSmallStone (see Recipes/SharpenSmallStone.c) with the
// game's crafting system. Confirmed by cross-referencing a real published
// mod's own unpacked scripts (@Search-For-Charcoal, bvp_recipe/allowrecipe.c)
// that adds its own crafting recipe the exact same way: modding
// PluginRecipesManager (not PluginRecipesManagerBase, which only defines
// RegisterRecipies() - the concrete subclass actually instantiated by the
// game is PluginRecipesManager, server/dta/scripts.pbo,
// 4_World/Plugins/PluginBase/PluginRecipesManager.c) and overriding
// RegisterRecipies() to call super then add the new recipe. Simply
// defining a RecipeBase-derived class does not by itself make the
// crafting system aware of it - same lesson learned earlier with actions
// needing an explicit PlayerBase.SetActions() registration.
modded class PluginRecipesManager
{
	override void RegisterRecipies()
	{
		super.RegisterRecipies();
		RegisterRecipe(new SharpenSmallStone);
	}
};

// SharpenSmallStone.c
//
// "Combine two SmallStones to sharpen one" - modelled directly on
// vanilla's own CraftStoneKnife recipe (server/dta/scripts.pbo,
// 4_World/Classes/Recipes/Recipes/CraftStoneKnife.c), which already
// crafts a StoneKnife from two SmallStones the same way. This recipe
// instead sharpens one of the two stones in place into a SharpStone
// (see ../../../../../config.cpp), consuming the other stone as the
// abrasive/striking stone used to do the sharpening.
//
// Registered via a modded PluginRecipesManager - see
// DZSurvivalFindStone_RecipesManager.c. Simply defining this class is
// not enough by itself (the same lesson learned earlier with actions
// not registered on PlayerBase.SetActions() - a class existing isn't the
// same as the game's crafting system knowing to offer it).
class SharpenSmallStone extends RecipeBase
{
	override void Init()
	{
		m_Name = "Sharpen stone";
		m_IsInstaRecipe = false; // should this recipe be performed instantly without animation
		m_AnimationLength = 1.5; // animation length in relative time units
		m_Specialty = 0.02; // value > 0 for roughness, value < 0 for precision

		// conditions
		m_MinDamageIngredient[0] = -1; // -1 = disable check
		m_MaxDamageIngredient[0] = 3;

		m_MinQuantityIngredient[0] = 1;
		m_MaxQuantityIngredient[0] = -1;

		m_MinDamageIngredient[1] = -1;
		m_MaxDamageIngredient[1] = 3;

		m_MinQuantityIngredient[1] = 1;
		m_MaxQuantityIngredient[1] = -1;
		//----------------------------------------------------------------------------------------------------------------------

		// INGREDIENTS
		// ingredient 0 - the stone used to strike/grind the edge, consumed in the process
		InsertIngredient(0, "SmallStone");

		m_IngredientAddHealth[0] = 0;
		m_IngredientSetHealth[0] = -1;
		m_IngredientAddQuantity[0] = -1;
		m_IngredientDestroy[0] = true; // consumed
		m_IngredientUseSoftSkills[0] = false;

		// ingredient 1 - the stone that gets sharpened; becomes the result in place
		InsertIngredient(1, "SmallStone");

		m_IngredientAddHealth[1] = 0;
		m_IngredientSetHealth[1] = -1;
		m_IngredientAddQuantity[1] = 0;
		m_IngredientDestroy[1] = false; // not destroyed - it becomes the SharpStone below
		m_IngredientUseSoftSkills[1] = false;
		//----------------------------------------------------------------------------------------------------------------------

		// result - the sharpened stone, replacing ingredient 1 (same inventory slot)
		AddResult("SharpStone");

		m_ResultSetFullQuantity[0] = false;
		m_ResultSetQuantity[0] = -1;
		m_ResultSetHealth[0] = -1;
		m_ResultInheritsHealth[0] = 1; // inherit health from ingredient 1, the stone being sharpened
		m_ResultInheritsColor[0] = -1;
		m_ResultToInventory[0] = 1; // switch position with ingredient 1
		m_ResultUseSoftSkills[0] = false;
		m_ResultReplacesIngredient[0] = 1; // replaces ingredient 1 in place
	}

	override bool CanDo(ItemBase ingredients[], PlayerBase player) // final check for recipe's validity
	{
		return true;
	}

	override void Do(ItemBase ingredients[], PlayerBase player, array<ItemBase> results, float specialty_weight) // gets called upon recipe's completion
	{
		MiscGameplayFunctions.TransferItemProperties(ingredients[1], results.Get(0), false, true, true, true);
	}
};

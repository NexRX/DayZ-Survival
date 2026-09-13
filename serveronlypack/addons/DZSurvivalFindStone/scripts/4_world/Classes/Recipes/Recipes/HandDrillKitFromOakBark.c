// HandDrillKitFromOakBark.c
//
// Same fix as HandDrillKitFromBirchBark.c (see that file's header comment
// for the full explanation), just for Bark_Oak (Dark Bark) instead of
// Bark_Birch (Light Bark) - kept as a separate recipe rather than trying
// to add both bark classnames to one ingredient slot, to avoid relying on
// unverified multi-classname-per-slot behaviour we have no way to test
// locally.
class HandDrillKitFromOakBark extends RecipeBase
{
	override void Init()
	{
		m_Name = "Craft hand drill kit";
		m_IsInstaRecipe = false;
		m_AnimationLength = 1.5;
		m_Specialty = 0.02;

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
		// ingredient 0 - the Short Stick, consumed; the result takes its slot
		InsertIngredient(0, "WoodenStick");

		m_IngredientAddHealth[0] = 0;
		m_IngredientSetHealth[0] = -1;
		m_IngredientAddQuantity[0] = -1;
		m_IngredientDestroy[0] = true;
		m_IngredientUseSoftSkills[0] = false;

		// ingredient 1 - the Dark Bark, consumed
		InsertIngredient(1, "Bark_Oak");

		m_IngredientAddHealth[1] = 0;
		m_IngredientSetHealth[1] = -1;
		m_IngredientAddQuantity[1] = -1;
		m_IngredientDestroy[1] = true;
		m_IngredientUseSoftSkills[1] = false;
		//----------------------------------------------------------------------------------------------------------------------

		// result - a brand new Hand Drill Kit, replacing ingredient 0's inventory slot
		AddResult("HandDrillKit");

		m_ResultSetFullQuantity[0] = true;
		m_ResultSetQuantity[0] = -1;
		m_ResultSetHealth[0] = -1;
		m_ResultInheritsHealth[0] = -1; // no inheritance - this is a new item, not a transformed ingredient
		m_ResultInheritsColor[0] = -1;
		m_ResultToInventory[0] = 0;
		m_ResultUseSoftSkills[0] = false;
		m_ResultReplacesIngredient[0] = 0;
	}

	override bool CanDo(ItemBase ingredients[], PlayerBase player)
	{
		return true;
	}

	override void Do(ItemBase ingredients[], PlayerBase player, array<ItemBase> results, float specialty_weight)
	{
	}
};

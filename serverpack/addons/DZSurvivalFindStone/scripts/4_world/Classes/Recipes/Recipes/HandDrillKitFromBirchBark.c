// HandDrillKitFromBirchBark.c
//
// Fix for a vanilla recipe bug: combining a WoodenStick (Short Stick) with
// Bark_Birch (Light Bark) is supposed to be able to craft a HandDrillKit,
// but the vanilla recipe apparently was never updated after Bark was split
// into Bark_Birch/Bark_Oak classnames (confirmed via this project's own
// src/data/marketGapFill.json and the current DayZ Wiki Short Stick page,
// which both use these exact classnames). Symptom: the combine menu shows
// a second scrollable recipe option (the leftover UI hint for Hand Drill
// Kit) alongside Fireplace, but scrolling to it never resolves - it's not
// a client-side glitch, the underlying recipe just never matches these
// post-split bark classnames. This registers an explicit, working
// replacement recipe instead of patching vanilla's own (unreachable)
// definition.
//
// Registered via a modded PluginRecipesManager - see
// ../../DZSurvivalFindStone_RecipesManager.c. Structure modelled on
// SharpenSmallStone.c in this same folder, adjusted for a "both
// ingredients consumed, brand new result item" recipe (matching vanilla's
// own CraftStoneKnife.c shape) rather than an in-place transform.
class HandDrillKitFromBirchBark extends RecipeBase
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

		// ingredient 1 - the Light Bark, consumed
		InsertIngredient(1, "Bark_Birch");

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

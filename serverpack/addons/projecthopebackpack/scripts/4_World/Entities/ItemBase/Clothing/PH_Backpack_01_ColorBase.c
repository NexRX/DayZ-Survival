class PH_Backpack_01_ColorBase extends Clothing 
{
	
	const int 						SIMPLE_SELECTION_MELEE_RIFLE = 0;
	const int 						SIMPLE_SELECTION_MELEE_MELEE = 1;
	const int 						SIMPLE_SELECTION_SHOULDER_RIFLE = 2;
	const int 						SIMPLE_SELECTION_SHOULDER_MELEE = 3;
	
	void UpdateBackpackProxyVisibility(EntityAI item, string slot_name)
	{
		
		if ( item.IsInherited( Weapon_Base ) && slot_name == "Melee" )
		{
			SetSimpleHiddenSelectionState(SIMPLE_SELECTION_MELEE_RIFLE,1);
			SetSimpleHiddenSelectionState(SIMPLE_SELECTION_MELEE_MELEE,0);
		}
		
		if ( !item.IsInherited( Weapon_Base ) && slot_name == "Melee" )
		{
			SetSimpleHiddenSelectionState(SIMPLE_SELECTION_MELEE_RIFLE,0);
			SetSimpleHiddenSelectionState(SIMPLE_SELECTION_MELEE_MELEE,1);
		}
		
		if ( item.IsInherited( Weapon_Base ) && slot_name == "Shoulder" )
		{
			SetSimpleHiddenSelectionState(SIMPLE_SELECTION_SHOULDER_RIFLE,1);
			SetSimpleHiddenSelectionState(SIMPLE_SELECTION_SHOULDER_MELEE,0);
		}
		
		if ( !item.IsInherited( Weapon_Base ) && slot_name == "Shoulder" )
		{
			SetSimpleHiddenSelectionState(SIMPLE_SELECTION_SHOULDER_RIFLE,0);
			SetSimpleHiddenSelectionState(SIMPLE_SELECTION_SHOULDER_MELEE,1);
		}
	}
	
	override void EEItemAttached(EntityAI item, string slot_name)
	{
		super.EEItemAttached(item, slot_name);

		UpdateBackpackProxyVisibility(item, slot_name);

	}
	
	override void EEItemDetached(EntityAI item, string slot_name)
	{
		super.EEItemDetached( item, slot_name );
		
		UpdateBackpackProxyVisibility(item, slot_name);
	}
	
	override bool CanReceiveAttachment( EntityAI attachment, int slotId )
	{
		
		string slot_name = InventorySlots.GetSlotName(slotId);
		
		if ( slot_name == "Shoulder" )
		{
			if ( attachment.IsInherited( Weapon_Base ))
				return true;
			if ( !attachment.IsInherited( Weapon_Base ))
				return false;
		}
		
		if ( slot_name == "Melee" )
		{
			if ( attachment.IsInherited( Weapon_Base ))
				return false;
			if ( !attachment.IsInherited( Weapon_Base ))
				return true;
		}
		return super.CanReceiveAttachment( attachment, slotId );
	}


};

class SurvivorBackpack_Black extends PH_Backpack_01_ColorBase {};

class SurvivorBackpack_Green extends PH_Backpack_01_ColorBase {};

class SurvivorBackpack_Blue extends PH_Backpack_01_ColorBase {};

class SurvivorBackpack_Red extends PH_Backpack_01_ColorBase {};

class SurvivorBackpack_Pink extends PH_Backpack_01_ColorBase {};

class SurvivorBackpack_Yellow extends PH_Backpack_01_ColorBase {};



modded class SharpWoodenStick
{
	protected bool m_ZenFireplaceActionTrigger;
	protected vector m_ZenFireplaceSpawnPosition;
	protected vector m_ZenFireplaceSpawnOrientation;
	protected FireplaceBase m_ZenFireplaceDaddy;

	//! ZEN'S FUNCTIONS

	void SharpWoodenStick()
	{
		m_ZenFireplaceActionTrigger = false;
	}

	FireplaceBase GetZenFireplaceDaddy()
	{
		return m_ZenFireplaceDaddy;
	}

	// Push stick up and backwards
	void ZenDropTheStick(bool restart = false)
	{
		vector impulse = Vector(0, 5, -1);

		if (restart)
			impulse = Vector(0, 10, -10);

		ThrowPhysically(null, impulse);
		ZenStopCookingSound();
	}

	void SetZenFireplaceData(vector pos, vector ori, FireplaceBase fire)
	{
		m_ZenFireplaceSpawnPosition = pos;
		m_ZenFireplaceSpawnOrientation = ori;
		m_ZenFireplaceDaddy = fire;

		if (m_ZenFireplaceDaddy && m_ZenFireplaceSpawnPosition != vector.Zero && m_ZenFireplaceSpawnOrientation != vector.Zero)
		{
			m_ZenFireplaceActionTrigger = true;
		}
		else 
		{
			m_ZenFireplaceActionTrigger = false;
			ZenStopCookingSound();
		}
	}

	void ZenStandUpByFire()
	{
		if (!m_ZenFireplaceSpawnPosition || !m_ZenFireplaceSpawnOrientation)
			return;

		if (m_ZenFireplaceSpawnPosition == vector.Zero || m_ZenFireplaceSpawnOrientation == vector.Zero)
			return;

		SetPosition(m_ZenFireplaceSpawnPosition);
		SetOrientation(m_ZenFireplaceSpawnOrientation);

		m_ZenFireplaceSpawnPosition = vector.Zero;
		m_ZenFireplaceSpawnOrientation = vector.Zero;
	}

	void ZenStopCookingSound()
	{
		Edible_Base item_on_stick = Edible_Base.Cast(GetAttachmentByType(Edible_Base));
		if (item_on_stick)
		{
			item_on_stick.MakeSoundsOnClient(false);
		}
	}

	//! VANILLA FUNCTIONS

	override void AfterStoreLoad()
	{
		super.AfterStoreLoad();

		vector ori = GetOrientation();

		//! TODO: This is a bit hacky, find a better way?
		// If on server restart ori y axis is tilted within range of my fire attachment range, assume we 
		// were placed by a fire and drop to ground if we have no attachment or our attachment is food. The reason 
		// I check for food specifically is because some mods use things like Human Skulls attached to sticks etc and 
		// allow players to place them similarly to how I place food sticks, so don't wanna drop them accidentally.
		// I do this to avoid confusion around server restarts - without saving to persistence or getting janky with
		// GetObjectAt checks on a server restart, it's not easy to know if a stick was 'placed' at a fire or not. So by
		// "dropping" the stick by the fire on a restart it makes it obvious it needs to be re-placed at the fire to cook.
		if (ori[1] >= 20 && ori[1] <= 40)
		{
			EntityAI item_on_stick = FindAttachmentBySlotName("ingredient");
			if (!item_on_stick || item_on_stick.IsInherited(Edible_Base))
			{
				ZenDropTheStick(true);
			}			
		}
	}

	override void OnInventoryExit(Man player)
	{
		super.OnInventoryExit(player);

		if (!GetGame().IsDedicatedServer())
			return;
		
		if (m_ZenFireplaceActionTrigger && player != NULL)
		{
			m_ZenFireplaceActionTrigger = false;
			GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(ZenStandUpByFire, 50, false);
		}
	}

	override void EEItemLocationChanged(notnull InventoryLocation oldLoc, notnull InventoryLocation newLoc)
	{
		super.EEItemLocationChanged(oldLoc, newLoc);

		if (!GetGame().IsDedicatedServer())
			return;

		if (oldLoc.GetParent() != NULL)
			return; // We're only interested in stick being moved from ground (null parent)

		if (m_ZenFireplaceDaddy != NULL)
		{
			m_ZenFireplaceDaddy.RemoveZenAttachedStick(this);
			SetZenFireplaceData(vector.Zero, vector.Zero, NULL);
		}
	}

	override void SetActions()
	{
		super.SetActions();
		
		AddAction(ActionZenAttachStickToFire);
	}
}
modded class FireplaceBase
{
	protected ref array<SharpWoodenStick> m_ZenAttachedSticks;

	override void Heating()
	{
		super.Heating();

		if (!IsBurning() || !m_ZenAttachedSticks || m_ZenAttachedSticks.Count() == 0)
			return;

		CookZenSticksAttached();
	}

	protected void CookZenSticksAttached()
	{
		SharpWoodenStick stick;

		for (int i = m_ZenAttachedSticks.Count() - 1; i >= 0; i--)
		{
			stick = SharpWoodenStick.Cast(m_ZenAttachedSticks.Get(i));
			if (!stick || stick.IsRuined() || vector.Distance(stick.GetPosition(), GetPosition()) > 2)
			{
				if (stick.IsRuined())
				{
					stick.ZenDropTheStick();
				}

				m_ZenAttachedSticks.Remove(i);
				continue;
			}

			stick.DecreaseHealth(GameConstants.FIRE_ATTACHMENT_DAMAGE_PER_SECOND * 5, false);

			Edible_Base item_on_stick = Edible_Base.Cast(stick.GetAttachmentByType(Edible_Base));
			if (!item_on_stick || !item_on_stick.CanBeCookedOnStick())
			{
				continue;
			}

			GetCookingProcess().CookOnStick(item_on_stick, 1);
			//ZenFunctions.DebugMessage("Cook: " + item_on_stick.GetType() + " stickHP=" + stick.GetHealth());
		}
	}

	void AddZenAttachedStick(SharpWoodenStick stick)
	{
		if (!m_ZenAttachedSticks)
		{
			m_ZenAttachedSticks = new array<SharpWoodenStick>;
		}

		m_ZenAttachedSticks.Insert(stick);
	}

	void RemoveZenAttachedStick(SharpWoodenStick stick)
	{
		if (!m_ZenAttachedSticks)
		{
			return;
		}

		m_ZenAttachedSticks.RemoveItem(stick);
	}
}
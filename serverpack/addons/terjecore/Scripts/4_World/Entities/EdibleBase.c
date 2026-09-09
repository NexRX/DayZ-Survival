modded class Edible_Base
{
	void SetTerjeDecayTimer(float value)
	{
		m_DecayTimer = value;
	}
	
	void SetTerjeDecayDelta(float value)
	{
		m_DecayDelta = value;
	}
	
	bool IsTerjeFishFillet()
	{
		return GetTerjeGameConfig().ConfigGetBool("CfgVehicles " + GetType() + " fishFillet");
	}
	
	override bool Consume(float amount, PlayerBase consumer)
	{
		if (super.Consume(amount, consumer))
		{
			ApplyTerjeConsumableEffects(consumer, amount);
			return true;
		}
		
		return false;
	}
}
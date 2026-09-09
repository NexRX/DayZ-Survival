class TerjeDamageSource
{
	protected string m_id;
	
	void TerjeDamageSource(string id)
	{
		m_id = id;
	}
	
	string GetId()
	{
		return m_id;
	}
	
	static ref TerjeDamageSource CreateDamageSource(string id)
	{
		return new TerjeDamageSource(id);
	}
	
	static ref TerjeDamageSource CONSUMABLE_EFFECT = CreateDamageSource("CONSUMABLE_EFFECT");
	static ref TerjeDamageSource HUNGER = CreateDamageSource("HUNGER");
	static ref TerjeDamageSource THIRST = CreateDamageSource("THIRST");
	static ref TerjeDamageSource BLEEDING = CreateDamageSource("BLEEDING");
}
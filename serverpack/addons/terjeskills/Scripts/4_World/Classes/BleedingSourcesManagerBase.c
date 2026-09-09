modded class BleedingSourcesManagerBase
{
	override bool AttemptAddBleedingSourceBySelection(string selection_name)
	{
		if (m_Player && m_Player.GetTerjeSkills())
		{
			float perkValue;
			if (selection_name == "RightFoot" || selection_name == "LeftFoot")
			{
				if (m_Player.GetTerjeSkills().GetPerkValue("surv", "rghfeet", perkValue) && Math.RandomFloat01() <= Math.AbsFloat(perkValue) )
				{
					return false;
				}
			}
			else if (selection_name == "LeftForeArmRoll" || selection_name == "RightForeArmRoll")
			{
				if (m_Player.GetTerjeSkills().GetPerkValue("surv", "rghhands", perkValue) && Math.RandomFloat01() <= Math.AbsFloat(perkValue) )
				{
					return false;
				}
				
				m_Player.SetBloodyHands(true);
			}
		}
		
		return super.AttemptAddBleedingSourceBySelection(selection_name);
	}
}
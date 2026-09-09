class TerjePlayerModifierSkillAthletic : TerjePlayerModifierBase
{
	private vector m_skillsRunLastPos;
	private float m_distanceCounter = -1;
	
	override float GetTimeout()
	{
		return 3.0;
	}
	
	override void OnServerFixedTick(PlayerBase player, float deltaTime)
	{
		super.OnServerFixedTick(player, deltaTime);
		
		if (player.IsInVehicle())
		{
			m_distanceCounter = -1;
			return;
		}
		
		if (m_distanceCounter < 0)
		{
			m_distanceCounter = 0;
			m_skillsRunLastPos = player.GetPosition();
		}
		else
		{
			if (player.m_MovementState.m_iStanceIdx == DayZPlayerConstants.STANCEIDX_ERECT)
			{
				float currentDistance = vector.Distance(m_skillsRunLastPos, player.GetPosition());
				if (player.m_MovementState.m_iMovement == DayZPlayerConstants.MOVEMENTIDX_SPRINT)
				{
					m_distanceCounter += Math.Clamp(currentDistance, 0, 30);
				}
				else if (player.m_MovementState.m_iMovement == DayZPlayerConstants.MOVEMENTIDX_RUN)
				{
					m_distanceCounter += Math.Clamp(currentDistance, 0, 15);
				}
				else
				{
					m_distanceCounter = 0;
				}
			}
			else
			{
				m_distanceCounter = 0;
			}
			
			int athleticCheckDistance;
			if (GetTerjeSettingInt(TerjeSettingsCollection.SKILLS_ATHLETIC_CHECK_DISTANCE, athleticCheckDistance) && m_distanceCounter > athleticCheckDistance)
			{
				m_distanceCounter = 0;
				
				int athleticExpGain;
				if (GetTerjeSettingInt(TerjeSettingsCollection.SKILLS_ATHLETIC_EXP_GAIN, athleticExpGain))
				{
					player.GetTerjeSkills().AddSkillExperience("athlc", athleticExpGain);
				}
			}
			
			m_skillsRunLastPos = player.GetPosition();
		}
	}
}

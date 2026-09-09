modded class DayZPlayerImplement
{
	override void OnStepEvent(string pEventType, string pUserString, int pUserInt)
	{
		if (g_Game.IsClient())
		{
			float perkValue;
			PlayerBase player = PlayerBase.Cast(this);
			if (player)
			{
				AnimBootsType bootsType = GetBootsType();
				if (bootsType == AnimBootsType.None)
				{
					if (player.GetTerjeSkillsStealthPerkValueFromBitmask(TerjeSkillsStealthMask.TERJE_SKILLS_STEALTH_FEETS, "shadowtrc", perkValue))
					{
						HumanMovementState state = new HumanMovementState();
						GetMovementState(state);
						if (state.m_iMovement != DayZPlayerConstants.MOVEMENTIDX_SPRINT)
						{
							ModifyTerjeWaveMasterVolume(0);
						}
					}
				}
				
				if (player.GetTerjeSkillsStealthPerkValueFromBitmask( TerjeSkillsStealthMask.TERJE_SKILLS_STEALTH_SHOES, "qtstep", perkValue))
				{
					ModifyTerjeWaveMasterVolume(Math.Clamp(1.0 + perkValue, 0, 1));
				}
				
				if (player.GetTerjeSkillsStealthPerkValueFromBitmask( TerjeSkillsStealthMask.TERJE_SKILLS_STEALTH_NINJA, "ninja", perkValue))
				{
					ModifyTerjeWaveMasterVolume(0.5);
				}
			}
		}
		
		super.OnStepEvent(pEventType, pUserString, pUserInt);
		ResetTerjeWaveMasterVolume();
	}
	
	override void OnSoundEvent(string pEventType, string pUserString, int pUserInt)
	{
		if (g_Game.IsClient())
		{
			float perkValue;
			PlayerBase player = PlayerBase.Cast(this);
			if (player)
			{
				if (pEventType == "SoundVoice")
				{
					if (player.GetTerjeSkillsStealthPerkValueFromBitmask( TerjeSkillsStealthMask.TERJE_SKILLS_STEALTH_VOICE, "coldbldd", perkValue))
					{
						ModifyTerjeWaveMasterVolume(Math.Clamp(1.0 + perkValue, 0, 1));
					}
				}
				else if (pEventType == "SoundAttachment")
				{
					if (player.GetTerjeSkillsStealthPerkValueFromBitmask( TerjeSkillsStealthMask.TERJE_SKILLS_STEALTH_CLOTHES, "fitequip", perkValue))
					{
						ModifyTerjeWaveMasterVolume(Math.Clamp(1.0 + perkValue, 0, 1));
					}
				}
				else if (pEventType == "SoundWeapon" || pEventType == "Sound")
				{
					if (player.GetTerjeSkillsStealthPerkValueFromBitmask( TerjeSkillsStealthMask.TERJE_SKILLS_STEALTH_WEAPON, "qshooter", perkValue))
					{
						ModifyTerjeWaveMasterVolume(Math.Clamp(1.0 + perkValue, 0, 1));
					}
				}
				
				if (player.GetTerjeSkillsStealthPerkValueFromBitmask( TerjeSkillsStealthMask.TERJE_SKILLS_STEALTH_NINJA, "ninja", perkValue))
				{
					ModifyTerjeWaveMasterVolume(0.5);
				}
			}
		}
		
		super.OnSoundEvent(pEventType, pUserString, pUserInt);
		ResetTerjeWaveMasterVolume();
	}
	
	override void AddNoise(NoiseParams noisePar, float noiseMultiplier = 1.0)
	{
		if (g_Game && g_Game.IsDedicatedServer() && noiseMultiplier > 0)
		{
			float settingValue;
			if (GetTerjeSettingFloat(TerjeSettingsCollection.SKILLS_STEALTH_PLAYER_NOISE_MODIFIER, settingValue))
			{
				noiseMultiplier *= Math.Max(0, settingValue);
			}
			
			float perkValue;
			PlayerBase player = PlayerBase.Cast(this);
			if (player && player.GetTerjeSkills() != null && player.GetTerjeSkills().IsPerkRegistered("stlth", "invisman") && player.GetTerjeSkills().GetPerkValue("stlth", "invisman", perkValue))
			{
				noiseMultiplier *= Math.Clamp(1.0 + perkValue, 0, 1);
			}
		}
		
		super.AddNoise(noisePar, noiseMultiplier);
	}
}
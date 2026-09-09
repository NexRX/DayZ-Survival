modded class DayZPlayerImplement
{
	private float m_terjeWaveMasterVolume = 1.0;
	
	private void ModifyTerjeWaveMasterVolume(float value)
	{
		m_terjeWaveMasterVolume *= value;
	}
	
	private void ResetTerjeWaveMasterVolume()
	{
		m_terjeWaveMasterVolume = 1.0;
	}
	
	override AbstractWave PlaySound(SoundObject so, SoundObjectBuilder sob)
	{
		AbstractWave wave = super.PlaySound(so, sob);
		if (wave != null)
		{
			wave.SetVolume(wave.GetVolume() * m_terjeWaveMasterVolume);
		}
		
		return wave;
	}
}
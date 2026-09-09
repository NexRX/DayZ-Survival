class TerjeBitmaskHelper
{
	static int SetBit(int bitmask, int index, bool bit)
	{
		if (index < 0 || index >= 32)
		{
			return bitmask; // ERROR
		}
		else if (bit == true)
		{
			bitmask |= 1 << index;
		}
		else
		{
			bitmask &= ~(1 << index);
		}
		
		return bitmask;
	}
	
	static bool GetBit(int bitmask, int index)
	{
		if (index < 0 || index >= 32)
		{
			return false; // ERROR
		}
		
		return (bitmask & (1 << index)) != 0;
	}
}
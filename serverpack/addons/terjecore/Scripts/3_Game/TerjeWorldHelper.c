class TerjeWorldHelper
{
	static bool IsOutOfMap(EntityAI entity)
	{
		if (entity && GetGame() && GetGame().GetWorld())
		{
			vector worldPos = entity.GetWorldPosition();
			int worldSize = GetGame().GetWorld().GetWorldSize();

			if ((worldPos[0] < 0) || (worldPos[0] > worldSize) || (worldPos[2] < 0) || (worldPos[2] > worldSize))
			{
				return true;
			}
		}
		
		return false;
	}
}
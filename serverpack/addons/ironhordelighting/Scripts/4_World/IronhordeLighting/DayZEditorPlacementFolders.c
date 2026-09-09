#ifdef DayZEditor
modded class EditorPlaceableItem
{
	bool IH_IsIronhordeLightingEntry()
	{
		if (IH_GetStaticModelDisplayName() != string.Empty)
			return true;

		if (IH_GetPlacementFolderName() != string.Empty)
			return true;

		return Type.Length() >= 3 && Type.Substring(0, 3) == "IH_";
	}

	override string GetModelName()
	{
		string staticModelName = IH_GetStaticModelDisplayName();
		if (staticModelName != string.Empty)
			return staticModelName;

		if (Type == "IH_Decorative_Candle_01")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_candle_01.p3d";
		if (Type == "IH_Decorative_Candle_02")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_candle_02.p3d";
		if (Type == "IH_Decorative_Candle_03")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_candle_03.p3d";
		if (Type == "IH_Decorative_Lantern_01")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_lantern_01.p3d";
		if (Type == "IH_Decorative_Lantern_02")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_lantern_02.p3d";
		if (Type == "IH_Decorative_Walltorch_01")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_walltorch_01.p3d";

		string folderName = IH_GetPlacementFolderName();
		if (folderName != string.Empty)
			return "ironhorde_lighting\\" + folderName + "\\" + Type + ".p3d";

		if (Type.Length() >= 3 && Type.Substring(0, 3) == "IH_")
			return "ironhorde_lighting\\" + Type + ".p3d";

		return super.GetModelName();
	}

	protected string IH_GetStaticModelDisplayName()
	{
		if (!Type.Contains(".p3d"))
			return string.Empty;

		string modelPath = Type;
		modelPath.ToLower();
		string modelFileName = File.GetName(modelPath);
		modelFileName.ToLower();

		if (modelPath.Contains("ih_ledstrip_1m.p3d"))
			return "ironhorde_lighting\\ih_ledstrip_1m.p3d";
		if (modelPath.Contains("ih_ledstrip_2m.p3d"))
			return "ironhorde_lighting\\ih_ledstrip_2m.p3d";
		if (modelPath.Contains("ih_ledstrip_4m.p3d"))
			return "ironhorde_lighting\\ih_ledstrip_4m.p3d";
		if (modelFileName == "ih_decorative_candle_01.p3d")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_candle_01.p3d";
		if (modelFileName == "ih_decorative_candle_02.p3d")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_candle_02.p3d";
		if (modelFileName == "ih_decorative_candle_03.p3d")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_candle_03.p3d";
		if (modelFileName == "ih_decorative_lantern_01.p3d")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_lantern_01.p3d";
		if (modelFileName == "ih_decorative_lantern_02.p3d")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_lantern_02.p3d";
		if (modelFileName == "ih_decorative_walltorch_01.p3d")
			return "ironhorde_lighting\\decorative_lights\\ih_decorative_walltorch_01.p3d";

		return string.Empty;
	}

	protected string IH_GetPlacementFolderName()
	{
		if (Type.IndexOf("IH_LEDStrip_") == 0)
			return "led_strips";
		if (Type.IndexOf("IH_LightSource_") == 0)
			return "lightsource";
		if (Type.IndexOf("IH_Industrial_Light_") == 0)
			return "industrial_light";
		if (Type.IndexOf("IH_Hangar_Lamp_") == 0)
			return "hangar_lamp";
		if (Type.IndexOf("IH_Rotating_") == 0)
			return "rotating";
		if (Type.IndexOf("IH_Town_LightPole_") == 0)
			return "town_lightpole";
		if (Type.IndexOf("IH_Industrial_LightPole_") == 0)
			return "industrial_lightpole";
		if (Type.IndexOf("IH_Searchlight_") == 0)
			return "searchlight";
		if (Type.IndexOf("IH_Flicker_") == 0)
			return "flicker";
		if (Type.IndexOf("IH_PoliceLight_") == 0)
			return "policelights";
		if (Type.IndexOf("RoadWarning_") == 0)
			return "policelights";
		if (Type.IndexOf("IH_Static_") == 0)
			return "static_colors";
		if (Type == "IH_Decorative_Candle_01" || Type == "IH_Decorative_Candle_02" || Type == "IH_Decorative_Candle_03" || Type == "IH_Decorative_Lantern_01" || Type == "IH_Decorative_Lantern_02" || Type == "IH_Decorative_Walltorch_01" || Type == "IH_Decorative_GasLamp" || Type == "IH_Decorative_LuxuryLamp")
			return "decorative_lights";
		if (Type == "IH_Candle" || Type == "IH_Fireflies" || Type.IndexOf("IH_Heat_") == 0 || Type.IndexOf("IH_Blinking_") == 0 || Type.IndexOf("IH_Alarm_") == 0)
			return "misc";

		return string.Empty;
	}
}

modded class Editor
{
	protected bool m_IHDecorativeCandleHandBasisValid;
	protected float m_IHDecorativeCandleHandYaw;

	protected bool IH_IsDecorativeCandleHandType(string typeName)
	{
		return typeName == "IH_Decorative_Candle_01" || typeName == "IH_Decorative_Candle_02" || typeName == "IH_Decorative_Candle_03" || typeName == "IH_Decorative_Lantern_01" || typeName == "IH_Decorative_Lantern_02" || typeName == "IH_Decorative_Walltorch_01";
	}

	override EditorHandMap AddInHand(EditorPlaceableItem item, EditorHandData hand_data = null)
	{
		if (!item || !IH_IsDecorativeCandleHandType(item.Type))
			return super.AddInHand(item, hand_data);

		ref EditorHandData candle_hand_data = hand_data;
		if (!candle_hand_data)
			candle_hand_data = new EditorHandData();

		vector orientationOffset = candle_hand_data.OrientationOffset;
		if (IH_IsUntouchedDecorativeCandleOrientation(orientationOffset))
		{
			orientationOffset[1] = 90.0;
			candle_hand_data.OrientationOffset = orientationOffset;
		}

		EditorHandMap handObjects = super.AddInHand(item, candle_hand_data);
		if (!handObjects)
			return handObjects;

		foreach (EditorWorldObject handObject, EditorHandData currentHandData : handObjects)
		{
			EditorHologram candleHologram;
			if (!Class.CastTo(candleHologram, handObject) || !candleHologram.GetPlaceableItem() || !IH_IsDecorativeCandleHandType(candleHologram.GetPlaceableItem().Type))
				continue;

			Object previewObject = candleHologram.GetWorldObject();
			if (previewObject)
			{
				previewObject.SetScale(0.50);
				previewObject.Update();

				if (candleHologram == m_MainHandObject)
				{
					vector previewOrientation = previewObject.GetOrientation();
					m_IHDecorativeCandleHandYaw = previewOrientation[0];
					m_IHDecorativeCandleHandBasisValid = true;
				}
			}
		}

		return handObjects;
	}

	override void HandleHands(float dt)
	{
		EditorHologram candleHologram;
		if (!Class.CastTo(candleHologram, m_MainHandObject) || !candleHologram.GetPlaceableItem() || !IH_IsDecorativeCandleHandType(candleHologram.GetPlaceableItem().Type))
		{
			m_IHDecorativeCandleHandBasisValid = false;
			super.HandleHands(dt);
			return;
		}

		Object previewObject = candleHologram.GetWorldObject();
		if (!previewObject)
		{
			m_IHDecorativeCandleHandBasisValid = false;
			super.HandleHands(dt);
			return;
		}

		if (!m_IHDecorativeCandleHandBasisValid)
		{
			vector currentOrientation = previewObject.GetOrientation();
			m_IHDecorativeCandleHandYaw = currentOrientation[0];
			m_IHDecorativeCandleHandBasisValid = true;
		}

		vector basisOrientation = Vector(m_IHDecorativeCandleHandYaw, 0.0, 0.0);
		previewObject.SetOrientation(basisOrientation);

		float pendingYaw = m_HandsInputOrientation[0];
		super.HandleHands(dt);
		m_IHDecorativeCandleHandYaw = m_IHDecorativeCandleHandYaw + pendingYaw;
	}

	override array<EditorObject> PlaceObject()
	{
		bool hasDecorativeCandle;
		foreach (EditorWorldObject candidateObject, EditorHandData candidateHandData : m_PlacingObjects)
		{
			EditorHologram candidateHologram;
			if (Class.CastTo(candidateHologram, candidateObject) && candidateHologram.GetPlaceableItem() && IH_IsDecorativeCandleHandType(candidateHologram.GetPlaceableItem().Type))
			{
				hasDecorativeCandle = true;
				break;
			}
		}

		if (!hasDecorativeCandle)
			return super.PlaceObject();

		if (GetWidgetUnderCursor() && !GetWidgetUnderCursor().IsInherited(MapWidget) && GetWidgetUnderCursor().GetName() != "HudPanel" && GetWidgetUnderCursor().GetName() != "CursorIcons")
			return null;

		if (!m_PlacingObjects || m_PlacingObjects.Count() == 0)
			return null;

		array<EditorObject> placedObjects = {};
		array<ref EditorObjectData> dataList = {};
		foreach (EditorWorldObject placingObject, EditorHandData handData : m_PlacingObjects)
		{
			EditorHologram editorHologram;
			if (!Class.CastTo(editorHologram, placingObject))
				continue;

			Object entity = editorHologram.GetWorldObject();
			if (!entity)
			{
				EditorLog.Warning("Invalid Entity from %1", editorHologram.GetPlaceableItem().Type);
				return null;
			}

			vector placementOrientation = entity.GetOrientation();
			float placementScale = entity.GetScale();
			if (editorHologram.GetPlaceableItem() && IH_IsDecorativeCandleHandType(editorHologram.GetPlaceableItem().Type))
			{
				placementOrientation = Vector(m_IHDecorativeCandleHandYaw, 90.0, 0.0);
				if (handData)
				{
					placementOrientation = handData.OrientationOffset;
					placementOrientation[0] = placementOrientation[0] + m_IHDecorativeCandleHandYaw;
				}
				placementScale = 0.50;
			}

			EditorObjectData editorObjectData = EditorObjectData.Create(editorHologram.GetPlaceableItem().GetSpawnType(), entity.GetPosition(), placementOrientation, placementScale, EFE_DEFAULT);
			if (!editorObjectData)
			{
				EditorLog.Warning("Invalid Object data from %1", entity.GetType());
				return null;
			}

			dataList.Insert(editorObjectData);

			if (!IsShiftDown())
				RemoveFromHand(placingObject);
		}

		m_JustPlacedObject = true;
		auto createdObjects = CreateObjects(dataList);
		foreach (int id, EditorObject createdObject : createdObjects)
		{
			EditorEvents.ObjectPlaced(this, createdObject);
			if (createdObject)
				SelectObject(createdObject);

			placedObjects.Insert(createdObject);
		}

		return placedObjects;
	}

	override void RemoveFromHand(EditorWorldObject world_object)
	{
		if (world_object == m_MainHandObject)
		{
			m_IHDecorativeCandleHandBasisValid = false;
			m_IHDecorativeCandleHandYaw = 0.0;
		}

		super.RemoveFromHand(world_object);
	}

	protected bool IH_IsUntouchedDecorativeCandleOrientation(vector orientation)
	{
		if (Math.AbsFloat(orientation[1]) > 0.01 || Math.AbsFloat(orientation[2]) > 0.01)
			return false;

		float absoluteX = Math.AbsFloat(orientation[0]);
		return absoluteX < 0.01 || Math.AbsFloat(absoluteX - 180.0) < 0.01;
	}
}

modded class EditorHologram
{
	override void SetBottomTransform(vector transform[4])
	{
		if (m_PlaceableItem && (m_PlaceableItem.Type == "IH_Decorative_Candle_01" || m_PlaceableItem.Type == "IH_Decorative_Candle_02" || m_PlaceableItem.Type == "IH_Decorative_Candle_03" || m_PlaceableItem.Type == "IH_Decorative_Lantern_01" || m_PlaceableItem.Type == "IH_Decorative_Lantern_02" || m_PlaceableItem.Type == "IH_Decorative_Walltorch_01"))
		{
			transform[0] = transform[0] * 0.50;
			transform[1] = transform[1] * 0.50;
			transform[2] = transform[2] * 0.50;
		}

		super.SetBottomTransform(transform);
	}
}

modded class EditorPlaceableListNode
{
	override bool OnMouseEnter(Widget w, int x, int y)
	{
		if (m_PlaceableItem && m_PlaceableItem.IH_IsIronhordeLightingEntry())
		{
			GetEditor().GetObjectManager().CurrentSelectedItem = m_PlaceableItem;
			return true;
		}

		return super.OnMouseEnter(w, x, y);
	}
}

modded class EditorPlaceableListItem
{
	override bool OnMouseEnter(Widget w, int x, int y)
	{
		if (m_PlaceableItem && m_PlaceableItem.IH_IsIronhordeLightingEntry())
		{
			GetEditor().GetObjectManager().CurrentSelectedItem = m_PlaceableItem;
			return true;
		}

		return super.OnMouseEnter(w, x, y);
	}
}
#endif

// ActionFindStoneOnPath.c
//
// Lets a player search the ground for a loose stone while standing on
// gravel/dirt/rail-ballast surfaces (train tracks, dirt trails, gravel
// roads) - the DayZ-Survival equivalent of dzr_find_bark.pbo's "find bark
// on trees" action, but for stones on paths/tracks.
//
// Design notes:
// - Train tracks and dirt trails are terrain, not placeable Objects, so
//   this can't be an "aim at an object" action (CCTObject) - vanilla
//   objects like that don't exist for terrain. Instead this is a
//   self-targeted action (CCTNone) gated by the surface type directly
//   under the player's feet, the same general technique vanilla DayZ uses
//   for e.g. ActionDigWormsFromGround's soil-type check.
// - No tool is required - this is meant to be a low-tech, always-available
//   way to gather crafting material, not a shortcut around real tools.
// - Spawns "Stone" (not "SmallStone") on a successful search, since vanilla
//   DayZ already ships a craftable "StoneKnife" (types.xml has it flagged
//   crafted="1"), and "Stone" is the more likely vanilla crafting
//   ingredient for it by naming convention - confirm this in-game via the
//   crafting menu and swap to "SmallStone" below if the recipe actually
//   wants that instead.
// - A short per-player cooldown (in-memory, resets on server restart)
//   stops it from being spammed in place; the search itself takes a few
//   seconds and isn't guaranteed to succeed.
//
// !!! VERIFICATION NEEDED BEFORE PUBLISHING !!!
// This was written against the well-established ActionContinuousBase
// pattern used throughout vanilla/community DayZ scripts, but it has NOT
// been compiled or run against the actual game (no DayZ Tools/Enforce
// Script compiler available in this environment). Before packing this
// into a .pbo and publishing to the Workshop:
//   1. Boot a local server with this mod folder added to `-mod=`.
//   2. Check `profiles/*.RPT` and `profiles/script.log` for compile
//      errors on startup - fix any class/method name mismatches there
//      (the most likely issues are `DayZPlayerConstants` animation
//      command names and the exact `GetGame().SurfaceGetType(...)`
//      signature, both flagged below).
//   3. Confirm in-game that standing on a gravel road / train track shows
//      the action prompt, and that it's NOT available on grass/concrete.
class ActionFindStoneOnPath : ActionContinuousBase {
  // Substrings matched (case-insensitive) against the surface hashname
  // under the player. DayZ surface classnames vary per map/texture-set
  // (e.g. "np_gravel_02", "ballast", "dirt_dry_a") but reliably contain
  // one of these tokens - adjust this list after testing on your map(s)
  // if a particular path surface isn't being detected.
  protected ref array<string> m_ValidSurfaceTokens = {
      "gravel", "dirt", "rail", "ballast", "road", "path", "mud"};

  protected float m_SuccessChance = 0.65;   // 65% chance per completed search
  protected float m_CooldownSeconds = 45.0; // per-player, resets on restart
  protected ref map<string, float> m_LastSearchTime = new map<string, float>();

  void ActionFindStoneOnPath() {
    m_CallbackClass = ActionFindStoneOnPathCB;
    // TODO verify: confirm this constant exists in DayZPlayerConstants
    // (a kneeling/ground-directed animation is the intent - substitute
    // e.g. CMD_ACTIONFB_DIGWORM or similar if this doesn't compile).
    m_CommandUID = DayZPlayerConstants.CMD_ACTIONFB_DIGWORM;
    m_LoopType = UA_LOOP_DIG;
    m_Text = "Search for a stone";
    m_SpecialtyWeight = UASoftSkillsWeight.PRECISE_LOW;
  }

  override void CreateConditionComponents() {
    m_ConditionItem = new CCINone;
    m_ConditionTarget = new CCTNone;
  }

  override bool ActionCondition(PlayerBase player, ActionTarget target,
                                ItemBase item) {
    if (!player || player.IsUnconscious() || player.IsRestrained() ||
        player.IsSwimming())
      return false;

    if (!IsOnValidSurface(player))
      return false;

    if (IsOnCooldown(player))
      return false;

    return true;
  }

  protected bool IsOnValidSurface(PlayerBase player) {
    vector pos = player.GetPosition();
    // TODO verify: confirm GetGame().SurfaceGetType's signature/name on
    // your DayZ version - some builds expose SurfaceGetType(x, z),
    // others SurfaceGetType3D(pos). Adjust the call below to match.
    string surface = GetGame().SurfaceGetType(pos[0], pos[2]);
    surface.ToLower();

    foreach (string token : m_ValidSurfaceTokens) {
      if (surface.IndexOf(token) != -1)
        return true;
    }

    return false;
  }

  protected string GetPlayerKey(PlayerBase player) {
    if (player.GetIdentity())
      return player.GetIdentity().GetPlainId();

    return player
        .ToString(); // offline/dev fallback, not expected in normal play
  }

  protected bool IsOnCooldown(PlayerBase player) {
    string key = GetPlayerKey(player);
    if (!m_LastSearchTime.Contains(key))
      return false;

    float last = m_LastSearchTime.Get(key);
    return (GetGame().GetTickTime() - last) < m_CooldownSeconds;
  }

  override void OnFinishProgressServer(ActionData action_data) {
    super.OnFinishProgressServer(action_data);

    PlayerBase player = PlayerBase.Cast(action_data.m_Player);
    if (!player)
      return;

    m_LastSearchTime.Set(GetPlayerKey(player), GetGame().GetTickTime());

    if (Math.RandomFloat01() > m_SuccessChance)
      return; // searched, found nothing this time

    ItemBase stone =
        ItemBase.Cast(player.GetInventory().CreateInInventory("Stone"));
    if (!stone) {
      // Inventory full - drop it on the ground at the player's feet instead.
      vector pos = player.GetPosition();
      Object dropped = GetGame().CreateObject("Stone", pos);
    }
  }
};

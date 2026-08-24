// DZSurvivalFindStone_ActionManager.c
//
// Registers ActionFindStoneOnPath with the game's action system. This is
// the standard community pattern for adding a brand-new action (as opposed
// to overriding an existing one): extend ActionManagerBase and register the
// new action class alongside vanilla's own registrations.
//
// !!! VERIFICATION NEEDED !!! - see ActionFindStoneOnPath.c's header. The
// `RegisterAction` call below is the well-established community idiom for
// this, but hasn't been compiled against the actual engine here.
modded class ActionManagerBase{
    override void CreateActionComponent(){super.CreateActionComponent();
RegisterAction(ActionFindStoneOnPath);
}
}
;

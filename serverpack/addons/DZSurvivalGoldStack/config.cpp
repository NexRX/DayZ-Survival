class CfgPatches {
  class DZSurvivalGoldStack {
    units[] = {};
    weapons[] = {};
    requiredVersion = 0.1;
    // Only needs DayZ-Expansion-Core's own currencies pbo (defines
    // ExpansionGoldNugget) already loaded - that pbo's own CfgPatches name,
    // confirmed from its shipped config (server/@DayZ-Expansion-Core/addons/
    // core_objects_currencies.pbo). @DZSurvivalServerPack loads after
    // @DayZ-Expansion-Core in mods.txt, so this addon's "reopen" below sees
    // the real class already defined.
    requiredAddons[] = {"DayZExpansion_Core_Objects_Currencies"};
  };
};
class CfgVehicles {
  class ExpansionGoldNugget;
  // Reopens (not renames/replaces) Expansion Core's own ExpansionGoldNugget
  // via the standard "class X: X {}" self-inherit config-patch trick, adding
  // just these two properties on top of the original definition. Confirmed
  // via the mod's own shipped config (derapified from core_objects_
  // currencies.pbo): ExpansionGoldNugget -> ExpansionMoneyNugget_Base ->
  // ExpansionMoneyBase, which sets varQuantityMax/varStackMax = 100 - NOT
  // the "50,000" this project previously assumed (see traders.ts's
  // GOLD_CURRENCY_CLASSNAME comment, now corrected). That native 100 cap is
  // actually enforced correctly by both the trader/ATM code
  // (ExpansionMarketModule.SpawnMoneyInCurrency) and the quest reward code
  // (ExpansionItemSpawnHelper.SpawnOnParent) - a payout bigger than 100 gets
  // split into several separate 100-quantity items rather than overflowing
  // one - so it's not a literal uncapped/"infinite" stack. But with quest
  // rewards up to 1500 gold and trader prices well into four digits, a
  // 100-cap means routine payouts spill across 10-15+ separate inventory
  // slots, which is the real, practical problem being fixed here.
  //
  // Raised to 50,000 - the same real, working cap Expansion's own default
  // currencies (ExpansionBanknoteUSD/Euro/Hryvnia, via
  // ExpansionMoneyBanknote_Base) already ship with out of the box - so a
  // single Gold Nugget slot can now hold any realistic in-game sum without
  // needing dozens of stacks, while this project's own "Gold Coin" branding
  // (see traders.ts's GOLD_CURRENCY_CLASSNAME/DisplayCurrencyName) stays
  // exactly as-is. Deliberately NOT switching to the classname
  // ExpansionGoldNugget_InsanityStack instead (which natively caps at
  // 16,777,216) - see traders.ts's own comment on why that variant's
  // GetMoneyPrice() lookup is broken (strips "_insanitystack" from the
  // classname before ever finding its own registered price, so it silently
  // prices/spawns at zero).
  class ExpansionGoldNugget : ExpansionGoldNugget {
    varQuantityMax = 50000;
    varStackMax = 50000;
  };
};

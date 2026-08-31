# DZSurvivalServerPack

This project's own **single Workshop mod** bundling all of its custom
from-scratch DayZ addons (Enforce Script), so there's only one Workshop item
to maintain, subscribe to, and add to `mods.txt` - regardless of how many
custom features live inside it.

Built on Linux with [armake2](https://github.com/KoffeinFlummi/armake2)
(packs/rapifies) and signed with the **real Bohemia `DSSignFile.exe`** (from
DayZ Tools, Steam app `830640`, run via Wine - see
[`../src/modSign.ts`](../src/modSign.ts)). [BiSignUtils](https://github.com/rvost/BiSignUtils)
is still used, but only to _generate_ the signing keypair - see bug #9 below
for why it's no longer used to sign. See
[`../src/modBuild.ts`](../src/modBuild.ts) and
[`../src/modPublish.ts`](../src/modPublish.ts).

## Pitfalls: the nine bugs behind one client-side kick

A client connect-time kick -

```
Data verification error: Client has a mod which is not on the server.
(...) Client has a PBO which is not part of the server.
(.../@<mod>/addons/DZSurvivalFindStone.pbo)
```

took **nine** real, independent bugs across many sessions to fully resolve.
Every one of 1-8 was individually confirmed correct/necessary and none were
reverted - the kick simply kept reproducing because bug #9 was still present
underneath all of them. Worth reading in full if this pipeline, or a similar
kick on a _different_ mod, ever needs debugging again:

1. **Weak keys.** armake2's own built-in signing hardcodes 1024-bit keys
   with no way to override it. This is not actually a bug by itself (1024-bit
   is what real DayZ mods use - see #9's key-length note), but armake2 gives
   no way to control or inspect it, which is why signing was moved to a
   separate tool in the first place.
2. **Misplaced signature output.** `bisignutils sign <key> <pbo>` writes its
   `.bisign` file next to its _current working directory_, not next to the
   `<pbo>` path it's given. Fixed by passing an explicit `cwd` on that call
   (moot now that signing uses `DSSignFile.exe`, which writes next to the
   target PBO directly - see `src/modSign.ts`).
3. **Case-sensitive signature lookup.** The `.bisign` filename's key-name
   suffix has to match the exact original case of the signing authority name
   (embedded in the key/signature itself), but `src/install.ts`'s
   `lowercaseTree()` - needed for various third-party mods with
   Windows-only-case assumptions - was lowercasing this pack's own
   `.bisign`/`.bikey` filenames too, desyncing them from the case actually
   embedded in the signature. Fixed by excluding this pack's own mod folder
   from that pass (`skipLowercase` in `installOneMod()`).
4. **Wrong `mod.cpp`/`config.cpp` schema.** `mod.cpp` was written using
   Arma 3's `class CfgMods { class X { ... } }` schema - but real, working
   DayZ mods use a **flat** `mod.cpp` (`name = "..."; picture = "...";` at
   the top level, no `CfgMods` wrapper). The real `CfgMods` registration -
   specifically `class defs { class worldScriptModule { files[] = {...}; };
};`, which tells the engine which folder(s) contain this addon's
   `4_World` Enforce Script to compile - belongs **inside the addon's own
   `config.cpp`** (next to `CfgPatches`), confirmed by unpacking
   `@Dynamic-Scavenging`'s real `config.bin`.
5. **Doubled internal PBO path.** `$PBOPREFIX$` said `4_World`, but the
   source tree also nested scripts under a literal `4_World/` subfolder, so
   the engine mounted content at `4_World\4_World\Actions\...` - doubled and
   unresolvable (reported as a confusing `SCRIPT (E): Syntax error` rather
   than a path error). Fixed by moving the source folder up one level.
6. **Guessed, non-existent scripting APIs.** `m_LoopType`/`UA_LOOP_DIG`,
   `DayZPlayerConstants.CMD_ACTIONFB_DIGWORM`, a string-returning
   `GetGame().SurfaceGetType(x, z)`, and registering the action via a
   non-existent `ActionManagerBase.CreateActionComponent()` override were all
   guessed and don't exist in the real API. Root-caused and fixed by
   unpacking vanilla's own `server/dta/scripts.pbo` and cross-referencing
   real working examples (`ActionDigWorms.c`, `ActionMineRock.c`,
   `ActionUncoverHeadSelf.c`, `ActionConstructor.c`).
7. **Wrong-case `Addons`/`Keys` folder names.** Every real, working mod
   unpacked to check uses lowercase `addons`/`keys` folder names, but
   `modBuild.ts` was producing `Addons`/`Keys` (capitalized), copied verbatim
   from Arma 3-era conventions. This project's own `install.ts` is
   case-insensitive when copying `.bikey` files server-side, which is why
   this was invisible from the server's own logs - but the real DayZ client
   downloads the Workshop item's raw folder structure as-is. Fixed by
   lowercasing both folder names in `modBuild.ts`.
8. **`$PBOPREFIX$` collided with vanilla's own reserved `4_World`
   namespace.** Real mods always use their own unique namespace as
   `$PBOPREFIX$`/`CfgMods.dir` (e.g. `BVP_Charcoal`, `Dynamic_Scavenging`),
   with the actual Enforce Script nested _under_ that namespace
   (`BVP_Charcoal/scripts/4_world`) - never claiming the bare `4_World` path
   directly (confirmed by unpacking vanilla's own `scripts.pbo`: its real
   `$PBOPREFIX$` is `scripts`, not `4_World`). Fixed by renaming
   `$PBOPREFIX$` to `DZSurvivalFindStone` and nesting scripts under
   `scripts/4_world/`.
9. **BiSignUtils' signer is spec-incompatible (the actual final root
   cause).** After 1-8 were fixed and independently verified byte-for-byte -
   content, V3 signature format, 1024-bit key length (matching a real
   working mod's key, hex-dumped for comparison), the `product=dayz ugc`
   PBO header property, correct `CfgPatches`/`CfgMods` structure, correct
   A2S mod/signature advertisement, BattlEye disabled, and even tested on an
   **isolated minimal server with only this one mod** - the exact same kick
   _still_ reproduced. The actual cause: BiSignUtils (a reimplementation of
   Bohemia's `DSCreateKey`/`DSSignFile`) produces `.bisign` files that pass
   its own `checkAll` validator, but that the **real** `DSCheckSignatures.exe`
   rejects as `"...bisign is wrong"` - even for a signature over the
   byte-identical PBO, using the byte-identical key. In other words:
   BiSignUtils' signing algorithm is internally self-consistent but not
   actually spec-compliant, and every real DayZ client performs the
   equivalent of the real check, not BiSignUtils' own. This was proven
   directly by downloading the real DayZ Tools (Steam app `830640`, via
   `steamcmd +force_install_dir ... +app_update 830640` with
   `+@sSteamCmdForcePlatformType windows` since it's Windows-only) and
   running its `DSSignFile.exe`/`DSCheckSignatures.exe` under Wine:
   - Signing our PBO with `DSSignFile.exe` (same key) → `DSCheckSignatures.exe`
     says **OK**.
   - Checking our existing BiSignUtils-signed PBO with the same real
     `DSCheckSignatures.exe` → **"is wrong"**.

   Fixed by signing with the real `DSSignFile.exe` via Wine instead (see
   `src/modSign.ts`) - BiSignUtils is now used only to _generate_ the
   keypair (that part was always fine; only its _signer_ was broken).
   Confirmed fixed by an actual live client connect after redeploying.

**Lesson for next time**: when a reimplemented/community tool's own
self-check passes but the real client still rejects the output, don't trust
the reimplementation's validator - cross-check against the _real_ Bohemia
tool if at all possible (DayZ Tools is free via Steam for anyone who owns
DayZ; it runs fine under Wine on Linux for command-line-only tools like
`DSSignFile.exe`/`DSCheckSignatures.exe`/`FileBank.exe`/`CfgConvert.exe`,
without needing the full GUI or a game-capable Proton prefix).

## Adding a new addon

Each subfolder of `addons/` becomes its own PBO inside this one mod. To add
a new custom feature:

1. Create `addons/<YourAddonName>/` with the usual PBO source layout:
   ```
   addons/<YourAddonName>/
   ├── config.cpp        # CfgPatches + CfgMods (worldScriptModule etc.)
   ├── $PBOPREFIX$        # the PBO's own unique namespace, e.g. "YourAddonName"
   └── scripts/4_world/...
   ```
2. Run `deno task build-serverpack` - it auto-discovers every folder under
   `addons/` (anything with a `config.cpp`) and packs + signs each into its
   own `addons/<YourAddonName>.pbo`, all under the one `@DZSurvivalServerPack`
   mod folder, signed with the same shared keypair.

No build-tooling changes are needed to add addons - `src/modBuild.ts` is
generic over whatever it finds under `addons/`.

## Current addons

- **`DZSurvivalFindStone`** - a hold-to-search action that lets players find
  a `SmallStone` while looking down at gravel/dirt/rail-ballast surfaces
  (train tracks, dirt trails), no tool required. Hands must be empty, and a
  `SharpenSmallStone` crafting recipe (see below) lets two `SmallStone`s be
  combined to sharpen one into a `SharpStone` (a cosmetic/scope-only variant
  of vanilla's `StoneKnife`).

  **Status: confirmed working end-to-end**, including in live multi-session
  testing - builds, signs (with the real `DSSignFile.exe`), publishes to
  Workshop (`3789404408`), downloads back down through the normal
  mod-install pipeline, boots cleanly, and a real client has connected,
  found the action available (including standing directly on railway
  ballast, not just the dirt at its base), held it to completion, and
  crafted a `SharpStone`. Getting here also surfaced two more real bugs
  worth knowing about if a similar action/recipe is ever added to this pack:

  - **Self-target actions need explicit `PlayerBase.SetActions()`
    registration.** Inserting an action into `ActionConstructor
.RegisterActions()` alone (see `DZSurvivalFindStone_ActionManager.c`)
    only builds a global singleton - it does not make the action a
    candidate for any player. Confirmed fixed by also adding a
    `modded class PlayerBase { override void SetActions(...) { ...
AddAction(...); } }` (see `DZSurvivalFindStone_PlayerBase.c`), the same
    pattern vanilla uses for its own self-actions like `ActionUncoverHeadSelf`.
  - **Client/server state divergence on a per-instance cooldown.**
    `ActionCondition()` runs independently on both the client (to decide
    whether to show the menu option) and the server (to actually validate
    the action) - each side has its own separate instance of the action
    class. A cooldown timestamp only updated via `OnFinishProgressServer()`
    (server-only) never reached the client's own copy, so the client kept
    showing the option as available throughout the whole cooldown while the
    server correctly rejected every attempt, which looked like an instant
    self-cancel. This is why the action ended up with no cooldown at all
    (just a 20-second hold time) rather than fixing the mirroring - simpler
    and avoids the class of bug entirely.
  - Also worth knowing: `CCTSurface` (vanilla's normal "is the crosshair on
    bare ground" target condition) silently rejects any crosshair hit that
    resolves to a real placed Object - which is exactly what raised terrain
    features like railway ballast beds are modelled as. A custom
    `CCTGroundOrObjectSurface` component (same file) fixes this by dropping
    just that one restriction.

- **`SharpenSmallStone` recipe** - combines two `SmallStone`s, consuming one
  and sharpening the other in place into a `SharpStone`. Registered via a
  `modded class PluginRecipesManager` (see
  `DZSurvivalFindStone_RecipesManager.c`) - the same "defining the class
  isn't enough, it must be explicitly registered" lesson as the action
  above, this time against a real published mod's own source
  (`@Search-For-Charcoal`) confirming the pattern.

- **`DZSurvivalMapGate`** - requires a player to have **both** an `ItemMap`
  and a GPS device (`GPSReceiver`) in inventory before the M-key map-toggle
  shortcut will open the map (vanilla/Expansion only ship an OR check, or no
  check at all for the shortcut specifically - see the addon's own comments
  for the full trace). Works by overriding vanilla's own
  `MissionGameplay.HandleMapToggleByKeyboardShortcut()` (unpacked from
  `server/dta/scripts.pbo`) via a `modded class MissionGameplay` under a
  `missionScriptModule` (5_Mission scope) - the mission-scope sibling of the
  `worldScriptModule` (4_World) pattern `DZSurvivalFindStone` uses. Requires
  `src/mapAccess.ts`'s `tuneMapAccess()` to have set
  `MapData.ignoreMapOwnership = true` in the mission's `cfggameplay.json` -
  without that, vanilla's own shortcut is unreachable regardless of this
  addon.

- **`DZSurvivalTraderRestock`** - real-time scheduled restocking for the
  custom trader city (`src/traders.ts`'s `CUSTOM_POSITION`/"CustomTrader"
  zone) - DayZ-Expansion-Market itself has **no restock/timer system at
  all** (confirmed by unpacking and searching its own `market_scripts.pbo`
  source). Runs a real, repeating in-game timer (hourly tick, independent
  of server restarts) that, per configured _rule_ (one or more Market
  categories pooled together under one label), tops up one random eligible
  item (below its own `MaxStockThreshold`) across the whole pool (default:
  Helicopters +1/168h, Cars +1/24h, Guns +1/6h - pooling every firearm
  category, Clothing +1/2h - pooling every wearable clothing/gear category
  except `Ghillies` - one random item each time, never every item/model) by
  mutating the live
  `ExpansionMarketTraderZone` object directly - found via
  `ExpansionMarketSettings`' own public `GetTraderZoneByPosition(vector)`,
  deliberately _not_ a `modded class ExpansionMarketSettings` (tried first,
  but modding a class that's also used as a generic type parameter
  elsewhere, e.g. `JsonFileLoader<ExpansionMarketSettings>`, breaks the
  whole `Game` module compile with `Cannot convert 'ExpansionMarketSettings@N#M' to 'ExpansionMarketSettings'` - a real, reproducible
  EnforceScript limitation). This only ever _raises_ the one chosen item's
  stock, up to its own cap - it never lowers or clears any item's stock, so
  a player's own sold-in stock is never affected by a normal tick. Per-rule
  last-restocked timestamps persist across restarts in
  `$profile:DZSurvivalServerPack\TraderRestock.json`.
  Every tick logs a heartbeat via `GetGame().AdminLog()` (visible live in
  the `.ADM` log / Community-Online-Tools) whether or not anything
  restocked, plus one line per actual restock; the same live status is also
  readable in-world via a "Check Trader Restock Board" self-action, showing
  an `ExpansionNotification` toast. That action requires two things at
  once: the player is within `CUSTOM_SAFE_ZONE_RADIUS` (350m, matching the
  SafeZone `src/traders.ts`'s `ensureCustomTraderSafeZone()` adds around the
  trader city) of the trader city, and a real `StaticObj_Furniture_tac_board`
  prop - placed and oriented entirely by hand via DayZ-Editor, not spawned
  or positioned by this CLI at all - is within a few meters of the player
  (found via `GetGame().GetObjectsAtPosition3D()`, a pure position-radius
  query, not a crosshair raycast/look-at check).

  For testing, admins can also trigger an immediate restock tick (instead
  of waiting up to an hour) by typing `/restock now` in in-game chat. This
  calls `DZSurvivalTraderRestock.ForceTick()` - a variant of the real
  hourly tick that deliberately ignores both the "wait until
  `IntervalHours` has really elapsed" rule _and_ the "first time an item is
  ever seen, just record a baseline instead of restocking" rule (see
  `TickInternal()` in `DZSurvivalTraderRestock_Module.c`). Without this,
  the very first `/restock now` on a fresh/newly-updated server would
  silently do nothing but still show a generic success toast, since every
  item would be "first time seen" - `ForceTick()` returns how many items
  actually got restocked, so the confirmation toast reports a real outcome
  ("Restocked N item(s)" or "Nothing needed restocking") instead of always
  claiming success. This is implemented as a Community-Online-Tools chat
  command (`modded class JMModuleConstructor` registers a small
  `DZSurvivalTraderRestockModule` that supplies
  `GetCommandNames()`/`GetSubCommands()` - the same extension point COT's
  own `JMObjectSpawnerModule`/`JMTeleportModule` use for their
  `/object ...`/`/tp ...` commands), gated by a COT permission
  (`Admin.DZSurvivalTraderRestock.Trigger`, granted to admins by default
  same as every other `Admin.*` COT permission). A real clickable GUI
  button inside COT's own panel would additionally need a hand-authored
  `.layout` resource and a custom RPC channel - doable, but a chat command
  reuses COT's own already-working client->server RPC channel entirely, so
  that's what this uses. See
  `DZSurvivalTraderRestock_COTCommand.c`.

  A second admin-only command, `/restock reset`, zeroes out stock for
  every item in every category referenced by this addon's rules
  (Helicopters/Cars/Guns/Clothing by default - never any other Market
  category) via `DZSurvivalTraderRestock.ResetStock()`, and rebaselines
  each rule's own restock timer back to "now" (same as a freshly-seen
  rule, i.e. one full interval's wait before the next real restock). This
  is a real, permanent stock change intended for trader-testing resets,
  not a preview - same admin-only permission as `/restock now`.

  **Status: confirmed working end-to-end** via a real live boot - the
  `[TraderRestock] Initialized...` and hourly `[TraderRestock] tick...`
  lines both appear in the `.ADM` log, the server reaches genuine
  steady-state (`Average server FPS`) with the addon loaded, and the
  board's proximity action correctly triggers `OnEndServer` on the server
  (see the second override-hook bug below - the board's toast didn't
  appear at all until this was found and fixed). Getting here surfaced
  several more real, independent bugs/design changes worth knowing about:

  - **EnforceScript does not support the C-style ternary operator (`? :`)
    at all.** Confirmed by searching vanilla's entire `scripts.pbo` and all
    of DayZ-Expansion-Market's source: zero usage anywhere. The original
    `NowUnix()` used `month + (month > 2 ? -3 : 9)` and `year - (month <= 2)` (implicit bool-in-arithmetic) - both crashed the `World` module
    compile. Fixed by rewriting with explicit `if`/`else` statements.
  - **Multi-line `string.Format(...)` calls aren't reliably supported**
    when the call's closing `));` sits on its own line after the last
    argument - this crashed the `World` module compile with `Expected ',' or ')'` pointing at the last argument token, even though the call was
    syntactically balanced (confirmed via brace/paren counting and
    hexdump - no hidden characters). Confirmed via live reproduction:
    collapsing the exact same call to a single line made the identical
    error move to the _next_ multi-line call, then disappear entirely once
    every multi-line `string.Format(...)` in the file was collapsed.
    Lesson: always write these as single-line calls in this codebase, even
    though vanilla itself has an (ifdef-guarded, likely never actually
    compiled) example of the multi-line form.
  - **Wrong override hook for a non-continuous action (round one).**
    `ActionCheckTraderBoard` (the board's proximity action) extends
    `ActionSingleUseBase`, but originally overrode `OnFinishProgressServer`
    - that hook only exists on `ActionContinuousBase` (progress-bar
      actions). Confirmed via vanilla's `ActionResetKitchenTimer.c` that a
      single-use/instant action's execution hook is `OnExecuteServer`.
      This produced a real, specific compiler error ("is marked as override,
      but there is no function with this name in the base class") rather
      than a silent no-op, which made it easy to fix once reached.
  - **Wrong override hook (round two) - `OnExecuteServer` compiles fine but
    silently never fires for this action shape.** After the round-one fix,
    the board's action ran with no error but the toast never appeared -
    confirmed live (player uses the action, nothing visibly happens).
    Root cause: `OnExecuteServer` is only ever invoked from
    `AnimatedActionBase.OnAnimationEvent()`, itself only triggered by a
    mid-animation `"ActionExec"` notify event
    (`RegisterAnimationEvent("ActionExec", UA_ANIM_EVENT)` in
    `ActionSingleUseBaseCB.InitActionComponent()`) - which the default
    `CMD_ACTIONMOD_PICKUP_HANDS` command's animation apparently never fires
    for a no-target self-action. `OnEndServer()`, by contrast, is called
    unconditionally by `AnimatedActionBase.End()` on every single-use
    action's completion (`UA_FINISHED` or `UA_CANCEL`), regardless of
    whether any animation notify ever fired. Confirmed via vanilla's own
    `ActionZoomIn.c` - identical shape to this board action
    (`ActionSingleUseBase`, `HasTarget() == false`, unmodified default
    command UID) - which itself uses `OnEndServer`, not `OnExecuteServer`.
    Fixed by switching to `OnEndServer`. **Lesson**: for a no-target
    self-action on an unmodified default command UID, prefer `OnEndServer`
    over `OnExecuteServer` unless a real precedent confirms the specific
    command UID's animation actually fires the notify event.
  - **A genuine vendor bug in DayZ-Expansion-Core's own
    `ExpansionWorldObjectsModule::GetObjectFromFile()`.** Reproduced live
    (during an earlier design where this CLI briefly spawned the board
    itself via `expansion/objects/*.map`, since abandoned - see below) as a
    `VM Exception: Index out of bounds` in `GetObjectFromFile` at
    `token = token[5]`. Root cause: when an `expansion/objects/*.map`
    line's 5th ("Takeable") pipe-field is the _exact_ literal string
    `"true"` or `"false"` with no suffix, that vendor code unconditionally
    indexes character position 5 of it - out of bounds for both 4- and
    5-character strings. Since this is vendor code we can't patch, worth
    remembering for _any_ future `expansion/objects/*.map` entry this
    project generates: use a directive like `canbelooted:false` instead of
    a bare `true`/`false` literal.
  - **Multiple look-at-target attempts, all abandoned: `tac_board.p3d` has
    zero geometry LOD, so crosshair-raycast targeting is structurally
    impossible for it.** Tried twice - once spawning a CLI-generated
    `ExpansionSign_Color` (a real placeable prop with actual collision) at
    a hardcoded position, once trying to reuse the player's own
    hand-placed `StaticObj_Furniture_tac_board` - before the player decided
    they'd rather place/orient the board prop entirely by hand via
    DayZ-Editor with no exact position known to the CLI at all, using
    `StaticObj_Furniture_tac_board` specifically. Confirmed live via the
    server's own RPT log that this exact prop (and `@BuilderItems`'
    visually-identical `bldr_tac_board` variant) emits `Warning: No
components in ...tac_board.p3d:geometry` - with no geometry, vanilla's
    own `CCTObject` target condition (which relies on `target.GetObject()`
    resolving a real raycast hit) can never resolve this object at all, so
    a look-at trigger is structurally impossible for it, not a scripting
    bug. Settled on a **pure proximity scan** instead: `ActionCondition()`
    checks the player is within `TRADER_RADIUS` of the trader city, then
    calls `GetGame().GetObjectsAtPosition3D(player.GetPosition(),
BOARD_SCAN_RADIUS, ...)` (vanilla's own nearby-object query, confirmed
    via `ActionCreateGreenhouseGardenPlot.c` - a pure position-radius
    lookup, unaffected by missing geometry) and checks whether any
    returned object's `GetType()` matches `BOARD_CLASSNAME`. This also
    means the board's exact position/orientation genuinely doesn't matter
    to either this addon or the CLI - only its classname does - so the
    player is free to move/re-place it in DayZ-Editor at any time with zero
    code changes needed.

  **Follow-up session: two more real bugs found/fixed, plus a design
  change to the restock algorithm itself:**

  - **`SaveState()` never actually wrote `TraderRestock.json` - the parent
    folder didn't exist.** Confirmed by searching the entire filesystem for
    `TraderRestock.json` after many real server boots (including boots that
    definitely ran `Tick()`/`SaveState()`) and finding it nowhere. Root
    cause: `JsonFileLoader.JsonSaveFile()` silently no-ops if
    `$profile:DZSurvivalServerPack` doesn't already exist - it does **not**
    create it. This is exactly why closing the server early always appeared
    to "reset" the restock timers: every restart's `LoadState()` found no
    file and started from a fresh, empty state. Fixed by calling
    `MakeDirectory(STATE_DIR)` unconditionally before every `JsonSaveFile()`
    call (the same, vanilla-confirmed idempotent pattern
    `CameraToolsMenu.c` uses before its own saves).
  - **Restock algorithm redesigned: one random item per category per
    interval, not every item in the category.** The original design bumped
    every single item in a category on every tick once its interval
    elapsed (e.g. every car model +1 every 24h) - meaning "1 car a day"
    actually meant "1 of every car model a day", growing total vehicle
    availability much faster than the name implied once more than one
    model existed. `TickInternal()` now tracks `LastRestockUnix` **per
    category** (not per item), and once a category's interval has elapsed,
    builds a list of items in it currently below their own
    `MaxStockThreshold` and restocks exactly one, chosen via
    `array.GetRandomElement()` (a real DayZ-Expansion-Market-confirmed
    API). `BuildBoardStatusText()` was updated to match (one
    `LastRestockUnix` entry per category instead of aggregating per-item).
  - Compile error hit while making the above change, worth remembering:
    **EnforceScript does not block-scope local variables the way C-like
    languages do** - declaring `int currentStock;` twice in the same
    function (once inside a `foreach` loop, once afterwards) crashed the
    `World` module compile with `Multiple declaration of variable
'currentStock'`, even though the two declarations were in clearly
    separate `{ }` blocks. Fixed by giving the second one its own name
    (`chosenStock`).
  - Added a second COT command, `/restock reset`, for wiping trader stock
    back to 0 during testing (see `DZSurvivalTraderRestock.ResetStock()`
    and `DZSurvivalTraderRestock_COTCommand.c`'s `Command_RestockReset`) -
    only ever touches the categories referenced by this addon's own rules
    (`s_Rules`), never any other Market category.
  - Dropped the `Boats` restock rule and removed `Boats` from the Vehicle
    Dealer's own sellable categories (`src/traders.ts`'s
    `CUSTOM_TRADER_IDENTITIES`) - no navigable water anywhere near this
    trader city, so boats were never actually purchasable/usable there.
  - **A much more serious bug, found while double-checking "does restocking
    ever affect player-added stock": `ensureCustomZone()` in
    `src/traders.ts` was silently wiping every player's sold-in trader
    stock on every single server restart, unrelated to this addon
    entirely.** It unconditionally rebuilt the whole zone JSON body
    (including a hardcoded `Stock: {}`) and overwrote the file whenever the
    serialized text differed from what was already on disk - which it
    always will once the live server has actually run and
    `ExpansionMarketTraderZone.Save()` has populated real stock there
    (confirmed live: 1800+ real stock entries existed in
    `expansion/traderzones/CustomTrader.json` before the fix). Since
    `ensureCustomZone()` runs on every server start (via
    `ensureCustomTrader()` in `doStart()`), this meant **every restart
    reset the entire trader city's stock to nothing**, including anything
    a player had sold in. Fixed by loading the existing zone file (if any)
    and only ever patching the handful of fields this CLI actually owns
    (`m_DisplayName`/`Position`/`Radius`/`BuyPricePercent`/
    `SellPricePercent`) onto it, leaving `Stock` (and `m_Version`)
    completely untouched. Verified live: re-ran `ensureCustomTrader()`
    against the real 1807-entry live zone file and confirmed the `Stock`
    map came out byte-for-byte identical afterwards.
  - The normal restock `Tick()`/`TickInternal()` itself was already safe by
    design and needed no change here: it only ever _raises_ the one chosen
    item's stock (`Math.Min(cap, current + AmountPerTick)`), never lowers
    or clears anything, and never touches any item it didn't choose - so a
    player's sold-in stock on any other item is never affected by a normal
    tick. `/restock reset` remains the one deliberate exception (a manual,
    admin-only testing command that zeroes everything in its managed
    categories on purpose - not something that runs automatically).
  - **Two new restock rules added, each pooling several Market categories
    into one "pick one random item across all of them" pool** (previously
    every rule was tied to exactly one category) - `DZSurvivalTraderRestockRule`
    now holds a `Label` (used as the persisted state key, e.g. "Guns") plus
    an `array<string> CategoryNames`, and `TickInternal()`/`ResetStock()`/
    `BuildBoardStatusText()` all gather eligible items across every
    category in the rule's pool before picking one:
    - **"Guns"** - every firearm category (`Assault_Rifles`,
      `Submachine_Guns`, `Rifles`, `Pistols`, `Sniper_Rifles`, `Shotguns`,
      `Launchers`, `Crossbows`) - one random gun every 6h.
    - **"Clothing"** - every wearable clothing/gear category _except_
      `Ghillies` (deliberately excluded, see below) - one random clothing
      item every 2h.
  - **Ghillie suits made deliberately rare: zero starting stock, never
    auto-restocked, only ever obtainable by a player selling one in.**
    `src/market.ts`'s new `RARE_CATEGORIES` sets `Ghillies`' `InitStockPercent`
    to 0 and `MaxStockThreshold` to 3 (still capped, so one seller can't
    flood the market), and the new "Clothing" restock rule above
    deliberately excludes it. Also manually zeroed out the _already-live_
    stock for all 16 ghillie classnames+color-variants
    (`ghilliehood_tan`/`_woodland`/`_mossy`/`_winter`, same for
    `ghillietop`/`ghilliesuit`/`ghilliebushrag`) in the running zone file -
    worth remembering for next time: DayZ-Expansion-Market's per-item
    `Variants` list (color variants sharing one base item's price/stock
    config) means a category's own `Items` array can look much shorter
    than the number of distinct classnames actually tracked in a live
    zone's `Stock` map.
  - **Broader stock rebalance across every remaining category the custom
    traders actually sell** (previously only weapons/ammo/vehicle-parts/
    vehicles were tuned - everything else, including all clothing, food,
    medical, and base-building categories, was still at vanilla's blanket
    75% `InitStockPercent`/100 `MaxStockThreshold`). `src/market.ts` now
    has dedicated tiers for `CLOTHING_CATEGORIES` (cap 15, init 15%),
    `CONSUMABLE_CATEGORIES` - food/drinks/medical (cap 30, init 30%), and
    `UTILITY_CATEGORIES` - tools/base-building/navigation/etc. (cap 15,
    init 20%), plus folded `Melee_Weapons` into the existing weapon tier
    and `Batteries` into the existing vehicle-parts tier. Applied live:
    42 category files updated in one pass.
  - A related, separate bug (not a restock issue) was root-caused the same
    session but requires the _player_, not this addon, to act: buying a
    helicopter/car can fail with "no air/land spawn space" because
    `ExpansionTraderBase.HasVehicleSpawnPosition()` (in
    `DayZ-Expansion-Market`'s own `ExpansionTraderBase.c`) only ever
    searches `MarketSettings.json`'s global `LandSpawnPositions`/
    `AirSpawnPositions` lists for a clear spot within
    `MaxVehicleDistanceToTrader` of the _buying_ trader NPC - and the
    5-6 shipped defaults are all clustered near the vanilla trader city,
    nowhere near this project's custom one. `src/traders.ts`'s
    `ensureCustomVehicleSpawnPositions()` (new this session) adds
    scouted, custom entries near the Vehicle Dealer NPC once
    `CUSTOM_LAND_VEHICLE_SPAWN_POINTS`/`CUSTOM_AIR_VEHICLE_SPAWN_POINTS`
    are filled in (still empty as of this writing - needs real in-game
    scouting, see that file's own TODO comment). Separately, a vehicle
    purchase also spawns its default attachments (wheels, doors, battery,
    etc.) each drawing from the shared `Vehicle_Parts` Market category's
    own stock - `src/market.ts` previously capped that category as tightly
    as ammo/optics (15 max, 10% init), easily insufficient for a single
    car needing 4+ of the same wheel classname at once. `Vehicle_Parts` now
    has its own, more generous cap (40 max, 50% init) instead of sharing
    the ammo/attachment bucket.

  This session also hardened `src/modVerify.ts`'s pre-publish check itself:
  it previously only watched the growing `.RPT` log against a fixed-length
  poll, which produced a **confirmed live false positive** - the ternary-
  operator bug above was once reported "compiled cleanly" because a slow
  boot that run meant script compilation hadn't even been reached yet when
  the poll window closed. Fixed by also watching for a dedicated
  `crash_<timestamp>.log` (written directly by the engine's crash handler,
  confirmed more reliable than the RPT for a hard/unhandled-exception
  crash, whose buffered RPT writes can be lost) and by breaking out of the
  poll loop immediately once the child process itself exits, rather than
  waiting for the next fixed-interval tick.

  **Follow-up session: full stock/restock rebalance - category
  consolidation, per-item rarity tiers, and a unified restock algorithm.**
  The trader had grown to ~50 narrow Market categories (`Assault_Rifles`,
  `Submachine_Guns`, `Helmets`, `Caps`, ... - DayZ-Expansion-Market's own
  defaults) each sharing one flat cap per broad group (all weapons capped
  the same, all clothing capped the same, etc.) and only 4 hand-picked
  categories/pools (`Helicopters`, `Cars`, `Guns`, `Clothing`) were ever
  auto-restocked at all. This replaced that with:

  - **12 merged categories, split Military/Civilian for weapons and
    clothing.** `src/market.ts`'s `MERGED_CATEGORIES` reads each of the
    original ~50 source category JSON files (still generated by
    DayZ-Expansion-Market, now otherwise unused/orphaned) and writes new,
    consolidated category files: `Guns_Military`, `Guns_Civilian`,
    `Weapon_Attachments`, `Explosives`, `Clothing_Military`,
    `Clothing_Civilian`, `Consumables`, `Medical` (in-place, no merge
    needed), `Utility`, `Vehicles` - plus `Ghillies` and
    `Vehicle_Parts`/`Batteries`, both deliberately left outside this system
    (see below). `src/traders.ts`'s `CUSTOM_TRADER_IDENTITIES` now
    reference these instead of the original ~50. Each item's own price
    fields (`MinPriceThreshold`/`MaxPriceThreshold`/`SellPricePercent`/
    `Variants`/`SpawnAttachments`/...) are copied verbatim from its source
    category - only `MaxStockThreshold` is ever overwritten. The
    Military/Civilian split for clothing/guns was done by hand, reading
    every classname in every source category (e.g. `platecarriervest`/
    `chestplate`/`gasmask`/`nvgheadstrap` -> Military; `tshirt_blue`/
    `jeans_blue` -> Civilian). Pistols were deliberately kept all-Civilian
    (sidearms are already DayZ's weakest weapon tier regardless of make),
    and `b95`/`scout_chernarus` were moved out of the military sniper
    group into `Guns_Civilian` (they're civilian scoped hunting rifles,
    not military DMRs).
  - **Per-item rarity tiers, not a flat cap per category.** Every item is
    now individually assigned Common (cap 25)/Uncommon (cap 10)/Rare
    (cap 4)/Legendary (cap 1), based on how coveted that specific item is -
    e.g. within `Clothing_Military`, a boonie hat is Uncommon but a plate
    carrier vest or NVG head strap is Legendary; within `Weapon_Attachments`,
    plain ammo is Common but an ACOG/PSO scope is Rare and a night-vision
    scope is Legendary. `InitStockPercent` stays one value per merged
    category (DayZ-Expansion-Market has no per-item init percent), but
    since it's applied as a _percentage of each item's own cap_, one flat
    percentage still yields "Legendary items start near 0, Common items
    start with a handful" automatically.
  - **The restock addon now derives an item's tier from its own live
    `MaxStockThreshold` at runtime** (`TierForCap()` in
    `DZSurvivalTraderRestock_Module.c` - <=1 Legendary, <=4 Rare, <=10
    Uncommon, else Common) instead of needing its own duplicated
    classname->tier lookup table. Keep this file's tier caps and that
    function's thresholds in sync if either ever changes.
  - **Restock algorithm replaced: one unified, tier-driven scanner across
    every managed category, instead of 4 fixed-interval rules.** The
    previous `Helicopters +1/168h`, `Cars +1/24h`, `Guns +1/6h`,
    `Clothing +1/2h` rules are gone. Every real hourly tick now scans
    every item in `s_ManagedCategories` (the 10 merged categories above,
    minus `Ghillies`/`Vehicle_Parts`/`Batteries`), and for each item below
    its own cap AND past its own tier's cooldown since it was last
    restocked (Common: no cooldown; Uncommon: 6h; Rare: 24h; Legendary:
    168h), computes a weight `(1 - currentStock/cap) * tierWeight`
    (`tierWeight` 1.0/0.5/0.2/0.05 for Common/Uncommon/Rare/Legendary).
    Up to 3 items are then picked per tick via weighted, without-
    replacement sampling and each raised by +1 stock. This is
    **deliberately probabilistic, not an exact schedule** - a Legendary
    item's 168h cooldown and 0.05 weight mean it still has to win a
    weighted draw against every other simultaneously-eligible item, so it
    averages out to _roughly_ once a week rather than landing on a precise
    cadence. This also means whole vehicles no longer have a guaranteed
    dedicated cadence of their own - a Legendary helicopter now competes
    for picks with every other Legendary item (top-tier optics, plate
    carriers, NVG mounts, etc.) at the same weight, not just other
    vehicles. Per-item `LastRestockUnix` timestamps persist across
    restarts in the same `TraderRestock.json` as before (the state file's
    shape didn't change, only what its keys mean - old rule-label keys
    like `"Guns"`/`"Clothing"` are simply left unused/orphaned in an
    upgraded file, no migration needed). `ResetStock()` and
    `BuildBoardStatusText()` were both rewritten to match: reset now zeroes
    every item across the 10 managed categories and clears the whole
    cooldown map; the board now reports one line **per rarity tier**
    (aggregated across every managed category) rather than one line per
    old rule, since a single merged category can now contain items from
    more than one tier.
  - Two EnforceScript compile errors caught by the pre-publish verification
    boot while making this change, worth remembering for next time:
    - **A `switch` statement with a `default: return ...` case is not
      recognized by the compiler as covering every path** - functions
      using this pattern failed with "No return statement in function
      returning non-void", even though every possible case textually
      returned something. Fixed by rewriting as a plain `if`/`else if`/
      final-`return` chain instead of `switch`/`case`/`default`.
    - **The same "no block-scoped locals" rule from the earlier restock
      redesign (see above) bit again**: `BuildBoardStatusText()` declared
      a local named `tier` inside a `foreach` block, then reused the same
      name as a `for` loop counter later in the same function - "Multiple
      declaration of variable 'tier'" even though the two blocks never
      overlap. Fixed by renaming the second one (`tierIndex`).
  - Verified safe the same way as the earlier `ensureCustomZone()` fix:
    backed up the live `CustomTrader.json` before applying any of this,
    re-ran the updated `tuneExpansionMarket()`/`ensureCustomTrader()`
    against the real profile, and confirmed the 1807-entry `Stock` map
    came out byte-for-byte identical afterwards (merging/renaming/
    re-tiering category _template_ files never touches the live zone's
    per-classname stock, which is keyed purely by lowercased classname,
    independent of which category file that classname happens to live in
    now).

  **Follow-up session: finer-grained category split - guns separated into
  ammo/attachments, clothing split by body slot, base building carved back
  out of Utility.** Building on the Military/Civilian tier rebalance above,
  the category list was reorganized again:

  - **Clothing split by body slot AND Military/Civilian - 10 categories
    instead of 2.** `Clothing_Military`/`Clothing_Civilian` became
    `Clothing_Head_Military`/`_Civilian`, `Clothing_Top_Military`/
    `_Civilian`, `Clothing_Bottom_Military`/`_Civilian`,
    `Clothing_Back_Military`/`_Civilian`, and `Clothing_Misc_Military`/
    `_Civilian`. Items are placed where they'd naturally be worn: Head =
    `Helmets`/`Caps`/`Hats_And_Hoods`/`Masks`/`Eyewear`; Top =
    `Coats_And_Jackets`/`Shirts_And_TShirts`/`Sweaters_And_Hoodies`/
    `Vests`/`Blouses_And_Suits`; Bottom = `Pants_And_Shorts`/
    `Boots_And_Shoes`/`Skirts_And_Dresses`; Back = `Backpacks` only (the
    literal DayZ "Back" equipment slot); Misc = everything that doesn't
    cleanly map to a slot - `Gloves`/`Armbands`/`Bandanas`/`Belts`/
    `Holsters_And_Pouches`. Each source category's existing Military/
    Civilian classname split (see the rebalance above) carries over
    unchanged - only how they're grouped into output category files
    changed, not which items are Military vs Civilian.
  - **Guns split into Ammo/Attachments, both Military/Civilian for
    attachments.** `Weapon_Attachments` (which had lumped ammo,
    magazines, muzzles, handguards, buttstocks, bayonets, and optics all
    into one category) became three: `Gun_Ammo` (`Ammo`/`Ammo_Boxes` -
    deliberately NOT split Military/Civilian, since calibers aren't
    inherently either), `Gun_Attachments_Military`, and
    `Gun_Attachments_Civilian`. The Military/Civilian split for
    attachments is platform-based (which weapon(s) they actually fit):
    AK/M4/AUG/MP5/FAL/SVD-pattern magazines/muzzles/handguards/
    buttstocks/bayonets/optics are Military; pistol/hunting-rifle/
    shotgun-pattern ones are Civilian. `Handguards` has no Civilian group
    at all - every entry in that source category is AK/M4/MP5-pattern.
    Optics keep their existing Rare/Legendary overrides (ACOG/PSO-pattern
    scopes, the night-vision-capable `starlightoptic`) - all landed in
    `Gun_Attachments_Military` since every one of them is a magnified
    combat/DMR optic on a military-pattern weapon.
  - **Two DMR-pattern rifles reclassified from Civilian to Military.**
    `svd_wooden` and `m14` were sitting in the generic `Rifles` source
    category (which defaults to `Guns_Civilian`), but both are
    designated-marksman-rifle-pattern weapons that belong with the other
    military-grade sniper/DMR guns - moved to `Guns_Military` at Rare
    tier (one step below the true `svd`/`vss`/etc. Legendary snipers,
    since they're semi-auto DMRs rather than bolt-action military
    snipers). Their magazines (`mag_svd_10rnd`, `mag_m14_10rnd`,
    `mag_m14_20rnd`) moved with them into
    `Gun_Attachments_Military`.
  - **`Base_Building` carved back out of `Utility`.** Pulls `Tents`,
    `Locks`, `Containers`, `Flags`, `Furnishings`, and a hand-picked subset
    of `Supplies` that's actually construction/fortification material
    (`rope`, `metalwire`, `epoxyputty`, `ducttape`, `woodenplank`,
    `metalplate`, `nailbox`, `nail`, `barbedwire`, `camonet`, `hescobox`,
    `powergenerator`, `tripod`) into their own category. The rest of
    `Supplies` (paper, handcuffs, gas canisters, etc. - not building-
    related) stays in `Utility` alongside `Gardening`/`Tools`/`Kits`/
    `Navigation`/`Electronics`/`Lights`/`Fishing`/`Spraycans`/`Knifes`/
    `Liquids`.
  - Net effect: the Everything ("General Store") trader now sells across
    21 categories (`Guns_Military`, `Guns_Civilian`, `Gun_Ammo`,
    `Gun_Attachments_Military`, `Gun_Attachments_Civilian`, `Explosives`,
    the 10 `Clothing_*` categories, `Ghillies`, `Consumables`, `Medical`,
    `Base_Building`, `Utility`) instead of the original ~50 or the prior
    session's 10 - a middle ground that keeps the in-game trader menu
    browsable while giving clothing/guns real body-slot/type granularity.
    `s_ManagedCategories` in `DZSurvivalTraderRestock_Module.c` was
    updated to match (still excludes `Ghillies`/`Vehicle_Parts`/
    `Batteries`, same as before).
  - Verified the same way as every other category change in this file:
    checked every merged category's item count against its un-merged
    source categories' combined counts (835 total items across all 21,
    zero duplicates, zero dropped) before touching the live trader, then
    re-ran `ensureCustomTrader()` against the real profile and confirmed
    the live `Stock` map was unaffected (the only 3 differences found were
    genuine, expected +1 restocks from a real tick that happened to fire
    during the publish pipeline's own verification boot - not data loss).

  **Follow-up session: closed the "found an item, can't sell it anywhere"
  gap - a full audit against the mission's real economy, not just the
  Market categories.** Prompted by a report that `Consumables` was missing
  meats - turned out to be one symptom of a much bigger structural issue.

  - **Root cause**: DayZ-Expansion-Market's `profiles/ExpansionMod/Market/
*.json` category files are generated **once**, the first time the
    mission ever loads, from whatever classnames existed in the economy at
    that moment. They are never re-scanned afterwards. `src/market.ts`'s
    merge can only ever copy classnames that already exist in one of those
    source files - so any classname added to the economy later (a mod
    installed/updated after that first boot, or simply a color/skin
    variant the snapshot never included in the first place) has no source
    record to copy from and silently has nowhere to sell, no matter how
    many times the merge re-runs.
  - **Audit method**: parsed every `<type name="...">` out of the mission's
    live, merged `db/types.xml` (already the union of vanilla + every
    mod's own types - see `modTypes.ts`/`ncpr.ts`/`moreCars.ts`/
    `wildlifeTerritories.ts`) - 3,615 entries - and cross-referenced every
    classname against every `ClassName` currently present in **any** of the
    89 files under `profiles/ExpansionMod/Market/` (not just the 21 merged
    ones - also the original, otherwise-orphaned source categories).
    Excluded the ~304 entries that were never meant to be sellable
    (zombies, animals, vehicle wrecks, world-decor props like
    `Land_*`/`StaticObj_*`). That left **2,446 real, spawnable/craftable
    inventory items with no trader anywhere** - among them almost the
    entirety of Alevarics-Clothing-Overhaul (`ALV_*`, ~336 items),
    Namalsk-Survival (`nm_*`, ~400 items), Risus-Bases' building kits
    (`bl_*`, ~90), Gas-Mask-Overhaul (`BVP_*`), the Quiver mod's variants
    (`seis_*`), Custom-Keycards (`evg_*`), several MBM/UAZ vehicle-part
    color variants, loose currency/wallet classnames, and - the item that
    started this - a large chunk of meat/food (`HorseSteakMeat`,
    `HumanSteakMeat`, `DeadChicken_*`, all of Old-Food's `Old_*` cans,
    etc.) plus plain color reskins of items that already sell fine
    (most `Armband_*`/`Poncho_*`/`Shemagh_*` variants, whole `AK74`/
    `AKS74U`/`SCAR-H` color variants, backpack color variants, ...).
  - **Fix - `src/marketGapFill.ts` + `src/data/marketGapFill.json`**: a new,
    idempotent, additive-only step that runs right after
    `tuneExpansionMarket()`. For each of the 2,446 classnames it clones a
    full existing item record (every price/spawn field verbatim - the same
    "copy verbatim, only override `MaxStockThreshold`" approach
    `market.ts`'s own merge already uses) rather than inventing prices from
    scratch, in one of two ways:
    - `template`: 770 items have an exact sibling already sellable (found
      by stripping the trailing color/variant segment off the classname,
      e.g. `Armband_Bear` -> `armband_apa`, `AK74_Black` -> `AK74`) - the
      clone inherits that sibling's exact tier/price/category, so it lands
      in whichever merged category the sibling is already in.
    - `category` + `tier`: the remaining 1,676 items are whole new item
      families with no real sibling - hand-classified (by classname
      keyword/prefix pattern, e.g. `bl_*` -> `Base_Building`,
      `nm_Sketch_*`/`evg_*`/`cw_*` -> `Utility`, `ALV_*` slot+Military/
      Civilian split by keyword) into one of the 21 tiered categories (or
      `Ghillies`/`Vehicle_Parts`, which get force-capped to their fixed
      stock ceiling like every other item in those categories, bypassing
      the normal tier table) - cloned from the first existing item already
      in that destination category as an in-family price template.
  - Idempotent: every run re-derives from the _current_ state of
    `profiles/ExpansionMod/Market/*.json` and only ever appends a
    classname that isn't sellable anywhere yet, so re-running never
    touches an item once added (and never resets stock a player has
    already sold into).
  - Verified live: sellable classname coverage went from 942 to 3,387 out
    of 3,615 total types (the remaining 314 are the confirmed-excluded
    zombies/animals/wrecks/decor - i.e. everything actually meant to be
    sellable now is), `Ghillies` stayed capped at 3 and `Vehicle_Parts` at
    40 for the newly-added items too, and the live `CustomTrader.json`
    `Stock` map came back byte-identical - confirmed via a real diff, not
    just re-running the merge.
  - No `.c` addon changes needed - `DZSurvivalTraderRestock_Module.c`
    already scans every item live out of each managed category every tick,
    so the new items are picked up automatically on the next restock. This
    is a pure `src/`-tooling + data change (no Workshop-distributed code
    touched), so it doesn't need a serverpack publish - just applying it
    live via `tuneExpansionMarket()`/`ensureMarketGapFill()` against the
    real profile, same as any other `market.ts` change.

  **Second follow-up session: four cleanup requests against the gap-fill
  above, plus one genuine gap-fill bug found and fixed along the way.**

  - **`nm_` (Namalsk-Survival) items removed from `Base_Building`.** The
    original gap-fill classified 62 Namalsk sign/canvas/tent reskins
    (`nm_Canvas_1..20`, `nm_Craftsign_1..15`, `nm_*Tent_*`, `nm_BarbedWire_
deployed`, `nm_CamoNet_deployed`, `nm_spikebarrier`, ...) into
    `Base_Building` - they show with no real display name/icon in the
    trader UI, so they're now permanently denylisted (see
    `MANUAL_EXCLUSIONS` in `src/marketGapFill.ts`).
  - **BoomLays-Things (`bl_`) kit-only enforcement.** ~35 `bl_` pallet-
    furniture classnames (`bl_pallet_table_l/m/s`, `bl_pallet_cabinet_l/m/
s/xs`, `bl_pallet_box_1-4`, `bl_pallet_bed_m/s`, `bl_painting_1-9`,
    `bl_workbench`, `bl_repairbench`, `bl_solar_panel`, `bl_greenhouse`,
    `bl_rain_collector`, `bl_stove_barrel`, `bl_trashcan`, `bl_old_fridge`,
    `bl_coffee_machine`, `bl_firewoodstorage`, `bl_logstorage`,
    `bl_anatolian_carpet_1/2`) are the **deployed world-object** form
    (confirmed via the mod's own script source, unpacked from
    `bl_pallet_table.pbo`: `class bl_pallet_table_l : bl_table`) - not a
    normal inventory item. Only their `_Kit` sibling (e.g.
    `bl_pallet_table_l_Kit : bl_table_prefab_Kit`) is the real carryable/
    purchasable item that deploys into the built form; buying the raw
    classname directly breaks it. All ~35 raw forms are now permanently
    denylisted too - their `_Kit` siblings are untouched/still purchasable.
    Items confirmed to have no `_Kit` counterpart at all (`bl_candy_*`,
    `bl_potatochips_*`, `bl_coffee_bag`/`bl_coffee_mug`, `bl_desk_lamp`,
    `bl_floor_lamp`, `bl_dieffenbachia`/`bl_ficus_bonsai`/`bl_monstera`/
    `bl_cercestis_mirabilis`, `bl_paint_tube`, `bl_extension_cable_reel`,
    `bl_small_spot`, `bl_pallet`, `bl_pallet_frame_solo`, `bl_repair_anvil`,
    `bl_old_crate`) were left alone.
  - **`bl_deposit_container` ("Your personal box") priced as a real,
    top-tier exclusive.** Confirmed via `bl_shared_data.pbo`'s
    `STR_CfgDepositContainer0` string and `bl_deposit.pbo`'s script source
    that this is a legitimate, self-contained purchasable placeable (spawned
    directly via `GetGame().CreateObject("bl_deposit_container", ...)` - no
    Kit dependency, unlike the furniture above), so it's kept sellable, not
    denylisted. It priced itself at a throwaway 3,060-5,105 with a bogus
    `Variants` list (an artifact of the original gap-fill's generic "clone
    the first item in the destination category" fallback happening to pick
    a colored tent) - now force-set every run to 9M-11M with `Variants`
    cleared and `MaxStockThreshold` capped at 1 (see `DEPOSIT_CONTAINER_*`
    constants in `src/marketGapFill.ts`). One physically placed in the
    trader city via DayZ-Editor + `deno task sync-editor` at
    `<7984.02, 221.09, 11303.8>` / orientation `<85.0887, 0, -0>`.
  - **Bug found and fixed: dead catch-all Market files blocked their own
    contents from ever reaching a live category.** DayZ-Expansion-Market
    ships both granular per-slot category files (`Backpacks.json`,
    `Coats_And_Jackets.json`, ...) AND a few fatter catch-all files
    (`Clothing_Military.json`, `Clothing_Civilian.json`,
    `Weapon_Attachments.json` - despite the name, this one is actually just
    ammo/ammo boxes) that duplicate much of the same content under a
    different grouping. `market.ts`'s merge never reads from these three -
    confirmed no `source:` group references them, and neither the
    `Everything` nor `Vehicle` trader identity's `Categories` list includes
    them, and `expansion/traders/` only has one NPC file (`CustomTrader
.map`) so none of DayZ-Expansion-Market's 17 default trader identities
    that _would_ reference them have an NPC either - they're pure dead
    weight. `ensureMarketGapFill()`'s "is this classname already sellable
    somewhere" check couldn't tell a dead file from a live one, though, so
    any gap-fill classname whose name (or template sibling) happened to
    already sit in one of these three dead files was silently skipped
    forever, never reaching the real, live category it should have. Fixed
    by excluding all three (`DEAD_MARKET_FILES` in `src/marketGapFill.ts`)
    from the ownership-tracking pass - their contents are now treated as
    invisible for "already sellable" purposes (the files themselves are
    left alone, untouched, in case DayZ-Expansion-Market expects them to
    exist).
  - **Investigated "only 2 military bags" report - confirmed working as
    designed, not a bug.** `Clothing_Back_Military` is deliberately curated
    via `market.ts`'s `MIL_BACKPACKS` allowlist to 9 hand-picked "true
    military" backpacks (`smershbag`, `assaultbag_black`, `coyotebag_brown`,
    `alicebag_green`, `duffelbagsmall_camo`, `armypouch_beige`,
    `attack2bag_black`, plus 2 more `assaultbag_winter`/`coyotebag_winter`
    variants already grouped under `assaultbag_black`/`coyotebag_brown`'s
    own in-game color-variant picker) - the gap-fill only ever added 2 _new_
    ones on top (`ALV_MilitaryBag_Black`/`Tan`). Every other camo-look
    backpack color variant (`AssaultBag_Green`/`Ttsko`, `CoyoteBag_Green`,
    `Attack2Bag_Green`/`Ttsko`/`Yeger`, `AliceBag_Black`/`Camo`, ...) is
    intentionally routed to `Clothing_Back_Civilian` instead by that same
    allowlist's `exclude:` counterpart - confirmed they're already sellable
    there. If more of these should count as "military", that's a curation
    change to `MIL_BACKPACKS` in `src/market.ts`, not a gap-fill bug.
  - Applied live via the same `tuneExpansionMarket()` + `ensureMarketGapFill
()` sequence as the original gap-fill, verified: `Base_Building.json`
    item count dropped from 271 to 174 (97 = 62 `nm_` + 35 `bl_` raw forms
    removed), zero `nm_`/raw-`bl_`-non-Kit classnames remain, `bl_deposit_
container` reads `MinPriceThreshold: 9000000, MaxPriceThreshold:
11000000, MaxStockThreshold: 1, Variants: []`, and the live
    `CustomTrader.json` `Stock` map was diffed before/after with no
    unexpected changes. No `.c` addon changes, no serverpack publish
    needed - pure `src/`-tooling + data.

  **Third follow-up session: three reported trader-economy bugs, all
  root-caused and fixed (one data-only, one a latent data-integrity guard,
  one a real addon/`.c` fix requiring republish).**

  - **`BVP_NailGun`/`BVP_NailGun_Mag` miscategorized under Clothing Head.**
    An earlier gap-fill manifest entry in `src/data/marketGapFill.json`
    lumped both into a `Clothing_Head_Military` group alongside gas masks.
    Split into their own groups: `BVP_NailGun` (a `RifleBoltLock_Base`) now
    goes to `Guns_Civilian` (Uncommon), `BVP_NailGun_Mag` (a
    `MagazineStorage`) now goes to `Gun_Attachments_Civilian` (Uncommon).
    Verified live: neither classname remains in `Clothing_Head_Military.json`.
  - **Bug found and fixed: live trader stock could get stuck ABOVE the
    current cap, apparently hiding well-stocked items in the trader UI.**
    A prior tier-rebalance session lowered many items' `MaxStockThreshold`
    in the merged Market category files, but nothing ever _lowers_ the
    live `Stock` value already saved in `CustomTrader.json` to match - so
    1,002 of 2,717 managed items (37%) were sitting with `Stock` above
    their own current cap (e.g. `deersteakmeat`/`porkcan`/`tunacan` at
    `Stock: 75` against a cap of `25`). This is undefined territory for
    DayZ-Expansion-Market's own trader UI and matched a report of common,
    perfectly-real items (deer meat, canned goods) appearing unavailable
    to buy while unrelated `Old_*` filler variants displayed normally.
    Fixed with a new `clampTraderStockToMarketCaps()` in `src/traders.ts`,
    called every server start (after `ensureCustomZone()`): reads the live
    `CustomTrader.json` `Stock` map and clamps any classname's stock down
    to its current cap, scanning only the 21 real merged category files
    (newly exported as `MANAGED_MARKET_CATEGORIES` from `src/market.ts`) -
    deliberately not the raw per-slot source files, which can carry stale/
    unrelated caps for the same classname under a different grouping.
    Verified live: zero over-cap items remain across all 21 managed
    categories after a full `tuneExpansionMarket()` + `ensureMarketGapFill
()` + `ensureCustomTrader()` pass; this never lowers or clears anything
    below its cap, so player-sold-in stock already within bounds is
    untouched.
  - **Bug found and fixed: the restock addon's flat pick-count starved the
    catalog once it grew large enough, permanently stalling ammo and gun
    optics.** `DZSurvivalTraderRestock_Module.c`'s `TickInternal()` picked
    a flat `MAX_RESTOCKS_PER_TICK = 3` items per real hourly tick, drawn
    from one shared weighted pool across every managed item in every
    managed category combined (not per-category) - a number tuned back
    when the catalog was much smaller. With ~2,717 managed items today,
    even a Common-tier item (weight 1.0, no cooldown) had a well-under-1%
    chance of being one of the 3 picks in any given hour - confirmed live
    via `CustomTrader.json`'s `Stock` map: every ammo type
    (`ammo_556x45`, `ammo_762x39`, `ammo_9x19`, ...) and most optics
    (`acogoptic`, `pso1optic`, ...) were stuck at `Stock: 1` indefinitely.
    Fixed by replacing the flat constant with a budget that scales with
    the currently-eligible pool each tick: `Math.Max(MIN_RESTOCKS_PER_TICK,
eligible.Count() / RESTOCK_FRACTION_DIVISOR)` (floor of 15, ~5% of the
    eligible pool per hour otherwise). `/restock now` (force tick) now
    tops up every currently-eligible item in one go instead of a flat 10,
    since cooldowns are already ignored on a forced tick anyway. Tier
    weighting/cooldowns are unchanged, so Rare/Legendary items are still
    far less likely to be picked and remain cooldown-gated - only the
    overall per-tick budget scales now. This IS a `.c` addon change -
    republished via `deno task publish-serverpack` (which also re-verified
    the pack still boots and compiles cleanly before uploading).

  **Fourth follow-up session: two Military/Civilian classification
  exceptions, a new dedicated Tools & Melee category, and a blanket nm\_
  denylist (up from a hand-picked list).**

  - **`Flaregun` (Signal Pistol) and `cz61` (CR-61 Skorpion) both moved to
    Civilian, by explicit request despite being combat weapons.**
    `Flaregun` was gap-filled into a `Guns_Military` manifest group
    alongside `M79`/`SCARH`/`SCARH_Black`/`Scout` (`src/data/
marketGapFill.json`) - split into its own group targeting
    `Guns_Civilian` (Uncommon), leaving the other four Rare-tier rifles in
    `Guns_Military`. `cz61` came from `Submachine_Guns`, which
    `src/market.ts` merged entirely into `Guns_Military` with no
    exclusion - added a new `SUBMACHINE_GUNS_CIVILIAN` allowlist (just
    `cz61`) and gave `Guns_Military`'s `Submachine_Guns` group an
    `exclude`, with a matching `only` group added to `Guns_Civilian`.
    Verified live: both classnames land only in `Guns_Civilian.json`, not
    `Guns_Military.json`.
  - **New `Tools_And_Melee` category, split out of `Utility` and
    `Guns_Civilian`.** Shovels/axes/hammers/wrenches/knives (`Tools`,
    `Knifes` source categories) used to sit in the generic `Utility`
    category (renamed from "Utility & Tools" to plain "Utility" now that
    Tools moved out) alongside navigation/electronics/lights/fishing/
    gardening gear, and baseball bats/pipes/maces/brass knuckles
    (`Melee_Weapons`) sat inside `Guns_Civilian` next to actual firearms.
    Added a 22nd merged category, `Tools_And_Melee` ("Tools & Melee"),
    combining all three source categories at their previous tiers (Tools/
    Knifes Uncommon, Melee_Weapons Common) - added to the Everything
    trader's category list (`src/traders.ts`) and to the restock addon's
    `s_ManagedCategories` (`DZSurvivalTraderRestock_Module.c`, republished).
    Verified live: `shovel`/`baseballbat`/`machete`/`sledgehammer`/etc. all
    land in the new `Tools_And_Melee.json`, and are gone from `Utility
.json`/`Guns_Civilian.json`.
  - **Namalsk-Survival's entire `nm_` item family blanket-denylisted by
    prefix, replacing a hand-picked, incomplete list.** The prior nm_
    cleanup (see the second follow-up session above) only denylisted the
    ~62 sign/canvas/tent classnames that had been gap-filled into
    `Base_Building` - but a closer look at `src/data/marketGapFill.json`
    found nm_ classnames gap-filled into a dozen+ _other_ categories too
    (`Clothing_Back_Civilian`, `Clothing_Bottom_Military`,
    `Clothing_Head_Military`, `Clothing_Top_Civilian`/`Military`,
    `Consumables`, `Explosives`, `Ghillies`, `Gun_Ammo`, `Guns_Civilian`,
    `Medical`, `Utility`, `Vehicle_Parts`, ...) - the project owner wants
    none of this mod's items sellable, full stop. Replaced the old
    Base_Building-only nm_ entries in `MANUAL_EXCLUSIONS`
    (`src/marketGapFill.ts`) with a blanket prefix rule instead
    (`isExcluded()`: true for any lowercased classname starting with
    `nm_`, or a hand-picked `bl_` non-Kit form as before) - both call
    sites (the per-run "strip any denylisted item still present" scan and
    the manifest addition loop) now go through this one function, so any
    nm_ classname `marketGapFill.json` might reference in the future is
    automatically covered too, with no list to keep up to date. Verified
    live: zero `nm_`-prefixed classnames remain anywhere under
    `profiles/ExpansionMod/Market/` after a full tune + gap-fill pass.
  - Applied live via the same `tuneExpansionMarket()` + `ensureMarketGapFill
()` + `ensureCustomTrader()` sequence as prior sessions (22 merged
    categories rebuilt, up from 21). The `Tools_And_Melee`/nm_ changes are
    data-only (`src/market.ts`/`src/marketGapFill.ts`/`src/traders.ts`),
    already live on next server start; the `s_ManagedCategories` addition
    is a `.c` addon change, republished via `deno task publish-serverpack`
    (verified the pack still boots and compiles cleanly before uploading).

  **Fifth follow-up session: a permanent, re-runnable trader-economy audit
  tool (`deno task audit-market`), plus the two real gaps it found on its
  first run.** Every prior session's gap-fill work was reactive - someone
  reports "I can't sell X", and it gets fixed one classname at a time. The
  project owner wanted durable confidence that nothing is missing or
  mispriced, without another manual pass. Added `src/marketAudit.ts`,
  wired into the CLI as menu option 15 / `audit-market` (writes a full
  report to `profiles/market-audit-report.txt`, gitignored like the rest of
  `profiles/`) since it's read-only and safe to run any time:
  - Bucket A (high confidence): every type in the mission's merged
    db/types.xml with a real category tag (weapons/tools/clothes/food/
    containers/explosives/vehiclesparts/lootdispatch - confirmed genuine
    inventory items, not vehicles/animals/decor) that isn't sellable
    anywhere and isn't already denylisted (marketGapFill.ts's isExcluded())
    or an obvious never-sellable pattern (Animal_/Zmb/wreck/Money_/Wallet_
    prefixes) - near-certain real gaps.
  - Bucket B (needs review): the same check for types with no category tag
    at all - a much noisier bucket (real vehicles, animals, zombie skins,
    wrecks, decor props) that isn't auto-flagged, just listed for a human
    to eyeball.
  - Bucket C (price/stock sanity): every currently-sellable item, checked
    for missing/non-positive price thresholds, Min greater than Max, and a
    MaxStockThreshold that doesn't match any valid cap for its category
    (TIER_MAX_STOCK/RARE_MAX_STOCK_CAP/VEHICLE_PARTS_MAX_STOCK_CAP, all now
    exported from market.ts for this purpose) - catches stray manual edits
    that bypassed the tier system.
  - "Sellable anywhere" is computed from traders.ts's
    CUSTOM_TRADER_IDENTITIES (now exported) - every category file either
    custom trader identity actually references - rather than hand-
    reconstructing the list from market.ts's separate category exports, so
    it can never silently drift out of sync with what a player can really
    buy/sell.
  - First run found 21 real Bucket-A gaps, all DayZ-Expansion holiday/event
    items (Candycane_ variants, GiftBox_Large_ variants, PaydayMask_
    variants, ChristmasHeadband_ variants, SantasHat/SantasBeard,
    PumpkinHelmet, AnniversaryBox, Anniversary_FireworksLauncher,
    UndergroundStash). Root cause:
    DayZ-Expansion-Market ships a fourth dead catch-all category file,
    Event.json, holding all of these by default - exactly like the three
    already-known-dead files (Clothing_Military/Clothing_Civilian/
    Weapon_Attachments, see the first follow-up session above) in that no
    trader identity's Categories list references it, but unlike those
    three, marketGapFill.ts's "already sellable somewhere" ownership scan
    wasn't treating it as invisible - so every seasonal item sitting only
    in Event.json looked "already covered" and was silently skipped
    forever, and worse, a few prior template-based manifest entries
    (WitchHood_Brown/Red, Candycane_Red/RedGreen/Yellow, etc.) had been
    resolving their template against Event.json and cloning their siblings
    into that same dead file - so those items were never actually sellable
    either, despite having a manifest entry that looked like it should
    work. Fixed by adding Event to marketGapFill.ts's DEAD_MARKET_FILES
    set, removing the now-fully-superseded old template-based entries for
    these families, and adding fresh category+tier entries in
    src/data/marketGapFill.json targeting real, live categories
    (Consumables, Clothing_Head_Civilian, Base_Building, Tools_And_Melee)
    for all of them, including WitchHood_Black/Brown/Red (same dead-file
    bug, caught as a skipped-with-no-template warning once Event was
    fixed).
  - Verified live: re-ran tuneExpansionMarket() + ensureMarketGapFill() +
    ensureCustomTrader(), then audit-market again - Bucket A dropped from
    21 to 0, Bucket C stayed at 0 (confirms the existing tier/pricing
    tuning was already sound), and Bucket B's remaining 43 items were spot-
    checked directly against db/types.xml (Fence/Watchtower/Bonfire/
    Cauldron/etc. all carry a SeasonalEvent usage tag or crafted/nominal
    decor-spawn markings, not real player-cargo loot) - confirmed nothing
    left to fix.
  - Data-only change (src/marketAudit.ts, src/main.ts, deno.json,
    src/marketGapFill.ts, src/data/marketGapFill.json) - no .c addon
    touched, so no republish needed. Applies on next server start the same
    way as any other market.ts/marketGapFill.ts tuning.

  **Sixth follow-up session: peer-price balance pass - found and fixed 3
  genuine tier/price mismatches, tuned for a hardcore survival server.**
  The audit tool above only checks structural correctness (missing price
  fields, invalid stock caps) - it can't catch an item whose _price_
  doesn't match the rarity tier it's stocked at, since both fields can be
  individually "valid" while still being wildly inconsistent with peers.
  Ran a one-off statistical pass (median price per category+tier, flagging
  anything >25x off) against the live, fully-gap-filled market and found:
  - `ammo_40mm_explosive`/`Ammo_40mm_Chemgas` (40mm underslung grenade
    launcher rounds) were Common tier (25 in stock) despite being priced
    ~100x every other Common-tier round (7,480 vs a 65-990 range) - moved
    to Rare tier (4 in stock) via a new per-item `overrides` entry on the
    `Ammo` source group in `market.ts`, matching both their real lethality
    and their already-correct price.
  - `zsh3pilothelmet_green`/`_black` (color variants of the ZSh-3 pilot
    helmet) were priced 135-270 despite being Rare tier (4 in stock) -
    ~40x below every Rare-tier peer, including their own base-color
    sibling `zsh3pilothelmet` (6,925-11,545, correctly priced). Same
    helmet, same rarity - repriced to match.
  - `budenovkahat_gray`/`shemag_brown` similarly underpriced (115-240) for
    their Uncommon tier (10 in stock, ~1,000-13,000 typical) - repriced to
    match a comparable peer already in the same tier (`militaryberet_un`/
    `nz` for the hat, `airbornemask` for the cloth face covering).
  - Added a `SourceGroup.priceOverrides` field (`src/market.ts`) alongside
    the existing per-item `overrides` (tier) field, applied the same way
    in `buildMergedItems()` - the same override mechanism, just for price
    instead of tier, so these corrections re-apply automatically on every
    tune (no manual one-off edit that a future rebuild would silently
    discard).
  - Also reclassified basic bulk base-building materials (`rope`,
    `metalwire`, `epoxyputty`, `ducttape`, `woodenplank`, `metalplate`,
    `nailbox`, `nail`) from Uncommon to Common tier, via the same
    per-item `overrides` mechanism on the `Base_Building` category's
    `Supplies` group - a hardcore survival server still needs base
    building to be achievable without a 10-in-stock bottleneck on plain
    nails, while genuinely substantial items in that same source group
    (`barbedwire`, `camonet`, `hescobox`, `powergenerator`, `tripod`)
    correctly stay scarcer.
  - Verified live: re-ran `tuneExpansionMarket()` + `ensureMarketGapFill()`
    - `ensureCustomTrader()`, confirmed each corrected item's new tier/
      price directly (`ammo_40mm_explosive`/`Ammo_40mm_Chemgas` both now
      stock=4; `zsh3pilothelmet_green`/`_black` now 6,925-11,545; `nail`
      etc. now stock=25), re-ran `audit-market` (still 0 gaps, 0 anomalies),
      and re-ran the peer-price outlier scan a second time - the only
      remaining outliers are legitimate by design (armbands/worm/paper are
      genuinely near-worthless cosmetics/bait, ammobox/barrel storage
      upgrades and bl_ furniture kits are genuinely premium crafted goods
      priced above plain raw materials).
  - Data-only change (`src/market.ts`) - no `.c` addon touched, so no
    republish needed.

  **Seventh follow-up session: guns start at zero stock, and the Common
  tier is gone from weapons entirely.** Reported symptom: some guns had
  what looked like infinite stock to buy. Direct inspection of the live
  trader zone file showed no gun actually had an unbounded stock value
  (every cap already matched a real tier, and live stock was only ever 1-3
  units per gun) - but `Guns_Civilian`'s `Shotguns` group was tiered
  Common (25 in stock), by far the highest cap any weapon had, which would
  have looked and felt effectively unlimited next to every other gun
  capped at 1/4/10. Root-caused and fixed:
  - Moved `Shotguns` from Common to Uncommon tier in `market.ts`'s
    `Guns_Civilian` definition - every gun in the trader (military or
    civilian) now caps out at 10 in stock at most, never 25. The
    reasoning: even the most basic civilian shotgun can kill a player, so
    no gun should regenerate as freely as a t-shirt.
  - Set `initStockPercent` to 0 for both `Guns_Military` and
    `Guns_Civilian` (was 10/25) - guns now start completely empty rather
    than pre-seeded with a starting supply.
  - Directly zeroed the 14 guns that already had a small amount of live
    stock in the current `CustomTrader.json` zone file, for a true clean
    slate immediately (not just for classnames added in the future).
  - This means every gun must now be earned - via the existing tier-driven
    restock addon (DZSurvivalTraderRestock_Module.c, unchanged - it
    already derives its own restock ceiling purely from each item's live
    MaxStockThreshold, so this tier change took effect with zero addon
    code changes) or sold in by another player. The restock addon's
    existing cooldown/weight system already does exactly what was asked
    for (stop adding stock once there's roughly 10, let players sell in
    more if they want) - Uncommon-tier guns cooldown 6h between restock
    ticks and cap at 10, Rare-tier 24h and cap at 4, Legendary ~168h and
    cap at 1.
  - Verified live: re-ran the tune/gap-fill/trader pipeline, confirmed
    every gun's cap is now one of 1, 4, 10 (no more 25s) and total live
    stock across both gun categories is 0, then re-ran audit-market
    (still 0 gaps, 0 anomalies).
  - Data-only change (`src/market.ts` plus a one-time direct edit to the
    live `CustomTrader.json` zone file) - no `.c` addon touched, so no
    republish needed. The tier/InitStockPercent changes apply
    automatically on every future server start; the zone-file zeroing was
    a one-time fix for the stock that already existed.

  **Sixth follow-up session: renamed the restock board's display grouping
  from abstract rarity tiers to named, player-recognizable categories.**
  The board previously showed one line per internal rarity tier
  (Common/Uncommon/Rare/Legendary), which opaquely mixed unrelated items
  together - e.g. "Rare" lumped rare guns, rare clothes, and rare gun
  attachments into one number, giving no sense of what was actually
  running low. The project owner wanted it clear "what stock is getting
  restocked and when" grouped the way a player actually thinks about the
  trader: Guns, Ammo & Attachments, Gear, Medicine, Cars, Helis, and Food &
  Supplies.

  - The underlying tier machinery (per-item stock cap, cooldown, and pick
    weight, all still derived from `MaxStockThreshold` via `TierForCap()`)
    is completely unchanged - this is a display/reporting change only, not
    a change to how often or how much anything actually restocks.
  - Added a new grouping layer in `DZSurvivalTraderRestock_Module.c`:
    `s_RestockGroups` (group display name -> the Market category
    fileNames it covers), `s_CategoryToGroup` (the reverse lookup used at
    scan time), and `s_GroupOrder` (a fixed display order, since map
    iteration order isn't guaranteed). Every one of the 23 managed
    categories maps to exactly one of the 7 named groups - no ambiguous
    "Other" bucket.
  - `Vehicles` was split into two separate merged Market categories so
    Cars and Helis could be reported (and, incidentally, restocked)
    independently: `Vehicles_Cars` (39 items) and `Vehicles_Helicopters`
    (5 items), replacing the old single `Vehicles` (44 items) file.
    Updated in `src/market.ts`'s `MERGED_CATEGORIES` and the Vehicle
    Dealer's `categories` list in `src/traders.ts`. The stale
    `profiles/ExpansionMod/Market/Vehicles.json` left behind by the split
    was deleted by hand (the tuning pipeline only ever writes/updates
    files for categories it currently knows about - it doesn't delete
    files for categories that no longer exist, so this is a one-time
    manual cleanup, not an ongoing concern).
  - `TickInternal()` now tracks a parallel `groups` array alongside the
    existing eligible/weight/tier arrays, and the per-restock admin log
    line now includes the group name (e.g. `Restocked m4a1 (Guns / Rare
tier): 2 -> 3 (cap 4)`) alongside the tier it already logged.
  - `BuildBoardStatusText()` was rewritten to aggregate by group instead
    of by tier - group-keyed maps (stock/cap/item-count/soonest-eligible),
    pre-seeded from `s_GroupOrder` so every group shows even when nothing
    in it is currently eligible, iterated in that fixed order for the
    final board text. Example board output shape:
    `Guns: 3/18 in stock (12 items, next eligible in 4h 20m)` /
    `Gear: 210/1660 in stock (166 items, fully stocked)` / etc, one line
    per group instead of per tier.
  - Verified: `deno task check` clean; re-ran the tune/gap-fill/trader
    pipeline (`Vehicles_Cars.json`/`Vehicles_Helicopters.json` confirmed
    to together hold all 44 items the old `Vehicles.json` had); re-ran
    `audit-market` (still 0 gaps / 43 review items / 0 anomalies,
    unchanged from before this session - a pure rename/split shouldn't
    and didn't change the audit's findings).
  - This touches the `.c` addon (`DZSurvivalTraderRestock_Module.c`), so
    unlike the mostly data-only fixes in prior sessions, this one needed a
    real republish: `deno task verify-serverpack` confirmed a clean
    compile against a real server boot, then `deno task publish-serverpack`
    uploaded the update to the existing Workshop item (auto-verifying the
    build again before upload, per the "verify on publish" safeguard added
    in an earlier session).

  **Seventh follow-up session: a staged (not-yet-attached) Boats category,
  plus two more permanent denylist entries found via Bucket B review.**

  - **New `Boats` merged category** (`src/market.ts`), built from
    DayZ-Expansion-Market's own untouched default `Boats.json` source (6
    items: `Boat_01_Black/Blue/Camo/Orange`, `expansionutilityboat`,
    `expansionlhd`) - this source file had sat completely unmerged/
    untuned since the project began (unlike `Cars`/`Helicopters`, `Boats`
    was never folded into the old `Vehicles` category at all). Tiered
    Rare (cap 4) except `expansionlhd`, a massive naval landing craft
    whose own default price (300-600 million) dwarfs every other boat by
    4+ orders of magnitude - promoted to Legendary (cap 1) via a
    per-classname `overrides` entry.
  - **Deliberately not wired to any trader yet** - the project owner is
    theming a spot in the trader city for boats but there's no navigable
    water nearby yet. The category is fully built/tuned and ready
    (`profiles/ExpansionMod/Market/Boats.json` now exists, tier caps
    applied) but stays invisible/unpurchasable until a future session adds
    `"Boats"` to some trader identity's `categories` list in
    `src/traders.ts`. Also deliberately left out of
    `DZSurvivalTraderRestock_Module.c`'s `s_ManagedCategories` for the same
    reason - no `.c` addon change was needed this session. Because it's
    unattached, `audit-market` still (correctly) lists the 4 `Boat_01_*`
    classnames in Bucket B - that's expected and will clear itself the
    moment a trader identity references `"Boats"`.
  - **Two more permanent "never sellable" denylist entries** added to
    `MANUAL_EXCLUSIONS` in `src/marketGapFill.ts`: `ContaminatedArea_Dynamic`
    (a dynamic contaminated-zone marker object) and `CrookedNose` (a
    Halloween decor prop). Confirmed via `db/types.xml` that both carry
    `count_in_cargo="0" count_in_player="0"` flags - DayZ's own central
    economy considers them permanently non-cargo/non-player-held, so there
    was never a way to actually hand one to a player at a trader in the
    first place.
  - Flagged, but deliberately **not** added, pending confirmation from the
    project owner: `Bonfire`/`Cauldron`/`ChristmasTree`/`Fence` all carry
    that same `count_in_cargo="0" count_in_player="0"` flag combination in
    `types.xml` - these are the final, already-built/placed structure
    classnames, not a portable kit (unlike e.g. `WatchtowerKit`, which is
    the actual purchasable, cargo-capable item and is already sellable).
    Adding the built-structure classnames directly to `Base_Building`
    would very likely be non-functional (no inventory slot fits a
    multi-part placed structure) - this matches an earlier session's own
    spot-check conclusion (see the fifth follow-up session above) that
    these carry "SeasonalEvent usage tag or crafted/nominal decor-spawn
    markings, not real player-cargo loot."
  - Also left for a follow-up: the remaining ~35 Bucket B entries (zombie
    skins, vehicle wrecks, Deer Isle static map decor/roadblocks/train
    wagons, `UndergroundStashSnow`, etc.) - these don't look like food/meat
    items by name or by `types.xml` flags, so they were left untouched
    pending clarification on what the project owner actually wants done
    with them.
  - Verified: `deno task check` clean; re-ran the tune/gap-fill/trader
    pipeline (24 merged categories now, up from 23; confirmed 1 item
    removed by the new denylist entries); re-ran `audit-market` (0 gaps,
    41 review items - down from 43, the 2 newly-denylisted items no longer
    appear; 0 anomalies). Purely data-only (`src/market.ts`/
    `src/marketGapFill.ts`) - no `.c` addon touched, so no republish
    needed; applies automatically on next server start.

  **Eighth follow-up session: resolved every remaining Bucket B item -
  `audit-market` now reports 0/0/0.**

  - **One genuine boat found among the "decor" items and rescued.**
    Re-checked every remaining Bucket B classname's `types.xml` flags
    directly rather than guessing from names - all matched the same
    `count_in_cargo="0" count_in_player="0"` "never actually holdable"
    signature as the items already denylisted last session, **except
    `StaticObj_PatrolBoat_Military_DE`**, which is flagged
    `count_in_cargo="1" count_in_player="1"` - a real, tradeable boat. Added
    it to the new `Boats` category via `src/data/marketGapFill.json`
    (Rare tier, cloned from the category's existing template item).
  - **Confirmed and applied the previously-flagged Bonfire/Cauldron/
    ChristmasTree/Fence/Watchtower exclusion** (`types.xml`-confirmed
    built/placed structures, not portable kits - the real purchasable kit
    forms, e.g. `WatchtowerKit`, were already sellable and untouched).
  - **Denylisted the rest of Bucket B**, all confirmed via `types.xml`
    flags rather than assumed from naming: `WitchHat`/`DeadFox`/
    `EasterEgg`/`UndergroundStashSnow` (seasonal/farm/dig-site decor props);
    12 Deer Isle (`_DE` suffix) static map decor classnames - decals,
    roadblocks, train wagons/containers, supply crates,
    `Static_FrozenScientist_DE` - explicitly hand-listed rather than a
    blanket `StaticObj_` prefix rule, specifically because
    `StaticObj_PatrolBoat_Military_DE` (see above) needed to stay exempt.
    All added to `MANUAL_EXCLUSIONS` in `src/marketGapFill.ts`.
  - **Extended `src/marketAudit.ts`'s regex-based `NEVER_SELLABLE_PATTERNS`**
    (audit-only noise reduction, doesn't affect real sellability) to also
    catch `Wreck_*` (previously only `Land_Wreck`/`StaticObj_Wreck`
    matched - bare `Wreck_Mi8_Crashed`/`Wreck_SantasSleigh`/`Wreck_UH1Y`
    slipped through) and `YRTSK_ZMB_*` (a second zombie-skin mod family,
    alongside the existing `^Zmb` rule).
  - **Audit tool itself improved**: `auditMarket()` previously only
    recognized categories actually referenced by a live trader identity as
    "accounted for" - meaning the new (deliberately unattached) `Boats`
    category's own items kept reappearing in Bucket B/never really able to
    reach 0 while unattached. Added a broader `trackedAnywhere` set (every
    category in `MANAGED_MARKET_CATEGORIES`, exported from `market.ts`,
    unioned with the trader-referenced set) used only for the Bucket A/B
    skip check - once something has a real, generated category entry
    (whether or not a trader references it yet) it's been reviewed and
    shouldn't keep flagging as an unknown gap. Bucket C (price/stock
    sanity) deliberately stays scoped to trader-referenced categories only
    (its own stated purpose - sanity-checking what's actually reachable
    today), so this doesn't loosen that check at all.
  - Verified: `deno task check` clean; re-ran the tune/gap-fill/trader
    pipeline (confirmed all 7 `Boats.json` items present with correct tier
    caps: 4 for the 6 Rare items, 1 for `expansionlhd`); `audit-market` now
    reports **0 high-confidence gaps / 0 items needing review / 0
    price-stock anomalies** - down from 41/0 at the start of this session.
    Purely data-only (`src/market.ts`/`src/marketGapFill.ts`/
    `src/marketAudit.ts`/`src/data/marketGapFill.json`) - no `.c` addon
    touched, no republish needed.

  **Immediate correction, same session: `StaticObj_PatrolBoat_Military_DE`
  moved from `Boats` back to the denylist.** Its `count_in_cargo="1"
count_in_player="1"` flags said "real item", but the project owner
  correctly called this out - DayZ-Expansion's own `StaticObj_` naming
  convention means a static, non-interactive map decoration prop, and
  that convention is trusted here over one possibly-stale/inaccurate
  config flag. Removed its `src/data/marketGapFill.json` entry, added
  `staticobj_patrolboat_military_de` to `MANUAL_EXCLUSIONS` alongside its
  Deer Isle decor siblings in `src/marketGapFill.ts`. `Boats.json` is back
  to its original 6 default items; `audit-market` re-verified still at
  0/0/0.

  **Ninth follow-up session: root-caused and fixed a real, silent trader-
  stock data-loss bug - "Cars"/"Helis" never appearing on the restock
  board was only the visible symptom.** Reported symptom: the physical
  restock board showed 5 of the expected 7 groups - `Cars` and `Helis`
  were completely missing, not just showing 0 stock.

  - **Root cause**: `market.ts`'s merge builds each `MERGED_CATEGORIES`
    file (e.g. `Vehicles_Cars.json`) by reading a raw DayZ-Expansion-Market
    source category (e.g. `Cars.json`) and writing a _new_ file under a
    _different_ name - but, per this file's own header comment at the
    time, left the original raw source "in place, unused... DayZ-
    Expansion-Market doesn't mind orphaned category files, they simply
    don't show up anywhere once no trader identity references them". That
    assumption was wrong. `ExpansionMarketSettings.LoadCategories()`
    (confirmed via the unpacked DayZ-Expansion-Market source) scans its
    whole folder for every `*.json` file and loads **all of them**
    unconditionally into one shared global classname->item map
    (`ExpansionMarketCategory`'s `s_GlobalItems`) - completely independent
    of whether any trader identity references that category. Whichever
    category loads a given classname _second_ has that item silently
    **rejected** (`CheckDuplicate()`), not merged/overwritten. `Vehicles_
Cars`/`Vehicles_Helicopters` are both 100%-overlapping 1:1 copies of a
    single raw source with no `only`/`exclude` split, so _every_ item in
    each was being rejected - the categories loaded with zero real items,
    which is exactly the condition `BuildBoardStatusText()`
    (`DZSurvivalTraderRestock_Module.c`) skips a group entirely for. Every
    other merged category lost only a _partial_ overlap (confirmed live:
    `Guns_Military`/`Guns_Civilian` were only showing 59 of their real 85
    on-disk items) - silent, but not obviously broken, which is why this
    had gone unnoticed. The same bug also affected marketGapFill.ts's
    "already sellable somewhere" ownership scan (already worked around for
    4 known-dead catch-all files via `DEAD_MARKET_FILES`, but not for the
    ~50 raw per-slot source files feeding the real merge) - a raw source's
    contents were counted as "already sellable" even though the live game
    was silently discarding them, permanently masking real gaps from ever
    being gap-filled into an actual reachable category.
  - **Fix**: `market.ts` now quarantines every raw source file once it's
    been fully absorbed into a differently-named live category (or is one
    of `marketGapFill.ts`'s 4 `DEAD_MARKET_FILES`), renaming it away from
    `.json` (new `.orphaned-source` extension) so DayZ-Expansion-Market's
    folder scan skips it, while `readCategory()` transparently keeps
    reading the very same (renamed) file as the merge's own data source on
    every subsequent run - fully idempotent, no behavior change to the
    merge itself. Self-merging categories (`Boats`, `Medical` - source name
    equals their own fileName, read-and-rewritten in place) are correctly
    excluded, since there's no separate orphaned copy to hide. `marketGap
Fill.ts`'s `DEAD_MARKET_FILES` set is now exported and folded into the
    same quarantine pass, superseding its old in-loop workaround (kept as
    harmless defense-in-depth).
  - **Verified against the live server's actual profile data** (not a
    synthetic test): ran the updated `tuneExpansionMarket()` directly -
    63 raw/dead files quarantined, only the 27 real live category files
    (24 merged + `Ghillies`/`Vehicle_Parts`/`Batteries`) remain as `.json`.
    Re-running immediately after confirmed idempotency (0 re-quarantined,
    no errors). Hand-verified `Guns_Military`'s/`Guns_Civilian`'s new
    merge-only counts (21/43) exactly match the sum of their source
    groups' `only`/`exclude` rules applied to the now-unpolluted raw data.
    Then ran the updated `ensureMarketGapFill()`: with raw sources no
    longer falsely "covering" classnames, it correctly found and added
    **1,232** previously-invisible items across 19 categories (mostly
    color/variant reskins, e.g. helmet/vest color variants) that had been
    silently masked by the bug above - spot-checked for denylisted
    classnames (`nm_`/`em_` prefixes, the hand-picked exclusion list) and
    found none. `deno task audit-market` re-run clean afterward: still
    **0 high-confidence gaps / 0 items needing review / 0 price-stock
    anomalies**. `deno check`/`deno lint` both clean.
  - **Purely data/tooling-side** (`src/market.ts`/`src/marketGapFill.ts`) -
    no `.c` addon touched, no republish needed. The already-running live
    server won't pick this up until its next restart (category templates
    are only read once at boot) - the fix has already been applied
    directly to the live profile on disk this session, so the very next
    `deno task up` restart is sufficient; no extra manual step needed.

## Building

From the project root, inside `nix develop`:

```bash
deno task build-serverpack
```

First run downloads the real DayZ Tools (Steam app `830640`, ~550MB, via
your project's existing SteamCMD login) and initializes a local Wine prefix
(`.wine-daytools/`, gitignored) - both one-time, machine-local setup. It also
generates a shared 1024-bit signing keypair via BiSignUtils
(`.serverpack-keys/`, gitignored - back it up, losing it means future
updates can't be signed with the same key) and produces a publish-ready
`@DZSurvivalServerPack/` folder under `.serverpack-build/` (gitignored)
containing `mod.cpp`, `addons/*.pbo` + matching `.bisign` files (one per
addon, signed with the real `DSSignFile.exe`), and `keys/DZSurvivalServerPack.bikey`.

**Test locally first**: copy `.serverpack-build/@DZSurvivalServerPack` into
your local server's mod path, add it to `-mod=`, boot the server, and check
`profiles/*.RPT` and `profiles/script.log` for compile errors. To verify a
signature will actually be accepted by real DayZ clients (not just
BiSignUtils' own, unreliable `checkAll` - see bug #9 above), use the real
checker directly:

```bash
WINEPREFIX=$(pwd)/.wine-daytools wine daytools/Bin/DsUtils/DSCheckSignatures.exe \
  "Z:$(pwd | tr / \\\\)\\.serverpack-build\\@DZSurvivalServerPack\\addons" \
  "Z:$(pwd | tr / \\\\)\\.serverpack-build\\@DZSurvivalServerPack\\keys"
```

## Publishing

```bash
deno task publish-serverpack
```

This builds every addon, then uploads/updates the **one** Workshop item via
SteamCMD's `+workshop_build_item` (reusing this project's existing Steam
login/session cache). First publish creates a **private** Workshop item -
flip it to Public yourself from the item's Steam page once you're happy
with it. The assigned Workshop ID is cached to `serverpack/.workshop_id` so
future `publish-serverpack` runs update the same item (adding/removing
addons in `addons/` and re-publishing updates all of them together) instead
of creating a new one.

Add an optional `preview.png` (1024x1024 recommended) next to `mod.cpp`
before publishing to get a preview image; otherwise it publishes without
one.

Once published, add the resulting Workshop ID to this project's `mods.txt`

- just once, no matter how many addons live inside the pack.

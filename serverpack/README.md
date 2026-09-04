# DZSurvivalServerPack

This project's own **single Workshop mod** bundling all of its custom
from-scratch DayZ addons (Enforce Script) that have ANY client-visible or
client-required behavior (UI, self-actions, board interactions, input
overrides), so there's only one Workshop item to maintain, subscribe to, and
add to `mods.txt` for those - regardless of how many custom features live
inside it.

> **A second, separate pack lives at
> [`../serverpack-serveronly/`](../serverpack-serveronly/)** for addons
> confirmed to have ZERO client-visible behavior _and_ zero
> Community-Online-Tools module/permission integration (COT requires
> permission trees to match structurally between client and server - a
> permission registered only server-side corrupts every connecting
> client's copy of the tree, silently breaking COT's own admin UI/keybinds
>
> - this happened for real to `DZSurvivalBaseDecay`, which used to live
>   there and was moved back here because of it; see that addon's own
>   "Current addons" writeup below and `../src/paths.ts`'s comment on
>   `SERVERPACK_SERVERONLY` for the full incident). That pack is
>   **currently empty** and **deliberately never published to Steam
>   Workshop** when it does hold something - see
>   [`../src/localServerPacks.ts`](../src/localServerPacks.ts). Everything
>   below in this file (build tooling, signing, the nine-bugs pitfalls list,
>   and each addon's own design writeup) applies equally to both packs - only
>   the physical folder and publish step differ. Addon writeups were kept in
>   this one file rather than split across two READMEs, to keep this
>   project's addon history/lessons-learned in a single place.

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
  - **Custom-Keycards' room keycards priced as real, hard-earned access,
    not a spare wallet (TODO.md item 2).** The generic gap-fill clone logic
    put all 15 `evg_keycards_*` room-access keycards in the same
    "Utility"/Uncommon bucket as wallets/gold/rings, pricing them at a few
    hundred - dirt cheap for a guaranteed-access key to an entire military
    keycard-loot room. Split into their own Legendary-tier manifest group
    (`src/data/marketGapFill.json`, caps stock at 1) plus an explicit
    re-price every run (`KEYCARD_*`/`MASTER_KEYCARD_*` constants in
    `src/marketGapFill.ts`). **Superseded by the Twelfth follow-up session
    below**: these were later made find-only/sell-only entirely, so the
    prices this bullet originally described are no longer the buy price -
    see that entry for the current design. The two keycard _holders_
    (`evg_keycard_holder_camo`/`_leather` - just carrying pouches, not
    access) were left at their original Uncommon tier and are unaffected.
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

  **Follow-up session: hardcore-survival economy pass - buying and earning
  money were both made deliberately harder, on top of everything above.**
  With no realistic ability to playtest (this is mostly a solo/rarely-
  played server), the ask was "make it harder to make money whatever it
  takes... I don't want the option to buy stuff just because I got money" -
  addressed with 3 independent levers, confirmed via the same
  `market_scripts.pbo` source read as the sell-price research above:

  - **Selling loot to the trader now pays out far less.**
    `ExpansionMarketSettings`' own global `SellPricePercent` (in
    `MarketSettings.json`) is the sell-side payout multiplier - confirmed
    it's the _only_ place `CalculatePrice()`'s sell path applies a
    less-than-1.0 modifier (buying always uses a fixed 1.0 modifier, so
    this setting has **zero** effect on prices when buying). DayZ-
    Expansion-Market's own default is 75 (75% of an item's computed
    value); dropped to **20**. New idempotent `ensureHardcoreSellPrice
Percent()` in `src/traders.ts` (same read-check-write pattern as
    `ensureGoldCoinCurrency()` right above it), wired into
    `ensureCustomTrader()`.
  - **Buying now costs more, scaled by how coveted the item is.** Since
    `SellPricePercent` has no effect on buying, a separate lever was
    needed for "hard to buy even with money in hand". New
    `BUY_PRICE_MULTIPLIER` in `src/market.ts` (Common 1.0x/Uncommon
    1.5x/Rare 2.0x/Legendary 2.5x), applied in `buildMergedItems()` on
    top of each item's own `MinPriceThreshold`/`MaxPriceThreshold` (either
    its raw DayZ-Expansion-Market default, or this file's own
    `priceOverrides` correction where one exists) before writing the
    merged category out. Common tier is deliberately left at 1.0x since
    it covers the baseline survival loop (ammo/food/meds/basic clothing) -
    not the thing this pass is trying to gate.
  - **Stock caps tightened and restocking slowed further**, so even
    "cheap" items can't be bought in bulk repeatedly. `src/market.ts`'s
    `TIER_MAX_STOCK` dropped from Common 25/Uncommon 10/Rare 4/Legendary 1
    to **20/8/3/1**. `DZSurvivalTraderRestock_Module.c`'s `TierForCap()`
    band thresholds updated to match (mandatory - both files carry
    explicit "keep in sync" comments), `TierCooldownHours()` roughly
    doubled (Legendary 168h->336h/~2 weeks, Rare 24h->48h, Uncommon
    6h->12h, Common stays uncooled/weight-gated only so basic ammo/food
    don't get starved), and the overall drip rate for Common-tier items
    (which have no cooldown and rely entirely on the per-tick fraction)
    slowed slightly: `RESTOCK_FRACTION_DIVISOR` 20->25 (~5%/hour ->
    ~4%/hour), `MIN_RESTOCKS_PER_TICK` 15->10.
  - Combined effect by tier: Common items are ~3.75x harder to earn back
    (sell payout cut alone; buy price unchanged) - Legendary items are
    roughly **9.4x** harder overall (2.5x higher buy price, times ~3.75x
    worse sell payout for anything sold to afford it), with Uncommon/Rare
    landing in between. Deliberately left `RARE_CATEGORIES` (`Ghillies`)
    and `VEHICLE_PARTS_CATEGORIES` (`Vehicle_Parts`/`Batteries`) untouched -
    both are already special-cased outside the tier system for functional
    reasons (see `src/market.ts`'s own header comment on those constants)
    and weren't part of this ask.
  - **Requires republishing the addon** (`deno task publish-serverpack`,
    which verifies automatically) for the `.c` changes to take effect, in
    addition to the normal server restart needed for the `market.ts`/
    `MarketSettings.json` changes to be re-applied. `deno check`/
    `deno lint` both clean on the touched TypeScript files.

  **Follow-up session: real bug found and fixed - selling to the trader
  silently paid out nothing.** Reported live: "it said it gave me gold coin
  but it didn't give me anything." Root-caused via two independent
  findings, both confirmed by reading real source (not guessed):

  - **`profiles/ExpansionMod/Market/Exchange.json` (the actual currency
    price/denomination definition) had silently never been updated away
    from DayZ-Expansion-Market's own default `expansionbanknotehryvnia`**,
    even though `MarketSettings.json`'s ATM `Currencies` and both trader
    identities' own `Currencies` field correctly said
    `ExpansionGoldNugget_InsanityStack` (from the earlier currency-switch
    session). Likely cause: `Exchange.json` doesn't exist until
    DayZ-Expansion-Market itself first generates it, so an earlier
    `ensureGoldCoinCurrency()` run most likely hit its "not generated yet"
    branch before the mod created the file with its own default - and
    nothing re-ran `ensureGoldCoinCurrency()` since. Net effect: the trader
    was configured to _pay in_ a currency that had no valid price
    definition anywhere, so `ExpansionMarketModule.SpawnMoneyInCurrency()`
    could never find an eligible denomination to spawn - the sale still
    completed (item removed, notification shown) but zero currency was
    ever created.
  - **Separately, and more importantly: `ExpansionGoldNugget_InsanityStack`
    itself is fundamentally broken as an Exchange denomination in
    DayZ-Expansion-Market's own code**, regardless of the bug above -
    confirmed by unpacking `market_scripts.pbo` and reading
    `ExpansionMarketModule.c` directly. `LoadMoneyPrice()` keys its
    classname->price map using the _unstripped_ classname straight from
    Exchange.json, but `GetMoneyPrice()` unconditionally strips any
    `_insanitystack` suffix (`MapInsanityStackToMoneyType()`) before every
    lookup - so a denomination whose own configured classname already ends
    in `_InsanityStack` can never find its own price (always resolves to
    0), and `SpawnMoneyInCurrency()`'s `remainingAmount / denomPrice` then
    never spawns anything for it. This means simply fixing the stale
    `Exchange.json` above would NOT have been enough on its own - the
    `_InsanityStack` variant needed to be dropped entirely.
  - **Fix**: `GOLD_CURRENCY_CLASSNAME` (`src/traders.ts`) changed from
    `ExpansionGoldNugget_InsanityStack` to plain `ExpansionGoldNugget`.
    Its native 50,000 stack cap (`ExpansionMoneyNugget_Base`, confirmed via
    `core_objects_currencies.pbo`) is still more than enough headroom for
    any realistic payout in this project's economy without the
    `_InsanityStack` lookup bug. `ensureGoldCoinCurrency()`'s existing
    idempotent read-check-write logic needed no other changes - it now
    correctly rewrites `Exchange.json`/`MarketSettings.json`/both trader
    identities to the plain classname on every run.
  - **Applied directly to the live profile this session** (not just a
    source change waiting on the next restart): ran `tuneExpansionMarket()`
    - `ensureCustomTrader()` directly via a one-off script against the real
      running profile. Confirmed output: `Exchange.json` switched to
      `ExpansionGoldNugget`, ATM `Currencies` switched in `MarketSettings.json`,
      both trader identity files rewritten, and 598 live trader stock entries
      clamped down to the tightened tier caps from the hardcore-rebalance
      pass above. Nothing else to clean up - since the sale never actually
      produced any currency, there's no bugged item sitting in anyone's
      inventory to remove. A normal server restart is still needed for the
      already-running game process to pick up these on-disk JSON changes.

  **Ninth follow-up session: further tightened buy/sell economics -
  Rare/Legendary buying costs more, and selling pays out even less.**
  Solo/unsupervised pass, no new bugs - just pushing the existing hardcore-
  economy levers (see the earlier "hardcore-survival economy pass" and
  "peer-price balance pass" entries above) further in the same direction,
  per a standing "make it harder to make money whatever it takes" request:

  - `src/traders.ts`'s `HARDCORE_SELL_PRICE_PERCENT` dropped **20 -> 12**
    (DayZ-Expansion-Market's own default is 75), then reverted back to 20
    in a follow-up session - see below. Applies globally via
    `MarketSettings.json`'s `SellPricePercent`, same as before - only
    affects the sell side, per the same `CalculatePrice()` behavior
    confirmed in earlier sessions.
  - `src/market.ts`'s `BUY_PRICE_MULTIPLIER` bumped for the top two tiers
    only: Rare **2.0x -> 2.5x**, Legendary **2.5x -> 3.5x**. Common (1.0x)
    and Uncommon (1.5x) deliberately left untouched so the baseline
    survival loop (ammo/food/meds/basic clothes) doesn't get any harder -
    this specifically targets "money alone shouldn't buy real power"
    (rare/legendary gear, vehicles, optics) without also taxing basic
    survival shopping.
  - Stock caps/restock cadence (`TIER_MAX_STOCK`,
    `DZSurvivalTraderRestock_Module.c`'s tier cooldowns/weights) were left
    as-is this pass - already tightened twice in prior sessions and
    reviewed again here; no further changes made.
  - `deno check`/`deno lint` clean on both touched files (same pre-existing
    2 exceptions as always - `modVerify.ts`'s unused import,
    `steam.ts`'s missing-await lint). Requires a normal server restart
    (`MarketSettings.json`/category templates only re-applied at boot) -
    no addon republish needed, this is TypeScript/JSON-only.

  **Tenth follow-up session: global sell percent reverted back to 20, with
  a new per-tier sell-percent override so rarer finds still pay out more.**
  The project owner's own feedback: 12 was too harsh globally, but rarer
  items should sell for a higher percentage than common ones - just not
  anywhere near DayZ-Expansion-Market's own 75 default. Discovered (by
  unpacking `market_scripts.pbo` again, specifically
  `ExpansionMarketTrader.GetSellPricePercent()`) that DayZ-Expansion-Market
  already supports exactly this: each item's own `SellPricePercent` field
  takes priority over the trader zone's own `SellPricePercent`, which takes
  priority over the global `MarketSettings.json` value - all three use
  `-1` as an "inherit the next level up" sentinel. This project's custom
  zone already leaves its own `SellPricePercent` at `-1` (see
  `ensureCustomZone()`), so this was a clean lever to add:

  - `src/traders.ts`'s `HARDCORE_SELL_PRICE_PERCENT` reverted **12 -> 20**
    (back to the original 2026-08 hardcore-survival pass value) - this is
    still the effective percentage for anything that doesn't get an
    override below.
  - New `SELL_PRICE_PERCENT_OVERRIDE` in `src/market.ts` (`Record<Tier,
number>`, same tier keys as `TIER_MAX_STOCK`/`BUY_PRICE_MULTIPLIER`):
    Common/Uncommon left at `-1` (inherit the 20% global - no change for
    the bulk of ordinary trading volume), Rare **40%**, Legendary **60%**.
    Applied in `buildMergedItems()` on every item pushed to a merged
    category - both the normal re-priced branch and the self-merging
    (Boats/Medical) branch, which is safe to do unconditionally here
    (unlike `MinPriceThreshold`/`MaxPriceThreshold`, `SellPricePercent` is
    an absolute value overwritten identically every boot, not a multiplier
    that compounds - no risk of repeating the Boats int32-overflow bug
    from the eighth follow-up session above).
  - `deno check`/`deno lint` clean on both touched files (same 2
    pre-existing exceptions as always). Requires a normal server restart
    for both the `MarketSettings.json` change and the regenerated category
    templates to take effect; no addon republish needed.

  **Eleventh follow-up session: briefly flattened to 66% globally, then
  reverted straight back to the Tenth session's 20/40/60 tiered design.**
  The project owner asked for "all sell prices to 66% of the buy price"
  while doing an unrelated food-pricing pass - `HARDCORE_SELL_PRICE_PERCENT`
  was bumped to 66 and `SELL_PRICE_PERCENT_OVERRIDE` flattened to `-1` across
  every tier so nothing overrode that one flat number (this change itself
  was never written up here - found only via its own code comments while
  starting the next session). Immediately walked back the same day ("I
  think sell percentage was fine at 20 actually and rarer items should sell
  for more percentage if possible but not up to 75"): `HARDCORE_SELL_PRICE_
PERCENT` back to **20**, `SELL_PRICE_PERCENT_OVERRIDE` back to Common/
  Uncommon `-1` (inherit 20%), Rare **40%**, Legendary **60%** - i.e. byte-
  for-byte the same values the Tenth session originally landed on. No new
  mechanism needed, both levers already existed from that session.

  **Twelfth follow-up session: deep headgear/backpack/base-building/
  explosives/medical price-and-category audit, plus keycards made find-
  only.** A long, itemized project-owner audit request covering several
  categories at once - see `src/marketGapFill.ts` for the full itemized
  comments (`HEADGEAR_AND_ARMOR_PRICE_FIXES`, `BACKPACK_PRICE_FIXES`,
  `BASE_BUILDING_PRICE_FIXES`, `EXPLOSIVES_PRICE_FIXES`,
  `MEDICAL_PRICE_FIXES`, `CATEGORY_REASSIGNMENTS`) - summarized:

  - **Headgear/armor**: `MilitaryCap_BDU/Desert/Woodland` had inherited a
    full ballistic helmet's price (17613-29363) via the same category-
    clones-`Items[0]` bug documented throughout this file - now a flat 6000. `ALV_TacCap_Black/Snow/Tan` were sitting in Clothing Head -
    Civilian's generic ALV bucket despite being unambiguously military gear
    - moved into Clothing Head - Military (new `CATEGORY_REASSIGNMENTS`
      mechanism, for items with no `template` sibling to auto-detect the
      drift the way `staleTemplatePlacementsFixed` does). Chainmail armor
      (`chainmail`/`_coif`/`_leggings`) and every WasteLandZ Survival Clothing
      civilian piece (pants/hoodies/waist packs) were priced at the Common-
      tier gap-fill floor (355-595 and 640-1090 respectively) despite being
      real armor/mid-tier gear - both bumped.
  - **Backpacks**: most of Clothing_Back_Civilian shared one Common-tier
    floor (1148-1920) regardless of actual bag size/quality - bumped ~2.2x,
    with `SurvivorBackpack_*`/`WasteLandZ_backpack*` (genuinely large/good
    packs) given their own higher band. Every already-differentiated
    Civilian/Military backpack got a further ~1.5x bump on its own existing
    price. Also fixed a real bug found along the way:
    `AssaultBag_Winter`/`CoyoteBag_Winter` (Military) were priced far below
    their own same-model color siblings (2975-4950 vs 15488-38740) -
    re-aligned before applying the bump. All target values are absolute
    (not a runtime multiplier), so re-running this stays idempotent.
  - **Base Building**: code locks (`CombinationLock`/`4`) were far too
    cheap for a real security item - bumped. Big safes got a moderate bump
    (small/regular safes deliberately left alone). A cluster of
    unmistakably military-themed storage props (gun racks/cases/walls/
    crates/lockers, the compound gate/wall, the helipad kit) shared the
    generic gap-fill floor with everything else - bumped as a group.
    `AmmoBox` (a small lootable storage prop, NOT gun ammunition) had
    accidentally cloned the same price as the `BarrelHoles_*` storage props
    (51675-86130, absurd for "a tiny box") - corrected down, as was
    `bl_coffee_mug` (a literal mug, also stuck at the generic floor).
    `TerritoryFlag` (the raw, already-built flag pole) is now excluded
    entirely (`MANUAL_EXCLUSIONS`) - only `TerritoryFlagKit` is
    purchasable, now the project owner's requested flat 10,000 (was 23-45).
    `Plant_Pepper/Potato/Pumpkin/Tomato/Zucchini` (immobile growing-stage
    crop props, not portable items - only their seed packets are real
    purchasable items) are now excluded too. `bl_candy_toffee/dark/milk/
nutty` and `bl_potatochips_*`/`bl_coffee_bag` were gap-filled into Base
    Building purely because that's where their `bl_` siblings live - these
    are food, moved into Consumables via the same new
    `CATEGORY_REASSIGNMENTS` mechanism.
  - **Explosives**: `M67Grenade`/`RGD5Grenade` (33125-55213) and every
    `M18SmokeGrenade_*`/`RDG2SmokeGrenade_*` variant (4138-8625) were far
    too expensive for common, disposable throwables on a hardcore server -
    all six now a flat 1500. Every other explosive (flashbang, remote/
    tripwire charges, plastic explosive, chemgas, landmine, claymore) was
    confirmed fine and left untouched.
  - **Medical**: real display names confirmed via `dta/languagecore.pbo`'s
    stringtable (`str_cfgvehicles_*0`) before touching anything -
    `bloodbagfull` is the actual "Blood Bag" (was 350-580, far too cheap -
    now 2500); `bloodbagempty` is "Blood Collection Kit" (was priced like a
    rare auto-injector at 27360-45600 - now 1250, half of Blood Bag's new
    price); `bloodtestkit` is "Blood Test Kit" (was 6803-11318 for a
    disposable single-use strip - now 500); `painkillertablets` is
    "Codeine Pills" (was 350-580 - now 1000).
  - **Keycards made find-only, sell-only.** The project owner decided
    `evg_keycards_*` (see the Ninth/Tenth entries' keycard writeup above)
    should never be purchasable at any price, only found in loot (already
    spawning naturally - see `modTypes.ts`) and sellable back for a modest
    amount. Unpacking `market_scripts.pbo` further
    (`ExpansionMarketModule.c`) confirmed `CanBuyItem()`/`CanSellItem()` are
    checked completely independently of each other and of stock - driven by
    each trader identity's own `Items` map
    (`ExpansionMarketTraderBuySell`: `CanOnlyBuy`=0, `CanBuyAndSell`=1,
    `CanOnlySell`=2, `CanBuyAndSellAsAttachmentOnly`=3), not by manipulating
    `MaxStockThreshold`/`MinStockThreshold` at all. `src/traders.ts`'s
    `TraderIdentity` gained an optional `items` field, populated for the
    General Store with every keycard classname set to `CanOnlySell`.
    `KEYCARD_MIN_PRICE`/`MAX_PRICE`/`MASTER_KEYCARD_MIN_PRICE`/`MAX_PRICE`
    (in `src/marketGapFill.ts`) dropped from 250k-400k/800k-1.2M down to
    15,000-25,000/48,000-52,000 - now purely a SELL-price basis (no longer
    a buy price), sized so the Legendary tier's 60% sell cut lands the
    master key around the project owner's requested ~30,000.
  - Verified via a full dry-run against a scratch copy of the live
    `profiles/ExpansionMod/Market`/`Traders` data (not the live server's own
    files) rather than a real boot: every re-price/move landed on the
    exact expected classname and value, a second consecutive run was a
    clean no-op (confirms idempotency), and `bl_deposit_container`/
    `StoneKnife`/`Stable_dayz_Kit`/every other untouched item was
    confirmed unaffected. `deno check`/`deno lint`/`deno fmt --check` clean
    across the whole project (same 2 pre-existing exceptions as always).
    Requires a normal server restart; no addon republish needed.

  **Thirteenth follow-up session: pelts repriced, plus a real systematic
  (not reactive) audit found ~270 more un-reviewed gap-fill items.** The
  project owner asked for two things in one go: bump pelt prices ("maybe
  900"), and "have another pass at the economy, I feel like you miss
  things quite easily... I want confidence there aren't things incorrectly
  priced." Rather than repeating the same "react to one reported item"
  pattern as every prior session, this pass grouped every item in every
  `profiles/ExpansionMod/Market/*.json` by identical `(MinPriceThreshold,
MaxPriceThreshold)` pair to systematically surface un-reviewed "category
  clones Items[0]" gap-fill bugs - the same root cause behind every fix in
  this file, just never hunted for exhaustively before.
  - Found two large offending clusters: `Base_Building.json` had **178
    items** still sitting at its generic 4590-7658 gap-fill floor, and
    `Utility.json` had **92 items** at its own 533-893 floor (including all
    12 pelts).
  - `Base_Building.json`'s cluster turned out to be mostly
    `@Paragon-Storage`'s ~100 `StorageBox_*` kits (never priced by tier -
    a safe/container/door/crate/locker/rack/tent all shared one price),
    plus real vanilla items (`FenceKit`/`WatchtowerKit`/`PartyTent_*`/
    `ShelterKit`/garden seeds) and `@BoomLays-Things` (`bl_`) furniture/
    decor, none of which had ever been individually reviewed. Confirmed
    via the Paragon mod's own shipped `extras/traderconfig.txt` and
    `extras/class names.txt` that every bare `Paragon_*` classname
    (BigSafe/GunRack/Locker/Container/...) is the ALREADY-DEPLOYED raw prop
    form - the mod's own reference config prices these at `-1/-1` ("not for
    sale") and only the separate `StorageBox_*` classname is the real
    portable/purchasable kit. Added a `paragon_` prefix rule to
    `isExcluded()` (same pattern as the existing `nm_` rule) rather than a
    ~100-line hand-picked list, then tiered every `StorageBox_*` kit by
    real function/value (crates/racks cheap, safes/doors/containers/tents
    pricier, the already-fixed military-storage/big-safe clusters from the
    Twelfth session left untouched).
  - Also found and excluded a batch of real BUILT/placed structures and
    dead-freebie props that had been silently gap-filled as if sellable:
    `GardenPlot`/`GardenPlotGreenhouse`/`GardenPlotPolytunnel` (confirmed
    via `languagecore.pbo` - the tilled-soil result of a hoe action, not an
    item), `ShelterSite`/`ShelterFabric`/`ShelterLeather`/`ShelterStick`
    (confirmed via their real display names "Tarp Shelter"/"Leather
    Shelter"/"Improvised Shelter" - each is the BUILT shelter itself, not a
    raw material; only `ShelterKit`, "used to plot the position", is the
    real portable item), `UndergroundStash` (displays as plain "Mound" -
    "a mound that can be dug up with a suitable tool", same as the
    already-excluded `UndergroundStashSnow`), `Fireplace`/`FireplaceIndoor`/
    `FireplaceFireBarrel`/`OvenIndoor` (built cooking structures, same
    reasoning as the already-excluded `Bonfire`/`Cauldron`), `AnniversaryBox`
    ("Anniversary T-Shirt Box" - "Take a t-shirt! It's free!"), every
    `GiftBox_Large/Medium/Small_*` (Christmas event decor, same family as
    the already-excluded `EasterEgg`), `HandcuffsLocked` (a live restraint
    state marker, not an item), and `ShippingContainerKeys_Blue/Orange/
Yellow` (each tied to one specific already-placed container instance -
    meaningless to hand out generically). Also excluded Dart-Board-Game's
    `*_KIT_PLACED` deployed props (only the `DARTS_PlacingKit_*` forms are
    real, confirmed via the mod's own `classnames.txt`) and
    `dog_shed_big`/`dog_shed_small` (+`_static`) deployed doghouse forms
    (only the `_kit` siblings are real).
  - `Utility.json`'s cluster: the 12 pelts got tiered pricing (small -
    Rabbit/Fox/Goat/Sheep - 800-950; standard - Pig/Deer/Cow/Wildboar/
    Reindeer - 900-1050; predator/large - Wolf/Bear/Horse - 1000-1200),
    matching the project owner's "maybe 900" ask with a bit of realistic
    spread instead of one flat number. The other ~80 items (crafting
    materials, traps, lighters, crossbow-building parts, horse tack, the
    `ScientificBriefcase` lore item) got tiered pricing by real value
    instead of sharing one flat 533-893 price - see `TESTS.md` for the
    full breakdown.
  - Also found and excluded two "Bucket A" false-positive gaps that would
    otherwise keep re-flagging on every future audit run despite having a
    real `<category>` tag: `@AirRaid`'s own scripted event-marker smoke
    items (`M18SmokeGrenade_AirStrike`/`_CH_47_Helicopter_*`/`_MI_8_
Helicopter_Crash`/`_UH_1_Helicopter_Crash`, `Ammo_40mm_Smoke_AirStrike`)
    and TGK-WeaponPack's `SM_Ammo_Empty_Crate`.
  - Separately, a full audit of the ~113 real spawnable inventory items
    that had never been sellable ANYWHERE (not just mispriced) found:
    `@TP-Apoc-SUV`/`@TP-Apoc-Pickup`/`@TP-Apoc-M1025`'s ~110 spare parts
    (hoods/trunks/doors/wheels) had zero market wiring despite the
    vehicles themselves being fully sellable - added to `Vehicle_Parts` via
    a new `src/data/marketGapFill.json` manifest group (grouped by part
    type, each cloning an existing generic vehicle part's price/stock tier
    - e.g. every hood clones `hatchbackhood`'s 520-870). Also found three
      genuine non-item creature families that `marketAudit.ts` had no pattern
      for yet (`Doggo_Wild1`-`35` from `@DayZ-Dog`, `BMM_ChimicalZombie_*`
      from `@BMM-Chemical-Zombie`, `TCHCAI_TheAstronaut_Zombie_*`/
      `TCHC_TheButcher_Zombie`/`TCHC_ZombieBear` from `@Custom-Zombies`) -
      added matching prefix patterns to `NEVER_SELLABLE_PATTERNS` (same
      treatment as the existing `Animal_`/`Zmb`/`YRTSK_ZMB` patterns) so
      these stop cluttering the audit's manual-review bucket forever, not
      just this one run.
  - **Result: `deno task audit-market` now reports 0 high-confidence gaps,
    0 items needing manual review, 0 price/stock anomalies** - down from
    8/282/0 at the start of this session (the "282" is not a regression
    from the Eighth follow-up session's earlier 0/0/0 claim - a lot of
    Workshop content, mainly `@Paragon-Storage`/`@TP-Apoc-*`/
    `@Custom-Zombies`, was added to the mod list in sessions since then).
  - Verified via the same scratch-copy dry-run method as every prior
    session (not the live server's own files): a full run showed the
    expected exclusion/re-price/add counts, a second consecutive run was a
    clean no-op (idempotency confirmed), and the audit tool itself
    confirmed 0/0/0 both immediately after and unchanged after the no-op
    second run. `deno check`/`deno lint`/`deno fmt --check` clean across
    the whole project (same 2 pre-existing exceptions as always). Requires
    a normal server restart; no addon republish needed.

  **Fourteenth follow-up session: four more narrow economy asks - lock
  tiering, raw material prices, a hard food price floor, and gun
  attachment sell%.** `deno task audit-market` still reports 0/0/0
  afterwards - this was a set of targeted corrections, not another
  systematic sweep like the Thirteenth session above.
  - **`CombinationLock` (3-dial) vs `CombinationLock4` (4-dial) no longer
    share an identical price.** Both had cloned the same
    `BASE_BUILDING_CODE_LOCK_PRICE` constant (3500-5500) - split into
    `BASE_BUILDING_LOCK3_PRICE` (2500-4000) and `BASE_BUILDING_LOCK4_PRICE`
    (5500-8000), the 4-dial lock now meaningfully pricier as the more
    secure option.
  - **`Nail`/`WoodenPlank`/the junk-material trio bumped off the trader's
    absolute price floor.** `Nail` was still at DayZ-Expansion-Market's own
    default (5-10) - trivially cheap next to `NailBox` (450-750, a full box
    of many nails) - now 40-70. `WoodenPlank` (a real base-building
    material, distinct from the already-fixed `PileOfWoodenPlanks`) was
    50-250, now 120-220. `bl_extension_cable_reel`/`bl_pallet`/
    `bl_pallet_frame_solo` (the shared `BASE_BUILDING_JUNK_MATERIAL_PRICE`
    band) went from 50-150 to 90-180.
  - **A hard 300 minimum on every plain food item, plus a whole Hen/
    Rooster bumped to 1000+.** The project owner: "minimum food price
    should be 300, even the mushroom" and "why is a whole Hen 45!!!! that
    should be at least 1000." `src/marketGapFill.ts`'s `FOOD_PRICE_FIXES`
    map (previously only covering Bitterlings/DeadChicken_*/Old_ cans/a
    couple of one-off items) was extended with two new bands:
    `FOOD_WILD_FORAGE_PRICE` (300-450 - every raw fruit/vegetable/
    mushroom, `Waterbottle`, `Lard`, and the small-critter trio that used
    to sit at 10-18) and `FOOD_BAKED_GOODS_PRICE` (320-520 - the
    `Expansion` bread/cheese loaves). `DeadChicken_Brown`/`_Spotted`/
    `_White`/`DeadRooster`/`DeadRabbit` moved from the old
    `FOOD_UNCLEANED_CARCASS_PRICE` (45-75) to a new `FOOD_WHOLE_GAME_PRICE`
    (1000-1500). Along the way, found a genuine anomaly during the same
    pass: `CrabCan`/`CrabCan_Opened` were sitting at 175-290 while every
    other fresh canned good in the category (`SardinesCan`, `TunaCan`,
    `BakedBeansCan`, etc.) sits at 700-2000+ - corrected to 700-1200 to
    match that sibling tier instead of just clearing the bare 300 floor.
  - **Steaks/fillets doubled again; whole raw fish floored instead of
    doubled.** "Double the price of the steaks and fish" - `market.ts`'s
    Meat/Fish `priceOverrides` (both already 180-280 from an earlier
    session) doubled to 360-560. Whole/uncleaned raw fish (`Carp`/
    `Sardines`/`Mackerel`/`SteelheadTrout`/`WalleyePollock`/`RedCaviar`/
    `Shrimp`, previously 70-120) did NOT get a plain double (which would
    have landed at 140-240) - the new 300 food floor takes priority, so
    these now match the `FOOD_WILD_FORAGE_PRICE` band (300-450) instead,
    still below a cleaned fillet since filleting work remains.
  - **Every `Old_` (moldy/expired) canned food item made find-only.** "Old
    food... maybe don't let people buy those" - all 42 `Old_*` classnames
    (exported as `OLD_FOOD_CLASSNAMES` from `marketGapFill.ts`, reused by
    both the price-fix map and this override so the two can never drift
    out of sync) are now `CanOnlySell` at the General Store - same
    find-only-but-sellable mechanism already used for the Custom-Keycards
    room keys (`traders.ts`'s `OLD_FOOD_BUYSELL_OVERRIDES`). Sell price
    (120-250) is untouched, since only the buy side changed.
  - **Gun_Attachments_Military/Civilian now sell for a flat 50% of buy
    price, regardless of rarity tier.** "Make attachments only sell for
    half of their buy price" - these two categories are entirely Uncommon/
    Rare/Legendary internally, whose per-tier sell percents (20/40/60)
    can't express a single flat category-wide rule, so `market.ts`'s
    `MergedCategory` gained an optional `sellPricePercent` field that
    overrides the per-tier lookup entirely when set, applied to both
    attachment categories. Also reviewed the cheapest attachment buy
    prices directly (TGK-WeaponPack's cosmetic grips/foregrips/flashlights
    at 150-400, vanilla low-end magazines at 180-360+) - these are
    deliberately low-value/cosmetic items already documented as such in an
    earlier session's `TGK_PRICE_FIXES` writeup, not a further pricing bug.
  - Verified via the same scratch-copy dry-run method as every prior
    session: a full run produced the expected re-price/exclusion counts, a
    second consecutive run converged to the same final values (the
    Consumables/Base_Building food and material fixes always re-log every
    run by design - `tuneExpansionMarket()` rebuilds those merged category
    files from their raw, un-overridden sources on every boot, so
    `FOOD_PRICE_FIXES`/`BASE_BUILDING_PRICE_FIXES` are a repair pass that
    necessarily re-applies every time, exactly like every pre-existing
    entry in those same maps already did before this session), and
    `deno task audit-market` reported 0/0/0 both times. `deno check`/
    `deno lint`/`deno fmt --check` clean across the whole project (same 2
    pre-existing exceptions as always). Requires a normal server restart;
    no addon republish needed.

  **Fifteenth follow-up session: magazine prices normalized by capacity,
  not by host weapon.** Project owner report: "a KA mag for almost
  8K!!!!". Direct comparison confirmed every real vanilla magazine's
  price had been cloned from its compatible weapon's own price, not
  priced by magazine value - `mag_ssg82_5rnd` (5940-9900) was identical
  to the `ssg82` rifle itself; `mag_cz550_10rnd` (4988-8310) was ~89% of
  the `cz550` rifle (5588-9315); `mag_akm_drum75rnd` (17625-29370) cost
  MORE than the entire `akm` rifle (16788-27975).
  - **`market.ts` gained capacity-based magazine price bands** -
    `MAGAZINE_PRICE_OVERRIDES` now assigns every real vanilla magazine
    classname (~47 total, both military and civilian) a final price
    purely by round count: <=10rnd 300-550, 11-20rnd 450-750, 21-30rnd
    600-1000, 31-45rnd 800-1300, 46-64rnd 1100-1800, 65rnd+ drums
    1500-2500. TGK-WeaponPack's own `Sobr_Mag_*`/`SM_Magazine_*`/
    `SM_Mag_*` reskins were deliberately left untouched (already
    correctly flat-priced via `TGK_MAGAZINE_PRICE` in
    `marketGapFill.ts`). Since `Gun_Attachments_Military/Civilian` are
    tier `Uncommon` (1.5x buy multiplier), the constants are defined as
    the target final price divided by 1.5 so the displayed price lands
    exactly on the intended band.
  - **A related anomaly found in the same pass:
    `m4_suppressor`/`ak_suppressor` (the plain vanilla suppressors) were
    priced at 7283-12135 - MORE than every one of their own
    TGK-WeaponPack reskinned variants (already 3500-6000).** Added
    `MUZZLE_PRICE_OVERRIDES` so both now match their reskins at
    3500-6000.
  - Both override maps are wired into the `Magazines`/`Muzzles` group
    entries inside both `Gun_Attachments_Military` and
    `Gun_Attachments_Civilian` category defs.
  - Verified via the same scratch-copy dry-run method as every prior
    session: final displayed prices land exactly on the target bands
    (e.g. `mag_akm_drum75rnd` now 1500-2501, `mag_val_20rnd`/
    `mag_vss_10rnd` now 300-551, `m4_suppressor`/`ak_suppressor` now
    3501-6000), a second consecutive run converges identically, and
    `deno task audit-market` reported 0/0/0 both times. `deno check`/
    `deno lint`/`deno fmt --check` clean. Requires a normal server
    restart; no addon republish needed.

  **Sixteenth follow-up session: a batch of specific project-owner-
  flagged prices - drinks, fish/meat/corpse sell%, and medical.**
  - **`filteringbottle`/`expansionmilkbottle` re-priced.** "The
    filtering Bottle is too cheap, should be 1K" / "Milk bottle should
    also be about 500" - `market.ts`'s Consumables `Drinks` group gained
    a `priceOverrides` map: `filteringbottle` flat 1000 (was 145-240),
    `expansionmilkbottle` flat 500 (was 130-220).
  - **Fish and meat now sell for a flat 75% of buy price, tiered by
    difficulty instead of one flat band per group.** "All fish i.e.
    Carp should sell for 75% of its actual price and the lowest tier
    fish should sell for 400, and get progressively more valuable for
    other fish" / "I want the same thing for steak, 75% sell and
    increasingly higher prices for harder animals to kill". Added a new
    group-level `SourceGroup.sellPricePercent` field (`market.ts`) that
    takes priority over both the category-wide `sellPricePercent` and
    the normal per-tier lookup - needed since Consumables mixes
    Food/Drinks/Fruit_And_Vegetables (still the normal 20% global rate)
    with Meat/Fish (now a flat 75%) in one category. Both groups'
    `priceOverrides` were re-tiered into 4 difficulty bands each: Tier 1
    (easy/common - rabbit/chicken/goat/sheep meat, sardines/shrimp) buys
    at 534-700 (sells 400-525, the requested 400 floor); Tier 2
    (moderate - pig/cow/deer/fox meat, mackerel/carp) 700-900 (sells
    525-675); Tier 3 (harder wild game - boar/mouflon/reindeer meat,
    steelhead trout/walleye pollock) 900-1150 (sells 675-863); Tier 4
    (apex predators/rarest - bear/wolf meat, red caviar) 1150-1450
    (sells 863-1088). Fillets (carp/mackerel/steelhead trout) are priced
    above their species' whole-fish tier, same relationship steaks
    already have over a raw carcass.
  - **Chicken/hare whole carcasses also sell for a flat 75%, rat corpses
    deliberately excluded.** "Same for chicken and hare corpses, not rat
    corpse tho" - `DeadChicken_Brown/Spotted/White`/`DeadRooster`/
    `DeadRabbit` aren't managed by a `market.ts` group (see the Twelfth
    session's writeup on why they needed a direct `FOOD_PRICE_FIXES`
    entry in the first place), so a new `marketGapFill.ts` map,
    `FOOD_SELL_PERCENT_FIXES`, sets their `SellPricePercent` directly to
    75, applied in its own small repair loop right after
    `FOOD_PRICE_FIXES`'s. `DeadRat_Grey`/`DeadRat_White` intentionally
    left untouched at the normal 20% rate.
  - **Six more Medical.json items re-priced.** Medical is a self-merging
    category (`market.ts`'s tier overrides there only ever touch
    `SellPricePercent`/`MaxStockThreshold`, never price - see
    `buildMergedItems()`'s own comment), so these needed direct
    `MEDICAL_PRICE_FIXES` entries in `marketGapFill.ts`, same mechanism
    as the existing Blood Bag/Blood Collection Kit/Blood Test
    Kit/Codeine Pills fixes: `vitaminbottle` ("Multivitamins") "too
    cheap, 40... should be 600" - now flat 600; `disinfectantalcohol`
    ("Alcohol Tincture") "should be double the price" - now 210-340 (was
    105-170); `morphine`/`startkitiv`/`salinebag`/`epinephrine`
    (Morphine Auto-Injector/IV Starter Kit/Saline Bag/Epinephrine
    Auto-Injector) "morphin injector should be 9k not 20k, same with IV
    starter kit and saline bag and epipinephrine injector" - all now
    flat 9000 (were 27360-46880); `bloodbagfull` ("Blood Bag") "should
    probably be bought at 5k" - now flat 5000 (was a flat 2500 from an
    earlier session).
  - Verified via the same scratch-copy dry-run method as every prior
    session: every price above lands exactly on target, a second
    consecutive run converges identically, and `deno task audit-market`
    reported 0/0/0 both times. `deno check`/`deno lint`/
    `deno fmt --check` clean. Requires a normal server restart; no
    addon republish needed.

- **Seventeenth follow-up session: starting weapon bug fix, per-zone
  keycard sell prices, a gun-cabinet price fix, and a backpack economy
  pass (buy-price parity + sell-price cap).**
  - **Real bug found and fixed: the starting loadout's "random blunt
    weapon" selector never actually applied - every new spawn always got
    a `WoodenStick` no matter what.** `Loadouts.xml` had an orphaned,
    unconditional `WoodenStick` item (leftover from an older, no-longer-
    in-`git`-history version of `tuneStartingKit()`) sitting _before_ the
    real `Selector type="RANDOM"` in the same `@InHands` slot - Bohemia's
    loadout parser takes the _first_ claim on a slot, so the random
    selector's roll was silently discarded every time. Per the project
    owner ("change the starting weapon from a shortstick to a Baseball
    bat"), replaced the whole 4-way random selector with one deterministic
    `BaseballBat` item, and `tuneStartingKit()` (`src/loot.ts`) now also
    detects and strips the legacy orphaned stick _and_ the legacy selector
    string on every run, so a live server self-heals to exactly one
    `@InHands` claim. Verified via a scratch-copy dry-run against the real,
    live `Loadouts.xml` (never touched directly) - both legacy patterns
    correctly stripped, exactly one `BaseballBat` left, second run a no-op.
  - **Tisy/NWAF zone keycards and the all-access card now sell for an
    exact, fixed amount instead of the generic keycard range.** "Tisy
    military cards should start selling from 1k for level 1 and go up to
    5k for level 5. same for NWAF zone 1-3. All access card should sell
    for 7K" - a new `KEYCARD_ZONE_PRICE_FIXES` map (`marketGapFill.ts`)
    sets each of the 9 zone/master keycards' `Min`/`MaxPriceThreshold` to
    the exact target and forces their own `SellPricePercent` to 100, so
    the flat value _is_ the payout - independent of the global sell
    percent. Every other single-location keycard (Blue/Green/Red/Violet/
    White/Yellow) is untouched, still on the original ranged pricing.
  - **Wooden gun cabinet kits re-priced out of the generic furniture
    band.** "Wooden gun cabinet is also too cheap, 401 should be more than
    that" - the 5 `bl_pallet_cabinet_*_Kit` classnames were sharing
    `BASE_BUILDING_MEDIUM_FURNITURE_KIT_PRICE` (400-900) with the barrel/
    prefab stove kits. Split into their own new `BASE_BUILDING_GUN_CABINET_
KIT_PRICE` band (1500-2400 - still well under the dedicated military
    gun-storage cluster's 8500-13500) so it doesn't drag the stove kits up
    with it.
  - **Backpack buy-price "cheap off-brand color" exploit closed - 15
    reskins across 7 families re-aligned to their canonical sibling's
    price.** "Some better packs are priced less than worse ones" - closer
    inspection found the _same physical backpack_ (DayZ-Expansion-Market
    lists the color siblings in the canonical item's own `Variants[]`)
    had two separate market entries at very different prices - e.g.
    `alicebag_green` (Legendary, 18400-30660) vs. its own listed variants
    `AliceBag_Black`/`AliceBag_Camo` (7885-13140, ~43% of that) - letting a
    player buy the identical bag for less by picking the cheaper color.
    Same bug hit `armypouch_beige`/`assaultbag_black`/`attack2bag_black`/
    `coyotebag_brown`/`duffelbagsmall_camo`, plus civilian `taloonbag_blue`.
    All 15 reskin entries in `BACKPACK_PRICE_FIXES` (`marketGapFill.ts`)
    now match their canonical sibling exactly.
  - **Backpack sell prices capped to a computed 1,000-5,000 range instead
    of scaling uncapped with the tier system.** "They should sell decently
    since they're bulky but you should probably only be selling them
    between 1k-5k for the best one" - backpack buy prices span too wide a
    range (1,360 to 48,860) for one flat `SellPricePercent` to make sense
    at both ends, so a new repair loop (`marketGapFill.ts`, right after the
    price fixes above) computes each backpack's own percent from its own
    final `MaxPriceThreshold`: target payout = `MaxPriceThreshold * 15%`,
    clamped to 1,000-5,000, then `SellPricePercent = target / MaxPriceThreshold
    - 100`. Applies to every item in `Clothing_Back_Military`/
`Clothing_Back_Civilian` directly (no per-classname list to maintain),
so it stays correct even if buy prices change again later. Result: the
cheapest civilian bag (`waterproofbag_green`, 1,360 buy) sells up to
1,000 (74%); the priciest military bags (`coyotebag_brown`/`winter`,
      48,860 buy) sell up to 5,000 (10%) - everything else scales smoothly
      between.
  - Verified via the same scratch-copy dry-run method as every prior
    session: all four fixes land exactly on target, a second consecutive
    run converges identically, and `deno task audit-market` reported
    0/0/0 both times. `deno check`/`deno lint`/`deno fmt --check` clean
    (only the 2 known pre-existing, unrelated warnings remain). Requires a
    normal server restart for all four; no addon republish needed.

- **Eighteenth follow-up session: another batch of specific project-
  owner-flagged prices, plus a full vehicle economy overhaul (car prices,
  vehicle-part scarcity, and a new daily vehicle-parts restock trickle).**
  - **Gas masks re-priced to an exact buy/sell split.** "Gas masks should
    sell for 2000 and buy for 15k" - both were still at their Legendary-
    tier computed price (`gasmask` 10745-17920, `gp5gasmask` 24868-41458).
    Buy price pinned flat to 15000 (`HEADGEAR_AND_ARMOR_PRICE_FIXES`,
    `marketGapFill.ts`); since a flat buy price and a different flat sell
    price can't both be one absolute `{min,max}` field, the sell side is
    a separate `GASMASK_SELL_PERCENT_FIXES` map forcing `SellPricePercent`
    to 13.33% of that 15000 basis (roughly 2000).
  - **Medical: two more corrections.** `BloodBagIV` ("IV blood bag" - a
    genuine vanilla classname, distinct from the Terje-Medicine mod's own
    lowercase `salinebag`/`startkitiv`/etc.) was still at DayZ-Expansion-
    Market's own untouched default (350-580) - now a flat 7300 per "IV
    blood bag should buy for 7.3k". `startkitiv` ("IV Start Kit") is now
    a flat 1200 - "should buy for 1.2K", which reverses the flat 9000 an
    earlier session set it to; `salinebag`/`morphine`/`epinephrine` are
    untouched, still 9000 per that same earlier session.
  - **Frying pan flat-priced.** "Frying pan should be 2k" - was 405-675
    (`Tools_And_Melee`'s generic Uncommon-tier default); added to the same
    `hardcorePricesFixed` repair loop as everything else above.
  - **Burlap sack and GPS receiver re-priced.** `burlapsack` "should buy
    for 1271" (was 675-1125). `gpsreceiver` "should be double its current
    price" - was 1283-2138, now exactly 2566-4276.
  - **Wooden logs and firewood: sell-only, no longer purchasable at any
    price.** "Wooden logs shouldn't be purchasable, buy should be
    sellable for 100 a log. Same for firewood but firewood should sell
    for 50." Same `CanOnlySell` mechanism as the keycards/old food (new
    `WOOD_SELL_ONLY_CLASSNAMES`/`WOOD_SELL_ONLY_PRICE_FIXES` in
    `marketGapFill.ts`, wired into `traders.ts`'s "Everything" trader
    identity's `items` override map) - flat 100/50 sell price,
    `SellPricePercent` forced to 100 so the flat number is the exact
    payout.
  - **"Lumber Pile" (`PileOfWoodenPlanks`) removed from the trader
    entirely - not buyable or sellable at any price.** This is the raw
    base-building resource-pile prop (construction-site map decor and a
    lootable pile, not a real portable inventory item), previously
    lumped into `UTILITY_PRICE_FIXES`' shared 80-180 basic-material band
    alongside genuinely-portable materials. Added to `MANUAL_EXCLUSIONS`
    (same permanent-denylist mechanism as the flag pole/growing plants/
    raw sticks-and-stones) - its own crafted/loose materials (`WoodenLog`,
    above, and `WoodenPlank`) stay independently sellable.
  - **Two real category-placement bugs found and fixed: weapon-mounted
    flashlights and standalone NVG goggles were both sitting in the
    civilian Utility category.** "There are some gun flashlights in the
    Utility category. NVG in utility but want it in military top with
    helmets." `universallight`/`tlrlight` (real rail-mounted flashlight/
    laser attachments - not handheld tools like the flashlight/torches
    that correctly stay in Utility) moved from Utility's `Lights` group
    into `Gun_Attachments_Military` (Uncommon tier, covered by that
    category's existing flat 50%-of-buy sell rule). `nvgoggles`
    (standalone night-vision goggles) moved from Utility's `Electronics`
    group into `Clothing_Head_Military`'s existing `Eyewear` group,
    Legendary tier - same tier and location as its sibling
    `nvgheadstrap`, which was already correctly placed there.
  - **Full vehicle (car) price ladder rebuilt from scratch - "some
    better vehicles were the same price as lower tier cars."** All 85
    `Vehicles_Cars` classnames were clustered within one narrow 36000-
    96000 buy band regardless of real capability, except the two already-
    confirmed-correct endpoints: `expansiontractor` (25000-50000, lowest
    tier) and `expansionvodnik` (250000-500000, top tier) - both left
    untouched. Every other family now has its own explicit price band,
    climbing smoothly between those two endpoints: basic hatchback
    (32000-56000), sedan (38000-64000), civilian sedan (46000-76000),
    offroad hatchback (55000-90000), `Offroad_02` (60000-95000), covered
    cargo truck (70000-110000), Apoc pickup (90000-135000), Apoc SUV
    (95000-140000), UAZ (115000-155000), M1025 Humvee (150000-190000 -
    "should probably be 150K, yes it's a Humvee but an apocalyptic
    scrappy version"), bus (165000-225000), Landrover (175000-235000),
    then Vodnik. Every color/reskin variant of a given vehicle shares its
    base's price (same physical vehicle). Root-caused a subtlety along
    the way: the Apoc SUV/pickup/M1025 families don't exist in
    `market.ts`'s raw `Cars` source file at all - each is its own
    `"category": "Vehicles_Cars"` manifest group
    (`src/data/marketGapFill.json`), cloned entirely by
    `marketGapFill.ts`'s gap-fill loop from whatever `Vehicles_Cars.json`'s
    own first item happens to be - so a `market.ts` `priceOverride` on the
    `Cars` group's own `SourceGroup` silently never reaches them (proven
    live: they all inherited `offroadhatchback`'s price instead of their
    intended one). Fixed with a new absolute post-merge
    `VEHICLE_MANIFEST_CAR_PRICE_FIXES` map in `marketGapFill.ts`, the same
    "inherited an unrelated gap-fill template price" pattern
    `TGK_PRICE_FIXES`/`BOW_PRICE_FIXES` already use for guns.
  - **Vehicle parts and batteries (574 classnames across `Vehicle_Parts`/
    `Batteries`) tuned for real scarcity for the first time - previously
    the only category still sitting at DayZ-Expansion-Market's own
    untouched defaults.** "The stock for most vehicle parts is 20, want a
    default of 1... all the vehicle prices are around the same too, they
    need to be more expensive by some margin, min car part should cost a
    1k to give you a baseline." `VEHICLE_PARTS_MAX_STOCK_CAP` (`market.ts`)
    dropped from 40 to 1 - every part is now as scarce as any other
    Legendary-tier item. Every part's price was multiplied 2.5x its own
    pristine default and floored at 1000 (never lowers an already-
    pricier part, e.g. `offroad_02_wheel`'s 6845-11410 default becomes
    17112-28525, not clamped down) - computed once and baked into a new
    `src/data/vehiclePartsPriceFixes.json` data file (574 entries; kept
    out of `marketGapFill.ts` itself purely for file-size/readability)
    and applied as an absolute, idempotent post-merge fix, same pattern
    as every other price fix in this project.
    `VEHICLE_PARTS_INIT_STOCK_PERCENT_TARGET` kept at 100% (full, i.e.
    exactly the new cap of 1) rather than dropping to 0% alongside
    `Ghillies` - vehicle parts are still a functional necessity (buying a
    whole vehicle spawns its default attachments, drawing from these same
    per-classname stock pools), so starting every part at 0 would make
    the very first vehicle purchase after this change fail outright.
  - **New: a dedicated daily trickle-restock for vehicle parts/batteries,
    completely separate from the existing hourly weighted-tier system.**
    "Restock 1 empty vehicle part a day max." Deliberately isolated
    (`DZSurvivalTraderRestock_Module.c`'s new `VehiclePartsTick()`,
    `s_VehiclePartsCategories`, `VEHICLE_PARTS_COOLDOWN_HOURS = 24`,
    called once per real hourly `Tick()`) rather than folding
    `Vehicle_Parts`/`Batteries` into `s_ManagedCategories`: with ~574
    classnames all sharing the exact same cap of 1, mixing them into the
    shared weighted-pick pool would have massively diluted picks away
    from guns/gear/medicine every hour. Instead: a single shared 24h
    cooldown (not per-item) tracked in a new persisted
    `LastVehiclePartsRestockUnix` field, gating one uniform-random pick
    per real day across both categories combined (never above any part's
    own cap). `/restock now` (`ForceTick()`) now also force-triggers this
    pick immediately, ignoring the 24h cooldown, for testing.
    Requires an addon republish (`.c` changes), then a normal restart.
  - Verified via the same scratch-copy dry-run method as every prior
    session: every price/category change lands exactly on target, a
    second and third consecutive run converge to byte-identical output
    (confirmed via `diff -rq` on the whole `Market/` directory, not just
    the log's own touched-item counts - this project's merge-from-source
    design means several pre-existing log lines legitimately repeat their
    same non-zero count on every run, so a stable count is what
    "idempotent" actually looks like here, not a count reaching zero),
    and `deno task audit-market` reported 0/0/0 every time.
    `deno check`/`deno lint`/`deno fmt --check` clean on every touched
    file (only the 2 known pre-existing, unrelated warnings remain
    elsewhere).

- **Nineteenth follow-up session: keycard in-world rarity now tracks their
  trader value.** All 15 `Custom-Keycards` access-card classnames
  (`evg_keycards_*`) shipped with the exact same uniform vanilla-mod spawn
  rate (`nominal=2`, `min=1`, `restock=0`) despite the trader ladder
  already pricing them anywhere from 1,000 (Tisy01/NWAF01) up to 25,000
  (the six single-location Blue/Green/Red/Violet/White/Yellow cards) -
  "we can just adjust the keycard rarity according to whatever is in the
  loot pool." New `tuneKeycardRarity()` (`src/economy.ts`, same overwrite-
  in-place pattern as `tuneFoodScarcity()`/`tuneMoneyScarcity()`, wired
  into `doStart()` in `src/server.ts` right after `ensureModTypesMerged()`
  merges the mod's own reference types.xml in for the first time) gives
  each card an explicit (not multiplied - the vanilla defaults are already
  uniform) `nominal`/`min`/`restock` target keyed to its price tier:
  - Tisy01/NWAF01 (1,000): `nominal=3, min=1, restock=3h` - common enough
    to bootstrap progress.
  - Tisy02/NWAF02 (2,000): `nominal=2, min=1, restock=6h`.
  - Tisy03/NWAF03 (3,000): `nominal=2, min=0, restock=12h` - no guaranteed
    floor from here up.
  - Tisy04 (4,000): `nominal=1, min=0, restock=18h`.
  - Tisy05 (5,000, hardest single-zone tier): `nominal=1, min=0,
restock=24h`.
  - All-access master key (7,000): `nominal=1, min=0, restock=36h` -
    rarer than any single zone card.
  - Blue/Green/Red/Violet/White/Yellow (15,000-25,000, the priciest of
    all 15): `nominal=1, min=0, restock=72h` - the rarest finds on the
    whole map.
    The two keycard _holders_ (belt pouches, not access items -
    `evg_keycard_holder_camo`/`_leather`) are untouched, still their
    original common rate. Idempotent via the same marker-comment pattern as
    every other `economy.ts` tuning pass - safe to run on every start, and
    self-healing if a Steam update ever resets `db/types.xml` back to
    vanilla-plus-merged-mods. Verified via a scratch-copy dry run against
    the real `db/types.xml`: all 15 classnames changed on the first pass to
    their exact target values, a second consecutive run was a genuine no-op
    (marker already present), and `deno check`/`deno lint`/`deno fmt --check`
    came back clean on both touched files.

- **`DZSurvivalBaseDecay`** - abandonment cleanup for this server's
  vanilla-style bases (fence-kit/tent bases secured with a `Code-Lock`
  `CodeLock` item). Neither vanilla DayZ nor Code-Lock itself has any
  time-based decay at all - a locked base persists forever with no upkeep
  unless something physically destroys it (see `TODO.md`'s original
  "Base decay/raiding" writeup for the full survey of what was checked
  before building this: `DayZ-Expansion-Core`'s separate Territory Flag
  system was ruled out as a disruptive model change rather than a drop-in
  decay layer, and no well-reviewed drop-in Workshop decay mod was found).
  Implemented as its own tiny addon rather than touching Code-Lock's own
  save format at all: activity is tracked in a **separate JSON file**
  (`$profile:DZSurvivalServerPack\BaseDecay.json`, same directory as
  `TraderRestock.json`), keyed by each lock's own position rounded to the
  nearest meter (`DZSurvivalBaseDecay.PositionKey()`) - stable across
  restarts since a lock attached to a fence/tent never moves. **Per the
  project owner's explicit requirement, a locked base decays
  (force-unlocked and dropped) after 30 real days with no recorded
  activity.**

Getting the activity signal right took real reverse-engineering of
Code-Lock's own unpacked source (`armake2 unpack` against
`server/@Code-Lock/addons/codelock.pbo`), because the obvious approaches
both turned out to be wrong:

- **Hooking `CodeLock`'s own methods alone misses the single most common
  real activity**: an owner/guest opening a gate/tent they already know
  the code for goes through `ActionInteractLockOnFence.OnStartServer` /
  `ActionInteractLockOnTent.OnStartServer`, which call `fence.OpenFence()`
  / `tent.ToggleAnimation("entrancec")` **directly** - the `CodeLock`
  object itself is only read (`GetLockState`/`IsOwner`/`IsGuest`), never
  mutated, on that path. Fixed by also hooking those two Action classes
  (`DZSurvivalBaseDecay_Actions.c`), re-deriving the same
  `isOwner||isGuest` condition the vanilla body already checks (there's
  no side effect to key off through a `super()` call that returns
  `void`).
- **Hooking `Fence.OpenFence()`/the tent equivalent directly (instead of
  the Action classes) was tried and rejected**: vanilla's own
  `Fence.AfterStoreLoad()` calls `OpenFence()` again on every server
  restart if the gate was left open last session - hooking that
  directly would falsely record "activity" for every open-gate base on
  every single restart, defeating the whole point of decay.
- **`CodeLockServerRPC.EnterCode()`** (a stranger successfully entering
  the passcode) **is a private method and can't be overridden at all**
  - but it always calls `codelock.ServerSetOwner(id)` right before
    opening, on both the fresh-claim and stranger-becomes-guest paths, so
    hooking `ServerSetOwner()` instead covers this case with no loss of
    coverage.
- `CodeLock.LockServer()` (initial claim / passcode changes) is also
  hooked directly - unambiguous, deliberate activity.
- Between `LockServer`/`ServerSetOwner` (`DZSurvivalBaseDecay_CodeLock.c`)
  and the two Action-class hooks (`DZSurvivalBaseDecay_Actions.c`),
  every real way a legitimate user interacts with a lock is covered.

A runtime registry of every currently-spawned `CodeLock` (rebuilt fresh
every boot via `EEInit()`/`EEDelete()`, never persisted itself) is
scanned once a day (`TICK_INTERVAL_MS` - daily granularity is plenty of
precision for a 30-day window). Any lock that's currently locked and has
gone `>= 30` days without a recorded activity timestamp gets force-
unlocked via `lock.NewUnlockServer(null, parent)` - **the exact same
"force-unlock with no player" pattern Code-Lock's own `Fence.c` already
uses internally** (`OnPartDestroyedServer` calls
`codelock.NewUnlockServer(null, this)` when a connected fence part is
destroyed with no player attribution) - a mod-author-sanctioned way to
unlock and drop a lock with nobody holding it, making the base freely
enterable/raidable without this addon deleting or damaging any objects
itself. A lock with no recorded activity yet (never seen before this
addon existed) is baselined to "now" the first time it's checked, not
treated as already overdue - so deploying this addon doesn't instantly
decay every pre-existing base in the world.

Same observability precedent as `DZSurvivalTraderRestock`: every daily
tick logs a heartbeat via `GetGame().AdminLog()` (checked/decayed
counts) regardless of outcome, plus one line per actual decay event -
both visible live via Community-Online-Tools' admin log viewer. Two
matching COT chat commands exist for on-demand checks/testing (same
`JMModuleBase`/`JMModuleConstructor` extension point as
`DZSurvivalTraderRestock`'s own `/restock` commands, gated by a separate
`Admin.DZSurvivalBaseDecay.Trigger` permission):

- `/basedecay status` - reports how many locked bases are currently
  tracked and how many days remain until the closest one would decay.
- `/basedecay now` - runs a real decay pass immediately (identical logic
  to the daily tick), for testing without waiting up to 24h.

See `DZSurvivalBaseDecay_COTCommand.c`.

**This addon lives in `serverpack/` (not `serverpack-serveronly/`),
despite its actual decay logic being entirely server-side
(`GetGame().IsServer()`-guarded).** It originally lived in the
server-only pack, since none of its hooks are player-facing - but its COT
chat commands register a `JMModuleBase` + permission node, and COT
requires every registered permission to exist identically on both client
and server (it compares permission-tree structure, not just values, when
syncing roles to a connecting client). Registering
`Admin.DZSurvivalBaseDecay.Trigger` only on the server (because the
server-only pack, by design, never loads on the client) gave the client's
local tree one fewer child under "Admin" than the server's, which threw
`JMPermission::OnReceive`'s "Received child count N for X does not match
registered child count M!" while deserializing the role sync on every
connect - silently corrupting that client's entire permission tree from
then on. The practical symptom (confirmed live on this project, 2026-09)
was extremely confusing to diagnose: Community-Online-Tools' own admin
UI/keybinds (END/Y/H/INSERT etc, all gated on
`GetPermissionsManager().HasPermission("COT.View")`) stopped responding
to any input at all, with no error shown in-game, while things that only
check permissions server-side (e.g. this same addon's own /basedecay
chat command gating, and DZSurvivalTraderRestock's /restock commands)
kept working completely normally - because COT's `JMCommandModule.OnRPC`
only ever runs on the server, so it never needed the client's (broken)
copy of the tree. Root cause was only found by digging through the
client's own RPT (at
`<Proton prefix>/drive_c/users/steamuser/AppData/Local/DayZ/DayZ_x64_*.RPT`

- not the more obvious `Documents/DayZ/` profile folder, which this
  client install doesn't write RPTs into at all) for a Virtual Machine
  Exception around the exact moment of connecting. **Lesson for any future
  addon: registering anything into COT's module/permission system at all
  (any `JMModuleBase` subclass, any
  `GetPermissionsManager().RegisterPermission()` call) forces that addon
  into the shared client+server pack, full stop - no matter how
  server-only its actual behavior is.** `src/server.ts`'s `doStart()` now
  also skips loading `serverpack-serveronly/` entirely whenever it has no
  addons (rather than failing to build/hard-erroring), so this pack
  staying empty going forward is an intentional, safe default rather than
  an oversight.

**Status: confirmed a clean compile via `deno task verify-serverpack`**
(boots the real server, no script errors/warnings attributable to this
addon in the RPT). **Not yet confirmed live over a real 30-day window**
(obviously can't be tested in one sitting) - see `TESTS.md` for a
suggested faster smoke test (temporarily lowering `DECAY_DAYS`, or
hand-editing `BaseDecay.json` with an old timestamp to force a decay on
the next tick).

- **`DZSurvivalTraderFireplace`** - spawns and permanently ignites exactly
  one `FBF_Fireplace` (from `@Forever_Burning_Campfire`) at the custom
  trader city's fire barrel, fully automated (no admin ever needs to
  manually spawn/hold/ignite it). Deliberately does **not** use a repeating
  `CreateObject()` call or a DayZ-Editor placement - the mod's own Steam
  page explicitly warns `FBF_Fireplace` "shouldn't be spawned with VPP
  builder tools or DayZ Editor... if you leave them in init/editor/vpp,
  they will multiply" (it's a genuine persistent entity, like a
  player-built campfire). Guarded by a one-time persistent marker
  (`$profile:DZSurvivalServerPack\TraderFireplace.json`, same pattern as
  `DZSurvivalTraderRestock`'s own state file) so it only ever spawns once,
  even across every future restart. `src/foreverBurningCampfire.ts`
  separately places the mod's other, plain decorative props (fire barrel,
  torches, area light - none of which multiply) via DayZ-Expansion-Core's
  generic placed-object `.map` mechanism.

  **Status: confirmed a clean compile via `deno task verify-serverpack`**
  only - see `TESTS.md` for what still needs confirming on a real live
  server (visual placement, the actual ignition firing, and republishing
  so players receive it).

- **`DZSurvivalTraderWarmth`** - keeps the custom trader city acting as a
  warm sanctuary: every 1.5 seconds, floors every connected player's
  `HeatComfort` stat up to `0.10` while they're within 175m of the trader
  city (`src/traders.ts`'s `CUSTOM_SAFE_ZONE_RADIUS`, same radius as the
  trader safe zone). This is a real, not-faked mechanic - `HeatComfort` is
  the exact stat vanilla itself uses to decide whether a player is warm
  enough to avoid hypothermia (confirmed via DZ's own scripts.pbo,
  `PlayerStatsPCO.c` registers it with range `-1..1`, default `0`;
  `Environment.c`'s `ProcessHeatComfort()` is what normally drives it from
  clothing/weather/stomach temperature on a fixed 3-second cycle).
  Re-applying the floor every 1.5s (twice that cycle) guarantees it keeps
  winning while a player is in the zone; the moment they leave, this simply
  stops touching their stat and vanilla's own weather-driven calculation
  immediately takes back over - no lingering buff to expire.
  Pure vanilla mechanic, no Expansion dependency needed.

  **Fixed a live "boiling hot to death" bug** (previously this
  unconditionally _set_ `HeatComfort` to `1.0`, the absolute max, every
  tick). Vanilla's own `HeatComfortMdfr.c` treats sustained `HeatComfort`
  above `0.15` (`PlayerConstants.THRESHOLD_HEAT_COMFORT_PLUS_WARNING`) as a
  water-loss hazard, and above `0.45`
  (`THRESHOLD_HEAT_COMFORT_PLUS_CRITICAL`) as a genuine health-loss hazard,
  scaling up to 0.30 HP/second at `1.0` - forcing the max value every 1.5s
  pinned every player in the zone at that maximum burn rate for as long as
  they stood there. Fixed by (1) lowering the target to `0.10`, safely
  under the `0.15` warning threshold so this addon can never itself trigger
  any penalty, and (2) only ever raising `HeatComfort` up to that floor
  when the player's real value is currently below it - never lowering a
  naturally higher (or dangerously hotter) value. See the file header
  comment in `DZSurvivalTraderWarmth_Module.c` for the full writeup.

  **Status: confirmed a clean compile via `deno task verify-serverpack`**;
  the original bug and its cause were confirmed live by the user (severe
  health loss while standing in the trader safe zone). The fix above has
  not yet been confirmed live - see `TESTS.md`.

- **`DZSurvivalTentWarmth`** - the same "warm up" idea as
  `DZSurvivalTraderWarmth` above, but for any pitched tent anywhere on the
  map instead of the one fixed trader-city position (project owner: "can
  we make it so that being in a tent stops the weather from making the
  player colder"). Tents are player-placed and move/get destroyed freely,
  so there's no coordinate to hardcode here - every 1.5s this looks up real
  nearby objects around each connected player via `GetGame().
GetObjectsAtPosition()` (the same native proximity query vanilla's own
  `PluginUniversalTemperatureSourceServer` debug tool and `Bot_Hunt.c`/
  `WoodBase.c` use - confirmed via unpacking `scripts.pbo`) and checks
  whether any of them is a real, currently-`PITCHED` tent (any
  `TentBase`-derived class - `MediumTent`/`LargeTent`/`CarTent`/
  `PartyTent`, vanilla's own `IsItemTent()` flag confirms this generically,
  so a modded tent that still derives from `TentBase` is covered too)
  close enough (4m horizontal, 2.5m vertical tolerance - loosely sized to a
  large/party tent's real footprint) to count as "sheltering under it". A
  `PACKED` tent (folded up, in a bag or on the ground) deliberately does
  **not** count - only a pitched one provides cover.

  Deliberately does **not** hook into vanilla's own real heat-source system
  (`UniversalTemperatureSource`/`UTemperatureSource` - confirmed via
  unpacking `scripts.pbo`, this is the actual mechanism `FireplaceBase`/
  `Torch` use to warm nearby players from a lit fire) even though it exists
  and would be the more "native" route: wiring it up means modding
  `TentBase` itself (every tent, including any third-party modded one,
  inherits from it) to register a permanent temperature source, and that
  system's Lambda/settings plumbing is built around heat radiating outward
  from a burning object, not "you're standing under cover" - a materially
  riskier change to get right and verify than reusing the exact
  floor-raise mechanic already confirmed safe and working live on
  `DZSurvivalTraderWarmth` (same `WARM_TARGET = 0.10`, same "only ever
  raise, never lower" rule - see that addon's own BUG HISTORY comment for
  why this specific value and rule are required to avoid the
  hyperthermia/water-loss bug).

  **Status: confirmed a clean compile via `deno task verify-serverpack`**
  only - not yet confirmed live (pitch a tent, get cold, stand at it,
  confirm `HeatComfort` floors at `0.10`) - see `TESTS.md`.

- **Twentieth follow-up session: `Custom-Keycards` fully removed, replaced
  by `KeyCard-Rooms-Better`.** The project owner decided to drop
  `Custom-Keycards` (workshop id `2810212624`) entirely in favor of
  `KeyCard-Rooms-Better` (workshop id `3332979792`) as the sole
  keycard-locked-room system - confirmed the two mods share zero item
  overlap (`KeyCard-Rooms-Better` uses its own entirely separate
  `RedemptionKeyCard_01/02/03` cards, `Land_KlimaX_T1/T2/T3Door` doors, and
  `RedemptionMilitaryCrate` loot crate, with no dependency on
  `Custom-Keycards`' `evg_keycards_*` items at all). `mods.txt` updated
  accordingly (`@KeyCard-Rooms-Better` replaces `@Custom-Keycards`).
  **Superseded by this session: the Ninth/Tenth/Twelfth/Seventeenth/
  Eighteenth/Nineteenth follow-up sessions' keycard pricing/rarity/
  find-only writeups above** - all of that `evg_keycards_*` trader wiring
  (`src/marketGapFill.ts`'s `KEYCARD_*`/`MASTER_KEYCARD_*` constants and
  gap-fill loops, `src/traders.ts`'s `KEYCARD_BUYSELL_OVERRIDES`,
  `src/economy.ts`'s `tuneKeycardRarity()`) was removed outright rather
  than adapted, since the item family itself no longer exists on this
  server. Left in place purely as dated history per this file's own
  convention of preserving prior session writeups even when superseded.

  A necessary one-time cleanup, not just a wiring removal: every server
  that ever ran `Custom-Keycards` already has its 17 `evg_*` classnames
  (15 `evg_keycards_*` cards + 2 `evg_keycard_holder_*` pouches)
  permanently merged into the mission's `db/types.xml` by
  `ensureModTypesMerged()` - that merge is additive-only and never
  removes anything, so simply deleting the trader wiring would have left
  all 17 as orphaned, still-spawnable-in-loot-but-completely-unsellable
  dead weight forever (confirmed via a scratch-copy `deno task
audit-market` dry run surfacing exactly these 17 classnames as a fresh
  gap the moment the wiring was removed). New
  `ensureCustomKeycardsTypesRemoved()` (`src/modTypes.ts`, wired into
  `doStart()` in `src/server.ts` right after `ensureModTypesMerged()`)
  regex-strips each of the 17 `<type name="...">...</type>` blocks out of
  `db/types.xml` if still present - a no-op on a fresh install that never
  ran the mod, and self-healing/idempotent on one that did (removes them
  once, then nothing on every subsequent start). Verified via a
  scratch-copy dry run against the real `db/types.xml`: first pass removed
  exactly 17 blocks, a second consecutive pass was a genuine no-op, and
  `deno task audit-market` afterward reports **0 gaps** again (confirming
  the 17 formerly-orphaned classnames are fully gone, not just
  unsellable). `deno check`/`deno lint`/`deno fmt --check` clean on every
  touched file.

  **Not yet done, tracked in `TODO.md`:** `KeyCard-Rooms-Better`'s real
  door/crate classnames beyond the one example in its own Steam Workshop
  description (`RedemptionKeyCard_02`) are unconfirmed until the mod is
  actually downloaded and inspected - no trader pricing, rarity, or
  in-game door/crate placement work has been done for it yet. Its own
  loot pool (weapons/attachments/gear per door tier) is hardcoded in the
  mod's own `Global.c` inside `KeyCardSystemServerConfig.pbo`, so tuning
  contents (not just door/crate location, which is a simple self-
  generating `profiles/KeyCardSystem/config.json` edit) will need an
  unpack/edit/repack server-side override, the same pattern already used
  for `DDP-Climate-Zones`/`Tent-Actions-Fix`.

- **Twenty-first follow-up session: `KeyCard-Rooms-Better` actually wired
  up (TODO.md item #3), real PBOs unpacked to confirm every fact instead of
  guessing.** Used this project's own DayZ Tools (already installed under
  `daytools/`, Wine prefix `.wine-daytools/`) to unpack and decompile every
  PBO in the mod: `daytools/Bin/PboUtils/BankRev.exe -f <destdir> <pbo>`
  (note: `FileBank.exe` in the same folder is pack-only, despite living
  alongside the real unpacker) and
  `daytools/Bin/CfgConvert/CfgConvert.exe -txt -dst <out.cpp> <config.bin>`
  to decompile binarized configs - both run via
  `WINEPREFIX=.wine-daytools nix develop --command wine <tool> <args>`. A
  new, reusable technique for this project - previously only used for PBO
  _signing_, not inspecting third-party mod content.

  Real facts confirmed this way (the mod's own Workshop discussion example
  config, used as a starting guess in `TODO.md`, turned out to only show 1
  of the real 4 keycard tiers):
  - 4 real keycard classnames: `RedemptionKeyCard_01/02/03/04` (`redemptionkeycards.pbo`'s `CfgVehicles`, base class
    `RedemptionKeyCard_Base : Inventory_Base`). Only `_01/_02/_03` ship in
    the mod's own natural-loot `types.xml` - `_04` is a deliberate,
    never-spawns-naturally terminal trophy (confirmed: it has a real
    `keycard04_co.paa` texture, so it's an intentional 4th tier, not a cut
    feature).
  - Progression chain (`keycardsystemserverconfig.pbo`'s
    `t1door.c`/`t2door.c`/`t3door.c`): `Land_KlimaX_T1Door` (opened by
    Card_01) rewards Card_02; `T2Door` (opened by Card_02) rewards Card_03;
    `T3Door` (opened by Card_03) rewards Card_04, the terminal reward - no
    T4 door exists in this mod.
  - **Door/crate placement is fully automatic, no manual work needed at
    all** - `keycardsystemserver.pbo`'s
    `PluginKeyCardSystemServer.Init()` hardcodes 9 real Chernarus door
    locations (5x T1, 3x T2, 1x T3) and self-generates
    `profiles/KeyCardSystem/config.json` with them on first run.
  - The mod's own crate loot is genuinely undertuned out of the box: every
    door tier's `Global.c` loot-pool arrays (`KEYCARD_LVL{1,2,3}
{VEST,HELMET,BACKPACK,MEDIC}`, `KEYCARD_OTHERITEMS`) ship completely
    empty (`{"", ""}` placeholders only), so every crate - regardless of
    tier - only ever contains an identical M4A1 (25% chance, 1-2 mags) plus
    the next-tier keycard. No vest/helmet/backpack/medical reward at any
    tier by default.

  **Loot pool customization was attempted, then deliberately abandoned as
  unreliable** rather than risking a fragile fix - documented in detail so
  it isn't re-attempted blindly later:
  - First tried `modded class Land_KlimaX_T1/T2/T3Door` (override
    `AddLoot()` directly) from a new serverpack addon
    (`DZSurvivalKeycardLoot`, since deleted). Reliably failed to compile
    ("Unknown type 'Land_KlimaX_T1Door'"), even though the _identical_
    override compiles fine from inside the mod's own
    `keycardsystemserverconfig.pbo` (confirmed via an isolation test -
    removing the new addon entirely left the mod's own copy compiling
    cleanly). Renaming the addon's virtual mount path (`$PBOPREFIX$`) _and_
    its actual built PBO filename to sort alphabetically after
    `keycardsystem.pbo` (the PBO that actually declares
    `class Land_KlimaX_T1Door`, which itself has **no CfgPatches/CfgMods
    entry at all** - a bare-script "orphan" PBO) both had zero effect,
    ruling out simple compile-order theories.
  - Second tried referencing the mod's own `KEYCARD_LVL1VEST`-etc. globals
    directly (no class extension at all - these are plain top-level
    `const static ref array<string>` globals, and mutating their contents
    via `.Clear()`/`.Insert()` needs no inheritance). This _also_ failed
    ("Can't find variable 'KEYCARD_LVL1VEST'"), from a correctly-placed
    `modded class MissionServer` in the addon's Mission module (a real,
    separate bug was found and fixed along the way here too - the file was
    initially placed under `scripts/4_world/` instead of `scripts/
5_mission/`, since `MissionServer` belongs to the Mission module, not
    World; that produced its own "Unknown type 'MissionServer'" until
    moved).
  - Conclusion: the owning PBOs (`keycardsystem.pbo`,
    `keycardsystemserverconfig.pbo`) have no CfgPatches identity at all,
    and cross-mod symbol visibility (both class extension and even plain
    global-variable reference) appears to require one - a real
    EnforceScript/DayZ limitation, not something fixable via
    `requiredAddons` or load/compile order. The only remaining way to
    change this mod's crate contents is unpacking, editing, and repacking
    its own PBO directly (which the mod author's own Workshop page
    suggests) - this project avoids binary-surgery on third-party mods on
    principle, so this was left alone. Crates still deliver real value
    (the keycard progression itself, plus a real chance at an M4A1) - just
    not custom per-tier gear.

  **What was actually wired up (all verified working):**
  - `src/keyCardRooms.ts` (new) merges the mod's own natural-loot
    `types.xml` (`RedemptionKeyCard_01/02/03` - no `<types>` root wrapper,
    so the generic `ensureModTypesMerged()` scanner never picks it up) into
    `db/types.xml`, additive/idempotent (verified: a second consecutive run
    added 0 more). Wired into `doStart()` in `src/server.ts`.
  - `src/marketGapFill.ts`'s new `KEYCARD_ROOMS_CLASSNAMES`/
    `KEYCARD_ROOMS_PRICE_FIXES` (plus a new manifest group in
    `src/data/marketGapFill.json`, gap-filled into the General Store's
    Utility category) price all 4 real tiers with a flat exact sell price
    and `SellPricePercent` forced to 100:
    `RedemptionKeyCard_01` 2,000 / `_02` 5,000 / `_03` 12,000 / `_04`
    30,000 - `_04` priced near this project's existing "rarest finds sell
    around 30000" precedent.
  - `src/traders.ts`'s new `KEYCARD_ROOMS_BUYSELL_OVERRIDES` marks all 4
    `CanOnlySell` (find-only, never purchasable at any price) in the
    General Store identity, same mechanism as the old-food/wood overrides.
  - Verified end-to-end: `deno task verify-serverpack` compiles cleanly;
    a direct run of `tuneExpansionMarket()`/`ensureMarketGapFill()`/
    `ensureCustomTrader()`/`auditMarket()` against the real project data
    confirms all 4 classnames land in `Utility.json` at their exact
    intended price/CanOnlySell state, and `auditMarket()` reports
    **0 gaps** afterward.

- **Twenty-second follow-up session: `KeyCard-Rooms-Better` crate loot -
  direct PBO repack attempted, but reverted after a live client kick.
  SUPERSEDED by the Twenty-third session below - read that one for what
  actually shipped.** The project owner explicitly authorized a direct PBO
  repack at the time ("repack is totally fine, and this is a repack of an
  original mod so go for it"), and this session did exactly that,
  repacking+re-signing `keycardsystemserverconfig.pbo` in place with a
  project-local key.

  **This turned out to be wrong, and broke live client connections.**
  `@KeyCard-Rooms-Better` is loaded via `-mod=` (client-required) - the
  reasoning below ("real DayZ has no core mechanic that hashes/diffs a
  given mod's PBO between client and server") was incorrect. Confirmed
  live: after this shipped, the project owner's own client got kicked on
  every connect attempt with `Data verification error: Server has a more
recent version` for this exact PBO. `verifySignatures`/signing-key
  validity is not the only thing DayZ checks for `-mod=` content after
  all - something about content/version also has to match between client
  and server for at least this mod. `server/@KeyCard-Rooms-Better` was
  reverted back to a fresh, 100%-stock install (`rm -rf` + re-run
  `ensureMods()`, pulling from the untouched local depot cache - no
  re-download needed) to restore connectivity, and
  `src/keyCardConfigOverride.ts`/`keycard-config-override/` (this
  session's whole approach) were deleted outright rather than left around
  disabled, to make sure nothing could accidentally re-apply this again.
  The rest of this entry is kept only as a record of what was tried and
  why it failed - do not resurrect this approach.

  (Original write-up of the repack mechanics omitted here since none of it
  shipped - see git history before the revert if the exact implementation
  details are ever needed again.)

- **Twenty-third follow-up session: `KeyCard-Rooms-Better` crate loot,
  actually fixed safely this time, via `DZSurvivalKeycardLootOverride`.**
  Picking up straight after the revert above. Two more approaches were
  tried and ruled out before landing on the one that shipped:

  1. **A separate addon, `modded class Land_KlimaX_T{1,2,3}Door`** (the
     upstream mod's own per-door classes) - loaded via `-servermod=` so it
     could never be client-required/checked at all. Failed to compile
     (`Unknown type 'Land_KlimaX_T{1,2,3}Door'`) every time, confirmed via
     `verify-serverpack-serveronly` (which genuinely boots the real server
     with the full actual mod list plus the new addon and inspects the RPT/
     crash log - a real, meaningful check, not a rubber stamp). Tried and
     ruled out, independently: putting the new addon's `-servermod=`
     position last in the argument list (no effect); adding
     `requiredAddons[] = {"KlimaX_T1Door", ...}` referencing the per-door
     mod's own nested `CfgPatches` identities (no effect - these turned out
     to not even be real root-level addon identities, just incidental
     per-object `CfgPatches` blocks bundled inside `klimax_doors.pbo`'s own
     `Data/T{1,2,3}Door/config.bin`); renaming the addon's own `$PBOPREFIX$`
     to sort alphabetically after `KeyCardSystem` (the real origin of
     these classes - see next point) on the theory that World-script
     compilation processes files in alphabetical virtual-path order rather
     than mod-list order (no effect either).
  2. **Same idea, targeting `RedemptionMilitaryCrate` instead** (the
     actual crate item spawned by all three door tiers) - unlike the door
     classes, this one genuinely is a real, config-bound `CfgVehicles`
     class with its own proper `CfgPatches` identity
     (`redemptionkeycards.pbo`). Made no difference - identical `Unknown
type` failure. This ruled out "only bare script classes have this
     problem" as the explanation; whatever's actually going on affects
     `modded class` of _any_ class originating in a genuinely separate mod
     folder, config-bound or not. Also disproved the working theory that
     this was `-servermod=`-specific: moving the exact same minimal test
     addon into `../serverpack/` (loaded via `-mod=`, same as
     `@KeyCard-Rooms-Better` itself, and positioned _after_ it in the
     merged `-mod=` list) reproduced the exact same failure.

     For contrast, `DZSurvivalMapGate` (already living in `../serverpack/`,
     see its own file) _does_ successfully reach into another mod
     (`@DayZ-Expansion-Core`) - but on closer look it never actually does
     `modded class` on one of Expansion's own classes at all. It does
     `modded class MissionGameplay` (100%-vanilla, always loaded first by
     definition) and, from inside that, calls
     `PlayerBase.Cast(player).Expansion_GetInventoryCount(...)` - a normal
     method call on an already-vanilla-typed instance, not a class
     extension. That's the actual working, safe pattern - not "extend any
     other mod's class you like", but "extend vanilla, then reach into
     other mods dynamically from there".

  **What shipped instead - `DZSurvivalKeycardLootOverride`
  (`../serverpack/addons/DZSurvivalKeycardLootOverride/`), never touching
  a single `@KeyCard-Rooms-Better` class as a compile-time symbol:**
  - `modded class MissionServer` (vanilla, exactly like
    `DZSurvivalTraderRestock`'s own established pattern) starts a
    `GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Tick, 5000,
true)` repeating scan.
  - Every tick, for each of the mod's own 9 hardcoded door/crate positions
    (5x T1, 3x T2, 1x T3 - see `../KEYCARD_ROOMS_LOCATIONS.md`), calls the
    vanilla `GetGame().GetObjectsAtPosition3D(pos, 2.5, objects, null)`
    area query and matches by classname **string**
    (`obj.GetType() == "RedemptionMilitaryCrate"`) rather than a
    compile-time type reference - already a proven-safe pattern in this
    project (`DZSurvivalTraderRestock`'s own `ActionCheckTraderBoard.c`
    does the identical `obj.GetType() == BOARD_CLASSNAME` check).
  - A crate only gets filled once: `crate.GetInventory().GetCargo()`'s
    `GetItemCount()` has to be `<= 1` (nothing but the stock plugin's own
    auto-added keycard) - anything more means it's already been filled (by
    us, on a previous tick) or a player's put their own items in, and gets
    left alone. Restart-safe by construction (no separate persisted
    "already handled" state needed at all) and can't double-stock.
  - Loot pools/tiers are the same ones designed in the (reverted) Twenty-
    second session above, cross-checked against
    `profiles/ExpansionMod/Market/*.json`: T1 keeps the M4A1 weapon roll,
    T2 reskins to AKM, T3 reskins to a suppressed VSS, each tier's own
    vest/helmet/backpack/medic pool scales up in value, and
    `RedemptionKeyCard_0{2,3,4}` is added per tier so a T1/T2 crate hands
    over the next tier's key.

  **Verification.** `deno check` passed. `deno task verify-serverpack`
  (builds the real server pack, stages it, and boots the actual full mod
  list including `@KeyCard-Rooms-Better` - a real, meaningful compile
  check, already relied on above to catch the two failed approaches)
  passed clean: "Server pack scripts compiled cleanly". In-game crate
  contents (does a real T1/T2/T3 crate actually end up stocked after the
  ~5s scan interval once a door's unlocked) still needs a live playtest -
  added to `TESTS.md`.

- **Twenty-fourth follow-up session: two real bugs found and fixed in
  `DZSurvivalKeycardLootOverride` by unpacking the actual installed
  `@KeyCard-Rooms-Better` PBOs (`armake2 unpack`) and reading its own
  source, rather than relying on the previous session's assumptions.**
  Triggered by the project owner reporting nothing at the T3 door/crate
  position after opening it.

  1. **Every crate was getting a duplicate keycard.** The mod's own
     `T{1,2,3}Door.c` (`KeyCardSystemServerConfig.pbo`) already adds the
     next-tier keycard unconditionally in its own `AddLoot()`
     (`RedemptionKeyCard_02/03/04`) - `DZSurvivalKeycardLootOverride` was
     redundantly adding a second copy of the same card on top. Fixed by
     removing those `CreateInInventory()` calls from this addon's own
     `AddT{1,2,3}Loot()`.

  2. **The "already filled" check could wrongly skip a legitimate,
     never-yet-filled crate.** It used to test `cargo.GetItemCount() > 1`.
     But the native `AddLoot()` has its own independent RNG (up to 16
     rolls at ~25% each, per its own `T{1,2,3}Door.c`) for adding a
     weapon+1-2 mags - entirely separate from and prior to this addon's
     own tick. A lucky roll pushes item count above 1 before this addon
     ever sees the crate, so the old count-based check would think it was
     "already filled" and skip it forever, silently leaving that crate
     without any vest/helmet/backpack/medic loot. Fixed: the check now
     looks for presence of one of that tier's own vest-pool classnames
     instead (e.g. `ukassvest_black` for T1) - a marker only this addon
     ever adds, since the native mod's own `KEYCARD_LVL*VEST` pools ship
     as empty `""` placeholders (confirmed straight from its own
     `global.c`). This is unaffected by the native mod's weapon RNG either
     way.

  **Also found (not a bug in this addon, but the real explanation for "the
  T3 crate had nothing in it"):** `@KeyCard-Rooms-Better`'s own
  `SecurityDoor.Close()` (called via `InitiateClose()`'s delayed callback)
  **deletes the reward crate entirely**, `autoClose` seconds after the
  door opens. Every one of the mod's 9 hardcoded door locations hardcodes
  `autoClose` to a flat `60.0` (confirmed straight from
  `PluginKeyCardSystemServer.c`'s `Init()`), plus a further `closeDelay` of
  10s before the door itself physically shuts (~70s total from open to
  crate deletion) - an easy miss on a first visit, especially the T3 door,
  which sits atop a tall tower and takes real time to climb to. Fixed via
  a new `ensureKeyCardRoomsAutoCloseExtended()` (`src/keyCardRooms.ts`,
  wired into `server.ts`'s `doStart()`): patches the mod's own
  self-generated `profiles/KeyCardSystem/config.json` (new
  `KEYCARD_ROOMS_CONFIG` path constant in `paths.ts`), bumping every
  door's `autoClose` from 60 to **240** seconds. Confirmed safe straight
  from the mod's own source: `Init()` only ever writes its hardcoded
  60-second defaults to `config.json` if that file doesn't exist yet -
  every subsequent boot unconditionally does
  `JsonFileLoader.JsonLoadFile(CONFIG, m_config)`, so whatever's on disk
  wins. A changed `autoClose` does make the mod's own `HasConfigChanged()`
  comparison return `true` once, but that only makes it discard its old
  persistence cache and re-`CreateObjectEx` all 9 doors fresh at their
  same `location`/`dir`/`crateLocation`/`crateDir` (none of which this
  patch touches) - harmless, and it only happens on the one boot right
  after this change lands. Only the `autoClose` number is ever modified -
  every other field is round-tripped untouched via `JSON.parse`/
  `JSON.stringify`, so this can't corrupt whatever vector format the
  mod's own serializer uses. If `config.json` doesn't exist yet (a fresh
  profile, or one wiped since this mod last ran), this function just logs
  and no-ops - the mod creates the file itself on its next real boot, and
  this patch takes effect the boot after that.

  **Verification.** `deno check` passed. `deno task verify-serverpack`
  (rebuilds the pack, boots the real server with the full actual mod
  list) passed clean both before and after every change in this session.
  `TESTS.md`'s existing KeyCard-Rooms-Better entry updated to describe
  both bugs and to check for exactly one keycard per crate (not two) and
  the longer door-open window.

**Twenty-fifth follow-up session** found the real, much bigger root cause
behind a user report of "nothing at the door coordinates, just an empty
field" (not merely a T3 timing issue as the prior session assumed):
`@KeyCard-Rooms-Better`'s own doors/crates had **never spawned at all, on
any boot, for anyone, ever.**

Root-caused by unpacking the actual installed mod PBOs directly
(`~/.local/share/Steam/steamapps/workshop/content/221100/3332979792/Addons/`,
via `armake2 inspect`/`unpack`/`derapify`, not just reading Steam Workshop
comments or going on assumptions): **3 of the mod's own PBOs -
`KeyCardSystem.pbo`, `KeyCardSystemServer.pbo`, and
`KeyCardSystemServerConfig.pbo` - ship with literally no `config.cpp`/
`config.bin` at all: no `CfgPatches`, no `CfgMods`, nothing telling the
DayZ engine to ever compile a single line of their script content.**
Confirmed by grepping every historical RPT log this server has ever
produced (dozens, across many prior sessions) for
`PluginKeyCardSystemServer`/`KEYCARDSYSTEM` - zero matches, anywhere, ever.
This is a genuine packaging defect in the upstream mod, not something any
prior session here broke.

This also retroactively explains the "Unknown type
'Land_KlimaX_T1Door'"/"Can't find variable 'KEYCARD_LVL1VEST'" failures
two earlier sessions hit trying a `modded class` extension approach (see
above): those classes and globals never existed as compiled script types
in the first place - there was no base class to extend, because the base
class's own owning PBO had never compiled either. Nothing to do with
cross-mod symbol visibility limits, as those earlier sessions assumed at
the time.

**Fixed** by adding a second `CfgMods` sub-class,
`KeyCardRoomsScriptBridge`, alongside the existing
`DZSurvivalKeycardLootOverride` `CfgMods` entry in
`serverpack/addons/DZSurvivalKeycardLootOverride/config.cpp` (confirmed:
multiple `CfgMods` sub-classes in one `config.cpp` is syntactically fine).
It bridges in the exact same already-shipped, unmodified `.c` files from
the 3 broken PBOs, by their virtual path, as extra script-module folders:

```cpp
class KeyCardRoomsScriptBridge {
  ...
  class defs {
    class worldScriptModule {
      files[] = {
        "KeyCardSystem/4_World/KeyCardSystem",
        "KeyCardSystemServer/4_World/KeyCardSystemServer",
        "KeyCardSystemServerConfig/4_World/SecurityDoorScriptsConfig"
      };
    };
    class missionScriptModule {
      files[] = {"KeyCardSystemServer/5_Mission/KeyCardSystemServer"};
    };
  };
};
```

This never repacks `@KeyCard-Rooms-Better`'s own PBOs - the engine merges
every loaded `-mod=` addon's virtual filesystem regardless of which
physical PBO a `files[]` path's contents actually live in, so bridging in
a path from another mod's PBO by name is enough. This has to be a `-mod=`
(client-required) addon, not `-servermod=` - the bridged classes (doors,
crates, open/close actions) are physical, client-visible world objects,
not server-only logic, so the client needs them compiled too. (This addon
already lived in `serverpack/addons/`, the client+server pack - a stale
comment in `server.ts`'s `doStart()` claiming it lived in
`serverpack-serveronly/addons/` instead, left over from an earlier plan,
was also corrected this session.)

While testing this fix, `deno task verify-serverpack` first failed with a
new compile error: `Multiple declaration of variable 'KEYCARD_LVL1VEST'`.
Root cause: a stray leftover file,
`serverpack/addons/DZSurvivalKeycardLootOverride/scripts/4_world/global.c`,
from an abandoned earlier approach, re-declared the exact same
`KEYCARD_LVL1VEST`-etc. global constant names as the real (now-bridged)
`global.c` - harmless while the bridge didn't exist yet (the real file
never compiled, so there was no collision), but broke the moment the
bridge made both copies compile in the same World script module. The
correctly-namespaced active file (`DZSK_*` names, to guarantee no
collision with the native mod's own globals) is
`DZSurvivalKeycardLootOverride_Global.c` - a previous session's handoff
notes claimed this exact stray file had already been deleted, but it
hadn't been; it's now actually removed.

Also discovered that `ensureKeyCardRoomsAutoCloseExtended()` (see the
Twenty-fourth session above) had been **documented as implemented but the
actual code was never written** - `src/keyCardRooms.ts` only had
`ensureKeyCardRoomsTypesMerged()`, no `KEYCARD_ROOMS_CONFIG` constant
existed in `paths.ts`, and nothing called it from `server.ts`. Implemented
for real this session, following the design already written up above
(patches `profiles/KeyCardSystem/config.json`'s `autoClose` from 60 to
240 seconds per door, idempotent, only touches that one field). Verified
directly against the real config.json generated by this session's
verification boots: patches all 9 door entries from 60→240 on first run,
correctly no-ops on a second run, and every other field round-trips
byte-for-byte unchanged (checked programmatically, not just by eye).

**Verification.**
`deno task verify-serverpack` now compiles cleanly _and_, for the first
time ever, produces `profiles/KeyCardSystem/config.json` - direct proof
`PluginKeyCardSystemServer.Init()` is actually running and spawning its 9
doors, something that had never happened on this server before. `deno
check`/`deno lint`/`deno fmt` clean on every touched `.ts` file (`deno
lint`'s 2 remaining findings, in `modVerify.ts`/`steam.ts`, are pre-existing
and untouched by this session). The auto-close patcher was verified in
isolation (`deno eval`, see above) rather than via a full `doStart()` boot,
since `verify-serverpack` only exercises the raw compile/boot path, not
the full tuning pipeline.

`KEYCARD_ROOMS_LOCATIONS.md`'s existing 9 door/crate coordinates (pulled
from the mod's own source in an earlier session) turned out to already
exactly match what `PluginKeyCardSystemServer.Init()` actually generated
once it finally ran for real - no location corrections were needed, only
the "nothing there at all" spawning bug above.

`TESTS.md`'s existing KeyCard-Rooms-Better entry rewritten to lead with
this session's real root cause (the mod never ran at all) rather than
undersell it as a T3-specific timing issue.

**Twenty-sixth follow-up session: `@KeyCard-Rooms-Better` removed from the
project entirely.** Even after the Twenty-fifth session's bridge fix made
the mod's doors/crates actually spawn for the first time ever, in-game
inspection showed the "rooms" were just a bare door standing in an empty
field - no surrounding room/bunker geometry at all, despite the mod's
Steam page name and screenshots implying otherwise. A full inspection of
every PBO the mod ships (`KeyCardSystem`, `KeyCardSystemServer`,
`KeyCardSystemServerConfig`, plus its two data/asset PBOs) confirmed there
never was any room/bunker model in the first place - only 3 door models, a
crate, and a keycard item exist anywhere in the mod's files. Building a
custom room to go around the doors would be a real modeling/level-design
task, not a config or script fix, and the project owner decided it wasn't
worth it ("lets just remove all this keycard stuff").

Removed: the `@KeyCard-Rooms-Better` mods.txt entry; this project's own
`DZSurvivalKeycardLootOverride` addon (the `KeyCardRoomsScriptBridge`
CfgMods bridge plus the dynamic crate-loot-fill logic from the
Twenty-second/Twenty-third sessions); `src/keyCardRooms.ts` (the
types-merge + auto-close-patch module from the Twentieth/Twenty-fourth
sessions); `KEYCARD_ROOMS_LOCATIONS.md`; the `KEYCARD_ROOMS_CONFIG`
constant in `src/paths.ts`; all calls into the above from `server.ts`;
and every `KEYCARD_ROOMS_*` gap-fill/pricing entry in
`src/marketGapFill.ts`/`src/traders.ts`/`src/data/marketGapFill.json`.

Added `ensureKeyCardRoomsTypesRemoved()` to `src/modTypes.ts`, mirroring
the existing `ensureCustomKeycardsTypesRemoved()` pattern from the
Twentieth session exactly: it strips any already-merged
`RedemptionKeyCard_01`/`02`/`03` `<type>` blocks out of `db/types.xml` on
any server that ran the mod previously (additive merges never
self-remove, so without this the entries would sit there forever as dead
weight). `RedemptionKeyCard_04` deliberately excluded - it was never
merged in the first place, since neither the mod's own natural-loot
`types.xml` nor this project's now-deleted `KEYCARD_ROOMS_TYPES` array
ever included it.

On the next server start: the mod's own 9 doors/crates simply stop
spawning (removed from `-mod=`), any `RedemptionKeyCard_01/02/03` a player
already picked up becomes a harmless orphaned item (same as any other mod
removal - no crash, just sits in inventory/on the ground until
dropped/despawned), and the `db/types.xml` cleanup above runs
automatically. No player-facing action needed. `deno check`/`deno
lint`/`deno fmt --check` clean on every touched file; `verify-serverpack`
confirmed the pack still builds with the remaining 7 addons.

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

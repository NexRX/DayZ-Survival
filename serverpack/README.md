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
  a `Stone` while standing on gravel/dirt/rail-ballast surfaces (train
  tracks, dirt trails) - no tool required. Meant to pair with a
  stone-crafted sharp/butchering tool (vanilla `StoneKnife`) rather than
  handing one out at spawn.

  **Status: confirmed working end-to-end** - builds, signs (with the real
  `DSSignFile.exe`), publishes to Workshop (`3789404408`), downloads back
  down through the normal mod-install pipeline, boots cleanly, and a real
  client has successfully connected without being kicked.

  **Known issue**: standing on a railway did not surface a "find stone"
  action option - see the surface-type check in
  [`addons/DZSurvivalFindStone/scripts/4_world/Actions/ActionFindStoneOnPath/ActionFindStoneOnPath.c`](addons/DZSurvivalFindStone/scripts/4_world/Actions/ActionFindStoneOnPath/ActionFindStoneOnPath.c)
  - needs the actual vanilla surface name(s) for rail ballast confirmed
    (`GetGame().SurfaceGetType()`'s return value for that terrain), since the
    current list was a best guess.

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

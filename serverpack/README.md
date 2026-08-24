# DZSurvivalServerPack

This project's own **single Workshop mod** bundling all of its custom
from-scratch DayZ addons (Enforce Script), so there's only one Workshop item
to maintain, subscribe to, and add to `mods.txt` - regardless of how many
custom features live inside it.

Built and signed on Linux with
[armake2](https://github.com/KoffeinFlummi/armake2) (packaged in this
repo's `flake.nix`) - no Windows or DayZ Tools needed. See
[`../src/modBuild.ts`](../src/modBuild.ts) and
[`../src/modPublish.ts`](../src/modPublish.ts).

## Adding a new addon

Each subfolder of `addons/` becomes its own PBO inside this one mod. To add
a new custom feature:

1. Create `addons/<YourAddonName>/` with the usual PBO source layout:
   ```
   addons/<YourAddonName>/
   ├── config.cpp        # CfgPatches
   ├── $PBOPREFIX$        # the PBO's virtual script-root, e.g. "4_World"
   └── 4_World/...        # (or whichever root the prefix points at)
   ```
2. Add a matching line to `mod.cpp`'s `worldScriptModule.files[]`:
   `"DZSurvivalServerPack/<YourAddonName>"`.
3. Run `deno task build-serverpack` - it auto-discovers every folder under
   `addons/` (anything with a `config.cpp`) and packs/signs each into its
   own `Addons/<YourAddonName>.pbo`, all under the one `@DZSurvivalServerPack`
   mod folder, signed with the same shared keypair.

No build-tooling changes are needed to add addons - `src/modBuild.ts` is
generic over whatever it finds under `addons/`.

## Current addons

- **`DZSurvivalFindStone`** - a hold-to-search action that lets players find
  a `Stone` while standing on gravel/dirt/rail-ballast surfaces (train
  tracks, dirt trails) - no tool required. Meant to pair with a
  stone-crafted sharp/butchering tool (vanilla `StoneKnife`) rather than
  handing one out at spawn.

  **Status: source written, build verified, gameplay unverified.** It packs
  and signs cleanly (`config.cpp` rapifies without errors), but has not been
  run in-game yet. Two spots are flagged `TODO verify` in
  [`addons/DZSurvivalFindStone/4_World/Actions/ActionFindStoneOnPath/ActionFindStoneOnPath.c`](addons/DZSurvivalFindStone/4_World/Actions/ActionFindStoneOnPath/ActionFindStoneOnPath.c):

  1. `DayZPlayerConstants.CMD_ACTIONFB_DIGWORM` - the animation command used
     while searching. If this constant name doesn't compile, look through
     `DayZPlayerConstants` (visible in DayZ Tools / decompiled vanilla
     scripts) for the closest ground-directed/kneeling animation and swap it
     in.
  2. `GetGame().SurfaceGetType(x, z)` - the surface-lookup call used to
     detect gravel/dirt/rail/path ground under the player. Confirm the exact
     method name/signature for your game version (some builds expose
     `SurfaceGetType3D(vector pos)` instead) and adjust if needed.
  3. Spawned item is `Stone`, not `SmallStone` - vanilla DayZ already ships a
     craftable `StoneKnife` (flagged crafted in its own types.xml entry), so
     this addon deliberately adds no crafting recipe of its own. `Stone` is
     a best guess at the real vanilla crafting ingredient by naming
     convention - open the in-game crafting menu, check what `StoneKnife`
     actually requires, and swap the spawn calls in
     `ActionFindStoneOnPath.c` to `SmallStone` if that turns out to be
     wrong.

## Building

From the project root, inside `nix develop`:

```bash
deno task build-serverpack
```

This generates a shared signing keypair on first run (`.serverpack-keys/`,
gitignored - back it up, losing it means future updates can't be signed
with the same key) and produces a publish-ready `@DZSurvivalServerPack/`
folder under `.serverpack-build/` (gitignored) containing `mod.cpp`,
`Addons/*.pbo` (one per addon), and `Keys/DZSurvivalServerPack.bikey`.

**Test locally first**: symlink/copy `.serverpack-build/@DZSurvivalServerPack`
into wherever your local server's mod path expects it, add it to `-mod=`,
boot the server, and check `profiles/*.RPT` and `profiles/script.log` for
compile errors.

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

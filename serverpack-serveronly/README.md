DZSurvivalServerOnly
=====================

Local-only companion pack to `../serverpack/` (DZSurvivalServerPack) - see
that folder's README.md for full build/design details, which apply equally
here. The only differences:

- This pack may only ever hold addons confirmed to have ZERO client-visible
  behavior (no self-actions, no UI, no board interactions, no input
  overrides) **and** zero Community-Online-Tools module/permission
  integration (no `JMModuleBase` subclasses, no
  `GetPermissionsManager().RegisterPermission()` calls, no
  `modded class JMModuleConstructor`). COT builds its permission tree from
  whatever's compiled into each machine and requires the client's and
  server's trees to match structurally - a permission registered only
  server-side (as anything in this pack would be) makes the client's copy
  of that branch have fewer children than the server's, which corrupts that
  client's entire permission tree on connect and silently breaks COT's own
  admin UI/keybinds (while server-side-only permission checks, like chat
  command gating, keep working fine - a very confusing split-brain bug).
  See `../src/paths.ts`'s comment on `SERVERPACK_SERVERONLY` for the full
  story - this is exactly what happened to `DZSurvivalBaseDecay`, which
  used to live here and was moved into `../serverpack/` because of it.
- It is deliberately never published to Steam Workshop. It's built and
  signed locally (same armake2 + real DSSignFile.exe pipeline), then staged
  directly into the running server's own mod folder on every single start
  (see ../src/localServerPacks.ts's ensureLocalServerPack(), called from
  ../src/server.ts's doStart()) and loaded via -servermod=. It is never
  listed in mods.txt.
- `deno task build-serverpack-serveronly` / `verify-serverpack-serveronly`
  exist for manually building/testing it. There is intentionally no
  `publish-serverpack-serveronly` task.

**Currently empty.** `src/server.ts`'s `doStart()` checks
`listAddons(SERVERPACK_SERVERONLY)` and skips staging/loading this pack
entirely whenever it has no addons, so having none here is a safe no-op,
not a broken state - the server won't try to load an empty mod. Add a new
addon folder here only once you've confirmed it truly needs neither
client-visible behavior nor any COT integration; otherwise it belongs in
`../serverpack/` instead (its actual runtime logic can still be guarded
server-only there via `GetGame().IsServer()` checks, as
`DZSurvivalBaseDecay` now does).

(A keycard-crate loot addon, `DZSurvivalKeycardLootOverride`, was tried
here first but had to move to `../serverpack/` instead purely for
organizational reasons - not because `-servermod=` itself was the problem.
See that addon's own `config.cpp` for the real story: cross-mod `modded
class` extension of a _third-party_ mod's own class (config-bound or not)
reliably failed to compile with "Unknown type", identically whether tried
via `-servermod=` (this pack) or `-mod=` (`../serverpack/`) - so that
addon ended up not extending @KeyCard-Rooms-Better's classes at all, using
a dynamic/generic scan instead. It happens to live in `../serverpack/` now
since nothing about it actually needed to be `-servermod=`-only.)

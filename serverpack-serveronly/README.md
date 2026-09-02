DZSurvivalServerOnly
=====================

Local-only companion pack to `../serverpack/` (DZSurvivalServerPack) - see
that folder's README.md for full build/design details, which apply equally
here. The only differences:

- This pack only ever holds addons confirmed to have ZERO client-visible
  behavior (no self-actions, no UI, no board interactions, no input
  overrides) - currently just DZSurvivalBaseDecay.
- It is deliberately never published to Steam Workshop. It's built and
  signed locally (same armake2 + real DSSignFile.exe pipeline), then staged
  directly into the running server's own mod folder on every single start
  (see ../src/localServerPacks.ts's ensureLocalServerPack(), called from
  ../src/server.ts's doStart()) and loaded via -servermod=. It is never
  listed in mods.txt.
- `deno task build-serverpack-serveronly` / `verify-serverpack-serveronly`
  exist for manually building/testing it. There is intentionally no
  `publish-serverpack-serveronly` task.

# DayZ Survival

A Deno/TypeScript CLI that manages a heavily-modded, hardcore-survival DayZ
(Chernarus) dedicated server on Linux: installs the server, resolves/downloads
Steam Workshop mods, tunes ~90 mods' generated configs into a coherent
survival ruleset, manages a custom trader economy, and builds/publishes this
project's own custom addons.

The aim of this project is to automate everything in setupping, hosting, moddeding, configuring and balancing the Game. This script should be maintained to run anywhere after cloning. The server is designed to be played solo with it also working if other players decide to join.

## Setup

All commands run inside the Nix dev shell (provides `deno`, `steamcmd`,
`steam-run`, `armake2`, `bisignutils`, Wine for the real DayZ Tools signer):

```
nix develop --command deno task dayz
```

With no arguments this opens the interactive menu. Run `deno task dayz --help`
for the full non-interactive command list.

First-time setup: `deno task config` (Steam credentials, port, etc.), then
`deno task up` (installs the server, downloads mods, tunes every mod's config,
starts the server). `up` is idempotent — safe to re-run any time.

## Project layout

- `src/` — the CLI itself. `main.ts` is the entrypoint; most other files each
  own one mod's/feature's config-tuning logic (e.g. `traders.ts`, `weather.ts`,
  `difficulty.ts`) and are wired together from `server.ts`'s `doStart()`.
- `mods.txt` — the mod list (`<workshop_id> @ModName [server]`). Comments here
  are load-bearing notes for future maintainers (why a mod was removed, known
  conflicts, etc.) — treat them as documentation, not clutter.
- `serverpack/` — this project's own custom addons (source), bundled and
  published as a single Workshop mod. See "Server pack" below.
- `ai/`, `profiles/` — generated at runtime (AI patrol/mission settings,
  server logs); not hand-edited directly.
- `server/`, `steamcmd/`, `daytools/`, `backups/`, `.wine-daytools/`,
  `.serverpack-*` — all gitignored, populated by the CLI itself.

## Server pack

`serverpack/addons/` holds this project's own custom Enforce Script addons,
packed with `armake2` and signed with the real Bohemia `DSSignFile.exe` (via
Wine), then published as one Workshop mod (`@DZSurvivalServerPack`).

Just run:

```
deno task publish-serverpack
```

This builds, verifies (boots the real server briefly to catch script compile
errors), and publishes/updates the Workshop item in one go — **don't run
`verify-serverpack` first**, it's the same boot-and-wait check `publish-
serverpack` already runs internally, so doing both means waiting for two full
verification boots for no extra benefit. Only reach for `verify-serverpack`
on its own if you want to sanity-check a change without publishing yet.

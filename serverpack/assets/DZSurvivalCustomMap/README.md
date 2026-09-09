# DZSurvivalCustomMap - source artwork

Editable source of truth for this server's custom physical map / tourist
signpost texture (overrides vanilla `DZ\structures\signs\tourist\data\*`,
shared by the handheld map item **and** the world's tourist-map signposts).

## Files

- `karta_co.png` - the main topographic map face (the side you actually
  read: roads, cities, grid, scale bar). Vanilla original is 2048x2048.
- `karta_side_co.png` - the legend + regional overview + cover art face.
  Vanilla original is 512x2048 (portrait).

Edit these in any image editor. Any size/aspect works, but matching the
vanilla dimensions above is recommended (matches the model's UVs 1:1, so
there's no stretching to account for).

Transparency (alpha) is ignored - the game engine target format has no
alpha channel, so fully-opaque RGB is what actually ships either way.

## Building

After editing, just build/publish as usual - it re-encodes automatically:

```
deno task build-serverpack
deno task publish-serverpack
```

Both re-encode both PNGs into
`serverpack/addons/DZSurvivalCustomMap/tourist/data/*.paa` via the real
Bohemia `ImageToPAA.exe` (part of the DayZ Tools install already used for
PBO signing - see `src/customMap.ts` for exactly how/why) as their first
step. Only source files that exist get re-encoded; the other stays
untouched.

If you just want to sanity-check an edit without a full build, run the
re-encode step on its own (inside `nix develop`):

```
deno task build-custom-map
```

No new mod is added to the server's required mod list - this ships bundled
inside the existing `@DZSurvivalServerPack` mod everyone already has.

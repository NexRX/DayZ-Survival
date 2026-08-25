# TESTS

Live-server, in-game verification passes that can't be scripted by the CLI -
these need an admin actually playing/observing on a running server. Check
items off as they're confirmed; note the outcome (and any follow-up fix
needed) inline or in a linked issue.

## Compatibility / risk items

- [ ] **`DayZ-Dynamic-AI-Addon` `Spatial_MaxAccuracy` on `Audio` entries** - a
      1.28-compatibility note on the mod's page says to delete
      `Spatial_MaxAccuracy` from the `Audio` array in `SpatialSettings.json`
      as a temporary fix. `tuneSpatialAIDifficulty()`
      ([`src/difficulty.ts`](src/difficulty.ts)) currently raises floors on
      `Group`/`Point`/`Location`/`Audio` uniformly.

  1. Confirm the server's actual DayZ version against whatever version the
     workshop note says needs the workaround.
  2. Start fresh so `profiles/ExpansionMod/AI/Spatial/SpatialSettings.json`
     generates, then let `tuneSpatialAIDifficulty()` run (automatic on
     `up`/`start`).
  3. Inspect the generated `Audio` array - does it now have
     `Spatial_MaxAccuracy` set (from the floor-raise)?
  4. In-game, trigger an ambient audio-based AI event and watch the
     server log/RPT for AI script errors tied to `Audio` entries.
  5. If errors appear - add a special case to `raiseSpatialFloors()` /
     `tuneSpatialAIDifficulty()` to skip/strip `Spatial_MaxAccuracy` on
     `Audio` entries instead of raising it.

- [ ] **`Community-Online-Tools` weather panel** - user reports describe its
      in-game "Weather Behavior" panel periodically reapplying its own
      presets. Low priority until weather tuning is actually added.

  1. Open COT's admin menu -> weather panel, apply a custom weather preset.
  2. Separately set weather via server-side script/config/commands.
  3. Wait a few in-game hours and watch whether weather reverts to COT's
     preset on its own.
  4. If it does, note the interval; add a workaround (disable auto-reapply,
     or re-apply tuning on the same cadence) once weather tuning exists.

- [ ] **`Keep-It-Dead-ProjectBR` + AI mods crash** - a reported crash when AI
      mods (e.g. Expansion AI) trigger its corpse-to-zombie conversion.

  1. With Keep-It-Dead and the AI mods active, kill several AI-spawned
     bandits/zombies via different sources (melee, gunfire, environmental).
  2. Wait for/trigger the corpse-to-zombie conversion window (check the
     mod's own config for the timer).
  3. Tail the server log/RPT during the conversion window for crashes or
     script errors.
  4. Repeat over a longer soak session (1h+) with multiple corpses
     converting concurrently, since intermittent crashes are more likely to
     show up under volume/concurrency.
  5. If reproduced, capture the RPT/minidump for a bug report, or decide
     whether to disable that conversion feature.

- [ ] **`Fuel-System` DIESEL matching on custom vehicles** - a user comment
      reports DIESEL fuel-type matching by base vehicle class not applying
      correctly in practice. Exact-classname entries have been added for our
      custom vehicles to route around this - needs live confirmation.

  1. Spawn one of each affected custom vehicle (UAZ-31514, MBM trucks,
     MoreCars Ada 4x4 variants).
  2. Attempt refueling each with both DIESEL and regular gasoline
     canisters/pumps.
  3. Confirm DIESEL is accepted and fills the tank, and non-DIESEL fuel is
     rejected (or accepted, if that's actually intended) per the configured
     type-matching.
  4. Check any in-game fuel-type indicator/tooltip matches configuration.
  5. If any vehicle accepts the wrong fuel type, the base-class matching bug
     is real for that vehicle - extend the exact-classname override.

## How to use this file

- These are manual/live tests only - nothing here can be verified by the
  Deno CLI or an automated test runner, since they depend on real mod
  runtime behavior on a populated server.
- Check off an item once it's been verified on a live server, and note the
  result (pass/fail + any follow-up) either inline here or in
  [`TODO.md`](TODO.md) if it turns into an actionable fix.
- New risk items surfaced by future mod research should be added here rather
  than left buried in `TODO.md`.

# TESTS

Live-server, in-game verification passes that can't be scripted by the CLI -
these need an admin actually playing/observing on a running server. Check
items off as they're confirmed; note the outcome (and any follow-up fix
needed) inline or in a linked issue.

## How to use this file

- These are manual/live tests only - nothing here can be verified by the
  Deno CLI or an automated test runner, since they depend on real mod
  runtime behavior on a populated server.
- Check off an item once it's been verified on a live server, and note the
  result (pass/fail + any follow-up) either inline here or in
  [`TODO.md`](TODO.md) if it turns into an actionable fix.
- New risk items surfaced by future mod research should be added here rather
  than left buried in `TODO.md`.

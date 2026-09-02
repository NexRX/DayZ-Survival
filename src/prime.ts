// On a brand-new install, none of the mod-generated config files the
// ensure/tune pipeline edits (AI patrols, spatial AI, dynamic missions,
// airdrop/loadout/difficulty settings) exist yet - each mod only writes its
// own config out once its mission has actually loaded. Left alone, that
// means the very first `up`/`start` boots with every mod's untuned
// defaults, and only a *second* start (after the mod configs exist) would
// actually apply this project's tuning.
//
// Rather than require the admin to notice and manually restart, this runs
// the server headless in the background just long enough for every mod to
// generate its config, then stops it so the real (foreground, blocking)
// start in server.ts can tune everything before players ever connect. A
// no-op on every start after the very first successful one, since every
// target already exists by then.

import {
  AI_BANDITS_DYNAMIC_SETTINGS,
  AI_BANDITS_STATIC_SETTINGS,
  AI_PATROL_SETTINGS,
  AI_WARZONES_SETTINGS,
  AIRBORNE_AI_SETTINGS,
  DYNAMIC_MISSIONS_SETTINGS,
  INEDIA_SETTINGS,
  KNOCK_KNOCK_ZOMBIES_SETTINGS,
  PROFILE_DIR,
  SERVER_DIR,
  SPATIAL_SETTINGS,
  TERJE_LOADOUTS,
  TERJE_RESPAWNS,
  TERJE_START_SCREEN_CFG,
  VEHICLE_3PP_WHITELIST,
  ZOMBIE_HORDE_GENERAL_SETTINGS,
} from "./paths.ts";
import { log, ok, warn } from "./ui.ts";
import { exists } from "./steam.ts";

// Only files self-generated on *mission/world load*, independent of any
// player ever connecting - AI_SETTINGS/COT admin grants are deliberately
// excluded here since those are gated on a player connecting at least once
// and would never appear during a headless priming run. AIRDROP_SETTINGS is
// also deliberately excluded: unlike the others, it's only written once an
// actual airdrop mission fires (not on plain world load), which can take far
// longer than any reasonable priming window - loot.ts's tuneAirdropLoot()
// already no-ops gracefully if it's still missing, so there's nothing to
// gain by blocking `up` on it.
const PRIME_TARGETS = [
  AI_PATROL_SETTINGS,
  SPATIAL_SETTINGS,
  DYNAMIC_MISSIONS_SETTINGS,
  INEDIA_SETTINGS,
  AI_BANDITS_DYNAMIC_SETTINGS,
  AI_BANDITS_STATIC_SETTINGS,
  TERJE_LOADOUTS,
  TERJE_RESPAWNS,
  TERJE_START_SCREEN_CFG,
  VEHICLE_3PP_WHITELIST,
  KNOCK_KNOCK_ZOMBIES_SETTINGS,
  AIRBORNE_AI_SETTINGS,
  AI_WARZONES_SETTINGS,
  ZOMBIE_HORDE_GENERAL_SETTINGS,
];

const PRIME_TIMEOUT_MS = 15 * 60_000;
const PRIME_POLL_MS = 5_000;
const PRIME_LOG_EVERY_MS = 30_000;
const PRIME_STOP_GRACE_MS = 30_000;

async function missingTargets(): Promise<string[]> {
  const missing: string[] = [];
  for (const t of PRIME_TARGETS) if (!(await exists(t))) missing.push(t);
  return missing;
}

/** Headless-runs the server once, if needed, so its mods finish generating their configs. */
export async function primeModConfigsIfNeeded(args: string[]): Promise<void> {
  const missing = await missingTargets();
  if (missing.length === 0) return;

  log(
    `First-ever start detected — ${missing.length} mod config file(s) don't exist yet. ` +
      `Priming: running the server headless in the background until every mod finishes ` +
      `generating its config, then stopping it so tuning can be applied before the real start...`,
  );

  await Deno.mkdir(PROFILE_DIR, { recursive: true });
  const bootstrapLog = `${PROFILE_DIR}/bootstrap-prime.log`;
  const logFile = await Deno.open(bootstrapLog, { create: true, write: true, truncate: true });

  const child = new Deno.Command("steam-run", {
    args,
    cwd: SERVER_DIR,
    env: {
      LD_LIBRARY_PATH: `${SERVER_DIR}:${Deno.env.get("LD_LIBRARY_PATH") ?? ""}`,
    },
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const pump = async (stream: ReadableStream<Uint8Array>) => {
    try {
      for await (const chunk of stream) await logFile.write(chunk);
    } catch {
      // stream torn down by the kill below - fine
    }
  };
  const pumping = Promise.all([pump(child.stdout), pump(child.stderr)]);
  const statusPromise = child.status;

  const start = Date.now();
  let lastLog = start;
  let remaining = missing;
  while (remaining.length > 0 && Date.now() - start < PRIME_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, PRIME_POLL_MS));
    remaining = await missingTargets();
    if (Date.now() - lastLog > PRIME_LOG_EVERY_MS) {
      log(`  ...still waiting on ${remaining.length} mod config file(s) (see ${bootstrapLog})`);
      lastLog = Date.now();
    }
  }

  if (remaining.length > 0) {
    warn(
      `Timed out after ${Math.round(PRIME_TIMEOUT_MS / 60_000)}m waiting on ` +
        `${remaining.length} mod config file(s) - continuing anyway. Tuning will only apply to ` +
        `whichever configs did generate; re-run 'up' again later once the rest exist ` +
        `(see ${bootstrapLog} for what the server logged).`,
    );
  } else {
    ok(`All mod configs generated after ${Math.round((Date.now() - start) / 1000)}s`);
  }

  log("Stopping the priming server so tuning can be applied...");
  try {
    child.kill("SIGINT");
  } catch {
    // already exited
  }
  const exited = await Promise.race([
    statusPromise.then(() => true),
    new Promise<boolean>((r) => setTimeout(() => r(false), PRIME_STOP_GRACE_MS)),
  ]);
  if (!exited) {
    warn(
      `Priming server didn't stop gracefully within ${
        PRIME_STOP_GRACE_MS / 1000
      }s - sending SIGKILL`,
    );
    try {
      child.kill("SIGKILL");
    } catch {
      // already exited
    }
    await statusPromise;
  }
  await pumping;
  logFile.close();
  ok("Priming server stopped - continuing with the real start");
}

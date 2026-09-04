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
  CLIMATE_ZONES_SETTINGS,
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
  CLIMATE_ZONES_SETTINGS,
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

  // setsid detaches the child into its own session/process group, so a
  // terminal Ctrl+C (which delivers SIGINT to the whole foreground process
  // group) does NOT reach it directly and uncontrolled - it only ever
  // reaches this process (via the Deno.addSignalListener below), which then
  // decides *when* and *how* to signal the child itself (same graceful
  // SIGINT-then-wait-then-SIGKILL sequence used on a normal finish).
  // Without this, a user's Ctrl+C would kill the child at an arbitrary
  // mid-write moment (confirmed live: a truncated mid-line RPT log) with no
  // chance for either side to shut down cleanly - a real, observed bug.
  //
  // stdbuf -oL/-eL forces the child's stdout/stderr into line-buffered mode.
  // Piped (non-tty) stdout normally makes glibc switch to fully-buffered
  // (chunks of several KB), so the log file this feeds into can go quiet for
  // long stretches even while the server is actively working - exactly what
  // made a genuinely-still-loading server look indistinguishable from a
  // stuck/dead one to a human watching bootstrap-prime.log. A harmless
  // no-op if the binary doesn't use glibc stdio buffering internally.
  const child = new Deno.Command("setsid", {
    args: ["stdbuf", "-oL", "-eL", "steam-run", ...args],
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

  // Tracked separately from the raw promise so the polling loop below can
  // cheaply check "has it exited yet" on every iteration without racing a
  // fresh promise each time - a priming server that crashes partway through
  // world load would otherwise leave the loop below polling for files that
  // will never appear for the rest of the full timeout, looking
  // indistinguishable from "just still loading".
  let exitStatus: Deno.CommandStatus | null = null;
  const statusPromise = child.status.then((status) => {
    exitStatus = status;
    return status;
  });

  // The only way this child now ever receives SIGINT (see the setsid note
  // above) - a user pressing Ctrl+C on the surrounding `up`/`start` signals
  // *this* process, not the detached child, so this is what decides to stop
  // it gracefully instead of it dying uncontrolled. A second Ctrl+C escalates
  // straight to SIGKILL for anyone unwilling to wait out the grace period.
  let interrupted = false;
  const onInterrupt = () => {
    if (interrupted) {
      warn("Second interrupt received - force-killing the priming server immediately.");
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
      return;
    }
    interrupted = true;
    warn(
      "Interrupted - stopping the priming server gracefully (Ctrl-C again to force-kill)... " +
        "whatever mod configs already exist are kept, so it's always safe to just run this again.",
    );
  };
  Deno.addSignalListener("SIGINT", onInterrupt);

  try {
    const start = Date.now();
    let lastLog = start;
    let lastLogSize = 0;
    let remaining = missing;
    while (
      remaining.length > 0 && Date.now() - start < PRIME_TIMEOUT_MS && !exitStatus && !interrupted
    ) {
      await new Promise((r) => setTimeout(r, PRIME_POLL_MS));
      remaining = await missingTargets();
      if (Date.now() - lastLog > PRIME_LOG_EVERY_MS) {
        // A raw "still waiting" message alone is indistinguishable from a
        // silently-dead server for as long as the process itself hasn't
        // exited yet (e.g. it's stuck rather than crashed) - showing whether
        // the log is actually still growing gives a direct, honest signal
        // instead of asking the admin to trust a fixed timeout.
        let sizeNote = "log size unknown";
        try {
          const info = await Deno.stat(bootstrapLog);
          const grew = info.size - lastLogSize;
          sizeNote = grew > 0
            ? `log grew +${(grew / 1024).toFixed(0)}KB in the last ${
              Math.round(PRIME_LOG_EVERY_MS / 1000)
            }s - still alive and working`
            : `log hasn't grown in the last ${
              Math.round(PRIME_LOG_EVERY_MS / 1000)
            }s - may be stuck (or just quiet); check the last lines of ${bootstrapLog}`;
          lastLogSize = info.size;
        } catch {
          // log file not created yet somehow - fall through with the placeholder note
        }
        log(
          `  ...still waiting on ${remaining.length} mod config file(s) after ${
            Math.round((Date.now() - start) / 1000)
          }s (${sizeNote})`,
        );
        lastLog = Date.now();
      }
    }

    if (interrupted) {
      // Already logged by onInterrupt() above - nothing more to say here.
    } else if (remaining.length > 0 && exitStatus) {
      const status: Deno.CommandStatus = exitStatus;
      const how = status.signal ? `signal ${status.signal}` : `exit code ${status.code}`;
      warn(
        `Priming server exited early (${how}) after ${
          Math.round((Date.now() - start) / 1000)
        }s, before all mod configs were generated - ${remaining.length} config(s) still missing ` +
          `(likely a crash - see ${bootstrapLog}'s last few lines for what it was doing when it ` +
          `stopped). Continuing anyway with whichever configs did generate; just re-run this again ` +
          `- it's safe, and only needs to wait on the configs that are still missing.`,
      );
    } else if (remaining.length > 0) {
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

    if (interrupted) {
      ok(
        "Priming server stopped. Re-run 'up'/'start' whenever you're ready - it'll pick up right where this left off.",
      );
      Deno.exit(130);
    }
    ok("Priming server stopped - continuing with the real start");
  } finally {
    Deno.removeSignalListener("SIGINT", onInterrupt);
  }
}

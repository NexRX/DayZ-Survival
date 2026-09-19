// serverDZ.cfg generation and launching the server under steam-run.

import {
  PROFILE_DIR,
  SERVER_DIR,
  SERVERONLYPACK_DIR,
  SERVERONLYPACK_NAME,
} from "../constants/paths.ts";
import { log, warn } from "../ui.ts";
import { requireTools } from "../proc.ts";
import { ensureServer, serverBinary } from "../steam.ts";
import { ensureMods } from "./install.ts";
import { backupWorldState, pruneOldLogs } from "./maintenance.ts";
import {
  ensureCustomKeycardsTypesRemoved,
  ensureKeyCardRoomsTypesRemoved,
  ensureModTypesMerged,
} from "../config/modTypes.ts";
import { ensureNCPRTypesMerged } from "../config/ncpr.ts";
import { ensureEconomyBlocks } from "../config/economyBlocks.ts";
import { ensureCustomKeycardsTypesWired } from "../config/customKeycards.ts";
import { ensureMarketGapFill } from "../config/marketGapFill.ts";
import { ensureCustomTrader } from "../config/traders.ts";
import { tuneExpansionMarket } from "../config/market.ts";
import { tuneAnimalSpawns, tuneFoodScarcity, tuneMoneyScarcity } from "../config/economy.ts";
import { loadMods, modParam, serverModParam } from "../server/mods.ts";
import { ensureConfig, genConfig, type Settings } from "../config/settings.ts";
import { ensureOverrides } from "../config/overrides.ts";
import { ensureQuests } from "../config/quests.ts";
import { tuneExtendedTouristMap, tuneMapGameplayConfig } from "../config/extendedTouristMap.ts";
import { copy } from "jsr:@std/fs@^1.0.24/copy";

async function deployServerOnlyPack(): Promise<void> {
  const dest = `${SERVER_DIR}/${SERVERONLYPACK_NAME}`;

  try {
    try {
      await Deno.remove(dest, { recursive: true });
    } catch (_ignored) { /* no-op */ }
    copy(SERVERONLYPACK_DIR, dest);
    log(`Deployed Server-only pack from repo → ${dest}`);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      warn(`Server-only pack source not found at ${SERVERONLYPACK_DIR}: ${e}`);
      Deno.exit(1);
      return;
    }
    throw e;
  }
}

// Crash-recovery watchdog for the actual server launch (the last step of
// doStart()): auto-restarts on an unexpected exit with a short backoff,
// but stops cleanly (no restart) on an intentional Ctrl-C/SIGTERM. Also
// drives the wall-clock scheduled restarts every 12h at 03:00/15:00 - see
// scheduleNextAutoRestart() below.
const CRASH_LOG = `${PROFILE_DIR}/crashes.log`;
// Below this much runtime, an exit counts as a "fast crash" for the
// give-up logic below rather than a normal shutdown after a real play
// session.
const FAST_CRASH_THRESHOLD_MS = 60_000;
const RESTART_BACKOFF_MS = 15_000;
const MAX_CONSECUTIVE_FAST_CRASHES = 5;
// If the server hasn't exited this long after a graceful SIGTERM, force-kill
// it ourselves. This matters under systemd, which sends exactly one SIGTERM
// on `systemctl stop`/`restart` and then just waits - there's no interactive
// "press Ctrl-C again" follow-up in that context, so without this the whole
// unit (and `systemctl restart`) can hang if the DayZ binary doesn't exit
// cleanly on its own.
const GRACEFUL_STOP_TIMEOUT_MS = 30_000;

let stopRequested = false;
let stopRequestedAt = 0;
let currentChild: Deno.ChildProcess | null = null;
// Set right before a scheduled restart's SIGTERM goes out, cleared once the
// watchdog loop below observes the resulting exit - lets that loop log a
// clear "this was scheduled" message instead of the generic crash/clean-exit
// warnings, without changing any of the actual restart/backoff behavior.
let scheduledRestartInProgress = false;

// A single Ctrl-C often reaches this process as more than one signal - e.g.
// the terminal delivers SIGINT to the whole foreground process group while
// a wrapper (nix develop --command, a shell, etc.) separately forwards
// SIGTERM moments later as its own cleanup behavior. Both are registered on
// this same handler below, so a second signal arriving within this window
// is treated as an artifact of that, not a genuinely repeated Ctrl-C.
const DUPLICATE_SIGNAL_WINDOW_MS = 1_000;

function forceKill(): void {
  try {
    currentChild?.kill("SIGKILL");
  } catch {
    // already exited - nothing to kill
  }
}

function requestStop(): void {
  const now = Date.now();
  if (stopRequested) {
    if (now - stopRequestedAt < DUPLICATE_SIGNAL_WINDOW_MS) return;
    warn("Second stop signal received - killing the server immediately.");
    forceKill();
    Deno.exit(1);
  }
  stopRequested = true;
  stopRequestedAt = now;
  log(
    "Stop requested - waiting for the server to shut down gracefully " +
      `(will force-kill after ${GRACEFUL_STOP_TIMEOUT_MS / 1000}s if it doesn't, ` +
      "or send another stop signal to force sooner)...",
  );
  try {
    currentChild?.kill("SIGTERM");
  } catch {
    // already exited - the watchdog loop will notice via child.status
  }
  setTimeout(() => {
    if (stopRequested && currentChild) {
      warn(
        `Server didn't exit within ${GRACEFUL_STOP_TIMEOUT_MS / 1000}s of SIGTERM - force-killing.`,
      );
      forceKill();
    }
  }, GRACEFUL_STOP_TIMEOUT_MS);
}

async function logCrash(code: number, ranMs: number): Promise<void> {
  const line = `${new Date().toISOString()}  exit=${code}  ranMs=${ranMs}\n`;
  await Deno.writeTextFile(CRASH_LOG, line, { append: true }).catch(() => {});
}

async function runServerWithWatchdog(args: string[]): Promise<never> {
  // Change to the server directory before spawning steam-run. This matters
  // because steam-run uses `--chdir "$(pwd)"` internally — if we don't cd
  // first, bwrap runs with the parent shell's CWD (the repo root), and the
  // Enfusion engine resolves "$CurrentDir" there, failing to find dayz.gproj
  // which lives in server/. The Deno spawn `cwd` option only affects the
  // child process itself, not the $(pwd) captured inside the steam-run script.
  Deno.chdir(SERVER_DIR);

  log(`Starting Server: ${args.reduce((a, b) => `${a}\n${b}`)}`);
  Deno.addSignalListener("SIGINT", requestStop);
  Deno.addSignalListener("SIGTERM", requestStop);

  let consecutiveFastCrashes = 0;
  while (true) {
    const startedAt = Date.now();
    // Run directly (no setsid) — setsid can interfere with LD_LIBRARY_PATH
    // resolution in Nix environments. signal handling is via requestStop().
    currentChild = new Deno.Command("steam-run", {
      args,
      cwd: SERVER_DIR,
      env: {
        LD_LIBRARY_PATH: "",
      },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    const { code } = await currentChild.status;
    const ranMs = Date.now() - startedAt;
    currentChild = null;

    if (stopRequested) Deno.exit(code);

    if (scheduledRestartInProgress) {
      scheduledRestartInProgress = false;
      log("Scheduled restart: server stopped cleanly, relaunching now.");
    } else if (code === 0) {
      warn("Server exited cleanly (code 0) without a stop request - restarting anyway.");
    } else {
      warn(`Server crashed (exit code ${code}) after running for ${Math.round(ranMs / 1000)}s.`);
    }
    await logCrash(code, ranMs);

    if (ranMs < FAST_CRASH_THRESHOLD_MS) {
      consecutiveFastCrashes++;
      if (consecutiveFastCrashes >= MAX_CONSECUTIVE_FAST_CRASHES) {
        warn(
          `${consecutiveFastCrashes} crashes in a row within ` +
            `${FAST_CRASH_THRESHOLD_MS / 1000}s of starting each time - giving up rather than ` +
            `crash-looping. Check ${CRASH_LOG} and the latest profiles/DayZServer_*.RPT for the ` +
            `real error before restarting manually.`,
        );
        Deno.exit(code || 1);
      }
    } else {
      consecutiveFastCrashes = 0;
    }

    log(`Restarting in ${RESTART_BACKOFF_MS / 1000}s...`);
    await new Promise<void>((resolve) => setTimeout(resolve, RESTART_BACKOFF_MS));
  }
}

export async function doStart(s: Settings): Promise<void> {
  await requireTools();
  await ensureConfig(s);
  await ensureServer(s);
  await ensureMods(s);
  const allMods = await loadMods();
  await genConfig(s);

  const mods = modParam(allMods);
  const serverMods = serverModParam(allMods);
  await Deno.mkdir(PROFILE_DIR, { recursive: true });
  const extra = s.EXTRA_PARAMS.trim() ? s.EXTRA_PARAMS.trim().split(/\s+/) : [];
  const args = [
    await serverBinary(),
    "-config=serverDZ.cfg",
    `-port=${s.PORT}`,
    `-mod=${mods}`,
    ...(serverMods ? [`-servermod=${serverMods}`] : []),
    `-BEpath=${PROFILE_DIR}/battleye`,
    `-profiles=${PROFILE_DIR}`,
    `-cpuCount=${navigator.hardwareConcurrency}`,
    ...extra,
  ];

  await ensureOverrides();

  await ensureModTypesMerged(allMods);
  await ensureCustomKeycardsTypesRemoved(allMods);
  await ensureKeyCardRoomsTypesRemoved();

  await ensureNCPRTypesMerged(allMods);
  await ensureEconomyBlocks(allMods);
  await ensureCustomKeycardsTypesWired(allMods);

  await tuneFoodScarcity();
  await tuneAnimalSpawns();
  await tuneMoneyScarcity();
  await tuneExpansionMarket();
  await ensureMarketGapFill();
  await ensureCustomTrader();

  await ensureQuests();

  await tuneMapGameplayConfig();
  await tuneExtendedTouristMap();

  await deployServerOnlyPack();

  await pruneOldLogs();
  await backupWorldState();

  log(`Starting DayZ server on UDP ${s.PORT}`);
  log(`Mods: ${mods}`);
  if (serverMods) log(`Server-only mods: ${serverMods}`);

  // steam-run provides the prebuilt DayZServer an FHS environment on NixOS.
  await runServerWithWatchdog(args);
}

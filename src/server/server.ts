// serverDZ.cfg generation and launching the server under steam-run.

import {
  EDITOR_FILES_DIR,
  EDITOR_STORED_DIR,
  PROFILE_DIR,
  SERVER_DIR,
  SERVERONLYPACK_DIR,
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

// Deploy the committed editor save (.dze) into the mission's EditorFiles/
// folder where @DayZ-Editor-Loader reads it. The file lives in the repo
// (data/editor/) for version control; this copies it to the live directory
// on every server start so it's always up to date.
async function deployEditorSave(): Promise<void> {
  try {
    await Deno.mkdir(EDITOR_FILES_DIR, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
  }

  // Copy every .dze from the stored dir into EditorFiles/.
  // Editor-Loader loads ALL .dze files it finds, so any file we commit
  // gets deployed. The user controls what ends up there by committing it.
  let deployed = 0;
  try {
    for await (const entry of Deno.readDir(EDITOR_STORED_DIR)) {
      if (!entry.isFile || !entry.name.toLowerCase().endsWith(".dze")) continue;
      const src = `${EDITOR_STORED_DIR}/${entry.name}`;
      const dest = `${EDITOR_FILES_DIR}/${entry.name}`;
      await Deno.copyFile(src, dest);
      deployed++;
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      // data/editor/ hasn't been created yet — nothing to deploy
      return;
    }
    throw e;
  }

  if (deployed > 0) {
    log(`Deployed ${deployed} editor save(s) to EditorFiles/`);
  }
}

// Deploy the locally-built server-only pack into the server's mod folder.
// The signed PBOs live in the repo (serveronlypack/@serveronlypack/) and are
// copied to @DZSurvivalServerOnlyPack in the server dir. This removes the
// need to download the pack from the Steam Workshop.
//
// Orphaned files in the destination (present on disk but not in the repo)
// are deleted so the server dir stays in sync with the committed pack.
async function deployServerOnlyPack(): Promise<void> {
  const dest = `${SERVER_DIR}/@DZSurvivalServerOnlyPack`;

  // Copy addon PBOs + signatures, collecting source names for orphan cleanup
  try {
    await Deno.mkdir(`${dest}/addons`, { recursive: true });
    const srcAddons = new Set<string>();
    for await (const entry of Deno.readDir(`${SERVERONLYPACK_DIR}/addons`)) {
      if (!entry.isFile || !entry.name.toLowerCase().match(/\.(pbo|bisign|bikey)$/)) continue;
      const name = entry.name;
      srcAddons.add(name);
      await Deno.copyFile(
        `${SERVERONLYPACK_DIR}/addons/${name}`,
        `${dest}/addons/${name}`,
      );
    }
    // Remove orphaned addon files
    let removed = 0;
    for await (const entry of Deno.readDir(`${dest}/addons`)) {
      if (entry.isFile && entry.name.toLowerCase().match(/\.(pbo|bisign|bikey)$/)) {
        if (!srcAddons.has(entry.name)) {
          await Deno.remove(`${dest}/addons/${entry.name}`);
          removed++;
        }
      }
    }
    if (removed > 0) {
      log(`Removed ${removed} orphaned addon file(s) from @DZSurvivalServerOnlyPack/addons`);
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      warn(`Server-only pack source not found at ${SERVERONLYPACK_DIR}/addons — skipping deploy`);
      return;
    }
    throw e;
  }

  // Copy keys if present, and clean up orphaned ones
  try {
    await Deno.mkdir(`${dest}/keys`, { recursive: true });
    const srcKeys = new Set<string>();
    for await (const entry of Deno.readDir(`${SERVERONLYPACK_DIR}/keys`)) {
      if (!entry.isFile || !entry.name.toLowerCase().endsWith(".bikey")) continue;
      const name = entry.name;
      srcKeys.add(name);
      await Deno.copyFile(
        `${SERVERONLYPACK_DIR}/keys/${name}`,
        `${dest}/keys/${name}`,
      );
    }
    // Remove orphaned keys
    let removed = 0;
    for await (const entry of Deno.readDir(`${dest}/keys`)) {
      if (entry.isFile && entry.name.toLowerCase().endsWith(".bikey")) {
        if (!srcKeys.has(entry.name)) {
          await Deno.remove(`${dest}/keys/${entry.name}`);
          removed++;
        }
      }
    }
    if (removed > 0) {
      log(`Removed ${removed} orphaned key(s) from @DZSurvivalServerOnlyPack/keys`);
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
    // keys/ may not exist — not fatal
  }

  log(`Deployed @DZSurvivalServerOnlyPack from repo → ${dest}`);
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

// Wall-clock restarts every 12h at 03:00 and 15:00 (local server time), on
// top of - not instead of - the crash-recovery watchdog below: this just
// SIGTERMs the current child the same way requestStop() does, but without
// ever setting `stopRequested`, so the watchdog's own while(true) loop
// treats the resulting clean exit exactly like any other and relaunches
// immediately - no special-casing needed there beyond the log message.
const SCHEDULED_RESTART_HOURS = [3, 15];

function msUntilNextScheduledRestart(now = new Date()): number {
  const next = Math.min(
    ...SCHEDULED_RESTART_HOURS.map((h) => {
      const d = new Date(now);
      d.setHours(h, 0, 0, 0);
      if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
      return d.getTime();
    }),
  );
  return next - now.getTime();
}

function scheduleNextAutoRestart(): void {
  const delay = msUntilNextScheduledRestart();
  log(`Next scheduled restart: ${new Date(Date.now() + delay).toLocaleString()}`);
  setTimeout(() => {
    if (currentChild) {
      log("Scheduled restart (03:00/15:00) - stopping the server gracefully...");
      scheduledRestartInProgress = true;
      try {
        currentChild.kill("SIGTERM");
      } catch {
        // already exited - the watchdog loop below will notice via child.status
      }
      setTimeout(() => {
        if (scheduledRestartInProgress && currentChild) {
          warn(
            `Server didn't exit within ${GRACEFUL_STOP_TIMEOUT_MS / 1000}s of the scheduled ` +
              "restart's SIGTERM - force-killing.",
          );
          forceKill();
        }
      }, GRACEFUL_STOP_TIMEOUT_MS);
    }
    // Reschedule regardless of whether a child was running at the moment
    // this fired (e.g. mid-crash-backoff) - next occurrence is still 12h out.
    scheduleNextAutoRestart();
  }, delay);
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
  Deno.addSignalListener("SIGINT", requestStop);
  Deno.addSignalListener("SIGTERM", requestStop);
  scheduleNextAutoRestart();

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

  await ensureOverrides();

  await deployEditorSave();
  await deployServerOnlyPack();

  await pruneOldLogs();
  await backupWorldState();

  log(`Starting DayZ server on UDP ${s.PORT}`);
  log(`Mods: ${mods}`);
  if (serverMods) log(`Server-only mods: ${serverMods}`);

  // steam-run provides the prebuilt DayZServer an FHS environment on NixOS.
  await runServerWithWatchdog(args);
}

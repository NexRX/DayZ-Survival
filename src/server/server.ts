import { parse as parseJsonc } from "jsr:@std/jsonc@^1.0.2";
import {
  DAYZ_SERVER_APPID,
  PROFILE_DIR,
  ROOT,
  SERVER_DIR,
  SERVERONLYPACK_DIR,
  SERVERONLYPACK_NAME,
} from "../constants/paths.ts";
import { log, ok, warn } from "../ui.ts";
import { requireTools, runInherit } from "../proc.ts";
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
import { ensureConfig, genConfig, type Settings } from "../config/settings.ts";
import { ensureOverrides } from "../config/overrides.ts";
import { ensureBook, ensureQuests } from "../config/expansion.ts";
import { tuneExtendedTouristMap, tuneMapGameplayConfig } from "../config/extendedTouristMap.ts";
import { copy } from "jsr:@std/fs@^1.0.24/copy";
import { updateGame, updateWorkshopMods, WorkshopModRequest } from "../steam/index.ts";

export type Mod = [number, string, "server" | undefined];
export type ModFile = { mods: Mod[] };

const MOD_FILE = parseJsonc(Deno.readTextFileSync(`${ROOT}/mods.jsonc`)) as ModFile;
const CLIENT_MODS = MOD_FILE.mods.filter((m) => m[2] !== "server").map((m) => m[1]).join(";");
const SERVER_MODS = MOD_FILE.mods.filter((m) => m[2] === "server").map((m) => m[1]).join(";");

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

const CRASH_LOG = `${PROFILE_DIR}/crashes.log`;
const FAST_CRASH_THRESHOLD_MS = 60_000;
const RESTART_BACKOFF_MS = 15_000;
const MAX_CONSECUTIVE_FAST_CRASHES = 5;
const GRACEFUL_STOP_TIMEOUT_MS = 30_000;
const DUPLICATE_SIGNAL_WINDOW_MS = 1_000;

let stopRequested = false;
let stopRequestedAt = 0;
let currentChild: Deno.ChildProcess | null = null;
let scheduledRestartInProgress = false;

function forceKill(): void {
  try {
    currentChild?.kill("SIGKILL");
  } catch { /* no-op */ }
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
  } catch { /* no-op */ }
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
  Deno.chdir(SERVER_DIR);

  log(`Starting Server: ${args.reduce((a, b) => `${a}\n${b}`)}`);
  Deno.addSignalListener("SIGINT", requestStop);
  Deno.addSignalListener("SIGTERM", requestStop);

  let consecutiveFastCrashes = 0;
  while (true) {
    const startedAt = Date.now();
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

export async function doSimpleStart(s: Settings): Promise<void> {
  const extra = s.EXTRA_PARAMS.trim() ? s.EXTRA_PARAMS.trim().split(/\s+/) : [];
  const args = [
    `${SERVER_DIR}/DayZServer`,
    "-config=serverDZ.cfg",
    `-port=${s.PORT}`,
    `-mod=${CLIENT_MODS}`,
    ...(SERVER_MODS ? [`-servermod=${SERVER_MODS}`] : []),
    `-BEpath=${PROFILE_DIR}/battleye`,
    `-profiles=${PROFILE_DIR}`,
    `-cpuCount=${navigator.hardwareConcurrency}`,
    ...extra,
  ];

  // steam-run resolves the server's files relative to its current directory.
  Deno.chdir(SERVER_DIR);
  const code = await runInherit("steam-run", args, {
    cwd: SERVER_DIR,
    env: { LD_LIBRARY_PATH: "" },
  });
  if (code !== 0) Deno.exit(code);
}

export async function ensureServer(): Promise<void> {
  ok(`Updating server to ${SERVER_DIR}`);
  const result = await updateGame(DAYZ_SERVER_APPID, SERVER_DIR);
  if (result.status === "failed") {
    throw new Error(`Failed to install/update server: ${result.error ?? ""}`);
  }
}

export async function ensureMods() {
  const mods: WorkshopModRequest[] = MOD_FILE.mods.map(([workshopId, folderName]) => {
    return { workshopId, folderName };
  });
  ok(`Updating ${mods.length} mods to ${SERVER_DIR}`);
  const result = await updateWorkshopMods(SERVER_DIR, mods);
  const errors = result.filter((r) => r.error);
  if (errors.length > 0) {
    const errorLines = errors.map((e) => `- ${e.folderName} (${e.workshopId}): ${e.error}`)
      .join("\n");
    throw new Error(`Failed to downloads mods...\n${errorLines}`);
  }
}

export async function doStart(s: Settings): Promise<void> {
  await requireTools();
  await ensureConfig(s);
  await ensureServer();
  await ensureMods();
  await genConfig(s);

  await Deno.mkdir(PROFILE_DIR, { recursive: true });
  const extra = s.EXTRA_PARAMS.trim() ? s.EXTRA_PARAMS.trim().split(/\s+/) : [];
  const args = [
    `${SERVER_DIR}/DayZServer`,
    "-config=serverDZ.cfg",
    `-port=${s.PORT}`,
    `-mod=${CLIENT_MODS}`,
    ...(SERVER_MODS ? [`-servermod=${SERVER_MODS}`] : []),
    `-BEpath=${PROFILE_DIR}/battleye`,
    `-profiles=${PROFILE_DIR}`,
    `-cpuCount=${navigator.hardwareConcurrency}`,
    ...extra,
  ];

  await ensureOverrides();

  await ensureModTypesMerged(MOD_FILE.mods);
  await ensureCustomKeycardsTypesRemoved(MOD_FILE.mods);
  await ensureKeyCardRoomsTypesRemoved();

  await ensureNCPRTypesMerged(MOD_FILE.mods);
  await ensureEconomyBlocks(MOD_FILE.mods);
  await ensureCustomKeycardsTypesWired(MOD_FILE.mods);

  await tuneFoodScarcity();
  await tuneAnimalSpawns();
  await tuneMoneyScarcity();
  await tuneExpansionMarket();
  await ensureMarketGapFill();
  await ensureCustomTrader();

  await ensureQuests();
  await ensureBook();

  await tuneMapGameplayConfig();
  await tuneExtendedTouristMap();

  await deployServerOnlyPack();

  await pruneOldLogs();
  await backupWorldState();

  log(`Starting DayZ server on UDP ${s.PORT}`);
  log(`Mods: ${CLIENT_MODS}`);
  if (SERVER_MODS) log(`Server-only mods: ${SERVER_MODS}`);

  await runServerWithWatchdog(args);
}

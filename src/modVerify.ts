// Verifies the freshly built server pack's Enforce Script actually compiles,
// by briefly booting the real DayZ dedicated server against the full local
// mod list + mission and scanning the resulting RPT log for fatal script
// compile failures.
//
// Why this exists: `armake2 build` (see modBuild.ts) only rapifies
// config.cpp and packs files - it never actually parses Enforce Script. A
// real syntax error in a .c file (e.g. DZSurvivalMapGate's very first
// version - a multi-line `return` with `&&` starting the continuation line)
// packs, signs, and even publishes completely cleanly. The only symptom is
// that the whole "Mission" script module fails to compile at *runtime*,
// which breaks mission loading entirely - every client just sees infinite
// loading, with no per-mod error surfaced anywhere obvious. The only
// reliable way to catch this ahead of publishing is to let the real engine
// parse it, which only happens when a mission actually loads.
//
// Deploys straight into the LOCAL server's own mod folder
// (server/@<SERVERPACK_NAME>) rather than going through install.ts's
// ensureMods() - that would just re-download whatever is currently
// *published* on Workshop and clobber the very build being verified, which
// is exactly what silently defeated an earlier attempt to fix this live
// (ensureMods() only re-syncs when Steam's API reports the item as stale,
// so a manually-patched local copy gets silently overwritten back to the
// last-published, still-broken version on the next start). This assumes
// `deno run up` has already been run at least once locally (server binary
// installed, other mods downloaded, mission/config generated) - if not, it
// skips with a warning rather than trying to bootstrap a whole install here.

import { PROFILE_DIR, SERVER_DIR, SERVERPACK, type ServerPackConfig } from "./paths.ts";
import { die, log, ok, warn } from "./ui.ts";
import { runCapture } from "./proc.ts";
import { ensureServer, exists, serverBinary, serverInstalled } from "./steam.ts";
import { loadMods, modParam, serverModParam } from "./mods.ts";
import { ensureConfig, loadSettings } from "./config.ts";

// Confirmed in practice: a fatal script-compile failure crashes the whole
// server process within ~5 seconds of launch (reproduced live - see the
// crash log/minidump from DZSurvivalTraderRestock's ternary-operator bug,
// which EnforceScript doesn't support at all: "Can't compile \"World\"
// script module!" appeared in the RPT and the process hard-crashed only
// ~4s after starting). By contrast, a genuinely clean boot against this
// project's full ~90-mod list can take several *minutes* just to finish
// loading world content (confirmed live: JunkYardDog's salvage-point scan
// over every map wreck alone routinely takes 5-9 minutes end-to-end) before
// the server reaches its steady-state main loop.
//
// This means a fixed, blind wait is fundamentally unreliable in either
// direction: too short and a slow/cold-cache clean boot gets falsely
// reported as failed (never reaching script compilation in time); worse, a
// wait that's merely "generous enough for the compile phase" can still
// falsely report a genuinely broken build as CLEAN if system load that run
// happens to slow the boot down before script compilation is ever reached
// (reproduced live: this exact ternary bug was reported "compiled cleanly"
// by an earlier fixed-90s-wait version of this function, immediately before
// a real full boot crashed on the very same file/line - the 90s window had
// simply elapsed before the engine got far enough to compile it that run).
//
// The fix: poll the growing RPT log instead of blindly waiting a fixed
// duration, and resolve as soon as EITHER a fatal pattern appears (fails
// fast, typically within seconds) OR a clear steady-state signal appears
// (succeeds as soon as it's actually known good, without waiting out a
// worst-case timeout on every single successful run). MAX_WAIT_MS is a
// generous upper bound for a genuinely stuck/hung boot only.
const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 600_000; // 10 minutes
// "Average server FPS" is logged once the server reaches its steady-state
// main loop (confirmed live, appears every ~30s once the world/mission has
// fully finished loading) - by this point script compilation (which
// happens architecturally before world/mission content loads at all) is
// long since finished, so its absence of any FATAL_PATTERNS match by then
// means the build is genuinely clean, not just "hasn't failed yet".
const SUCCESS_PATTERN = /Average server FPS/;

// The exact log signatures of a fatal script-compile failure, as reproduced
// live by DZSurvivalMapGate's original bug. Deliberately narrow: this
// modlist's RPT logs are otherwise full of benign noise (e.g. "Bad type
// 'Param1'" warnings from several unrelated third-party mods, ANIMATION (E)
// spam) that looks alarming but never actually breaks mission loading -
// only these specific lines do.
const FATAL_PATTERNS = [
  /Can't compile "[^"]+" script module!/,
  /Failed to load mission scripts!/,
  /Mission script has no main function/,
];

async function currentLogNames(matches: (name: string) => boolean): Promise<Set<string>> {
  const names = new Set<string>();
  try {
    for await (const entry of Deno.readDir(PROFILE_DIR)) {
      if (entry.isFile && matches(entry.name)) names.add(entry.name);
    }
  } catch {
    // profiles/ doesn't exist yet - fine, treated as no pre-existing logs.
  }
  return names;
}

async function newestLogNotIn(
  matches: (name: string) => boolean,
  before: Set<string>,
): Promise<string | null> {
  const fresh: string[] = [];
  for await (const entry of Deno.readDir(PROFILE_DIR)) {
    if (entry.isFile && matches(entry.name) && !before.has(entry.name)) {
      fresh.push(entry.name);
    }
  }
  if (fresh.length === 0) return null;
  // Log filenames are timestamped (e.g. DayZServer_YYYY-MM-DD_HH-MM-SS.RPT,
  // crash_YYYY-MM-DD_HH-MM-SS.log), so a plain lexicographic sort puts the
  // newest one last.
  fresh.sort();
  return `${PROFILE_DIR}/${fresh[fresh.length - 1]}`;
}

const isRpt = (name: string) => name.endsWith(".RPT");
// DayZ writes a dedicated `crash_<timestamp>.log` (via its own crash
// reporter machinery) on a hard/unhandled-exception crash - confirmed live
// to reliably contain the exact fatal script-compile line (e.g. "Can't
// compile \"World\" script module!" plus the offending file/line) even in
// runs where the *RPT* itself does NOT end up containing that same line.
// RPT writes appear to be buffered and can be lost/truncated on a hard
// crash (SIGSEGV, not a clean shutdown), whereas the crash log is written
// directly by the crash handler - so this is actually the more reliable of
// the two signals for a fatal script error, not merely a redundant check.
const isCrashLog = (name: string) => name.startsWith("crash_") && name.endsWith(".log");

/**
 * Boots the real dedicated server for a bounded window against the pack at
 * `outRoot` (as produced by `buildServerPack()`), then checks the fresh RPT
 * log for fatal script-compile failures. Throws (via `die()`) if any are
 * found, printing the actual offending log lines. No-ops with a warning if
 * this machine's server isn't installed/configured yet.
 */
export async function verifyServerPackScripts(
  outRoot: string,
  pack: ServerPackConfig = SERVERPACK,
): Promise<void> {
  const s = await ensureConfig(await loadSettings());

  if (
    !(await exists(`${SERVER_DIR}/keys`)) || !(await exists(await serverBinary().catch(() => "")))
  ) {
    warn(
      "Local server doesn't look installed yet - skipping pre-publish script verification. " +
        "Run 'deno run up' at least once on this machine first so publishes can be verified.",
    );
    return;
  }

  log(
    "Verifying the freshly built server pack actually compiles (booting the real server briefly)…",
  );

  // Deliberately bypass install.ts's ensureMods() - see file header. Reuses
  // the same stage-locally-and-register-key logic this project's local-only
  // packs use for real starts (see localServerPacks.ts) - for a pack that's
  // already been through at least one real Workshop install, the key is
  // already registered and this is a no-op; for a brand new, never-yet-
  // published pack, nothing has ever copied its key into server/keys/ before,
  // and a dedicated server given a -servermod=/-mod= entry signed with a
  // completely unregistered key hangs indefinitely at startup with no RPT
  // output and no crash log at all (confirmed live: 3 separate boots all
  // stopped dead after only the fixed banner lines, vs. a normal boot which
  // logs many more lines within the same second).
  const dst = `${SERVER_DIR}/@${pack.name}`;
  await Deno.remove(dst, { recursive: true }).catch(() => {});
  const copy = await runCapture("cp", ["-r", outRoot, dst]);
  if (copy.code !== 0) {
    die(`Failed to stage the built server pack into ${dst} for verification:\n${copy.stderr}`);
  }
  const serverKeyFile = `${SERVER_DIR}/keys/${pack.name}.bikey`;
  if (!(await exists(serverKeyFile))) {
    await Deno.mkdir(`${SERVER_DIR}/keys`, { recursive: true });
    await Deno.copyFile(`${pack.keysDir}/${pack.name}.bikey`, serverKeyFile);
    log(`Registered ${pack.name}'s signing key into ${SERVER_DIR}/keys/ for verification.`);
  }

  await ensureServer(s);
  const allMods = await loadMods();
  let mods = modParam(allMods);
  let serverMods = serverModParam(allMods);
  // A brand new pack (not published yet) won't be in mods.txt at all - it
  // still needs to be included in the boot args so this verification run
  // actually loads it (staged above at `dst`), since mods.txt is normally
  // what maps a Workshop id to a local @name for downloading, not what this
  // pre-publish check should depend on. Once the pack IS in mods.txt (after
  // a real first publish), this is a no-op - the entry there is used as-is.
  if (!allMods.some((m) => m.name === `@${pack.name}`)) {
    if (pack.serverOnly) serverMods = serverMods ? `${serverMods};@${pack.name}` : `@${pack.name}`;
    else mods = mods ? `${mods};@${pack.name}` : `@${pack.name}`;
  }
  await Deno.mkdir(PROFILE_DIR, { recursive: true });

  const rptBefore = await currentLogNames(isRpt);
  const crashBefore = await currentLogNames(isCrashLog);

  const args = [
    await serverBinary(),
    "-config=serverDZ.cfg",
    `-port=${s.PORT}`,
    `-mod=${mods}`,
    ...(serverMods ? [`-servermod=${serverMods}`] : []),
    `-BEpath=${PROFILE_DIR}/battleye`,
    `-profiles=${PROFILE_DIR}`,
    `-cpuCount=${navigator.hardwareConcurrency}`,
  ];

  const child = new Deno.Command("steam-run", {
    args,
    cwd: SERVER_DIR,
    env: { LD_LIBRARY_PATH: `${SERVER_DIR}:${Deno.env.get("LD_LIBRARY_PATH") ?? ""}` },
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  // Drain stdio so the child never blocks on a full pipe buffer - we don't
  // need this run's console output, only its RPT log afterward.
  const drain = async (stream: ReadableStream<Uint8Array>) => {
    try {
      for await (const _chunk of stream) { /* discard */ }
    } catch {
      // stream closed on kill - fine.
    }
  };
  const drains = Promise.all([drain(child.stdout), drain(child.stderr)]);

  // Poll the growing RPT (and, more reliably for a hard crash, the
  // separate crash log - see isCrashLog's own comment) until either a
  // fatal pattern or the steady-state success signal shows up (see the
  // constants' own comment above for why a blind fixed wait doesn't work),
  // whichever comes first, up to MAX_WAIT_MS for a genuinely hung boot.
  // Also breaks immediately once the child process itself exits (a crash
  // means no further RPT growth is coming, so no point continuing to poll
  // at the normal interval).
  let rpt: string | null = null;
  let crashLog: string | null = null;
  let failures: string[] = [];
  let sawSuccess = false;
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await Promise.race([
      new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS)),
      child.status,
    ]);

    if (!crashLog) {
      crashLog = await newestLogNotIn(isCrashLog, crashBefore);
      if (crashLog) {
        const crashText = await Deno.readTextFile(crashLog).catch(() => "");
        failures = crashText.split("\n").filter((line) => line.trim().length > 0).slice(0, 10);
        if (failures.length === 0) failures = [`(empty crash log: ${crashLog})`];
        break;
      }
    }

    if (!rpt) {
      rpt = await newestLogNotIn(isRpt, rptBefore);
      if (!rpt) continue;
    }

    const text = await Deno.readTextFile(rpt).catch(() => "");
    const lines = text.split("\n");
    failures = lines.filter((line) => FATAL_PATTERNS.some((p) => p.test(line)));
    if (failures.length > 0) break;

    sawSuccess = lines.some((line) => SUCCESS_PATTERN.test(line));
    if (sawSuccess) break;
  }

  await runCapture("pkill", ["-f", "DayZServer"]);
  try {
    child.kill("SIGKILL");
  } catch {
    // already gone - fine.
  }
  await Promise.race([
    child.status,
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
  await Promise.race([drains, new Promise<void>((resolve) => setTimeout(resolve, 5_000))]);

  if (crashLog) {
    die(
      `Server crashed during the verification boot (${crashLog}):\n` +
        failures.join("\n") +
        "\n\nNOT publishing - fix the addon's script(s) and re-run.",
    );
  }

  if (!rpt) {
    die(
      "Couldn't find a fresh RPT log after the verification boot - the server may have failed " +
        `to start at all. Check ${PROFILE_DIR} manually before publishing.`,
    );
  }

  if (failures.length > 0) {
    die(
      `Script compile failure detected in the freshly built server pack (${rpt}):\n` +
        failures.slice(0, 20).join("\n") +
        "\n\nNOT publishing - fix the addon's script(s) and re-run.",
    );
  }

  if (!sawSuccess) {
    die(
      `Verification boot didn't reach a steady-state signal or a known fatal error within ` +
        `${MAX_WAIT_MS / 60_000} minutes (${rpt}). Inconclusive - check the RPT manually before ` +
        "publishing.",
    );
  }

  ok(`Server pack scripts compiled cleanly (verified against ${rpt}).`);
}

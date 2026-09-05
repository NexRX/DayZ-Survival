// Verifies the freshly built server pack's Enforce Script actually compiles,
// by briefly booting the real DayZ dedicated server against the full local
// mod list + mission and scanning the resulting RPT log for fatal script
// compile failures.
//
// Why this exists: `armake2 build` (see modBuild.ts) only rapifies
// config.cpp and packs files - it never parses Enforce Script, so a real
// syntax error can pack/sign/publish cleanly and only fail at mission-load
// runtime, with no per-mod error surfaced anywhere. Booting the real engine
// against the pack is the only reliable way to catch that ahead of publish.
//
// Deploys straight into the LOCAL server's own mod folder
// (server/@<SERVERPACK_NAME>) rather than going through install.ts's
// ensureMods(), which would re-download whatever is currently *published*
// on Workshop and clobber the very build being verified. Assumes
// `deno run up` has already been run at least once locally; if not, skips
// with a warning rather than bootstrapping a whole install here.

import { PROFILE_DIR, SERVER_DIR, SERVERPACK, type ServerPackConfig } from "./paths.ts";
import { die, log, ok, warn } from "./ui.ts";
import { runCapture } from "./proc.ts";
import { ensureServer, exists, serverBinary, serverInstalled } from "./steam.ts";
import { loadMods, modParam, serverModParam } from "./mods.ts";
import { ensureConfig, loadSettings } from "./config.ts";

// A fatal script-compile failure crashes the server within seconds of
// launch, but a genuinely clean boot against a large mod list can take
// several minutes to finish loading world content before reaching its
// steady-state main loop. A fixed, blind wait is therefore unreliable in
// either direction, so instead poll the growing RPT log and resolve as soon
// as EITHER a fatal pattern appears OR the steady-state success signal
// appears, whichever comes first. MAX_WAIT_MS bounds a genuinely hung boot.
const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 600_000; // 10 minutes
// Logged once the server reaches its steady-state main loop, which happens
// well after script compilation - its absence of any FATAL_PATTERNS match
// by then means the build is genuinely clean, not just "hasn't failed yet".
const SUCCESS_PATTERN = /Average server FPS/;

// The log signatures of a fatal script-compile failure. Deliberately
// narrow: this modlist's RPT logs are otherwise full of benign noise (e.g.
// "Bad type 'Param1'" warnings, ANIMATION (E) spam) that never actually
// breaks mission loading - only these specific lines do.
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
  // Log filenames are timestamped, so a plain lexicographic sort puts the
  // newest one last.
  fresh.sort();
  return `${PROFILE_DIR}/${fresh[fresh.length - 1]}`;
}

const isRpt = (name: string) => name.endsWith(".RPT");
// DayZ's crash reporter writes a dedicated `crash_<timestamp>.log` on a
// hard/unhandled-exception crash, reliably containing the fatal script-
// compile line even when RPT writes are lost/truncated by the same crash -
// so this is a more reliable signal than the RPT alone, not a redundant check.
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

  // Deliberately bypass install.ts's ensureMods() - see file header. A
  // brand new, never-yet-published pack has no key registered under
  // server/keys/ yet, and a dedicated server given a -mod=/-servermod=
  // entry signed with an unregistered key hangs indefinitely at startup
  // with no RPT or crash log at all - so register it here if missing.
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
  const serverMods = serverModParam(allMods);
  // A brand new pack (not published yet) won't be in mods.txt yet, so add
  // it to the boot args manually to make sure this run actually loads it
  // (staged above at `dst`). Once it's in mods.txt, this is a no-op.
  if (!allMods.some((m) => m.name === `@${pack.name}`)) {
    mods = mods ? `${mods};@${pack.name}` : `@${pack.name}`;
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

  // Drain stdio so the child never blocks on a full pipe buffer - we only
  // need its RPT log afterward, not this run's console output.
  const drain = async (stream: ReadableStream<Uint8Array>) => {
    try {
      for await (const _chunk of stream) { /* discard */ }
    } catch {
      // stream closed on kill - fine.
    }
  };
  const drains = Promise.all([drain(child.stdout), drain(child.stderr)]);

  // Poll the growing RPT (and the separate crash log, see isCrashLog)
  // until either a fatal pattern or the success signal shows up, whichever
  // comes first, up to MAX_WAIT_MS. Also breaks immediately once the child
  // process exits, since a crash means no further RPT growth is coming.
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

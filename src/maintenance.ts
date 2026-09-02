// Server housekeeping run at the start of every doStart(): log rotation and
// a rotating backup of the mission's persistence database. Neither of these
// existed before - a long-lived, rarely-supervised server (per this
// project's own design goals) was accumulating profiles/*.RPT+*.ADM forever
// with no cleanup, and a bad wipe/crash/corrupted save had no automatic
// recovery path at all. Both are best-effort: a failure here should never
// block the server from actually starting.

import { MISSION_DIR, PROFILE_DIR, ROOT } from "./paths.ts";
import { log, ok, warn } from "./ui.ts";
import { runCapture } from "./proc.ts";
import { exists } from "./steam.ts";

// --- Log rotation ---

// Every real server start writes a fresh, uniquely-timestamped RPT (+ ADM
// when -adminlog is on, + occasional script_*/error_* logs from mod crash
// reports) into PROFILE_DIR - confirmed live: 194 RPT + 144 ADM files
// (673MB) had piled up with zero cleanup before this existed. 20 is
// generous headroom (weeks of typical restart cadence) while keeping
// profiles/ from growing without bound across months of uptime.
const LOG_KEEP_COUNT = 20;
const LOG_PATTERNS = [
  /^DayZServer_.*\.RPT$/,
  /^DayZServer_.*\.ADM$/,
  /^script_.*\.log$/,
  /^error_.*\.log$/,
];

// A handful of installed mods (DayZ-Expansion, Community-Online-Tools,
// Code-Lock, Custom-Keycards, sVisual/sUDE, CJ187-RandomMineFields, the
// P2P-Trading-Board, and DayZ's own WebApi/EventManager logging) each keep
// their own separate, unbounded per-run log directory under PROFILE_DIR -
// individually much smaller than the main RPT/ADM problem above (KBs, not
// hundreds of MBs), but every one of them grows forever with no cleanup of
// its own (confirmed live: 100-185 files apiece after only ~10 days).
// Pruned the same way, just without the RPT/ADM filename-pattern filter
// (each of these directories only ever holds one kind of file).
const MOD_LOG_DIRS = [
  "ExpansionMod/Logs",
  "CommunityOnlineTools/Logs",
  "CodeLock/Logs",
  "CustomKeycards/0_Logs",
  "EventManagerLog",
  "WebApiLog",
  "sUDE/logs",
  "Beetle/tradeboard/logs",
  "CJ_RandomMineFields/Logs",
];

export async function pruneOldLogs(): Promise<void> {
  if (!(await exists(PROFILE_DIR))) return;

  for (const pattern of LOG_PATTERNS) {
    const matches: { name: string; mtime: number }[] = [];
    try {
      for await (const entry of Deno.readDir(PROFILE_DIR)) {
        if (!entry.isFile || !pattern.test(entry.name)) continue;
        const stat = await Deno.stat(`${PROFILE_DIR}/${entry.name}`);
        matches.push({ name: entry.name, mtime: stat.mtime?.getTime() ?? 0 });
      }
    } catch {
      continue; // best-effort - a read error here shouldn't block startup
    }
    if (matches.length <= LOG_KEEP_COUNT) continue;

    matches.sort((a, b) => b.mtime - a.mtime); // newest first
    const toDelete = matches.slice(LOG_KEEP_COUNT);
    for (const f of toDelete) {
      await Deno.remove(`${PROFILE_DIR}/${f.name}`).catch(() => {});
    }
    ok(
      `Pruned ${toDelete.length} old log file(s) (${pattern.source}) - kept newest ${LOG_KEEP_COUNT}`,
    );
  }

  for (const rel of MOD_LOG_DIRS) {
    const dir = `${PROFILE_DIR}/${rel}`;
    if (!(await exists(dir))) continue;

    const files: { name: string; mtime: number }[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (!entry.isFile) continue;
        const stat = await Deno.stat(`${dir}/${entry.name}`);
        files.push({ name: entry.name, mtime: stat.mtime?.getTime() ?? 0 });
      }
    } catch {
      continue; // best-effort - a read error here shouldn't block startup
    }
    if (files.length <= LOG_KEEP_COUNT) continue;

    files.sort((a, b) => b.mtime - a.mtime); // newest first
    const toDelete = files.slice(LOG_KEEP_COUNT);
    for (const f of toDelete) {
      await Deno.remove(`${dir}/${f.name}`).catch(() => {});
    }
    ok(`Pruned ${toDelete.length} old log file(s) in ${rel} - kept newest ${LOG_KEEP_COUNT}`);
  }
}

// --- World-state backup ---

// Rotating backup of the mission's persistence database (storage_1 -
// characters, bases, vehicles, trader stock) taken on every server start,
// capturing whatever was left over from the previous run before anything
// new happens to it. This is the only safety net against a bad `wipe`,
// disk corruption, or a mod bug trashing a save - none existed before. Uses
// `tar` (already relied on inside the nix devshell) for a single-file,
// easy-to-prune artifact that also compresses reasonably well - confirmed
// live storage_1 is ~86MB uncompressed.
export const BACKUPS_DIR = `${ROOT}/backups`;
const BACKUP_KEEP_COUNT = 10;

function backupTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function backupWorldState(): Promise<void> {
  const storage = `${MISSION_DIR}/storage_1`;
  if (!(await exists(storage))) return; // nothing to back up yet

  await Deno.mkdir(BACKUPS_DIR, { recursive: true });
  const dest = `${BACKUPS_DIR}/storage_1-${backupTimestamp()}.tar.gz`;
  const { code, stderr } = await runCapture("tar", [
    "-czf",
    dest,
    "-C",
    MISSION_DIR,
    "storage_1",
  ]);
  if (code !== 0) {
    warn(
      `World-state backup failed (tar exited ${code}): ${stderr.trim()} - continuing without one`,
    );
    await Deno.remove(dest).catch(() => {});
    return;
  }
  ok(`Backed up world state to ${dest}`);

  const backups: { name: string; mtime: number }[] = [];
  for await (const entry of Deno.readDir(BACKUPS_DIR)) {
    if (!entry.isFile || !/^storage_1-.*\.tar\.gz$/.test(entry.name)) continue;
    const stat = await Deno.stat(`${BACKUPS_DIR}/${entry.name}`);
    backups.push({ name: entry.name, mtime: stat.mtime?.getTime() ?? 0 });
  }
  if (backups.length > BACKUP_KEEP_COUNT) {
    backups.sort((a, b) => b.mtime - a.mtime);
    const toDelete = backups.slice(BACKUP_KEEP_COUNT);
    for (const f of toDelete) {
      await Deno.remove(`${BACKUPS_DIR}/${f.name}`).catch(() => {});
    }
    log(`Pruned ${toDelete.length} old world-state backup(s) - kept newest ${BACKUP_KEEP_COUNT}`);
  }
}

import { loadDotEnv } from "./dotenv.ts";
import { ENV_FILE, STEAMCMD_DIR } from "../constants/paths.ts";
import type { RunOptions } from "./process.ts";

/**
 * Configuration is sourced from environment variables / a local `.env` file.
 *
 * Missing values fall back to sensible defaults — anonymous login when
 * `STEAM_USER` is absent, DayZ app id when `STEAM_APP_ID` is absent, etc.
 * Neither a Steam password nor Steam Guard code is ever stored on disk.
 */
export interface BaseConfig {
  /** Path/command used to invoke steamcmd. Defaults to "steamcmd" (must be on PATH). */
  steamCmdPath: string;
  /** Path/command used to invoke DepotDownloader. Defaults to "DepotDownloader". */
  depotDownloaderPath: string;
  /** Steam account to log in as. Defaults to "Anonymous". */
  steamUser: string;
  /** Optional Web API key for Steam Workshop API calls. */
  steamApiKey?: string;
  /** Starting delay before the first rate-limit retry. Default 30s. */
  rateLimitBaseDelayMs: number;
  /** Ceiling the exponential backoff delay grows to (retries continue indefinitely at this cap). Default 15min. */
  rateLimitMaxDelayMs: number;
}

/** Adds workshop-specific settings on top of the shared/base config. */
export interface WorkshopManagerConfig extends BaseConfig {
  /** The Steam AppID that owns the workshop items (DayZ = 221100 by default). */
  appId: string;
  /** Mods at and above this size use DepotDownloader instead of steamcmd. Default 500MB. */
  largeFileCutoffBytes: number;
}

const DEFAULT_CUTOFF_BYTES = 500 * 1024 * 1024; // 500MB
const DEFAULT_BASE_DELAY_MS = 30_000; // 30s
const DEFAULT_MAX_DELAY_MS = 15 * 60_000; // 15min

/** Keep SteamCMD and DepotDownloader credentials in the project-local, gitignored cache. */
export async function persistentSteamOptions(): Promise<RunOptions> {
  await Deno.mkdir(STEAMCMD_DIR, { recursive: true });
  return {
    cwd: STEAMCMD_DIR,
    env: {
      ...Deno.env.toObject(),
      HOME: STEAMCMD_DIR,
      XDG_CONFIG_HOME: `${STEAMCMD_DIR}/.config`,
    },
  };
}

export async function loadBaseConfig(): Promise<BaseConfig> {
  await loadDotEnv(ENV_FILE);

  const baseDelayRaw = Deno.env.get("RATE_LIMIT_BASE_DELAY_MS");
  const rateLimitBaseDelayMs = baseDelayRaw ? Number(baseDelayRaw) : DEFAULT_BASE_DELAY_MS;

  const maxDelayRaw = Deno.env.get("RATE_LIMIT_MAX_DELAY_MS");
  const rateLimitMaxDelayMs = maxDelayRaw ? Number(maxDelayRaw) : DEFAULT_MAX_DELAY_MS;

  return {
    steamCmdPath: Deno.env.get("STEAMCMD_PATH") ?? "steamcmd",
    depotDownloaderPath: Deno.env.get("DEPOTDOWNLOADER_PATH") ?? "DepotDownloader",
    steamUser: Deno.env.get("STEAM_USER") ?? "Anonymous",
    steamApiKey: Deno.env.get("STEAM_API_KEY") || undefined,
    rateLimitBaseDelayMs,
    rateLimitMaxDelayMs,
  };
}

/** Full workshop config — defaults to DayZ app id (221100) if STEAM_APP_ID is absent. */
export async function loadConfig(): Promise<WorkshopManagerConfig> {
  const base = await loadBaseConfig();

  const appId = Deno.env.get("STEAM_APP_ID") ?? "221100";

  const cutoffRaw = Deno.env.get("WORKSHOP_SIZE_CUTOFF_BYTES");
  const largeFileCutoffBytes = cutoffRaw ? Number(cutoffRaw) : DEFAULT_CUTOFF_BYTES;
  if (Number.isNaN(largeFileCutoffBytes) || largeFileCutoffBytes <= 0) {
    throw new Error(`WORKSHOP_SIZE_CUTOFF_BYTES must be a positive number, got "${cutoffRaw}".`);
  }

  return { ...base, appId, largeFileCutoffBytes };
}

// Settings persisted to `.env`. The Steam password is deliberately never stored.

import { ENV_FILE } from "./paths.ts";
import { ask, confirm, log, ok, warn } from "./ui.ts";

export interface Settings {
  STEAM_USER: string;
  SERVER_NAME: string;
  JOIN_PASSWORD: string;
  ADMIN_PASSWORD: string;
  MAXPLAYERS: string;
  PORT: string;
  QUERY_PORT: string;
  LOWERCASE_MODS: string;
  STEAM_API_KEY: string;
  EXTRA_PARAMS: string;
}

const DEFAULTS: Settings = {
  STEAM_USER: "",
  SERVER_NAME: "DayZ Survival | Expansion",
  JOIN_PASSWORD: "",
  ADMIN_PASSWORD: "",
  MAXPLAYERS: "60",
  PORT: "2302",
  QUERY_PORT: "2305",
  LOWERCASE_MODS: "1",
  STEAM_API_KEY: "",
  EXTRA_PARAMS: "-dologs -adminlog -netlog -freezecheck",
};

/** Parse a `.env` file: KEY=value, with optional quotes and `#` comments. */
function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      const quote = val[0];
      val = val.slice(1, -1);
      if (quote === '"') val = val.replace(/\\(["\\$`])/g, "$1");
    } else {
      // Unescape shell backslash escapes (older files were written via printf %q).
      val = val.replace(/\\(.)/g, "$1");
    }
    out[m[1]] = val;
  }
  return out;
}

/** Quote a value for `.env` output when it contains shell-significant chars. */
function quote(v: string): string {
  if (v === "") return '""';
  if (/[^A-Za-z0-9_./:@=+-]/.test(v)) {
    return `"${v.replace(/(["\\$`])/g, "\\$1")}"`;
  }
  return v;
}

export async function loadSettings(): Promise<Settings> {
  let parsed: Record<string, string> = {};
  try {
    parsed = parseEnv(await Deno.readTextFile(ENV_FILE));
  } catch {
    // No .env yet — use defaults.
  }
  const s = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    if (parsed[key] !== undefined) s[key] = parsed[key];
  }
  return s;
}

export async function saveSettings(s: Settings): Promise<void> {
  const lines = [
    "# DayZ server settings — written by the CLI.",
    "# Your Steam password is NEVER stored here (used once to cache a session).",
    "",
    `STEAM_USER=${quote(s.STEAM_USER)}`,
    `SERVER_NAME=${quote(s.SERVER_NAME)}`,
    `JOIN_PASSWORD=${quote(s.JOIN_PASSWORD)}`,
    `ADMIN_PASSWORD=${quote(s.ADMIN_PASSWORD)}`,
    `MAXPLAYERS=${quote(s.MAXPLAYERS)}`,
    `PORT=${quote(s.PORT)}`,
    `QUERY_PORT=${quote(s.QUERY_PORT)}`,
    `LOWERCASE_MODS=${quote(s.LOWERCASE_MODS)}`,
    `STEAM_API_KEY=${quote(s.STEAM_API_KEY)}`,
    `EXTRA_PARAMS=${quote(s.EXTRA_PARAMS)}`,
    "",
  ];
  await Deno.writeTextFile(ENV_FILE, lines.join("\n"));
  await Deno.chmod(ENV_FILE, 0o600);
}

/** Interactively (re)enter all settings and persist them. */
export async function configure(s: Settings): Promise<Settings> {
  log("Server configuration (press Enter to keep the shown default)");
  s.STEAM_USER = await ask("Steam username that OWNS DayZ", s.STEAM_USER);
  s.SERVER_NAME = await ask("Server name (shown in browser)", s.SERVER_NAME);
  s.JOIN_PASSWORD = await ask("Join password (blank = open)", s.JOIN_PASSWORD);
  s.ADMIN_PASSWORD = await ask("Admin password", s.ADMIN_PASSWORD);
  s.MAXPLAYERS = await ask("Max players", s.MAXPLAYERS);
  s.PORT = await ask("Game port (UDP)", s.PORT);
  s.QUERY_PORT = await ask("Steam query port (UDP)", s.QUERY_PORT);
  s.LOWERCASE_MODS = (await confirm("Lowercase mod files for Linux (recommended)?", "Y"))
    ? "1"
    : "0";
  s.STEAM_API_KEY = await ask(
    "Steam Web API key (optional, for mod verify)",
    s.STEAM_API_KEY,
  );
  await saveSettings(s);
  ok("Saved to .env");
  return s;
}

/** Ensure a usable Steam account is configured, prompting if not. */
export async function ensureConfig(s: Settings): Promise<Settings> {
  if (!s.STEAM_USER || s.STEAM_USER === "anonymous") {
    warn("No Steam account configured yet.");
    return await configure(s);
  }
  return s;
}

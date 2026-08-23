// Thin wrappers around subprocess execution + a PATH tool check.

import { DayzError } from "./ui.ts";

export interface RunOpts {
  cwd?: string;
  /** Extra env vars layered on top of the inherited environment. */
  env?: Record<string, string>;
}

/** Run a command with inherited stdio (interactive) and resolve its exit code. */
export async function runInherit(
  cmd: string,
  args: string[],
  opts: RunOpts = {},
): Promise<number> {
  const { code } = await new Deno.Command(cmd, {
    args,
    cwd: opts.cwd,
    env: opts.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  return code;
}

/** Run a command and capture its output. */
export async function runCapture(
  cmd: string,
  args: string[],
  opts: RunOpts = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const out = await new Deno.Command(cmd, {
    args,
    cwd: opts.cwd,
    env: opts.env,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const dec = new TextDecoder();
  return { code: out.code, stdout: dec.decode(out.stdout), stderr: dec.decode(out.stderr) };
}

/**
 * Run a command, streaming stdout+stderr to the console live (so long-running
 * downloads still show progress) while also returning the full combined
 * output text - e.g. so a caller can detect a specific error string (like
 * Steam's "RateLimitExceeded") to react to.
 */
export async function runInheritCapture(
  cmd: string,
  args: string[],
  opts: RunOpts = {},
): Promise<{ code: number; output: string }> {
  const child = new Deno.Command(cmd, {
    args,
    cwd: opts.cwd,
    env: opts.env,
    stdin: "inherit",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const dec = new TextDecoder();
  let output = "";
  const pump = async (stream: ReadableStream<Uint8Array>) => {
    for await (const chunk of stream) {
      output += dec.decode(chunk, { stream: true });
      Deno.stdout.writeSync(chunk);
    }
  };

  await Promise.all([pump(child.stdout), pump(child.stderr)]);
  const { code } = await child.status;
  return { code, output };
}

/**
 * Run a command, streaming stdout+stderr line-by-line while dropping any line
 * matching `drop`. Used to hide known-benign SteamCMD log spam on Linux.
 */
export async function runFiltered(
  cmd: string,
  args: string[],
  drop: RegExp,
  opts: RunOpts = {},
): Promise<number> {
  const child = new Deno.Command(cmd, {
    args,
    cwd: opts.cwd,
    env: opts.env,
    stdin: "inherit",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const pump = async (stream: ReadableStream<Uint8Array>) => {
    let buffer = "";
    for await (const chunk of stream) {
      buffer += dec.decode(chunk, { stream: true });
      let i: number;
      while ((i = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, i + 1);
        buffer = buffer.slice(i + 1);
        if (!drop.test(line)) Deno.stdout.writeSync(enc.encode(line));
      }
    }
    if (buffer && !drop.test(buffer)) Deno.stdout.writeSync(enc.encode(buffer));
  };

  await Promise.all([pump(child.stdout), pump(child.stderr)]);
  const { code } = await child.status;
  return code;
}

async function onPath(bin: string): Promise<boolean> {
  for (const dir of (Deno.env.get("PATH") ?? "").split(":")) {
    if (!dir) continue;
    try {
      const s = await Deno.stat(`${dir}/${bin}`);
      if (s.isFile) return true;
    } catch {
      // not here
    }
  }
  return false;
}

/** Ensure the external tools the CLI shells out to are available. */
export async function requireTools(): Promise<void> {
  const needed = ["steamcmd", "steam-run", "DepotDownloader"];
  const missing: string[] = [];
  for (const t of needed) if (!(await onPath(t))) missing.push(t);
  if (missing.length) {
    throw new DayzError(
      `Missing tools: ${missing.join(", ")}. Enter the Nix dev shell first ` +
        `('nix develop', or enable direnv), then re-run.`,
    );
  }
}

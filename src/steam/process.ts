export interface RunResult {
  code: number;
  /** Combined stdout+stderr, for scanning steamcmd/DepotDownloader output. */
  output: string;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export function run(path: string, args: string[], options?: RunOptions): Promise<RunResult> {
  return Deno.stdin.isTerminal()
    ? runInteractive(path, args, options)
    : runNonInteractive(path, args, options);
}

export async function runInteractive(
  path: string,
  args: string[],
  options?: RunOptions,
): Promise<RunResult> {
  const [cmdPath, cmdArgs] = await resolveLineBuffered(path, args);
  const command = new Deno.Command(cmdPath, {
    args: cmdArgs,
    cwd: options?.cwd,
    env: options?.env,
    stdin: "inherit",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();

  const [stdoutText, stderrText] = await Promise.all([
    relayAndCapture(child.stdout, Deno.stdout.writable),
    relayAndCapture(child.stderr, Deno.stderr.writable),
  ]);

  const status = await child.status;
  return { code: status.code, output: stdoutText + stderrText };
}

export async function runNonInteractive(
  path: string,
  args: string[],
  options?: RunOptions,
): Promise<RunResult> {
  const command = new Deno.Command(path, {
    args,
    cwd: options?.cwd,
    env: options?.env,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();

  const [stdoutText, stderrText] = await Promise.all([
    relayAndCapture(child.stdout, Deno.stdout.writable),
    relayAndCapture(child.stderr, Deno.stderr.writable),
  ]);

  const status = await child.status;
  return { code: status.code, output: stdoutText + stderrText };
}

async function resolveLineBuffered(
  path: string,
  args: string[],
): Promise<[string, string[]]> {
  try {
    const probe = await new Deno.Command("stdbuf", {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    }).output();
    if (probe.code === 0) return ["stdbuf", ["-oL", "-eL", path, ...args]];
  } catch {
    // stdbuf not on PATH — fall through to running directly.
  }
  return [path, args];
}

async function relayAndCapture(
  readable: ReadableStream<Uint8Array>,
  writable: WritableStream<Uint8Array>,
): Promise<string> {
  const [forDisplay, forCapture] = readable.tee();
  const displayDone = forDisplay.pipeTo(writable, { preventClose: true });

  const decoder = new TextDecoder();
  let text = "";
  const reader = forCapture.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  await displayDone;
  return text;
}

// Terminal output + interactive prompts.
//
// log/ok go to stdout; warn/errors go to stderr. Prompts are written to stderr
// so that piping stdout stays clean. Password entry disables terminal echo.

const enc = new TextEncoder();
const dec = new TextDecoder();

const useColor = Deno.stdout.isTerminal() && !Deno.env.get("NO_COLOR");
const wrap = (code: string) => (s: string) => (useColor ? `${code}${s}\x1b[0m` : s);

/** ANSI color helpers (no-op when stdout isn't a TTY or NO_COLOR is set). */
export const c = {
  cyan: wrap("\x1b[1;36m"),
  yellow: wrap("\x1b[1;33m"),
  red: wrap("\x1b[1;31m"),
  green: wrap("\x1b[1;32m"),
  dim: wrap("\x1b[2m"),
};

const writeOut = (s: string) => Deno.stdout.writeSync(enc.encode(s));
const writeErr = (s: string) => Deno.stderr.writeSync(enc.encode(s));

export const log = (msg: string) => writeOut(`${c.cyan("==>")} ${msg}\n`);
export const ok = (msg: string) => writeOut(`${c.green(" ok")} ${msg}\n`);
export const warn = (msg: string) => writeErr(`${c.yellow(" !!")} ${msg}\n`);
export const hint = (msg: string) => writeErr(`${c.dim(`  ${msg}`)}\n`);

/** Recoverable, user-facing error. `die()` throws this; `main()` reports it. */
export class DayzError extends Error {}
export function die(msg: string): never {
  throw new DayzError(msg);
}

// Buffered so a single read that returns multiple lines isn't lost.
let stdinBuf = "";

/** Read a single line from stdin (canonical mode). */
async function readLine(): Promise<string> {
  while (true) {
    const nl = stdinBuf.indexOf("\n");
    if (nl >= 0) {
      const line = stdinBuf.slice(0, nl);
      stdinBuf = stdinBuf.slice(nl + 1);
      return line.replace(/\r$/, "");
    }
    const buf = new Uint8Array(4096);
    const n = await Deno.stdin.read(buf);
    if (n === null) {
      const line = stdinBuf;
      stdinBuf = "";
      return line.replace(/\r?\n$/, "");
    }
    stdinBuf += dec.decode(buf.subarray(0, n));
  }
}

/** Ask a free-text question, returning `def` when the answer is blank. */
export async function ask(question: string, def = ""): Promise<string> {
  writeErr(`${c.cyan(question)}${def ? ` [${def}]` : ""}: `);
  const ans = (await readLine()).trim();
  return ans || def;
}

/** Ask for a secret with echo disabled (supports backspace; Ctrl-C aborts). */
export async function askSecret(question: string): Promise<string> {
  writeErr(`${c.cyan(question)}: `);
  if (!Deno.stdin.isTerminal()) return await readLine();

  Deno.stdin.setRaw(true);
  const buf = new Uint8Array(1);
  let pw = "";
  try {
    while (true) {
      const n = await Deno.stdin.read(buf);
      if (n === null) break;
      const ch = buf[0];
      if (ch === 3) throw new DayzError("Aborted."); // Ctrl-C
      if (ch === 13 || ch === 10) break; // Enter
      if (ch === 127 || ch === 8) { // Backspace
        pw = pw.slice(0, -1);
        continue;
      }
      pw += String.fromCharCode(ch);
    }
  } finally {
    Deno.stdin.setRaw(false);
    writeErr("\n");
  }
  return pw;
}

/** Yes/no prompt. Returns true for yes. */
export async function confirm(
  question: string,
  def: "Y" | "N" = "Y",
): Promise<boolean> {
  writeErr(`${c.cyan(question)} ${def === "Y" ? "[Y/n]" : "[y/N]"} `);
  const ans = (await readLine()).trim() || def;
  return /^y/i.test(ans);
}

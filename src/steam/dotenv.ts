/**
 * A tiny, dependency-free .env loader. Doesn't overwrite variables that are
 * already set in the real environment (so `STEAM_USER=x deno run ...` still
 * wins over whatever is in the file).
 */
export async function loadDotEnv(path = ".env"): Promise<void> {
  let text: string;
  try {
    text = await Deno.readTextFile(path);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return; // .env is optional
    throw err;
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!key) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (Deno.env.get(key) === undefined) {
      Deno.env.set(key, value);
    }
  }
}

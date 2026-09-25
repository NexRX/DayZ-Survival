export async function ensureConfigs(configs: Record<string, unknown>): Promise<void> {
  for (const [path, config] of Object.entries(configs)) {
    await ensureConfig(path, config);
  }
}

export async function ensureConfig(path: string, config: unknown): Promise<void> {
  const separator = path.lastIndexOf("/");
  if (separator > 0) {
    await Deno.mkdir(path.slice(0, separator), { recursive: true });
  }
  await Deno.writeTextFile(path, JSON.stringify(config, null, 2));
}

export async function ensureRemoved(...paths: string[]) {
  for (const path of paths) {
    await Deno.remove(path, { recursive: true }).catch(() => {});
  }
}

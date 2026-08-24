// Builds this project's server pack (serverpack/) - a single Workshop mod
// bundling every custom addon under serverpack/addons/ - into signed,
// publish-ready PBOs using armake2, a Linux-native reimplementation of
// Bohemia's AddonBuilder (see flake.nix). No Windows/DayZ Tools needed.

import {
  SERVERPACK_ADDONS_DIR,
  SERVERPACK_BUILD_DIR,
  SERVERPACK_DIR,
  SERVERPACK_KEYS_DIR,
  SERVERPACK_NAME,
} from "./paths.ts";
import { requireTools, runInherit } from "./proc.ts";
import { die, hint, log, ok } from "./ui.ts";
import { exists } from "./steam.ts";

export interface ServerPackAddon {
  /** Folder name under serverpack/addons/ - also the built PBO's name. */
  name: string;
  /** serverpack/addons/<name> - contains config.cpp and $PBOPREFIX$. */
  srcDir: string;
}

/** Every subfolder of serverpack/addons/ that looks like a PBO source (has a config.cpp). */
export async function listAddons(): Promise<ServerPackAddon[]> {
  const addons: ServerPackAddon[] = [];
  if (!(await exists(SERVERPACK_ADDONS_DIR))) return addons;
  for await (const entry of Deno.readDir(SERVERPACK_ADDONS_DIR)) {
    if (!entry.isDirectory) continue;
    const srcDir = `${SERVERPACK_ADDONS_DIR}/${entry.name}`;
    if (!(await exists(`${srcDir}/config.cpp`))) continue;
    addons.push({ name: entry.name, srcDir });
  }
  return addons;
}

function keyPaths(): { priv: string; pub: string } {
  return {
    priv: `${SERVERPACK_KEYS_DIR}/${SERVERPACK_NAME}.biprivatekey`,
    pub: `${SERVERPACK_KEYS_DIR}/${SERVERPACK_NAME}.bikey`,
  };
}

/** Generate the server pack's shared signing keypair if it doesn't exist yet. */
export async function ensurePackKeys(): Promise<void> {
  const { priv } = keyPaths();
  if (await exists(priv)) return;
  await requireTools(["armake2"]);
  await Deno.mkdir(SERVERPACK_KEYS_DIR, { recursive: true });
  log(`Generating a new signing keypair for '${SERVERPACK_NAME}'`);
  const code = await runInherit("armake2", ["keygen", SERVERPACK_NAME], {
    cwd: SERVERPACK_KEYS_DIR,
  });
  if (code !== 0 || !(await exists(priv))) {
    die(`armake2 keygen failed for '${SERVERPACK_NAME}'.`);
  }
  ok(
    `Keypair generated: ${SERVERPACK_KEYS_DIR}/${SERVERPACK_NAME}.bikey (public), ${priv} (private, keep safe).`,
  );
  hint(
    "Back up the .biprivatekey somewhere safe - losing it means future " +
      "updates to the server pack can't be signed with the same key.",
  );
}

/**
 * Build every addon under serverpack/addons/ into one publish-ready
 * `@<SERVERPACK_NAME>/` folder: a single `mod.cpp`, one `Addons/<name>.pbo`
 * per addon (packed + rapified + signed with the pack's shared key), and
 * one `Keys/<SERVERPACK_NAME>.bikey`. Adding a new addon needs no changes
 * here - it's picked up automatically from serverpack/addons/.
 */
export async function buildServerPack(): Promise<string> {
  await requireTools(["armake2"]);
  const addons = await listAddons();
  if (addons.length === 0) {
    die(`No addons found under ${SERVERPACK_ADDONS_DIR} (expected a config.cpp in each).`);
  }
  if (!(await exists(`${SERVERPACK_DIR}/mod.cpp`))) {
    die(`Missing ${SERVERPACK_DIR}/mod.cpp`);
  }
  await ensurePackKeys();
  const { priv, pub } = keyPaths();

  const outRoot = `${SERVERPACK_BUILD_DIR}/@${SERVERPACK_NAME}`;
  const addonsOut = `${outRoot}/Addons`;
  const keysOut = `${outRoot}/Keys`;
  await Deno.mkdir(addonsOut, { recursive: true });
  await Deno.mkdir(keysOut, { recursive: true });

  for (const addon of addons) {
    const pboTarget = `${addonsOut}/${addon.name}.pbo`;
    log(`Building ${addon.name}.pbo from ${addon.srcDir}`);
    const code = await runInherit("armake2", [
      "build",
      "-f",
      "-k",
      priv,
      addon.srcDir,
      pboTarget,
    ]);
    if (code !== 0 || !(await exists(pboTarget))) {
      die(`armake2 build failed for addon '${addon.name}' - see output above.`);
    }
  }

  await Deno.copyFile(`${SERVERPACK_DIR}/mod.cpp`, `${outRoot}/mod.cpp`);
  await Deno.copyFile(pub, `${keysOut}/${SERVERPACK_NAME}.bikey`);

  ok(
    `Built ${outRoot} (${addons.length} addon${addons.length === 1 ? "" : "s"}: ` +
      `${addons.map((a) => a.name).join(", ")}).`,
  );
  return outRoot;
}

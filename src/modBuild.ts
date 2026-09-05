// Builds this project's server pack (see paths.ts's ServerPackConfig /
// SERVERPACK) - a single Workshop mod bundling every custom addon under its
// addons/ folder - into signed, publish-ready PBOs. Packing/rapifying uses
// armake2, a Linux-native reimplementation of Bohemia's AddonBuilder.
// Signing uses the *real* `DSSignFile.exe` (DayZ Tools, via Wine - see
// modSign.ts) - see modSign.ts's header for why.
//
// One quirk worth knowing if this ever needs touching again: the `.bisign`
// filename's key-name suffix must match the exact original case of the
// signing authority name (embedded in the key/signature itself, from the
// pack's own `name`) - so a pack's mod folder must never be run through
// `src/install.ts`'s `lowercaseTree()` (see the `skipLowercase` check in
// `installOneMod()` there).

import { SERVERPACK, type ServerPackConfig } from "./paths.ts";
import { requireTools, runInherit } from "./proc.ts";
import { die, hint, log, ok, warn } from "./ui.ts";
import { exists } from "./steam.ts";
import { fetchContentIds } from "./mods.ts";
import { ensureDayZTools, ensureWinePrefix, signPboReal } from "./modSign.ts";
import { ensureConfig, loadSettings } from "./config.ts";

export interface ServerPackAddon {
  /** Folder name under the pack's addons/ - also the built PBO's name. */
  name: string;
  /** <pack addonsDir>/<name> - contains config.cpp and $PBOPREFIX$. */
  srcDir: string;
}

/** Every subfolder of a pack's addons/ that looks like a PBO source (has a config.cpp). */
export async function listAddons(pack: ServerPackConfig = SERVERPACK): Promise<ServerPackAddon[]> {
  const addons: ServerPackAddon[] = [];
  if (!(await exists(pack.addonsDir))) return addons;
  for await (const entry of Deno.readDir(pack.addonsDir)) {
    if (!entry.isDirectory) continue;
    const srcDir = `${pack.addonsDir}/${entry.name}`;
    if (!(await exists(`${srcDir}/config.cpp`))) continue;
    addons.push({ name: entry.name, srcDir });
  }
  return addons;
}

function keyPaths(pack: ServerPackConfig): { priv: string; pub: string } {
  return {
    priv: `${pack.keysDir}/${pack.name}.biprivatekey`,
    pub: `${pack.keysDir}/${pack.name}.bikey`,
  };
}

/**
 * Signing key length in bits. DayZ's connect-time PBO signature verification
 * appears to only recognize 1024-bit keys - a cryptographically valid
 * 2048-bit signature still gets silently treated as an unrecognized PBO.
 * Keep this at 1024 to match real mods.
 */
const KEY_LENGTH_BITS = 1024;

/** Generate a server pack's own signing keypair if it doesn't exist yet. */
export async function ensurePackKeys(pack: ServerPackConfig = SERVERPACK): Promise<void> {
  const { priv } = keyPaths(pack);
  if (await exists(priv)) return;
  await requireTools(["bisignutils"]);
  await Deno.mkdir(pack.keysDir, { recursive: true });
  log(`Generating a new ${KEY_LENGTH_BITS}-bit signing keypair for '${pack.name}'`);
  const code = await runInherit("bisignutils", [
    "generate",
    pack.name,
    "--length",
    String(KEY_LENGTH_BITS),
  ], {
    cwd: pack.keysDir,
  });
  if (code !== 0 || !(await exists(priv))) {
    die(`bisignutils generate failed for '${pack.name}'.`);
  }
  ok(
    `Keypair generated: ${pack.keysDir}/${pack.name}.bikey (public), ${priv} (private, keep safe).`,
  );
  hint(
    "Back up the .biprivatekey somewhere safe - losing it means future " +
      "updates to this pack can't be signed with the same key.",
  );
}

/**
 * Build every addon under a pack's addons/ into one publish-ready
 * `@<pack.name>/` folder: a single `mod.cpp`, one `addons/<name>.pbo` per
 * addon (packed + rapified by armake2, then signed by the real
 * `DSSignFile.exe` via Wine - see modSign.ts - with the pack's own key), and
 * one `keys/<pack.name>.bikey`. Adding a new addon needs no changes here -
 * it's picked up automatically from the pack's addons/ folder.
 */
export async function buildServerPack(pack: ServerPackConfig = SERVERPACK): Promise<string> {
  await requireTools(["armake2", "bisignutils"]);
  const s = await ensureConfig(await loadSettings());
  await ensureDayZTools(s);
  await ensureWinePrefix();
  const addons = await listAddons(pack);
  if (addons.length === 0) {
    die(`No addons found under ${pack.addonsDir} (expected a config.cpp in each).`);
  }
  if (!(await exists(`${pack.dir}/mod.cpp`))) {
    die(`Missing ${pack.dir}/mod.cpp`);
  }
  await ensurePackKeys(pack);
  const { priv, pub } = keyPaths(pack);

  // Lowercase "addons"/"keys" to match real-world mod convention (our own
  // install.ts is case-insensitive server-side, but the DayZ client
  // downloads the raw Workshop folder structure as-is).
  const outRoot = `${pack.buildDir}/@${pack.name}`;
  const addonsOut = `${outRoot}/addons`;
  const keysOut = `${outRoot}/keys`;
  // Wipe any previous build first - otherwise an addon removed from the
  // pack's addons/ (or renamed) leaves its old .pbo/.bisign orphaned here
  // forever, silently getting bundled into every future build/publish.
  await Deno.remove(outRoot, { recursive: true }).catch(() => {});
  await Deno.mkdir(addonsOut, { recursive: true });
  await Deno.mkdir(keysOut, { recursive: true });

  for (const addon of addons) {
    const pboTarget = `${addonsOut}/${addon.name}.pbo`;
    log(`Building ${addon.name}.pbo from ${addon.srcDir}`);
    // A real, Workshop-published DayZ addon's PBO header extension always
    // includes `product=dayz ugc`, which armake2's own build output
    // otherwise omits. Its absence makes the DayZ engine's connect-time
    // addon check treat the PBO as not genuine DayZ UGC content, regardless
    // of correct signing/CfgPatches/script content.
    const buildCode = await runInherit("armake2", [
      "build",
      "-f",
      "-e",
      "product=dayz ugc",
      addon.srcDir,
      pboTarget,
    ]);
    if (buildCode !== 0 || !(await exists(pboTarget))) {
      die(`armake2 build failed for addon '${addon.name}' - see output above.`);
    }
    // The real DSSignFile.exe writes its `.bisign` output directly next to
    // the target PBO path - no cwd trick needed.
    await signPboReal(priv, pboTarget);
    if (!(await exists(`${pboTarget}.${pack.name}.bisign`))) {
      die(`Signing failed for addon '${addon.name}' - see output above.`);
    }
  }

  await Deno.copyFile(`${pack.dir}/mod.cpp`, `${outRoot}/mod.cpp`);
  await Deno.copyFile(pub, `${keysOut}/${pack.name}.bikey`);
  await writeMeta(outRoot, pack);

  ok(
    `Built ${outRoot} (${addons.length} addon${addons.length === 1 ? "" : "s"}: ` +
      `${addons.map((a) => a.name).join(", ")}).`,
  );
  return outRoot;
}

/**
 * A `meta.cpp` in the mod's own root folder, declaring its Workshop
 * `publishedid`. Without this, the server can't correctly advertise this
 * mod's real id to the master server / clients. Steam writes this file
 * automatically for mods installed through its own workshop machinery, but
 * we upload via `steamcmd +workshop_build_item` instead, so we write it
 * ourselves, matching Steam's own schema. `timestamp` is the depot's
 * manifest id (`hcontent_file` from the Workshop API, see mods.ts's
 * fetchContentIds), not wall-clock time. Skipped (with a warning) before
 * the very first publish, when no id has been assigned yet -
 * `publishServerPack` rebuilds and re-uploads once more right after a first
 * publish specifically so this file gets embedded with the now-known id.
 */
async function writeMeta(outRoot: string, pack: ServerPackConfig): Promise<void> {
  if (!(await exists(pack.workshopIdFile))) {
    warn(
      `No cached Workshop id yet (${pack.workshopIdFile} not found) - building without ` +
        "meta.cpp. This is expected before the very first publish only.",
    );
    return;
  }
  const id = (await Deno.readTextFile(pack.workshopIdFile)).trim();

  const contentIds = await fetchContentIds([{ id, name: pack.name, serverOnly: false }]);
  const timestamp = contentIds.get(id);
  if (!timestamp) {
    warn(
      `Could not fetch a manifest id for Workshop item ${id} (offline, or too soon after ` +
        "publish) - building meta.cpp without a timestamp field. Re-run once Steam's API " +
        "has caught up so future rebuilds include it.",
    );
  }

  const lines = [
    "protocol = 1;",
    `publishedid = ${id};`,
    `name = "${pack.displayName}";`,
    ...(timestamp ? [`timestamp = ${timestamp};`] : []),
  ];
  await Deno.writeTextFile(`${outRoot}/meta.cpp`, lines.join("\r\n") + "\r\n");
}

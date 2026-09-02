// Builds one of this project's server packs (see paths.ts's ServerPackConfig
// - SERVERPACK for the client+server pack, SERVERPACK_SERVERONLY for the
// server-only one) - each a single Workshop mod bundling every custom addon
// under its own addons/ folder - into signed, publish-ready PBOs.
// Packing/rapifying uses armake2, a Linux-native reimplementation of
// Bohemia's AddonBuilder. Signing uses the *real* `DSSignFile.exe` (DayZ
// Tools, via Wine - see modSign.ts) - BiSignUtils (a reimplementation) was
// tried first and produces `.bisign` files that pass its own `checkAll` but
// that the real DayZ engine rejects at connect-time as "not part of the
// server". See modSign.ts's header for the full story.
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
 * Signing key length in bits. A real, working Workshop mod's `.bisign`
 * (bvp_charcoal.pbo.bloodshot.bisign, from @Search-For-Charcoal) was hex-
 * dumped and its embedded RSA key length is 1024 bits (`0004 0000` right
 * after the "RSA1" magic) - not 2048. DayZ's connect-time PBO signature
 * verification appears to only recognize 1024-bit keys; a cryptographically
 * valid 2048-bit signature (confirmed valid via `bisignutils checkAll`)
 * still gets silently treated as an unrecognized/foreign PBO, producing the
 * exact same generic "Client has a PBO which is not part of the server"
 * kick reproduced throughout this project's debugging history - with no
 * hint it's actually a key-length problem. Keep this at 1024 to match real
 * mods; BiSignUtils (github.com/rvost/BiSignUtils) is still used instead of
 * armake2's own signer for other reasons (see the file header comment).
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

  // Lowercase "addons"/"keys" - matches every real, working mod we've
  // unpacked to check (@AI-Bandits, @Dynamic-Scavenging, @Terje-Skills all
  // use lowercase folder names here, never "Addons"/"Keys"). Our own
  // install.ts is case-insensitive when it copies bikeys server-side
  // (findKeyDir matches /^keys?$/i), so this specific mismatch was
  // invisible on the server, but the actual DayZ client downloads this
  // Workshop item's raw folder structure as-is (no such normalization) -
  // matching real-world convention removes this as a possible cause of the
  // persistent "Client has a PBO which is not part of the server" kick.
  const outRoot = `${pack.buildDir}/@${pack.name}`;
  const addonsOut = `${outRoot}/addons`;
  const keysOut = `${outRoot}/keys`;
  // Wipe any previous build first - otherwise an addon removed from the
  // pack's addons/ (or renamed) leaves its old .pbo/.bisign orphaned here
  // forever, silently getting bundled into every future build/publish even
  // though its source is gone.
  await Deno.remove(outRoot, { recursive: true }).catch(() => {});
  await Deno.mkdir(addonsOut, { recursive: true });
  await Deno.mkdir(keysOut, { recursive: true });

  for (const addon of addons) {
    const pboTarget = `${addonsOut}/${addon.name}.pbo`;
    log(`Building ${addon.name}.pbo from ${addon.srcDir}`);
    // A real, Workshop-published DayZ addon's PBO header extension always
    // includes `product=dayz ugc` (confirmed by unpacking a genuine working
    // mod, @Search-For-Charcoal's bvp_charcoal.pbo, and comparing its raw
    // header bytes against ours: it has `product\0dayz ugc\0prefix\0...`,
    // while armake2's own build output only ever writes `prefix` - never
    // `product`). Its absence is what the client-side error
    // `#STR_ve_unexpected_source` ("Client has a PBO which is not part of
    // the server") was actually about: the DayZ engine's connect-time addon
    // check treats a PBO lacking this marker as not being genuine DayZ UGC
    // content, regardless of correct signing/CfgPatches/script content -
    // this persisted through 8 previous, independently-verified-correct
    // fixes (signing keys, case, namespace, etc.) because none of them
    // touched this header property.
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
    // the target PBO path - no cwd trick needed (unlike BiSignUtils, which
    // wrote next to its *current working directory* instead).
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
 * `publishedid`. Without this, DayZ/Steam can't tie the on-disk folder back
 * to the Workshop item it came from - the server can't correctly advertise
 * this mod's real id to the master server / joining clients, which shows up
 * to players as "invalid mods that are not recognized by Steam" even though
 * the item itself is public and downloads fine. Steam writes this file
 * automatically when a mod is subscribed/downloaded through its own
 * workshop machinery, but we bypass that entirely by uploading via
 * `steamcmd +workshop_build_item` (see modPublish.ts), so we have to write
 * it ourselves - matching the exact schema Steam itself uses (verified
 * against a real downloaded mod's meta.cpp: `protocol`, `publishedid`,
 * `name`, `timestamp`, CRLF line endings). `timestamp` here isn't wall-clock
 * time - it's the depot's manifest id (`hcontent_file` from the Workshop
 * API), the same value already used elsewhere in this project
 * (see mods.ts's fetchContentIds / staleModIds) to detect content changes.
 * Skipped (with a warning) before the very first publish, when no id has
 * been assigned yet - `publishServerPack` rebuilds and re-uploads once more
 * right after a first publish specifically so this file gets embedded with
 * the now-known id.
 */
async function writeMeta(outRoot: string, pack: ServerPackConfig): Promise<void> {
  // Local-only packs (see paths.ts's ServerPackConfig.localOnly) are never
  // published to Steam Workshop at all, so they never have a real
  // publishedid - meta.cpp is simply skipped, silently, every build (not a
  // one-time "before the first publish" warning, since there will never be
  // one).
  if (pack.localOnly) return;
  if (!(await exists(pack.workshopIdFile))) {
    warn(
      `No cached Workshop id yet (${pack.workshopIdFile} not found) - building without ` +
        "meta.cpp. This is expected before the very first publish only.",
    );
    return;
  }
  const id = (await Deno.readTextFile(pack.workshopIdFile)).trim();

  const contentIds = await fetchContentIds([{ id, name: pack.name, serverOnly: pack.serverOnly }]);
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

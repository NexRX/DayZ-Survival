// Builds this project's server pack (serverpack/) - a single Workshop mod
// bundling every custom addon under serverpack/addons/ - into signed,
// publish-ready PBOs. Packing/rapifying uses armake2, a Linux-native
// reimplementation of Bohemia's AddonBuilder. Signing uses the *real*
// `DSSignFile.exe` (DayZ Tools, via Wine - see modSign.ts) - BiSignUtils
// (a reimplementation) was tried first and produces `.bisign` files that
// pass its own `checkAll` but that the real DayZ engine rejects at
// connect-time as "not part of the server". See modSign.ts's header for
// the full story.
//
// One quirk worth knowing if this ever needs touching again: the `.bisign`
// filename's key-name suffix must match the exact original case of the
// signing authority name (embedded in the key/signature itself, from
// SERVERPACK_NAME) - so this pack's mod folder must never be run through
// `src/install.ts`'s `lowercaseTree()` (see the `skipLowercase` check in
// `installOneMod()` there).

import {
  SERVERPACK_ADDONS_DIR,
  SERVERPACK_BUILD_DIR,
  SERVERPACK_DIR,
  SERVERPACK_KEYS_DIR,
  SERVERPACK_NAME,
  SERVERPACK_WORKSHOP_ID_FILE,
} from "./paths.ts";
import { requireTools, runInherit } from "./proc.ts";
import { die, hint, log, ok, warn } from "./ui.ts";
import { exists } from "./steam.ts";
import { fetchContentIds } from "./mods.ts";
import { ensureDayZTools, ensureWinePrefix, signPboReal } from "./modSign.ts";
import { ensureConfig, loadSettings } from "./config.ts";

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

/** Generate the server pack's shared signing keypair if it doesn't exist yet. */
export async function ensurePackKeys(): Promise<void> {
  const { priv } = keyPaths();
  if (await exists(priv)) return;
  await requireTools(["bisignutils"]);
  await Deno.mkdir(SERVERPACK_KEYS_DIR, { recursive: true });
  log(`Generating a new ${KEY_LENGTH_BITS}-bit signing keypair for '${SERVERPACK_NAME}'`);
  const code = await runInherit("bisignutils", [
    "generate",
    SERVERPACK_NAME,
    "--length",
    String(KEY_LENGTH_BITS),
  ], {
    cwd: SERVERPACK_KEYS_DIR,
  });
  if (code !== 0 || !(await exists(priv))) {
    die(`bisignutils generate failed for '${SERVERPACK_NAME}'.`);
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
 * `@<SERVERPACK_NAME>/` folder: a single `mod.cpp`, one `addons/<name>.pbo`
 * per addon (packed + rapified by armake2, then signed by the real
 * `DSSignFile.exe` via Wine - see modSign.ts - with the pack's shared key),
 * and one `keys/<SERVERPACK_NAME>.bikey`. Adding a new addon needs no
 * changes here - it's picked up automatically from serverpack/addons/.
 */
export async function buildServerPack(): Promise<string> {
  await requireTools(["armake2", "bisignutils"]);
  const s = await ensureConfig(await loadSettings());
  await ensureDayZTools(s);
  await ensureWinePrefix();
  const addons = await listAddons();
  if (addons.length === 0) {
    die(`No addons found under ${SERVERPACK_ADDONS_DIR} (expected a config.cpp in each).`);
  }
  if (!(await exists(`${SERVERPACK_DIR}/mod.cpp`))) {
    die(`Missing ${SERVERPACK_DIR}/mod.cpp`);
  }
  await ensurePackKeys();
  const { priv, pub } = keyPaths();

  // Lowercase "addons"/"keys" - matches every real, working mod we've
  // unpacked to check (@AI-Bandits, @Dynamic-Scavenging, @Terje-Skills all
  // use lowercase folder names here, never "Addons"/"Keys"). Our own
  // install.ts is case-insensitive when it copies bikeys server-side
  // (findKeyDir matches /^keys?$/i), so this specific mismatch was
  // invisible on the server, but the actual DayZ client downloads this
  // Workshop item's raw folder structure as-is (no such normalization) -
  // matching real-world convention removes this as a possible cause of the
  // persistent "Client has a PBO which is not part of the server" kick.
  const outRoot = `${SERVERPACK_BUILD_DIR}/@${SERVERPACK_NAME}`;
  const addonsOut = `${outRoot}/addons`;
  const keysOut = `${outRoot}/keys`;
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
    if (!(await exists(`${pboTarget}.${SERVERPACK_NAME}.bisign`))) {
      die(`Signing failed for addon '${addon.name}' - see output above.`);
    }
  }

  await Deno.copyFile(`${SERVERPACK_DIR}/mod.cpp`, `${outRoot}/mod.cpp`);
  await Deno.copyFile(pub, `${keysOut}/${SERVERPACK_NAME}.bikey`);
  await writeMeta(outRoot);

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
async function writeMeta(outRoot: string): Promise<void> {
  if (!(await exists(SERVERPACK_WORKSHOP_ID_FILE))) {
    warn(
      `No cached Workshop id yet (${SERVERPACK_WORKSHOP_ID_FILE} not found) - building without ` +
        "meta.cpp. This is expected before the very first publish only.",
    );
    return;
  }
  const id = (await Deno.readTextFile(SERVERPACK_WORKSHOP_ID_FILE)).trim();

  const contentIds = await fetchContentIds([{ id, name: SERVERPACK_NAME, serverOnly: false }]);
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
    `name = "DayZ Survival - Server Pack";`,
    ...(timestamp ? [`timestamp = ${timestamp};`] : []),
  ];
  await Deno.writeTextFile(`${outRoot}/meta.cpp`, lines.join("\r\n") + "\r\n");
}

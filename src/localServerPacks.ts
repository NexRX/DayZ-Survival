// Stages a "local-only" server pack (see paths.ts's ServerPackConfig,
// e.g. SERVERPACK_SERVERONLY) directly into the server's own mod folder,
// without ever going through Steam Workshop at all - built and signed
// locally (see modBuild.ts) every time this runs, then copied straight into
// server/@<name> and its own signing key registered into server/keys/,
// mirroring what a real ensureMods() install does for a Workshop-downloaded
// mod (see install.ts). Used for DZSurvivalServerOnly: entirely server-side
// logic (no client-visible behavior at all - see paths.ts's own comment on
// SERVERPACK_SERVERONLY) that the project owner deliberately keeps off the
// Workshop entirely - nobody (not even this server) ever needs to download
// it, so there's no reason to publish it.
//
// Safe/idempotent to call on every server start - always rebuilds from the
// current addon source under the pack's own addons/ folder, so local edits
// are picked up automatically without a separate manual build step.

import { SERVER_DIR, type ServerPackConfig } from "./paths.ts";
import { buildServerPack } from "./modBuild.ts";
import { runCapture } from "./proc.ts";
import { die, log } from "./ui.ts";
import { exists } from "./steam.ts";

export async function ensureLocalServerPack(pack: ServerPackConfig): Promise<void> {
  const outRoot = await buildServerPack(pack);
  const dst = `${SERVER_DIR}/@${pack.name}`;
  await Deno.remove(dst, { recursive: true }).catch(() => {});
  const copy = await runCapture("cp", ["-r", outRoot, dst]);
  if (copy.code !== 0) {
    die(`Failed to stage local server pack '${pack.name}' into ${dst}:\n${copy.stderr}`);
  }

  // A real ensureMods() install permanently registers every mod's own
  // .bikey into the server's central keys/ dir the first time it's
  // downloaded (see install.ts). Since this pack is never downloaded that
  // way, that has to happen here instead - a dedicated server given a
  // -servermod= entry signed with a completely unregistered key hangs
  // indefinitely at startup with no RPT output and no crash log at all
  // (confirmed live while first wiring this up).
  const serverKeyFile = `${SERVER_DIR}/keys/${pack.name}.bikey`;
  if (!(await exists(serverKeyFile))) {
    await Deno.mkdir(`${SERVER_DIR}/keys`, { recursive: true });
    await Deno.copyFile(`${pack.keysDir}/${pack.name}.bikey`, serverKeyFile);
    log(`Registered ${pack.name}'s signing key into ${SERVER_DIR}/keys/.`);
  }
}

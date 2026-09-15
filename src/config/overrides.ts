import { copy } from "jsr:@std/fs@1.0.24";
import { PROFILE_DIR, ROOT, SERVER_DIR } from "../constants/paths.ts";

export async function ensureOverrides() {
  await copy(`${ROOT}/overrides_profile`, PROFILE_DIR, { overwrite: true });
  await copy(`${ROOT}/overrides_server`, SERVER_DIR, { overwrite: true });
}

import { copy } from "jsr:@std/fs/copy";
import { PROFILE_DIR, ROOT } from "./paths.ts";

export async function ensureOverrides() {
  await copy(`${ROOT}/overrides`, PROFILE_DIR, { overwrite: true });
}

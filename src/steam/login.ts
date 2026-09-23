import { loadBaseConfig, persistentSteamOptions } from "./config.ts";
import { runInteractive } from "./process.ts";

/** Log in interactively once so SteamCMD can persist its session locally. */
export async function loginSteam(): Promise<void> {
  const config = await loadBaseConfig();
  if (!config.steamUser || config.steamUser.toLowerCase() === "anonymous") {
    throw new Error("Set STEAM_USER in .env before logging in.");
  }

  console.log(`Logging in to Steam as '${config.steamUser}'...`);
  console.log("Steam will prompt for the password and any Steam Guard code.");
  const { code, output } = await runInteractive(
    config.steamCmdPath,
    ["+login", config.steamUser, "+quit"],
    await persistentSteamOptions(),
  );

  if (code !== 0) {
    throw new Error(`Steam login failed (exit code ${code}).\n${output}`);
  }
  console.log("Steam login succeeded; the session is cached in steamcmd/.");
}

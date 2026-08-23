// CLI entry point: status board, interactive menu, and command dispatch.

import { ask, c, DayzError, warn } from "./ui.ts";
import { configure, loadSettings, type Settings } from "./config.ts";
import { doInstall, doLogin, loggedIn, serverInstalled } from "./steam.ts";
import { doMods, modsInstalled } from "./install.ts";
import { doAdmin } from "./admin.ts";
import { aiPatrolsConfigured } from "./ai.ts";
import { spatialAIConfigured } from "./spatial.ts";
import { dynamicMissionsConfigured } from "./dynamicMissions.ts";
import { doStart } from "./server.ts";
import { doWipe } from "./wipe.ts";
import { loadMods, resolveMods, searchMods } from "./mods.ts";

function statusLine(label: string, good: boolean, extra = ""): void {
  const mark = good ? c.green("✓") : c.dim("·");
  const value = good ? extra : extra || "not done";
  console.log(`   ${mark} ${label.padEnd(18)} ${value}`);
}

async function showStatus(s: Settings): Promise<void> {
  let nmods = 0;
  try {
    nmods = (await loadMods()).length;
  } catch {
    // mods.txt missing — reported elsewhere
  }
  let mods = false;
  try {
    mods = await modsInstalled();
  } catch {
    // ignore
  }

  console.log(`\n${c.cyan("DayZ Survival — status")}`);
  statusLine(
    "Configured",
    !!s.STEAM_USER && s.STEAM_USER !== "anonymous",
    s.STEAM_USER,
  );
  statusLine("Steam login", await loggedIn(s.STEAM_USER));
  statusLine("Server installed", await serverInstalled());
  statusLine("Mods installed", mods, `${nmods} in mods.txt`);
  statusLine("Roaming AI patrols", await aiPatrolsConfigured());
  statusLine("Spatial AI groups", await spatialAIConfigured());
  statusLine("Dynamic AI missions", await dynamicMissionsConfigured());
  console.log("");
}

async function menu(s: Settings): Promise<void> {
  while (true) {
    await showStatus(s);
    console.log(`${c.cyan("What would you like to do?")}
    1) Set up & start  (does everything needed)  ${c.dim("[recommended]")}
    2) Configure settings
    3) Log in to Steam
    4) Install / update server
    5) Download / update mods
    6) Start server
    7) Verify mod IDs (Steam API)
    8) Grant admin access (test AI quickly)
    9) Search the Steam Workshop
    10) Wipe server (reset world or reinstall)
    11) Quit`);

    const choice = await ask("Choice", "1");
    try {
      switch (choice) {
        case "1":
        case "6":
          await doStart(s);
          break;
        case "2":
          await configure(s);
          break;
        case "3":
          await doLogin(s);
          break;
        case "4":
          await doInstall(s);
          break;
        case "5":
          await doMods(s);
          break;
        case "7":
          await resolveMods(await loadMods());
          break;
        case "8":
          await doAdmin();
          break;
        case "9": {
          const query = await ask("Search terms", "");
          await searchMods(query, s.STEAM_API_KEY);
          break;
        }
        case "10":
          await doWipe();
          break;
        case "11":
          Deno.exit(0);
          break;
        default:
          warn(`Unknown choice: ${choice}`);
      }
    } catch (e) {
      if (e instanceof DayzError) warn(e.message);
      else throw e;
    }
  }
}

const HELP = `Usage: deno task dayz [command]

  (no command)  Interactive menu
  up            Do everything needed, then start the server
  config        (Re)configure settings (.env)
  login         Log in to Steam (caches the session)
  install       Install/update the DayZ server
  mods          Download/update all mods in mods.txt
  resolve       Verify mod IDs via the Steam Web API
  search <terms> Search the Steam Workshop for DayZ mods (needs a Steam Web API key)
  status        Show setup status
  admin         Grant AI-menu / Community Online Tools admin access
  wipe          Reset world state, or remove the install entirely`;

async function main(): Promise<void> {
  const s = await loadSettings();
  const cmd = Deno.args[0] ?? "";
  switch (cmd) {
    case "":
    case "menu":
      await menu(s);
      break;
    case "up":
    case "start":
      await doStart(s);
      break;
    case "config":
      await configure(s);
      break;
    case "login":
      await doLogin(s);
      break;
    case "install":
      await doInstall(s);
      break;
    case "mods":
      await doMods(s);
      break;
    case "resolve":
      await resolveMods(await loadMods());
      break;
    case "search":
      await searchMods(Deno.args.slice(1).join(" "), s.STEAM_API_KEY);
      break;
    case "status":
      await showStatus(s);
      break;
    case "admin":
      await doAdmin();
      break;
    case "wipe":
      await doWipe();
      break;
    case "-h":
    case "--help":
    case "help":
      console.log(HELP);
      break;
    default:
      throw new DayzError(
        `Unknown command '${cmd}' (try: deno task dayz --help)`,
      );
  }
}

main().catch((e) => {
  if (e instanceof DayzError) {
    console.error(`${c.red(" xx")} ${e.message}`);
    Deno.exit(1);
  }
  throw e;
});

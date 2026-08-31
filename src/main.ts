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
import { buildServerPack } from "./modBuild.ts";
import { publishServerPack } from "./modPublish.ts";
import { verifyServerPackScripts } from "./modVerify.ts";
import { doSyncEditor } from "./editorSync.ts";
import { auditMarket } from "./marketAudit.ts";

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
    11) Build server pack (serverpack/addons/)
    12) Publish server pack to Steam Workshop
    13) Sync DayZ-Editor save into the mission (EditorFiles/)
    14) Verify server pack scripts actually compile (no publish)
    15) Audit trader economy (find missing/mispriced items)
    16) Quit`);

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
        case "5": {
          const ids = await ask(
            "Workshop id(s) to force re-check even if not flagged as stale (blank = auto-detect only)",
            "",
          );
          await doMods(s, ids.trim() ? new Set(ids.trim().split(/\s+/)) : undefined);
          break;
        }
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
          await buildServerPack();
          break;
        case "12":
          await publishServerPack(s);
          break;
        case "13":
          await doSyncEditor();
          break;
        case "14":
          await verifyServerPackScripts(await buildServerPack());
          break;
        case "15":
          await auditMarket();
          break;
        case "16":
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
  mods          Download/update mods in mods.txt (auto-detects and re-checks
                any already-installed mod Steam has updated since last time -
                add workshop id(s) to also force-recheck specific ones, e.g.
                'deno task mods 3149798901')
  resolve       Verify mod IDs via the Steam Web API
  search <terms> Search the Steam Workshop for DayZ mods (needs a Steam Web API key)
  status        Show setup status
  admin         Grant AI-menu / Community Online Tools admin access
  wipe          Reset world state, or remove the install entirely
  build-serverpack    Build serverpack/ (this project's own custom addons)
                      into one publish-ready Workshop mod
  publish-serverpack  Build, verify (boots the real server briefly to catch
                      script compile errors), then publish/update the
                      server pack as the one Workshop item bundling all
                      custom addons
  verify-serverpack   Build the server pack and verify its scripts actually
                      compile, without publishing (same check publish-
                      serverpack runs automatically first)
  sync-editor   Copy the newest DayZ-Editor .dze save into the mission's
                EditorFiles/ folder, ready for @DayZ-Editor-Loader to load
                on next server start
  audit-market  Cross-reference the mission's full item economy against
                what's actually sellable, and sanity-check prices/stock
                caps on everything that is - writes a full report to
                profiles/market-audit-report.txt`;

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
    case "mods": {
      const ids = Deno.args.slice(1);
      await doMods(s, ids.length ? new Set(ids) : undefined);
      break;
    }
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
    case "build-serverpack":
      await buildServerPack();
      break;
    case "publish-serverpack":
      await publishServerPack(s);
      break;
    case "verify-serverpack":
      await verifyServerPackScripts(await buildServerPack());
      break;
    case "sync-editor":
      await doSyncEditor();
      break;
    case "audit-market":
      await auditMarket();
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

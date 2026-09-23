// CLI entry point: status board, interactive menu, and command dispatch.

import { ask, c, DayzError, warn } from "./ui.ts";
import { configure, loadSettings, type Settings } from "./config/settings.ts";
import { doAdmin } from "./config/admin.ts";
import { doSimpleStart, doStart, ensureMods, ensureServer } from "./server/server.ts";
import { doWipe } from "./tools/wipe.ts";
import { doSyncEditor } from "./tools/editorSync.ts";
import { auditMarket } from "./tools/marketAudit.ts";
import { clearQuestCache } from "./tools/questClear.ts";
import { resetPlayerQuestData } from "./tools/playerQuestReset.ts";
import { loginSteam } from "./steam/index.ts";

async function menu(s: Settings): Promise<void> {
  while (true) {
    console.log(`${c.cyan("What would you like to do?")}
    1) Set up & start  (does everything needed)  ${c.dim("[recommended]")}
    2) Configure settings
    3) Install / update server
    4) Download / update mods
    5) Grant admin access
    6) Wipe server (reset world or reinstall)
    7) Sync DayZ-Editor save into the mission (EditorFiles/)
    8) Verify server pack scripts actually compile (no publish)
    9) Audit trader economy (find missing/mispriced items)
    10) Clear Expansion Quests cached data (regenerates quest definitions)
    11) Reset a player's Expansion quest progress
    12) Quit`);

    const choice = await ask("Choice", "1");
    try {
      switch (choice) {
        case "1":
          await doStart(s);
          break;
        case "2":
          await configure(s);
          break;
        case "3":
          await ensureServer();
          break;
        case "4": {
          ensureMods();
          break;
        }
        case "5":
          await doAdmin();
          break;
        case "6":
          await doWipe();
          break;
        case "7":
          await doSyncEditor();
          break;
        case "8":
          await auditMarket();
          break;
        case "9":
          await clearQuestCache();
          break;
        case "10": {
          const playerId = await ask("Player/identity ID to reset", "");
          if (playerId) await resetPlayerQuestData(playerId);
          break;
        }
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
  up-simple     Start the existing server without setup or downloads
  config        (Re)configure settings (.env)
  login         Log in to Steam (caches the session)
  install       Install/update the DayZ server
  mods          Download/update mods in mods.txt (auto-detects and re-checks
                any already-installed mod Steam has updated since last time -
                add workshop id(s) to also force-recheck specific ones, e.g.
                'deno task mods 3149798901')
  resolve       Verify mod IDs via the Steam Web API
  check-mods    Show which mods have updates available on Steam (no download)
  search <terms> Search the Steam Workshop for DayZ mods (needs a Steam Web API key)
  status        Show setup status
  admin         Grant AI-menu / Community Online Tools admin access
  wipe          Reset world state, or remove the install entirely

  sync-editor   Copy the newest DayZ-Editor .dze save into the mission's
                EditorFiles/ folder, ready for @DayZ-Editor-Loader to load
                on next server start
  audit-market  Cross-reference the mission's full item economy against
                what's actually sellable, and sanity-check prices/stock
                caps on everything that is - writes a full report to
                profiles/market-audit-report.txt
  clear-quests  Delete the Expansion Quests cached data so the mod regenerates
                fresh quest definitions on next start (useful after quest
                ID changes like switching quest lines)
  reset-player-quests <id>
                Back up and reset one player's Expansion quest progress;
                run only while the DayZ server is stopped`;

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
    case "server":
      await ensureServer();
      break;
    case "mods":
      await ensureMods();
      break;
    case "up-simple":
      await doSimpleStart(s);
      break;
    case "config":
      await configure(s);
      break;
    case "login":
      await loginSteam();
      break;
    case "admin":
      await doAdmin();
      break;
    case "wipe":
      await doWipe();
      break;
    case "sync-editor":
      await doSyncEditor();
      break;
    case "audit-market":
      await auditMarket();
      break;
    case "clear-quests":
      await clearQuestCache();
      break;
    case "reset-player-quests": {
      const playerId = Deno.args[1];
      if (!playerId) {
        throw new DayzError(
          "Usage: deno task dayz reset-player-quests <COT identity id>",
        );
      }
      await resetPlayerQuestData(playerId);
      break;
    }
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

# DayZ Survival — Expansion server

A single interactive script (`dayz.sh`) that sets up and runs a modded **DayZ**
dedicated server pre-wired for the official **DayZ Expansion Bundle**, on
**NixOS**. It installs the server, downloads the mods, handles the Steam login,
generates the config, and launches the server — prompting for anything it needs
and skipping whatever's already done.

## Just run it

```bash
./dayz.sh
```

That's it. The script:

1. Enters the Nix dev shell automatically if `steamcmd` / `steam-run` aren't on
   PATH (no FHS hacks — required on NixOS).
2. Shows a status summary, then a menu. Pick **1) Set up & start** and it does
   everything needed:
   - prompts for your settings (Steam account, server name, ports, admin pw…)
     and saves them to `.env` (your Steam **password is never stored**),
   - logs in to Steam once (Steam Guard confirmed on your phone/app),
   - installs the DayZ server if missing,
   - downloads + installs the mods and their keys if missing,
   - writes `server/serverDZ.cfg` from your settings,
   - starts the server under `steam-run`.

Re-run it any time — it detects what's already in place and only redoes what's
needed.

### Non-interactive subcommands

```bash
./dayz.sh up         # do everything needed, then start
./dayz.sh config     # (re)enter settings
./dayz.sh login      # cache a Steam session
./dayz.sh install    # install/update the server
./dayz.sh mods       # download/update all mods
./dayz.sh resolve    # verify mod IDs via the Steam Web API
./dayz.sh status     # show setup status
./dayz.sh --help
```

## Included mods

The [DayZ Expansion Bundle](https://steamcommunity.com/sharedfiles/filedetails/?id=2572523362),
in load order (see [`mods.txt`](mods.txt)):

| #   | Mod                     | Workshop ID  |
| --- | ----------------------- | ------------ |
| 1   | CF                      | `1559212036` |
| 2   | Dabs Framework          | `2545327648` |
| 3   | Community-Online-Tools  | `1564026768` |
| 4   | DayZ-Expansion-Bundle   | `2572331007` |
| 5   | DayZ-Expansion-Licensed | `2116157322` |
| 6   | DayZ-Expansion-AI       | `2792982069` |

Add/reorder mods by editing `mods.txt` (`<workshop_id>  @name`, one per line) —
`dayz.sh` reads the load order from there.

## Requirements

- **NixOS** (or Linux with Nix). `flake.nix` / `shell.nix` provide `steamcmd`,
  `steam-run`, `jq`, `curl`.
- ~6 GB disk (server) + ~3 GB (Expansion mods).
- **A Steam account that owns DayZ.** Both the server (app 223350) and the mods
  (app 221100) require it — anonymous login is rejected with "No subscription".

## Layout

```
.
├── dayz.sh              # THE script — does everything
├── mods.txt             # Mod load order (id -> @name)
├── flake.nix / shell.nix# Nix dev shell (steamcmd, steam-run, jq, curl)
├── .envrc               # Optional direnv auto-shell
├── .env                 # Your saved settings (generated; git-ignored)
├── server/              # DayZ server + mods (generated; git-ignored)
├── steamcmd/            # SteamCMD state + cached login (git-ignored)
└── profiles/            # Logs, BattlEye, crash dumps (git-ignored)
```

## Networking

Open these **UDP** ports (defaults; change in `./dayz.sh config`):

| Port  | Purpose                       |
| ----- | ----------------------------- |
| 2302  | Game port                     |
| 2305  | Steam query port              |
| 27016 | Steam master-server heartbeat |

## Full Expansion experience (traders, markets, spawn select)

The Expansion **mods** load against the vanilla Chernarus mission, but
Expansion features that need mission data (traders, ATMs, spawn selection,
quests) require the Expansion **mission files**. Grab them from
[DayZ-Expansion-Scripts](https://github.com/salutesh/DayZ-Expansion-Scripts),
drop the mission into `server/mpmissions/`, and change the `Missions` template
in `server/serverDZ.cfg` to it (e.g. `expansion.chernarusplus`).

## Updating

Just run `./dayz.sh` again and choose **Install/update server** and/or
**Download/update mods**. Keep the server build and mods in sync after each DayZ
patch, or clients on the new build can't join (`forceSameBuild = 1`).

#!/usr/bin/env bash
# ===========================================================================
#  dayz.sh — one interactive script to set up & run a modded DayZ server
#            (DayZ Expansion bundle) on NixOS.
#
#  Just run:   ./dayz.sh
#  It figures out what still needs doing (install / login / mods) and does it,
#  prompting for anything it needs (Steam login, server name, etc.), then
#  starts the server.
# ===========================================================================
set -euo pipefail

# --- Locate project root ---------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env"
MODS_FILE="$ROOT_DIR/mods.txt"

SERVER_DIR="$ROOT_DIR/server"
STEAMCMD_DIR="$ROOT_DIR/steamcmd"     # project-local Steam HOME (git-ignored)
PROFILE_DIR="$ROOT_DIR/profiles"
LOGIN_MARKER="$STEAMCMD_DIR/.dayz_login_ok"

DAYZ_SERVER_APPID=223350
DAYZ_CLIENT_APPID=221100
WORKSHOP_SUBPATH="steamapps/workshop/content/$DAYZ_CLIENT_APPID"

# --- Pretty output ---------------------------------------------------------
c_reset=$'\033[0m'; c_cyan=$'\033[1;36m'; c_yel=$'\033[1;33m'
c_red=$'\033[1;31m'; c_grn=$'\033[1;32m'; c_dim=$'\033[2m'
log()  { printf '%s==>%s %s\n' "$c_cyan" "$c_reset" "$*"; }
ok()   { printf '%s ok%s %s\n' "$c_grn" "$c_reset" "$*"; }
warn() { printf '%s !!%s %s\n' "$c_yel" "$c_reset" "$*" >&2; }
die()  { printf '%s xx%s %s\n' "$c_red" "$c_reset" "$*" >&2; exit 1; }

# --- Prompt helpers (prompts go to stderr so $(...) captures only answers) --
ask() { # ask "Question" ["default"]
  local q="$1" def="${2:-}" ans
  if [[ -n "$def" ]]; then
    read -rp "$(printf '%s%s%s [%s]: ' "$c_cyan" "$q" "$c_reset" "$def")" ans </dev/tty
    printf '%s' "${ans:-$def}"
  else
    read -rp "$(printf '%s%s%s: ' "$c_cyan" "$q" "$c_reset")" ans </dev/tty
    printf '%s' "$ans"
  fi
}
ask_secret() { # ask_secret "Question"
  local q="$1" ans
  read -rsp "$(printf '%s%s%s: ' "$c_cyan" "$q" "$c_reset")" ans </dev/tty
  printf '\n' >&2
  printf '%s' "$ans"
}
confirm() { # confirm "Question" [Y|N]  -> returns 0 for yes
  local q="$1" def="${2:-Y}" ans hint="[Y/n]"
  [[ "$def" == "N" ]] && hint="[y/N]"
  read -rp "$(printf '%s%s%s %s ' "$c_cyan" "$q" "$c_reset" "$hint")" ans </dev/tty
  ans="${ans:-$def}"
  [[ "$ans" =~ ^[Yy] ]]
}

# ===========================================================================
#  0. Ensure the Nix-provided tooling (steamcmd + steam-run) is available.
#     If not, re-exec this script inside the dev shell.
# ===========================================================================
if ! command -v steamcmd >/dev/null 2>&1 || ! command -v steam-run >/dev/null 2>&1 \
   || ! command -v jq >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  if [[ -z "${DAYZ_IN_NIX:-}" ]] && command -v nix >/dev/null 2>&1; then
    export DAYZ_IN_NIX=1
    log "Required tools not all on PATH — entering the Nix dev shell…"
    if [[ -f "$ROOT_DIR/flake.nix" ]]; then
      exec nix develop "$ROOT_DIR" --command "$0" "$@"
    else
      exec nix-shell "$ROOT_DIR/shell.nix" --run "$(printf '%q ' "$0" "$@")"
    fi
  fi
  command -v steamcmd  >/dev/null 2>&1 || die "steamcmd not found. Install Nix, or add steamcmd to PATH."
  command -v steam-run >/dev/null 2>&1 || die "steam-run not found. Install Nix, or add steam-run to PATH."
  command -v jq        >/dev/null 2>&1 || warn "jq not found — 'resolve' will not work."
  command -v curl      >/dev/null 2>&1 || warn "curl not found — 'resolve' will not work."
fi
STEAMCMD_BIN="$(command -v steamcmd)"
STEAM_RUN="$(command -v steam-run)"

# ===========================================================================
#  Config (.env) — load, prompt, persist. Steam PASSWORD is never stored.
# ===========================================================================
load_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  set -a; # shellcheck disable=SC1090
  source "$ENV_FILE"; set +a
}
set_env() { # set_env KEY VALUE  (safe, shell-quoted, in-place)
  local key="$1" val="$2" tmp
  touch "$ENV_FILE"; chmod 600 "$ENV_FILE"
  tmp="$(mktemp)"
  grep -v "^${key}=" "$ENV_FILE" > "$tmp" 2>/dev/null || true
  printf '%s=%q\n' "$key" "$val" >> "$tmp"
  mv "$tmp" "$ENV_FILE"; chmod 600 "$ENV_FILE"
}

# Defaults for anything not yet in .env.
apply_defaults() {
  : "${STEAM_USER:=}"
  : "${SERVER_NAME:=DayZ Survival | Expansion}"
  : "${JOIN_PASSWORD:=}"
  : "${ADMIN_PASSWORD:=}"
  : "${MAXPLAYERS:=60}"
  : "${PORT:=2302}"
  : "${QUERY_PORT:=2305}"
  : "${LOWERCASE_MODS:=1}"
  : "${STEAM_API_KEY:=}"
  : "${EXTRA_PARAMS:=-dologs -adminlog -netlog -freezecheck}"
}

configure() { # (re)prompt for all settings and persist
  log "Server configuration (press Enter to keep the shown default)"
  STEAM_USER="$(ask 'Steam username that OWNS DayZ' "${STEAM_USER:-}")"
  SERVER_NAME="$(ask 'Server name (shown in browser)' "$SERVER_NAME")"
  JOIN_PASSWORD="$(ask 'Join password (blank = open)' "${JOIN_PASSWORD:-}")"
  local ap; ap="$(ask 'Admin password' "${ADMIN_PASSWORD:-}")"; ADMIN_PASSWORD="$ap"
  MAXPLAYERS="$(ask 'Max players' "$MAXPLAYERS")"
  PORT="$(ask 'Game port (UDP)' "$PORT")"
  QUERY_PORT="$(ask 'Steam query port (UDP)' "$QUERY_PORT")"
  if confirm 'Lowercase mod files for Linux (recommended)?' Y; then LOWERCASE_MODS=1; else LOWERCASE_MODS=0; fi
  STEAM_API_KEY="$(ask 'Steam Web API key (optional, for mod verify)' "${STEAM_API_KEY:-}")"

  set_env STEAM_USER      "$STEAM_USER"
  set_env SERVER_NAME     "$SERVER_NAME"
  set_env JOIN_PASSWORD   "$JOIN_PASSWORD"
  set_env ADMIN_PASSWORD  "$ADMIN_PASSWORD"
  set_env MAXPLAYERS      "$MAXPLAYERS"
  set_env PORT            "$PORT"
  set_env QUERY_PORT      "$QUERY_PORT"
  set_env LOWERCASE_MODS  "$LOWERCASE_MODS"
  set_env STEAM_API_KEY   "$STEAM_API_KEY"
  set_env EXTRA_PARAMS    "$EXTRA_PARAMS"
  ok "Saved to .env"
}

ensure_config() {
  if [[ -z "${STEAM_USER:-}" || "${STEAM_USER}" == "anonymous" ]]; then
    warn "No Steam account configured yet."
    configure
  fi
}

# ===========================================================================
#  Mods (mods.txt) — parse into MOD_IDS / MOD_NAMES.
# ===========================================================================
MOD_IDS=(); MOD_NAMES=()
load_mods() {
  [[ -f "$MODS_FILE" ]] || die "mods.txt not found"
  MOD_IDS=(); MOD_NAMES=()
  local id name _rest
  while read -r id name _rest; do
    [[ -z "${id:-}" || "${id:0:1}" == "#" ]] && continue
    [[ -n "${name:-}" ]] || die "mods.txt: id $id has no @name"
    MOD_IDS+=("$id"); MOD_NAMES+=("$name")
  done < "$MODS_FILE"
  [[ ${#MOD_IDS[@]} -gt 0 ]] || die "mods.txt has no mods"
}
mod_param() { load_mods; local IFS=';'; printf '%s' "${MOD_NAMES[*]}"; }

# ===========================================================================
#  SteamCMD helpers
# ===========================================================================
run_steamcmd() { mkdir -p "$STEAMCMD_DIR"; HOME="$STEAMCMD_DIR" "$STEAMCMD_BIN" "$@"; }

# Same, but strips known-benign Linux log spam. Use for non-interactive ops
# (install/mods) only — NOT for login, whose prompts must reach the tty.
run_steamcmd_quiet() {
  mkdir -p "$STEAMCMD_DIR"
  set +o pipefail
  HOME="$STEAMCMD_DIR" "$STEAMCMD_BIN" "$@" 2>&1 \
    | grep --line-buffered -vE 'SaveInstallBaseFolders: rejecting attempt to save with no libraries|applicationmanager\.cpp \([0-9]+\) :' \
    || true
  set -o pipefail
}

find_workshop_item() {
  local id="$1" root
  for root in "$SERVER_DIR" "$STEAMCMD_DIR" \
              "$STEAMCMD_DIR/.local/share/Steam" "$STEAMCMD_DIR/Steam" \
              "$HOME/.steam/steam" "$HOME/.local/share/Steam"; do
    [[ -d "$root/$WORKSHOP_SUBPATH/$id" ]] && { printf '%s' "$root/$WORKSHOP_SUBPATH/$id"; return 0; }
  done
  return 1
}

server_installed() { [[ -x "$SERVER_DIR/DayZServer" || -x "$SERVER_DIR/DayZServer_x64" ]]; }
server_binary()    { [[ -x "$SERVER_DIR/DayZServer_x64" ]] && printf '%s' "$SERVER_DIR/DayZServer_x64" || printf '%s' "$SERVER_DIR/DayZServer"; }
logged_in() {
  [[ -f "$LOGIN_MARKER" ]] && return 0
  # Heuristic: a cached Steam session for this user already exists (e.g. from a
  # previous download) -> treat as logged in and skip the password prompt.
  local vdf="$STEAMCMD_DIR/.local/share/Steam/config/config.vdf"
  if [[ -n "${STEAM_USER:-}" && -f "$vdf" ]] && grep -qi "\"${STEAM_USER}\"" "$vdf" 2>/dev/null; then
    touch "$LOGIN_MARKER" 2>/dev/null || true
    return 0
  fi
  return 1
}

mods_installed() {
  load_mods
  local n
  for n in "${MOD_NAMES[@]}"; do [[ -e "$SERVER_DIR/$n" ]] || return 1; done
  return 0
}

# ===========================================================================
#  Actions
# ===========================================================================
do_login() {
  ensure_config
  log "Logging in to Steam as '$STEAM_USER'"
  echo "$c_dim  Password is used once to cache a session; it is NOT saved.$c_reset"
  local pass; pass="$(ask_secret 'Steam password')"
  echo "$c_dim  (Steam Guard: confirm on your phone or enter the code when asked.)$c_reset"
  if run_steamcmd +login "$STEAM_USER" "$pass" +quit; then
    touch "$LOGIN_MARKER"
    ok "Logged in and session cached."
  else
    rm -f "$LOGIN_MARKER"
    die "Login failed. Re-run and check username / password / Steam Guard."
  fi
}
ensure_login() { logged_in || do_login; }

do_install() {
  ensure_login
  log "Installing/updating DayZ dedicated server (app $DAYZ_SERVER_APPID)"
  mkdir -p "$SERVER_DIR" "$PROFILE_DIR"
  # 223350 rejects anonymous ("No subscription"), so use the DayZ-owning account.
  # The "SaveInstallBaseFolders ... no libraries" line is benign Linux spam and
  # is filtered out here; the app installs fine regardless.
  run_steamcmd_quiet \
    +force_install_dir "$SERVER_DIR" \
    +login "$STEAM_USER" \
    +app_update "$DAYZ_SERVER_APPID" validate \
    +quit
  server_installed || die "DayZServer binary missing after install — check output above."
  ok "Server installed."
}
ensure_server() { server_installed || do_install; }

lowercase_tree() {
  local dir="$1" p base low
  find "$dir" -depth -mindepth 1 | while read -r p; do
    base="$(basename "$p")"; low="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')"
    [[ "$base" == "$low" ]] && continue
    mv -f "$p" "$(dirname "$p")/$low"
  done
}

install_one_mod() {
  local id="$1" name="$2" src dst keydir
  src="$(find_workshop_item "$id")" || die "Downloaded content for $name ($id) not found."
  dst="$SERVER_DIR/$name"
  rm -rf "$dst"
  if [[ "${LOWERCASE_MODS:-1}" == "1" ]]; then
    cp -a "$src" "$dst"; lowercase_tree "$dst"
  else
    ln -sfn "$src" "$dst"
  fi
  for keydir in "$dst"/keys "$dst"/Keys "$src"/keys "$src"/Keys; do
    if [[ -d "$keydir" ]]; then
      mkdir -p "$SERVER_DIR/keys"
      find "$keydir" -maxdepth 1 -iname '*.bikey' -exec cp -f {} "$SERVER_DIR/keys/" \;
      break
    fi
  done
}

# Download a single workshop item in its own SteamCMD session, retrying on
# failure. Large mods (e.g. the 2.8 GB Expansion bundle) frequently hit
# SteamCMD's download timeout; a dedicated session + retry lets it resume and
# complete instead of tripping the batch timeout.
download_one() {
  local id="$1" name="$2" attempt=1 max=8
  while true; do
    log "Downloading $name ($id) — attempt $attempt/$max"
    run_steamcmd_quiet +force_install_dir "$SERVER_DIR" +login "$STEAM_USER" \
      +workshop_download_item "$DAYZ_CLIENT_APPID" "$id" validate +quit
    if find_workshop_item "$id" >/dev/null; then
      ok "$name downloaded"
      return 0
    fi
    attempt=$((attempt + 1))
    if (( attempt > max )); then
      die "Failed to download $name ($id) after $max attempts. Re-run './dayz.sh mods' — SteamCMD resumes where it left off."
    fi
    warn "Download of $name timed out/failed; retrying (SteamCMD resumes)…"
    sleep 3
  done
}

do_mods() {
  ensure_login
  load_mods
  log "Downloading ${#MOD_IDS[@]} workshop mod(s) (one session each, with retries)…"
  local i
  for i in "${!MOD_IDS[@]}"; do
    download_one "${MOD_IDS[$i]}" "${MOD_NAMES[$i]}"
  done

  log "Installing mods + keys into the server"
  mkdir -p "$SERVER_DIR/keys"
  for i in "${!MOD_IDS[@]}"; do
    printf '   %s\n' "${MOD_NAMES[$i]}"
    install_one_mod "${MOD_IDS[$i]}" "${MOD_NAMES[$i]}"
  done
  ok "Mods installed. Load order: $(mod_param)"
}
ensure_mods() { mods_installed || do_mods; }

gen_config() {
  local cfg="$SERVER_DIR/serverDZ.cfg"
  mkdir -p "$SERVER_DIR"
  cat > "$cfg" <<EOF
// Generated by dayz.sh — edit values via './dayz.sh config' or here directly.
hostname       = "${SERVER_NAME}";
password       = "${JOIN_PASSWORD}";
passwordAdmin  = "${ADMIN_PASSWORD}";
maxPlayers     = ${MAXPLAYERS};

verifySignatures = 2;
forceSameBuild   = 1;

disableVoN        = 0;
vonCodecQuality   = 20;
disable3rdPerson  = 0;
disableCrosshair  = 0;

serverTime                  = "SystemTime";
serverTimeAcceleration      = 8;
serverNightTimeAcceleration = 2;
serverTimePersistent        = 0;

guaranteedUpdates = 1;
loginQueueConcurrentPlayers = 5;
loginQueueMaxPlayers        = 500;

instanceId     = 1;
storageAutoFix = 1;
respawnTime    = 5;

steamQueryPort = ${QUERY_PORT};

class Missions
{
    class DayZ
    {
        template = "dayzOffline.chernarusplus";
    };
};

motd[] = { "Welcome to ${SERVER_NAME}" };
motdInterval = 30;

timeStampFormat = "Short";
logAverageFps   = 30;
logMemory       = 30;
logPlayers      = 30;
logFile         = "server_console.log";
adminLogPlayerHitsOnly = 0;
adminLogPlacement      = 1;
adminLogBuildActions   = 1;
adminLogPlayerList     = 1;
EOF
  ok "Wrote $cfg"
}

do_start() {
  ensure_config
  ensure_server
  ensure_mods
  gen_config
  local mods; mods="$(mod_param)"
  log "Starting DayZ server on UDP $PORT"
  log "Mods: $mods"
  export LD_LIBRARY_PATH="$SERVER_DIR:${LD_LIBRARY_PATH:-}"
  mkdir -p "$PROFILE_DIR"
  cd "$SERVER_DIR"
  # steam-run gives the prebuilt DayZServer an FHS environment on NixOS.
  # shellcheck disable=SC2086
  exec "$STEAM_RUN" "$(server_binary)" \
    -config=serverDZ.cfg \
    -port="$PORT" \
    -mod="$mods" \
    -BEpath="$PROFILE_DIR/battleye" \
    -profiles="$PROFILE_DIR" \
    -cpuCount="$(nproc)" \
    ${EXTRA_PARAMS}
}

do_resolve() {
  command -v curl >/dev/null || die "curl required"
  command -v jq   >/dev/null || die "jq required"
  load_mods
  local api="https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/"
  local form=(--data-urlencode "itemcount=${#MOD_IDS[@]}") i
  for i in "${!MOD_IDS[@]}"; do form+=(--data-urlencode "publishedfileids[$i]=${MOD_IDS[$i]}"); done
  log "Querying Steam for ${#MOD_IDS[@]} workshop item(s)…"
  curl -sS -X POST "${form[@]}" "$api" | jq -r '
    .response.publishedfiledetails[]
    | "  \(.publishedfileid)\t\(.title // "<unavailable>")\t\(((.file_size|tonumber)/1048576*100|round/100))MB"'
}

# ===========================================================================
#  Status + menu
# ===========================================================================
status_line() { # status_line "Label" <0|1> ["extra"]
  local label="$1" good="$2" extra="${3:-}"
  if [[ "$good" == "1" ]]; then printf '   %s✓%s %-18s %s\n' "$c_grn" "$c_reset" "$label" "$extra"
  else printf '   %s·%s %-18s %s\n' "$c_dim" "$c_reset" "$label" "${extra:-not done}"; fi
}
show_status() {
  local nmods=0
  if [[ -f "$MODS_FILE" ]]; then load_mods; nmods=${#MOD_IDS[@]}; fi
  printf '\n%sDayZ Survival — status%s\n' "$c_cyan" "$c_reset"
  status_line "Configured" "$([[ -n "${STEAM_USER:-}" && "${STEAM_USER}" != anonymous ]] && echo 1 || echo 0)" "${STEAM_USER:-}"
  status_line "Steam login" "$(logged_in && echo 1 || echo 0)"
  status_line "Server installed" "$(server_installed && echo 1 || echo 0)"
  status_line "Mods installed" "$(mods_installed 2>/dev/null && echo 1 || echo 0)" "$nmods in mods.txt"
  echo
}

menu() {
  while true; do
    show_status
    cat <<EOF
${c_cyan}What would you like to do?${c_reset}
  1) Set up & start  (does everything needed)  ${c_dim}[recommended]${c_reset}
  2) Configure settings
  3) Log in to Steam
  4) Install / update server
  5) Download / update mods
  6) Start server
  7) Verify mod IDs (Steam API)
  8) Quit
EOF
    local choice; choice="$(ask 'Choice' '1')"
    case "$choice" in
      1) do_start ;;                     # ensures config/login/server/mods then starts
      2) configure ;;
      3) do_login ;;
      4) do_install ;;
      5) do_mods ;;
      6) do_start ;;
      7) do_resolve ;;
      8) exit 0 ;;
      *) warn "Unknown choice: $choice" ;;
    esac
  done
}

# ===========================================================================
#  Entry point
# ===========================================================================
load_env

# Reserved internal values: never let a stale or hand-edited .env override the
# project layout or detected tooling. (Older templates shipped a relative
# SERVER_DIR=server, which would break the launch path after we cd into it.)
SERVER_DIR="$ROOT_DIR/server"
STEAMCMD_DIR="$ROOT_DIR/steamcmd"
PROFILE_DIR="$ROOT_DIR/profiles"
LOGIN_MARKER="$STEAMCMD_DIR/.dayz_login_ok"
DAYZ_SERVER_APPID=223350
DAYZ_CLIENT_APPID=221100
WORKSHOP_SUBPATH="steamapps/workshop/content/$DAYZ_CLIENT_APPID"
[[ -n "${STEAMCMD_BIN:-}" ]] || STEAMCMD_BIN="$(command -v steamcmd || true)"
[[ -n "${STEAM_RUN:-}" ]]   || STEAM_RUN="$(command -v steam-run || true)"

apply_defaults

case "${1:-}" in
  ""|menu)   menu ;;
  up|start)  do_start ;;
  config)    configure ;;
  login)     do_login ;;
  install)   do_install ;;
  mods)      do_mods ;;
  resolve)   do_resolve ;;
  status)    show_status ;;
  -h|--help|help)
    cat <<EOF
Usage: ./dayz.sh [command]

  (no command)  Interactive menu
  up            Do everything needed, then start the server
  config        (Re)configure settings (.env)
  login         Log in to Steam (caches the session)
  install       Install/update the DayZ server
  mods          Download/update all mods in mods.txt
  resolve       Verify mod IDs via the Steam Web API
  status        Show setup status
EOF
    ;;
  *) die "Unknown command '$1' (try: ./dayz.sh --help)" ;;
esac

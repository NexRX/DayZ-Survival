# Fallback dev shell for non-flake workflows:  nix-shell
# (Flake users: `nix develop` — see flake.nix.)
{
  pkgs ? import <nixpkgs> { config.allowUnfree = true; },
}:

pkgs.mkShell {
  packages = with pkgs; [
    steamcmd # packaged SteamCMD that works on NixOS
    steam-run # FHS wrapper to run the DayZ server + mods
    gnumake
    bashInteractive
    curl
    jq
    coreutils
    findutils
    gnused
    gawk
  ];

  shellHook = ''
    echo "DayZ Survival dev shell — steamcmd + steam-run ready."
    echo "  run:  ./dayz.sh"
  '';
}

# Fallback dev shell for non-flake workflows:  nix-shell
# (Flake users: `nix develop` — see flake.nix.)
{
  pkgs ? import <nixpkgs> { config.allowUnfree = true; },
}:

pkgs.mkShell {
  packages = with pkgs; [
    deno # runs the TypeScript CLI in ./src + task runner
    steamcmd # packaged SteamCMD that works on NixOS
    depotdownloader # reliable large-workshop-item downloads (bundle)
    steam-run # FHS wrapper to run the DayZ server + mods
    bashInteractive
    coreutils # cp, du used by the CLI
  ];

  shellHook = ''
    echo "DayZ Survival dev shell — deno + steamcmd + steam-run ready."
    echo "  run:  deno task dayz        (or: deno task up)"
  '';
}

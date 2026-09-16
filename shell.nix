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
    gdb
    libcap
    stdenv.cc.cc
  ];

  shellHook = ''
    unset NIX_LD NIX_LD_LIBRARY_PATH
    unset LD_LIBRARY_PATH LD_PRELOAD
    unset QT_PLUGIN_PATH QT_QPA_PLATFORM_PLUGIN_PATH
    unset GTK_PATH GTK2_RC_FILES GTK_RC_FILES
    unset GST_PLUGIN_SYSTEM_PATH_1_0 GDK_PIXBUF_MODULE_FILE
    unset QML2_IMPORT_PATH NIXPKGS_QT6_QML_IMPORT_PATH

    echo "DayZ Survival dev shell — deno + steamcmd + steam-run ready."
    echo "  run:  deno task dayz        (or: deno task up)"
  '';
}

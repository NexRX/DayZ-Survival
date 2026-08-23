{
  description = "DayZ Survival — Expansion dedicated server (NixOS-native tooling)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          # SteamCMD is unfree.
          config.allowUnfree = true;
        };

        # Everything the CLI (deno task dayz -> ./src) needs at runtime.
        tools = with pkgs; [
          deno # runs the TypeScript CLI in ./src + task runner
          steamcmd # packaged SteamCMD that works on NixOS
          depotdownloader # reliable large-workshop-item downloads (bundle)
          steam-run # FHS wrapper to run the DayZ server + mods
          bashInteractive
          coreutils # cp, du used by the CLI
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          packages = tools;
          shellHook = ''
            echo "DayZ Survival dev shell — deno + steamcmd + steam-run ready."
            echo "  run:  deno task dayz        (or: deno task up)"
          '';
        };
      }
    );
}

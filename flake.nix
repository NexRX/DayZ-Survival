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

        # Everything the scripts in ./scripts need at runtime.
        tools = with pkgs; [
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
      in
      {
        devShells.default = pkgs.mkShell {
          packages = tools;
          shellHook = ''
            echo "DayZ Survival dev shell — steamcmd + steam-run ready."
            echo "  run:  ./dayz.sh"
          '';
        };

        # `nix run` convenience apps.
        apps = {
          default = {
            type = "app";
            program = "${pkgs.writeShellScript "dayz" "exec ./dayz.sh \"$@\""}";
          };
          up = {
            type = "app";
            program = "${pkgs.writeShellScript "dayz-up" "exec ./dayz.sh up"}";
          };
        };
      }
    );
}

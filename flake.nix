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

        # armake2: Rust reimplementation of Bohemia's AddonBuilder (packs,
        # rapifies and signs PBOs) - not in nixpkgs, so we build it ourselves.
        # Used by `deno task build-serverpack` (src/modBuild.ts) to build
        # serverpack/ into a publishable Workshop mod on Linux, without
        # needing DayZ Tools/Windows.
        armake2 = pkgs.rustPlatform.buildRustPackage {
          pname = "armake2";
          version = "unstable-2021";

          src = pkgs.fetchFromGitHub {
            owner = "KoffeinFlummi";
            repo = "armake2";
            rev = "3cc3362101900ff41504db3e780dd1625634cf94";
            hash = "sha256-NdJBYvxkQ3yCd5mjwPx4jqEz153fT3B9xglbcJWT02M=";
          };

          cargoLock = {
            lockFile = ./nix/armake2-Cargo.lock;
          };

          nativeBuildInputs = [ pkgs.pkg-config ];
          buildInputs = [ pkgs.openssl ];

          # Upstream has no test suite wired for a headless sandbox build.
          doCheck = false;
        };

        # Everything the CLI (deno task dayz -> ./src) needs at runtime.
        tools = with pkgs; [
          deno # runs the TypeScript CLI in ./src + task runner
          steamcmd # packaged SteamCMD that works on NixOS
          depotdownloader # reliable large-workshop-item downloads (bundle)
          steam-run # FHS wrapper to run the DayZ server + mods
          bashInteractive
          coreutils # cp, du used by the CLI
          armake2 # build/sign the server pack's PBOs (see src/modBuild.ts)
        ];
      in
      {
        packages.armake2 = armake2;

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

# DayZ Survival Server WIP

The goal of this project is to deliver a DayZ survival experience in the spirit
of **Arma 2 Epoch** crossed with the progression and crafting loops of modern
**survival games** - a persistent, living world where every session is a story
of scavenging, building, trading, and fighting to stay alive.

## Design philosophy

### Hardcore, but respects your time

Survival should have teeth: hunger, thirst, temperature, illness, and injury are
real threats that force players to plan ahead. But the challenge should come from
_meaningful decisions_, not from tedium. Finding your first gun or your next meal
should be a tense scramble, not an hour of running through empty fields. We tune
loot, travel, and progression so downtime is spent making choices, not waiting.

### A world that fights back

PvP is a core part of the fantasy - encounters with other survivors should be
tense and consequential. But the environment is a rival in its own right. AI
bandits, roaming patrols, and infested hotspots contest the best loot. Dynamic
missions and world events (heli crashes, convoys, airdrops, contaminated zones)
pull players toward flashpoints and give the map a rhythm. The world should feel
alive and dangerous whether the server holds two players or two hundred.

### An Epoch-style economy and safe havens

Trader cities and safe zones anchor the social side of the server: neutral
ground to buy, sell, and refit before heading back into the danger. A persistent
currency/valuables economy rewards scavenging and gives loot lasting value.
But not everything can be bought

### Base building with real stakes

Bases are the long game: a place to store gear, park vehicles, and stake a claim.
Building should be rich and expressive, but ownership must be _earned and
maintained_ - decay, upkeep, and raiding keep the map from freezing into a
fortress of abandoned bases. Territory should be defensible but never truly safe.

### Gameplay-rich through heavy modding

Most survival power fantasies should be on the table: helicopters, boats, and
cars to master the map; deep crafting and character skills to grow into; trading
and player-run economies; loot progression from rusty pistols to endgame kit.
The guiding constraint is _earned power_ - becoming strong should be possible,
but slow, risky, and always reversible in a single bad firefight.
Not just buying your way to success!

### Technical

This project contains a deno cli app that manages the installation and running of this server (interactively). Any updates to the server should not have manual intervention on other hosts, the script should supply all updates or the filesystem itself via cloning etc

## Commands

You made need to run `nix develop` first

```bash
deno run dayz            # interactive menu
deno run up              # do everything needed, then start
deno run config          # (re)enter settings
deno run login           # cache a Steam session
deno run install         # install/update the server
deno run mods            # download/update all mods
deno run resolve         # verify mod IDs via the Steam Web API
deno run status          # show setup status
deno run dayz --help
```

`deno run dayz <command>` also works for any subcommand (e.g.
`deno run dayz up`), since Deno forwards trailing arguments to the task.

## Mods

see [`mods.txt`](mods.txt)

Add/reorder mods by editing `mods.txt` (`<workshop_id>  @name`, one per line) -
the CLI reads the load order from there.

## Networking

Default ports for firewall rules to consider:

| Port      | Purpose                                     |
| --------- | ------------------------------------------- |
| 2302      | Game port                                   |
| 2303–2305 | Steam query / server ports (BI reserves +3) |
| 27016     | Steam master-server heartbeat               |

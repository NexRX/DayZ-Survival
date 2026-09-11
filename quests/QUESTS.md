# Quest Line

Built autonomously per the user's request ("come up with a whole quest line
and some optional side quests... surprise me"). Implemented entirely as
hand-authored DayZ-Expansion-Quests JSON config (`src/quests.ts`), following
this project's usual "ensure" pattern - no custom mod/PBO needed.

## The mission giver

One NPC, **"The Quartermaster"**, stationed a few meters from the General
Store trader (see `src/traders.ts`'s `CUSTOM_POSITION`). Hands out and takes
in every quest below.

**TODO (placeholder):** its `ClassName` is currently `ExpansionQuestNPCMirek`
- a real, confirmed-spawnable skin from DayZ-Expansion-Quests' own roster
  (`ExpansionQuestNPCBase`-derived classes: Mirek, Denis, Boris, Cyril, Elias,
  Francis, Guo, Hassan, Indar, Jose, Kaito, Lewis, Manua, Niki, Oliver, Peter,
  Quinn, Rolf, Seth, Taiki, Linda, Maria, Frida, Gabi, Helga, Irena, Judy,
  Keiko, Eva, Naomi, Baty), picked only because it doesn't visually clash with
  the two existing trader NPCs (`ExpansionTraderDenis`/`ExpansionTraderCyril`).
  Swap `MISSION_GIVER_CLASSNAME` in `src/quests.ts` for whichever skin you
  actually want - nothing else needs to change.

## Main quest chain (10 quests, IDs 1000-1009)

A linear chain gated with `PreQuestIDs`, all given out and turned in at the
Quartermaster. Rewards scale from 250 up to 1200 gold (`ExpansionGoldNugget`)
as the chain progresses, plus a few thematic item rewards along the way.

| #   | Title                          | Objective                                              | Reward                          |
| --- | ------------------------------- | ------------------------------------------------------- | -------------------------------- |
| 1   | Welcome to the Exchange          | Travel to the trading post (auto-active on connect)     | 250 gold                         |
| 2   | Prove You Can Handle Yourself    | Kill 15 Infected                                         | 400 gold + 1x Decoy Grenade      |
| 3   | Thin the Pack                    | Kill 5 wolves                                            | 450 gold                         |
| 4   | Boar Hunt                        | Kill 3 wild boar                                         | 500 gold + Taloon Bag (Green)    |
| 5   | Supply Run                       | Deliver 5x Tuna Can + 5x Water Bottle                    | 600 gold                         |
| 6   | Fresh off the Vine               | Gather 3x Apple + 3x Pear + 3x Plum                      | 650 gold                         |
| 7   | Scout the Waterworks             | Travel to the Water Station                              | 700 gold + `evg_keycards_Yellow` |
| 8   | Into the Hot Zone                | Travel to Stary Sobor (the radiation zone)               | 800 gold                         |
| 9   | The Big Game                     | Kill 1 bear                                              | 1200 gold + `evg_keycards_Blue`  |
| 10  | Steady Hands                     | Craft an Improvised Fishing Rod, then catch 2x Mackerel  | 900 gold + spare Fishing Rod     |

Quest #1 has no quest-giver NPC assigned, so it auto-activates for every
player the moment they connect (DayZ-Expansion-Quests treats any quest with
no `QuestGiverIDs`/`PreQuestIDs` as an auto-start) - it only needs a turn-in,
which is what naturally introduces the player to the Quartermaster.

Quest #8 deliberately sends players into the existing Stary Sobor
radiation/toxic hazard zone (see `src/hazards.ts`) - a good excuse to gear up
before going in.

## Side quests (5, all standalone and repeatable, IDs 1100-1104)

Available from the start, no chain gating - a currency grind, separate from
the main story. A couple are capped at once/day; the rest have no cooldown
at all and can be turned in back-to-back.

| #   | Title                    | Objective                       | Reward   | Cooldown  |
| --- | ------------------------- | -------------------------------- | -------- | --------- |
| 1100 | Vermin Control            | Kill 20 Infected                 | 300 gold | Daily     |
| 1101 | Deer Season               | Kill 3 deer                      | 350 gold | None      |
| 1102 | Bottled Sunshine          | Gather 5x Water Bottle           | 200 gold | Daily     |
| 1103 | Rags to Riches            | Gather 10x Rag                   | 250 gold | None      |
| 1104 | Firewood for the Fire     | Deliver 10x Wooden Log           | 300 gold | Daily     |

## Design notes / what was deliberately left out

- Every coordinate used is either a `CUSTOM_POSITION` offset (the already-
  scouted trader city) or a real, already-verified location elsewhere in
  this project (Water Station/Stary Sobor). Nothing was guessed.
- Every item/creature classname was checked against this project's own
  `db/types.xml` or DayZ-Expansion-Quests' own shipped example quest data
  before use - see `src/quests.ts`'s header comment for specifics.
- Objective types used: Travel, Target (kill), Delivery, Collect, Crafting.
  Treasure Hunt / Action / AI Patrol / AI Camp / AI Escort were intentionally
  **not** used - their extra nested schemas (`ExpansionLoot`, real DayZ
  `ActionBase` classnames, `ExpansionQuestAISpawn`) couldn't be fully
  confirmed from the mod's source in the time available, and shipping a
  smaller, fully-verified quest line was judged better than guessing at
  those and risking a broken quest config.
- The mod ships ~24 example quests/3 example NPCs the first time its config
  folders are generated - `src/quests.ts` deletes those automatically so
  only this server's own quests show up in the quest board/log.

## Extending this later

All quest/objective/NPC data lives in `src/quests.ts` as plain TypeScript
arrays (`MAIN_QUESTS`, `SIDE_QUESTS`, `TRAVEL_OBJECTIVES`, etc.) - add a new
entry with a fresh ID (this project uses ID ranges: 1000s for main quests,
1100s for side quests, 1000s/2000s/3000s/4000s/6000s for the different
objective types) and it'll be picked up automatically on the next server
start, idempotently (existing quests are left untouched if unchanged).

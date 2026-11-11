# What is open

The rebuild is complete on `grassroots`: the loop runs end to end, the server
is the authority, and the branch builds, lints and passes its tests. These are
the things that are decisions rather than work, or that need real players.

## Decisions waiting on you

- **Marks have nothing to spend them on.** Selling coins pays marks, and the
  shop that took marks is gone — the goblin gives away what it used to sell.
  Until there is a sink, marks are a score. The option closest to the design:
  let marks be offered at the door alongside scrolls, at a poor rate.
- **Duels** are kept and still hidden (`FEATURES.duels` in `shared/tuning.js`),
  as they were before the rebuild. The server endpoint is unchanged; the client
  UI is ported and lives under Profile → Friends. Flip the flag to try them.
- **The Tavern is simulated gambling.** It is coins-only and says so, but if
  this is ever distributed in Australia that is the feature that sets its
  classification.
- **Titles still say "Digger".** `Novice Digger` is the starting title and
  there is no digging any more. Renaming titles was left to you.

## Needs real players

- **Sigil thresholds.** They are tuned against generated drawings
  (`npm run sim`), not people. The first real stroke logs should replace the
  generators in `tools/simulate.mjs`. `deliberate` (drawing pace) is the trait
  most likely to be wrong.
- **Chest pacing** past the first hour, and whether eight steps of posture are
  enough of a signal on the longest waits.

## Not built

- Real sound. The hooks and placeholder tones are in `src/lib/feel.js`.
- Offline sealing. A scroll cannot be judged without the server; if the
  request fails the drawing stays on the sheet to try again.
- Seal-farming protection beyond a 2.5s cooldown and the eight-scroll satchel.

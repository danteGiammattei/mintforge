# What is open

The rebuild is complete on `grassroots`: the loop runs end to end, the server
is the authority, and the branch builds, lints and passes its tests. These are
the things that are decisions rather than work, or that need real players.

## Decisions waiting on you


- **The Tavern is simulated gambling.** It is coins-only and says so, but if
  this is ever distributed in Australia that is the feature that sets its
  classification.
- **The new title names** are a first pass (`TITLES` and `TITLE_RENAMES` in
  `src/lib/data.js`). Changing one is a one-line edit plus a row in the map.

- **The name filter is a backstop**, not moderation: a short word list in
  `nameAllowed` (`shared/economy.js`). It blocks "MOBY DICK"; that is the price.

## Needs real players

- **Sigil thresholds.** They were tuned against generated drawings. Every seal
  is now logged (numbers only, never the drawing): after a week of play, run
  `node tools/seal-report.mjs --remote` and move any trait that fires on most
  drawings, or almost none. `deliberate` (drawing pace) is the likeliest to
  be off.
- **Forge prices.** A shine costs about 1,000 marks on an ordinary coin —
  roughly twenty minutes of selling — and five times a coin's worth above
  that. Whether that makes shinies too common is a question for real play.
- **Chest pacing** past the first hour, and whether eight steps of posture are
  enough of a signal on the longest waits.

## Not built

- Real sound. The hooks and placeholder tones are in `src/lib/feel.js`.
- Offline sealing. A scroll cannot be judged without the server; if the
  request fails the drawing stays on the sheet to try again.
- Seal-farming protection beyond a 2.5s cooldown and the eight-scroll satchel.

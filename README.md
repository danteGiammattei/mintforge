# MintForge

A mobile-first pixel-art collecting game. You are a scribe. You draw sigils,
pay them to something behind a door, and brush the dust off whatever it gives
back.

## The loop

1. **Scribe** — free-draw a sigil on parchment with a limited well of ink and
   seal it into a scroll. The scroll gets a rarity. To the player this is meant
   to feel random; the rules are never shown.
2. **Door** — a goblin waits half-hidden in the gap. Swipe up, pick a scroll,
   offer it; he pulls it out of your hand. There is no menu, no price and no
   tooltip. His posture is the only meter: he leans further out as the pot
   fills. When he has been paid enough, a chest comes through.
3. **Satchel** — hold to break the chest's seal. It cannot fail. Inside is a
   coin, thick with dust.
4. **Brush** — clean it. Then it is yours, in the **Vault**.

The goblin also gives things away unprompted when you visit: the first chest,
better brushes, titles, banners. When a scroll was lifted by something about
the way it was drawn, he sometimes says so, obliquely. He never comments on a
poor scroll and never states a rule.

Around the loop: the **Forge** (reached from any coin in the vault — spend
marks on a strike that may leave the coin shiny and never harms it, or have a
name of your own engraved on it), deeper **inkwells** bought with marks at the
desk, a **Journal** of every kind of coin found (milestones in it earn gifts from the goblin), a gift on the first visit to
the door each day (a seven-day streak, with a chest on the seventh), the
**Tavern** (four coin wagers: toss, crucible, roulette, plinko), and **Profile** (banner, title, a cabinet of
six coins, friends).

## Three rules of the codebase

**The coin generator is frozen.** `genFace` in `src/lib/coin.js` is a 13×13
cellular automaton and stays that way. Its coarseness is the point — players
see rabbits and faces in the blobs, and a nearly blank face is prized.
`tests/coin.golden.test.js` pins its output against the generator on `main`.
Coins are never drawn through `pixelform`.

**The server decides everything of value.** The client sends which of the
player's own things to act on (and, for sealing, the strokes). It never sends
a coin, a rarity, a balance or a roll. See `server/game.js`.

**Nothing on the door screen explains itself.** No prices, no progress bar, no
tooltips. `shared/tuning.js` and the server keep the pot hidden; the client is
told his posture in eight coarse steps and nothing finer.

## Layout

```
shared/        rules both sides run
  tuning.js      every balance number, in one file
  economy.js     the pot, chests, coin rolls, gifts, wagers — pure functions
  sigil.js       how a drawing is judged
server/        the authority (runs in Pages Functions; plain modules, so tests run them in Node)
  game.js        seal · offer · visit · open · brush · sell · forge · engrave · well · gamble
  state.js       the snapshot the client may see; cosmetic choices
  auth.js        PIN hashing, login throttle, session expiry
functions/api/ thin HTTP wrappers over server/
src/
  scenes/        canvas scenes: door, scribe, chest, forge (+ kit.js: scaling, 60Hz loop, reduced motion)
  lib/           pixelform (renderer), forms (sprites), coin (frozen), feel (sound/haptics), outbox
  state/         useGameState — the one place game state changes
  screens/       Scribe, Door, Satchel, Vault, Tavern, Profile (+ Friends)
  ui/            dialogs, toasts, aria-live, pixel icons
tests/         node --test: coin golden, sigil traits, server actions, contrast
tools/simulate.mjs   plays the loop thousands of times and prints what it pays
migrations/    D1 migrations 001–012 · schema.sql is all of them applied
```

## Running it

```sh
npm install
npm run db:local     # create a local D1 from schema.sql (once; delete .wrangler/state to reset)
npm run build
npm run serve        # http://localhost:8788 — the built app + the API + the local D1
```

`npm run dev` serves the client alone with hot reload, but there is no API
behind it; use `npm run serve` (rebuild after changes) to play.

```sh
npm run check        # lint + tests + build
npm test             # 61 tests, no network, no browser
npm run sim          # the balance report (npm run sim -- --quick while iterating)
```


## Deploying

The project is Cloudflare Pages + D1 (`wrangler.toml`). Migrations go in
**before** the code that needs them:

```sh
npx wrangler d1 export mintforge --remote --output=backup.sql      # always, first
node tools/migrate.mjs migrations/013_war.sql --remote
node tools/migrate.mjs migrations/014_war_picks.sql --remote
node tools/cards.mjs path/to/Jorels_Card_Pack.zip                  # once per machine
npm run build
npx wrangler pages deploy dist --project-name mintforge --branch main
```

`tools/migrate.mjs` runs a migration file as a `--command`, because
`wrangler d1 execute --file` uses an import endpoint that can refuse an OAuth
login. Either works when it works. Each migration runs once.

| Migration | What it does |
| --- | --- |
| 009 | the grassroots loop: scrolls, chests, the pot, dusty coins, login throttle, session expiry |
| 010 | renames the old digging-game titles in stored rows (safe to repeat) |
| 011 | engraved names, the journal, inkwells |
| 012 | **deletes** the duels, tarot and artefact tables and six dead columns; better indexes; the seal log |
| 013 | war at the tavern: the tables, with staked coins held in them |
| 014 | war: which card of the fan each player picked |

The playing cards for war are Jorel's Card Pack, whose licence allows them
in the game but not in this public repo, so `public/sprites/cards/` is
git-ignored and `tools/cards.mjs` fills it from the pack's zip on the
machine you build on. Without it, war deals plain pixel cards of its own.

A fresh database takes `schema.sql` instead, which is all of them applied.

## Tools

```sh
node tools/reset-pin.mjs <username> <new-pin> --remote   # new PIN, signs them out, clears any lockout
node tools/seal-report.mjs --remote [--days 7]           # how real drawings score; suggests sigil thresholds
node tools/simulate.mjs                                  # the balance report (npm run sim)
```

## Art

Everything except coins is built in `src/lib/pixelform.js`: a sprite is a
skeleton of capsules, joints and slabs, turned into a distance field, lit by
one named rig and quantised to a six-tone ramp. No outlines. To move, mirror
or resize a sprite, transform its skeleton and rasterise again — never rotate
or scale a finished sprite by a fraction.

Each scene names its light at the top of its file and shades to it:

| Scene | Light |
| --- | --- |
| Door | A cold slot of light **behind** the door, up and left. Rim only. His magic is the second source. |
| Scribe, Satchel, chest | One candle, low and left, **in front**. Warm, falls off hard. |
| Forge | A bed of coals, low and right, **in front**. Orange, and the only light. |

The one exception is the chests: drawn sheets in `public/sprites/chests/`,
lit by the same candle as the satchel and graded colder for the doorway in
`src/lib/chestArt.js`. Where they came from and how to replace one:
`tools/chest/README.md`.

HTML screens follow the scenes: one dark palette, Silkscreen for every word,
hard square edges, pixel icons (`src/ui/icons.js`), no emoji.

## Accessibility

Pinch-zoom is on. Touch targets are at least 44px. Text clears 4.5:1
(`tests/contrast.test.js`). `prefers-reduced-motion` stops flicker, grain,
sway and shake in the scenes and animation elsewhere. Results that are only
drawn on a canvas — a scroll's rarity, the goblin's hints — are also sent to
an `aria-live` region, and every canvas control has an off-canvas button.
Render loops stop while the tab is hidden.

## Sound

`src/lib/feel.js` has a named cue for every moment worth feeling (`seal`,
`pull`, `break`, `reveal`, …) with a haptic pattern and a placeholder tone.
To use a real sound, drop a file in `public/sfx/` and add its name to
`SAMPLES` at the top of that file.

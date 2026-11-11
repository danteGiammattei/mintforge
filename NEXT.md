# Where the grassroots branch is up to

## Done

- **Deleted**: the side-scroller hunt and its sprite system, tarot (cards,
  pairs, buffs, shop, spreads), the pickaxe/shovel upgrade tree and its
  durability + repair loop, artefacts and the Shrine, the old radar/dig
  Hunt screen, and the 176 hand-drawn coin PNGs.
- **Coins untouched.** `lib/coin.js` keeps its 13×13 generator exactly as
  it was. See the warning block at the top of `lib/forms.js`.
- **Two bugs fixed.** `coinValue` read `?.multiplier`, which does not exist
  on RARITIES, so rarity contributed nothing to a coin's value — now reads
  `?.valueMul`. And `BrushReveal`/`CoinModal` loaded coin PNGs while the
  vault drew procedurally, so the coin you brushed was not the coin you
  kept; both now use the one painter.
- **Added**: `lib/pixelform.js` (the shared renderer), `lib/forms.js` (the
  sprites), `lib/sigil.js` (scroll judging), `scenes/door.js`,
  `scenes/scribe.js`, and the `Door`/`Scribe` screen wrappers.

## Not done — and why

`MintForge.jsx` still imports and uses the removed systems in roughly 200
places, so **the build does not pass yet.** Most of that is the phase
machine (`hunt → dig → brush`), the ore economy and the shovel gating,
which the new loop replaces outright. Stripping it is not a separate job
from wiring scribe → goblin → chest → brush — it is the same job, and
doing it as deletion first would mean writing the state twice.

## Open question before that starts

What is the Tavern for now? Its tarot shop and repair tab are gone, and
the goblin hands out banners and titles for free, which was the other half
of its shop. That leaves gambling. Keep it, fold the gambling into the
goblin, or drop it?

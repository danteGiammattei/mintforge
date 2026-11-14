/* ══════════════════════════════════════════════════════════════════════
 *  The goblin's stall: what is on it today
 *  ────────────────────────────────────────────────────────────────────
 *  rollStall(pid, day, journal, owned) → five slots, the same every time
 *  for one player on one local day, so nothing need be stored but what
 *  has been bought. Slots:
 *    0  a chest, mostly the lower tiers
 *    1  a coin   } each mostly a kind (metal × rarity) missing from the
 *    2  a coin   } journal, so the stall is where you hunt a gap
 *    3  an oddity: a shop-only cosmetic you do not own (else a chest)
 *    4  featured: a fine coin, a high chest or an oddity, a little cheaper
 *  Astral coins are never sold (their signs are one each), nor mythics
 *  (those are only ever found).
 * ══════════════════════════════════════════════════════════════════════ */

import { STALL, COIN_METAL_BY_CHEST } from "./tuning.js";
import { weighted, coinRarityWeights } from "./economy.js";
import { mkCoin, coinValue } from "../src/lib/coin.js";

const TOP = 9;                               // eldritch: the finest metal the stall sells
const round5 = n => Math.max(5, Math.ceil(n / 5) * 5);

function rng(a, b) {
  let s = (Math.imul(a ^ 0x9e3779b9, 2654435761) ^ Math.imul(b + 0x7f4a7c15, 1597334677)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coinWare(metalIdx, rarity, rand, mul) {
  const seed = Math.floor(rand() * 4294967296) >>> 0;
  const c = mkCoin(seed, 1, metalIdx, undefined, rarity);
  return { kind: "coin", coin: { seed, metalIdx, rarity }, price: round5(coinValue(c) * mul) };
}
function randomCoin(rand, mul) {
  const metal = Math.min(TOP, weighted(COIN_METAL_BY_CHEST[2], rand()));
  return coinWare(metal, Math.min(4, weighted(coinRarityWeights(2), rand())), rand, mul);
}
function missingCoin(rand, journal, mul) {
  const have = journal?.c || {}, gaps = [];
  for (let m = 0; m <= TOP; m++) for (let r = 0; r <= 4; r++) if (!(have[`${m}:${r}`] > 0)) gaps.push([m, r, 1 / ((1 + m * 0.6) * (1 + r))]);
  if (!gaps.length) return null;
  const [m, r] = gaps[weighted(gaps.map(g => g[2]), rand())];
  return coinWare(m, r, rand, mul);
}
const chestWare = (tier, mul = 1) => ({ kind: "chest", tier, price: round5(STALL.chestPrice[tier] * mul) });

export function rollStall(pid, day, journal, ownedTitles = [], ownedFrames = []) {
  const rand = rng(pid, day);
  const unowned = STALL.oddities.filter(o => !(o.type === "title" ? ownedTitles : ownedFrames).includes(o.id));
  const oddity = mul => {
    if (!unowned.length) return null;
    const o = unowned[Math.floor(rand() * unowned.length)];
    return { kind: o.type, id: o.id, price: round5(o.price * mul) };
  };
  const coin = () => (rand() < STALL.missingChance && missingCoin(rand, journal, STALL.coinMul)) || randomCoin(rand, STALL.coinMul);

  const slots = [chestWare(weighted(STALL.chestTier, rand()))];
  slots.push(coin(), coin());
  const odd = oddity(1);
  slots.push(odd || chestWare(weighted(STALL.chestTier, rand())));
  // featured: never the same oddity twice in one stall
  const F = STALL.featured, pick = weighted([F.coin, F.chest, F.oddity], rand());
  let feat = null;
  if (pick === 2) { const o = oddity(F.discount); if (o && !(odd && o.id === odd.id)) feat = o; }
  if (!feat && pick === 1) feat = chestWare(weighted(F.chestTier, rand()), F.discount);
  if (!feat) {
    const metal = Math.min(TOP, weighted(COIN_METAL_BY_CHEST[3], rand()));
    feat = coinWare(metal, weighted(F.rarity, rand()), rand, STALL.coinMul * F.discount);
  }
  slots.push({ ...feat, featured: true });
  return slots;
}

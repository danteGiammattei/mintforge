/* ══════════════════════════════════════════════════════════════════════
 *  economy — the rules, as pure functions
 *  ────────────────────────────────────────────────────────────────────
 *  Everything here takes its randomness as an argument (`rand`, a
 *  function returning [0,1)), so the server can hand it real entropy,
 *  the tests a fixed sequence and the simulator a seeded stream — and
 *  all three run exactly the rules the players get.
 *
 *  The numbers are in tuning.js. This file is only their meaning.
 * ══════════════════════════════════════════════════════════════════════ */

import {
  FAVOUR_PER_RARITY, CHESTS, COIN_METAL_BY_CHEST, COIN_RARITY,
  SHINY_CHANCE_BY_BRUSH, XP, GAMBLE, GIFTS,
} from "./tuning.js";

export const MAX_METAL = 8;
export const MAX_RARITY = 5;
export const MAX_CHEST = CHESTS.cost.length - 1;

export const levelOf = xp => Math.floor(Math.sqrt(Math.max(0, xp) / XP.perLevel)) + 1;

/* Pick an index from a list of weights with one roll. */
export function weighted(weights, roll) {
  const tot = weights.reduce((s, w) => s + w, 0);
  let r = roll * tot;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}

/* ─── the door ────────────────────────────────────────────────────── */

export function chestTierWeights(chestsGiven) {
  const k = Math.min(1, Math.max(0, chestsGiven / CHESTS.trustChests));
  return CHESTS.early.map((w, i) => w + (CHESTS.late[i] - w) * k);
}

/* A pot is { favour, tier, cost, best, chests }. cost === 0 means he has
 * not yet decided what he is holding. */
export function primePot(pot, rand) {
  if (pot.cost > 0) return pot;
  const tier = weighted(chestTierWeights(pot.chests), rand());
  return { ...pot, tier, cost: CHESTS.cost[tier] };
}

/* One scroll goes in. Returns the new pot and the tier of the chest he
 * hands over, or null. At most one chest per offering: a rich scroll's
 * overpayment stays in the pot and shortens the next wait instead. */
export function offerScroll(pot0, rarity, rand) {
  let pot = primePot(pot0, rand);
  pot = { ...pot, favour: pot.favour + FAVOUR_PER_RARITY[rarity], best: Math.max(pot.best, rarity) };
  if (pot.favour < pot.cost) return { pot, chest: null };

  let tier = pot.tier;
  if (pot.best >= CHESTS.impressFrom && rand() < CHESTS.impressChance[pot.best]) tier = Math.min(MAX_CHEST, tier + 1);
  pot = primePot({ favour: pot.favour - pot.cost, tier: 0, cost: 0, best: 0, chests: pot.chests + 1 }, rand);
  return { pot, chest: tier };
}

/* His posture, 0..leanSteps. Deliberately coarse: the client is told this
 * and nothing finer, so the price cannot be read off the wire. */
export function leanOf(pot) {
  if (!pot.cost) return 0;
  return Math.max(0, Math.min(CHESTS.leanSteps, Math.floor(CHESTS.leanSteps * pot.favour / pot.cost)));
}

/* ─── the chest ───────────────────────────────────────────────────── */

export function coinRarityWeights(tier) {
  const lean = 1 + tier * COIN_RARITY.leanPerTier;
  return COIN_RARITY.base.map((w, r) => w * Math.pow(lean, r));
}

export function rollCoin(tier, brushLevel, rand) {
  const metalIdx = weighted(COIN_METAL_BY_CHEST[tier] || COIN_METAL_BY_CHEST[0], rand());
  const rarity   = weighted(coinRarityWeights(tier), rand());
  const shiny    = rand() < (SHINY_CHANCE_BY_BRUSH[brushLevel] ?? SHINY_CHANCE_BY_BRUSH[0]);
  const seed     = Math.floor(rand() * 4294967296) >>> 0;
  return { metalIdx, rarity, shiny, seed };
}

/* ─── experience ──────────────────────────────────────────────────── */

export const xpForSeal  = rarity => XP.seal.base + XP.seal.perRarity * rarity;
export const xpForOffer = rarity => XP.offer.base + XP.offer.perRarity * rarity;
export const xpForBrush = coin =>
  XP.brush.base + XP.brush.perRarity * (coin.rarity || 0) + XP.brush.perMetal * coin.metalIdx + (coin.shiny ? XP.brush.shiny : 0);

/* ─── the tavern ──────────────────────────────────────────────────────
 * Each returns what happens to the stake in terms the server can apply:
 *   lose  indices of staked coins that are destroyed
 *   make  metal tiers of the coins minted in return                   */

export function resolveToss(metal, rand) {
  const won = rand() < GAMBLE.toss.win;
  return { won, lose: [0], make: won ? [Math.min(MAX_METAL, metal + 1)] : [], outcome: won ? "up1" : "lose" };
}

export function resolveCrucible(metal, rand) {
  if (rand() < GAMBLE.crucible.win) {
    const up = Math.min(MAX_METAL, metal + 1);
    return { won: true, lose: [0, 1, 2], make: [up, up, up], outcome: "up1" };
  }
  const kept = Math.min(2, Math.floor(rand() * 3));
  return { won: false, lose: [0, 1, 2].filter(i => i !== kept), make: [], outcome: "lose", kept };
}

export function resolveRoulette(metal, rand) {
  const sector = weighted(GAMBLE.roulette.map(s => s.weight), rand());
  const outcome = GAMBLE.roulette[sector].outcome;
  const make = {
    lose:    [],
    same:    [metal],
    up1:     [Math.min(MAX_METAL, metal + 1)],
    x2:      [metal, metal],
    up2:     [Math.min(MAX_METAL, metal + 2)],
    jackpot: [MAX_METAL],
  }[outcome];
  return { won: outcome !== "lose", lose: [0], make, outcome, sector };
}

/* ─── gifts ───────────────────────────────────────────────────────────
 * The first gift not yet given whose every condition is met. */
export function nextGift(stats, level, given) {
  const have = new Set(given);
  for (const g of GIFTS) {
    if (have.has(g.id)) continue;
    let ok = true;
    for (const [k, min] of Object.entries(g.when)) {
      const v = k === "level" ? level : (stats[k] || 0);
      if (v < min) { ok = false; break; }
    }
    if (ok) return g;
  }
  return null;
}

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
  SHINY_CHANCE_BY_BRUSH, XP, GAMBLE, GIFTS, FORGE, SCRIBE, DAILY, ENGRAVE,
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
  if (chestsGiven < CHESTS.alwaysWooden) return [1, 0, 0, 0, 0];
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

/* ─── the forge ───────────────────────────────────────────────────── */

/* What one strike costs, from the coin's sale value before any shine. */
export const forgeCost = plainValue => Math.max(FORGE.minCost, Math.round(plainValue * FORGE.costMul));

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

const makeFor = (outcome, metal) => ({
  lose:    [],
  same:    [metal],
  up1:     [Math.min(MAX_METAL, metal + 1)],
  x2:      [metal, metal],
  up2:     [Math.min(MAX_METAL, metal + 2)],
  jackpot: [MAX_METAL],
}[outcome]);

export function resolveRoulette(metal, rand) {
  const sector = weighted(GAMBLE.roulette.map(s => s.weight), rand());
  const outcome = GAMBLE.roulette[sector].outcome;
  return { won: outcome !== "lose", lose: [0], make: makeFor(outcome, metal), outcome, sector };
}

/* The path is the board: one left-or-right per row, and the slot is how
 * many rights. The client replays the path it is given. */
export function resolvePlinko(metal, rand) {
  const path = Array.from({ length: GAMBLE.plinko.rows }, () => (rand() < 0.5 ? 0 : 1));
  const slot = path.reduce((a, b) => a + b, 0);
  const outcome = GAMBLE.plinko.slots[slot];
  return { won: outcome !== "lose", lose: [0], make: makeFor(outcome, metal), outcome, slot, path };
}

/* Each slot's chance: C(rows, k) / 2^rows. */
export function plinkoOdds() {
  const n = GAMBLE.plinko.rows, out = [];
  let c = 1;
  for (let k = 0; k <= n; k++) { out.push(c / 2 ** n); c = c * (n - k) / (k + 1); }
  return out;
}

/* ─── gifts ───────────────────────────────────────────────────────────
 * The first gift not yet given whose every condition is met. */
export function nextGift(stats, level, given, journal = {}) {
  const have = new Set(given), j = journalCounts(journal);
  for (const g of GIFTS) {
    if (have.has(g.id)) continue;
    let ok = true;
    for (const [k, min] of Object.entries(g.when)) {
      const v = k === "level" ? level : k === "kinds" ? j.kinds : k === "found" ? j.found : (stats[k] || 0);
      if (v < min) { ok = false; break; }
    }
    if (ok) return g;
  }
  return null;
}

/* How far the journal has got: kinds found, and the rarest rarity found
 * (-1 for none). `journal` is the stored { c: { "metal:rarity": n } }. */
export function journalCounts(journal) {
  let kinds = 0, found = -1;
  for (const [k, n] of Object.entries(journal?.c || {})) {
    if (!(n > 0)) continue;
    kinds++;
    found = Math.max(found, Number(k.split(":")[1]) || 0);
  }
  return { kinds, found };
}
export const LEDGER_MARKS = GIFTS.filter(g => g.when.kinds).map(g => g.when.kinds).sort((a, b) => a - b);

/* ─── the desk ────────────────────────────────────────────────────── */
export const wellOf = level => SCRIBE.wells[Math.max(0, Math.min(SCRIBE.wells.length - 1, level | 0))];
export const inkFor = level => wellOf(level).ink;

/* ─── the daily visit ─────────────────────────────────────────────────
 * daily is { at, streak } from the player's stats. Returns the reward
 * and the new { at, streak }, or null if today's has been had. */
export function dailyGift(daily, now) {
  const at = daily?.at || 0, since = now - at;
  if (at && since < DAILY.gapMs) return null;
  const streak = at && since < DAILY.breakMs ? (daily.streak || 0) + 1 : 1;
  const reward = streak % DAILY.chestEvery === 0
    ? { type: "chest", tier: DAILY.chestTier }
    : { type: "marks", n: DAILY.marks[Math.min(DAILY.marks.length - 1, (streak - 1) % DAILY.chestEvery)] };
  return { reward, daily: { at: now, streak } };
}

/* ─── names ───────────────────────────────────────────────────────────
 * What may be engraved: letters, digits, spaces, apostrophes, hyphens.
 * Returns the cleaned name, "" to clear, or null if it will not do. */
export function cleanName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name) return "";
  if (name.length > ENGRAVE.maxLength || !/^[A-Za-z0-9 '-]+$/.test(name)) return null;
  return name.toUpperCase();
}

/* Words the engraver will not cut. Checked after undoing the usual
 * disguises (4 for A, spaces between letters). STEMS match anywhere in
 * the name; WORDS only as a whole word, so "PEACOCK" and "ASSASSIN"
 * pass. Deliberately short: it is a backstop, not a moderation system. */
const STEMS = ["FUCK", "CUNT", "NIGG", "FAGG", "RETARD", "WHORE", "RAPIST", "NAZI", "HITLER", "PEDO", "PAEDO", "SHIT", "BITCH", "WANK", "DILDO", "PENIS", "VAGINA", "CUM", "SPERM"];
const WORDS = ["ASS", "ARSE", "COCK", "DICK", "TIT", "TITS", "FAG", "SLUT", "KIKE", "SPIC", "CHINK", "COON", "TWAT", "PRICK", "PUSSY", "BOOB", "BOOBS", "RAPE", "SEX", "KKK", "NIGA"];
const UNLEET = { 0: "O", 1: "I", 3: "E", 4: "A", 5: "S", 7: "T", 8: "B", 9: "G" };
const FALSE_HITS = ["CUMBER", "SCUM", "CIRCUM", "CUMUL", "DOCUMENT", "ACCUM", "CUMIN", "SHITAKE"];
export function nameAllowed(name) {
  const clean = String(name).toUpperCase().replace(/[0-9]/g, d => UNLEET[d] || d).replace(/['-]/g, "");
  const joined = clean.replace(/ /g, "");
  let scan = joined;
  for (const ok of FALSE_HITS) scan = scan.split(ok).join("_");
  if (STEMS.some(w => scan.includes(w))) return false;
  const words = clean.split(" ").filter(Boolean);
  // single letters spaced out ("F U C K") are read as one word
  const spaced = words.every(w => w.length === 1) ? [joined] : [];
  return ![...words, ...spaced, joined].some(w => WORDS.includes(w));
}

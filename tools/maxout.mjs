#!/usr/bin/env node
/* How long to "max" an account, played the way a keen player would, on
 * the real rules (shared/*, lib/coin.js). Assumptions, all stated:
 *  · every seal is a copy of the highest-tier page owned, at a likeness
 *    drawn evenly from LIKE (fair to true), with full care;
 *  · SEAL seconds a seal, plus the offer, open and brush times below;
 *  · every coin is sold except the six best for the cabinet;
 *  · inkwells are bought as soon as affordable, then the stall's
 *    cosmetics (60k marks); no gambling, no stall chests or coins;
 *  · a "day" is MIN_PER_DAY of play, with its daily pouch.
 * Maxed = all 66 journal kinds, all 12 signs found, all 5 tomes, all
 * inkwells, every gift, every stall cosmetic, the top cabinet grade. */
import { analyse, rollScroll } from "../shared/sigil.js";
import { SCRIBE, XP, ASTRAL, CABINET_SCORE, DAILY, STALL, CHESTS } from "../shared/tuning.js";
import { offerScroll, rollCoin, levelOf, xpForSeal, xpForOffer, xpForBrush, nextGift } from "../shared/economy.js";
import { TOMES, tomeFromChest } from "../shared/tomes.js";
import { mkCoin, coinValue } from "../src/lib/coin.js";

const LIKE = [0.55, 0.9], SEAL = 28, T = { offer: 6.5, open: 6, brush: 10 };
const MIN_PER_DAY = +(process.argv.find(a => a.startsWith("--min="))?.slice(6) || 30);
const N = +(process.argv.find(a => a.startsWith("--n="))?.slice(4) || 60);
const rng = s => () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };

// one honest copy of each page, analysed once; the seal's salt varies the roll
function copyOf(page, r) {
  const at = { x: 20, y: 30, k: 115 }; let t = 0;
  return page.strokes.map(s => {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const [a, b] = [s[Math.max(0, i - 1)], s[i]], n = i ? Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 30)) : 1;
      for (let k = 1; k <= n; k++) out.push({ x: at.x + (a[0] + (b[0] - a[0]) * k / n + (r() - 0.5) * 0.02) * at.k, y: at.y + (a[1] + (b[1] - a[1]) * k / n + (r() - 0.5) * 0.02) * at.k, t: (t += 120) });
    }
    return out;
  });
}
const R0 = rng(99), A = {};
for (const t of TOMES) for (const p of t.pages) A[t.id + p.id] = analyse(copyOf(p, R0), SCRIBE.sheet);

const cabScore = c => CABINET_SCORE.rarity[c.rarity] * (1 + CABINET_SCORE.perMetal * c.metalIdx) * (c.shiny ? CABINET_SCORE.shiny : 1);
const COSMETICS = STALL.oddities.reduce((s, o) => s + o.price, 0);

function play(seed) {
  const R = rng(seed);
  let sec = 0, xp = 0, marks = 0, pot = { favour: 0, tier: 0, cost: 0, best: 0, chests: 0 }, salt = 1;
  let earned = 0; const at = {};
  let well = 0, spent = 0, day = 0, dayStart = 0, streak = 0, chestsGot = 0;
  const tomes = ["primer"], found = new Set(), held = new Set(), j = { c: {} }, given = [], cab = [];
  const stats = { visits: 0, sealed: 0, offered: 0, chests: 0, brushed: 0, gambles: 0 };
  const when = {};
  const mark = k => { if (when[k] == null) when[k] = { h: sec / 3600, d: day + 1 }; };
  const chests = [];
  const page = () => {
    const best = TOMES.filter(t => tomes.includes(t.id)).flatMap(t => t.pages.map(p => ({ t, p }))).sort((a, b) => b.p.tier - a.p.tier)[0];
    return best;
  };
  const open = tier => {
    sec += T.open + T.brush;
    const tome = tomeFromChest(tier, tomes, CHESTS.tomeChance, R);
    if (tome) tomes.push(tome.id ?? tome);
    const c = rollCoin(tier, R);
    if (c.metalIdx === ASTRAL.metal) {
      const free = ASTRAL.signs.filter(s => !held.has(s));
      if (!free.length) c.metalIdx = ASTRAL.instead;
      else { const s = free[Math.floor(R() * free.length)]; c.sign = s; held.add(s); if (!found.has(s)) { found.add(s); marks += ASTRAL.firstBonus; } }
    }
    const k = `${c.metalIdx}:${c.rarity}`; j.c[k] = (j.c[k] || 0) + 1;
    stats.brushed++; xp += XP.open + xpForBrush(c);
    // the cabinet keeps the six best; everything else is sold (freeing its sign)
    cab.push(c); cab.sort((a, b) => cabScore(b) - cabScore(a));
    for (const out of cab.splice(CABINET_SCORE.slots)) {
      const v = coinValue(Object.assign(mkCoin(out.seed, 1, out.metalIdx), { shiny: out.shiny, rarity: out.rarity })); marks += v; earned += v;
      if (out.sign) held.delete(out.sign);
    }
  };
  const gift = () => {
    stats.visits++;
    const g = nextGift(stats, levelOf(xp), given, j);
    if (!g) return;
    given.push(g.id);
    if (g.reward.type === "chest") chests.push(g.reward.tier);
    if (g.reward.type === "marks") marks += g.reward.n;
  };
  const CAP = (+(process.argv.find(a => a.startsWith("--cap="))?.slice(6) || 1500)) * 3600;
  for (let n = 0; sec < CAP; n++) {
    // a new day: its pouch, and every seventh an iron chest
    if (sec - dayStart >= MIN_PER_DAY * 60 || n === 0) {
      if (n) { day++; dayStart = sec; }
      streak++; if (streak % DAILY.chestEvery === 0) chests.push(DAILY.chestTier); else marks += DAILY.marks[Math.min(DAILY.marks.length, streak % 7 || 7) - 1];
      gift();
    }
    const { t, p } = page();
    const like = LIKE[0] + R() * (LIKE[1] - LIKE[0]);
    const s = rollScroll(A[t.id + p.id], [], salt++, { page: p, likeness: like, maxMs: 14000 });
    sec += SEAL + T.offer; stats.sealed++; stats.offered++;
    xp += xpForSeal(s.rarity) + xpForOffer(s.rarity);
    const o = offerScroll(pot, s.rarity, R); pot = o.pot;
    if (o.chest != null) { chests.push(o.chest); stats.chests++; chestsGot++; }
    if (stats.offered % 5 === 0) gift();
    while (chests.length) open(chests.shift());
    // spend: inkwells first, then the stall's cosmetics
    while (well < SCRIBE.wells.length - 1 && marks >= SCRIBE.wells[well + 1].cost) { marks -= SCRIBE.wells[++well].cost; }
    if (well === SCRIBE.wells.length - 1) mark("wells");
    if (well === SCRIBE.wells.length - 1 && spent < COSMETICS && marks >= COSMETICS - spent) { marks -= COSMETICS - spent; spent = COSMETICS; }
    if (spent >= COSMETICS) mark("cosmetics");
    for (const H of [1, 5, 10, 20, 40]) if (at[H] == null && sec >= H * 3600) at[H] = { earned, chests: chestsGot, tier: pot.tier };
    const kinds = Object.keys(j.c).length;
    if (kinds >= 33) mark("journal half");
    if (kinds >= 66) mark("journal");
    if (found.size >= 12) mark("signs");
    if (tomes.length >= TOMES.filter(t => !t.event).length) mark("tomes");
    if (given.length >= 26) mark("gifts");
    const lv = levelOf(xp); if (lv >= 10) mark("level 10"); if (lv >= 20) mark("level 20"); if (lv >= 35) mark("level 35");
    const score = cab.reduce((s2, c) => s2 + cabScore(c), 0);
    if (score >= 11000) mark("cabinet obsidian"); if (score >= 40000) mark("cabinet mythic");
    if (["wells", "cosmetics", "journal", "signs", "tomes", "gifts", "cabinet mythic"].every(k => when[k])) { mark("MAXED"); break; }
  }
  return { at, when, seals: stats.sealed, chests: chestsGot, kinds: Object.keys(j.c).length, missing: Object.keys(j.c).length < 66 ? missingKinds(j) : [] };
}

function missingKinds(j) {
  const out = [];
  for (let m = 0; m < 11; m++) for (let r = 0; r < 6; r++) if (!j.c[`${m}:${r}`]) out.push(`${m}:${r}`);
  return out;
}
const runs = Array.from({ length: N }, (_, i) => play(1000 + i * 7919));
const keys = ["level 10", "wells", "journal half", "tomes", "cabinet obsidian", "level 20", "cosmetics", "signs", "level 35", "gifts", "journal", "cabinet mythic", "MAXED"];
const q = (xs, f) => { const s = xs.filter(x => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : null; };
console.log(`${N} players, ${MIN_PER_DAY} min a day, likeness ${LIKE.join("–")}, ${SEAL}s a seal`);
for (const k of keys) {
  const h = runs.map(r => r.when[k]?.h), d = runs.map(r => r.when[k]?.d), got = h.filter(x => x != null).length;
  console.log(k.padEnd(18), `hours median ${q(h, .5)?.toFixed(1)}  (p10 ${q(h, .1)?.toFixed(1)}, p90 ${q(h, .9)?.toFixed(1)})  days ${q(d, .5)}  reached ${got}/${N}`);
}
for (const H of [1, 5, 10, 20, 40]) {
  const xs = runs.map(r => r.at[H]).filter(Boolean);
  if (xs.length) console.log(`by hour ${H}: coin sales ${q(xs.map(x => x.earned), .5)} marks, ${q(xs.map(x => x.chests), .5)} chests from offers`);
}
const miss = {}; for (const r of runs) for (const k of r.missing) miss[k] = (miss[k] || 0) + 1;
console.log("kinds after 1500h, median", q(runs.map(r => r.kinds), .5), " most often missing:", Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => k + "×" + n).join(" "));
console.log("seals to max, median", q(runs.map(r => r.seals), .5), " chests", q(runs.map(r => r.chests), .5));

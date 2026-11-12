#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
 *  simulate — play the loop a few thousand times and print what it pays
 *  ────────────────────────────────────────────────────────────────────
 *    npm run sim              the full report
 *    npm run sim -- --quick   fewer samples, for iterating on a number
 *
 *  It runs the real rules: shared/sigil.js judges the drawings,
 *  shared/economy.js runs the pot, the chests and the coins, and
 *  lib/coin.js prices them. Only two things are made up, and both are
 *  stated at the top of the report so nobody mistakes them for data:
 *
 *  1. THE DRAWINGS. Nobody has played this yet, so the sigils come from
 *     generators for the things people tend to draw — a tick, a circle,
 *     a star, a heart, a scribble, a face. Each has hand jitter and a
 *     speed profile that slows on corners. They are stand-ins. Re-tune
 *     against real stroke logs as soon as there are any.
 *  2. THE CLOCK. How long a seal, an offering, a chest and a brush take
 *     (TIME below), which turns counts into per-hour figures.
 *
 *  What to look for when changing shared/tuning.js:
 *    · no archetype should be worth much more than the average — if one
 *      is, players will find it and draw nothing else;
 *    · no trait should fire on nearly everything or nearly nothing;
 *    · the first chests should come quickly and later ones slower.
 * ══════════════════════════════════════════════════════════════════════ */

import { analyse, traitsOf, rollScroll, RARITY, TRAITS } from "../shared/sigil.js";
import { SCRIBE, FAVOUR_PER_RARITY, CHESTS, XP, GAMBLE, FORGE, SHINY_VALUE_MUL } from "../shared/tuning.js";
import { offerScroll, rollCoin, levelOf, xpForSeal, xpForOffer, xpForBrush, nextGift, forgeCost, plinkoOdds } from "../shared/economy.js";
import { mkCoin, coinValue } from "../src/lib/coin.js";
import { METALS } from "../src/lib/data.js";

const QUICK = process.argv.includes("--quick");
const N_DRAW = QUICK ? 600 : 3000;         // drawings per archetype
const N_PLAYERS = QUICK ? 60 : 400;        // simulated players
const HOURS = 30;                          // each plays this long

/* seconds per action, including getting to the screen and the animation */
const TIME = { seal: 16, offer: 6.5, open: 6, brush: 10, walk: 3 };

/* ─── randomness ──────────────────────────────────────────────────── */
function rng(seed) {
  let s = seed >>> 0 || 1;
  const f = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  f.range = (a, b) => a + f() * (b - a);
  f.gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += f(); return (u - 3) / Math.sqrt(0.5); };
  return f;
}

/* ─── a hand ──────────────────────────────────────────────────────────
 * Turn an ideal polyline into what a finger would leave: resampled at
 * pointer rate, wobbling a little, slowing into corners. `care` 0..1 is
 * how deliberate this player is being. */
const { w: SW, h: SH } = SCRIBE.sheet;
const clampPt = p => ({ x: Math.max(1, Math.min(SW - 1, p.x)), y: Math.max(1, Math.min(SH - 1, p.y)) });

function hand(path, R, care, t0) {
  const out = [];
  let t = t0, prevDir = null;
  const base = R.range(0.12, 0.34) * (1 - care * 0.45);        // px per ms
  const wobble = R.range(0.3, 1.1) * (1 - care * 0.5);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.01) continue;
    const dir = Math.atan2(b.y - a.y, b.x - a.x);
    const turn = prevDir == null ? 0 : Math.abs(Math.atan2(Math.sin(dir - prevDir), Math.cos(dir - prevDir)));
    prevDir = dir;
    const steps = Math.max(1, Math.round(len / 3.2));
    for (let k = (out.length ? 1 : 0); k <= steps; k++) {
      const u = k / steps;
      // slow out of a corner, quick through the middle of a stroke, never steady
      const cornering = 1 - Math.min(0.75, turn / 2.2) * (1 - u) * (1 - care * 0.6);
      const mid = 0.7 + 0.6 * Math.sin(Math.PI * u) * (1 - care * 0.7);
      const v = Math.max(0.03, base * cornering * mid * (1 + R.gauss() * 0.22 * (1 - care * 0.6)));
      const p = clampPt({ x: a.x + (b.x - a.x) * u + R.gauss() * wobble, y: a.y + (b.y - a.y) * u + R.gauss() * wobble });
      if (out.length) t += Math.max(8, Math.hypot(p.x - out[out.length - 1].x, p.y - out[out.length - 1].y) / v);
      out.push({ x: p.x, y: p.y, t });
    }
  }
  return out;
}
function draw(paths, R, care) {
  let t = 0;
  const strokes = [];
  for (const path of paths) {
    const s = hand(path, R, care, t);
    if (s.length > 1) { strokes.push(s); t = s[s.length - 1].t + R.range(180, 700); }
  }
  return trimToInk(strokes);
}
/* the sheet stops taking ink at inkMax, exactly as the scene does */
function trimToInk(strokes) {
  let ink = 0; const out = [];
  for (const s of strokes) {
    const keep = [s[0]];
    for (let i = 1; i < s.length; i++) {
      const d = Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
      if (ink + d > SCRIBE.inkMax) break;
      ink += d; keep.push(s[i]);
    }
    if (keep.length > 1) out.push(keep);
    if (ink >= SCRIBE.inkMax - 1) break;
  }
  return out;
}

/* ─── things people draw ──────────────────────────────────────────── */
const arc = (cx, cy, rx, ry, a0, a1, n = 28) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + (a1 - a0) * i / n; return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
});
const centre = (R, m = 40) => ({ x: R.range(m, SW - m), y: R.range(m, SH - m) });
const TAU = Math.PI * 2;

const ARCHETYPES = {
  tick(R) { const c = centre(R, 20), l = R.range(4, 16), a = R.range(0, TAU);
    return [[c, { x: c.x + Math.cos(a) * l, y: c.y + Math.sin(a) * l }]]; },
  line(R) { const a = centre(R, 15), b = centre(R, 15); return [[a, b]]; },
  zigzag(R) { const n = (R.range(4, 9)) | 0, y = R.range(50, 160), amp = R.range(10, 36), x0 = R.range(10, 40), dx = R.range(10, 18);
    return [Array.from({ length: n }, (_, i) => ({ x: x0 + i * dx, y: y + (i % 2 ? amp : -amp) }))]; },
  circle: null,   // defined below the table
  spiral(R) { const c = centre(R, 55), turns = R.range(1.6, 3.2), r = R.range(26, 52);
    return [Array.from({ length: 70 }, (_, i) => { const u = i / 69, a = u * turns * TAU; return { x: c.x + Math.cos(a) * r * u, y: c.y + Math.sin(a) * r * u }; })]; },
  star(R) { const c = centre(R, 58), r = R.range(26, 55), rot = R.range(-0.3, 0.3);
    return [Array.from({ length: 6 }, (_, i) => ({ x: c.x + Math.cos(i * 0.8 * Math.PI - Math.PI / 2 + rot) * r, y: c.y + Math.sin(i * 0.8 * Math.PI - Math.PI / 2 + rot) * r }))]; },
  heart(R) { const c = centre(R, 58), s = R.range(1.4, 3.0);
    return [Array.from({ length: 41 }, (_, i) => { const a = i / 40 * TAU;
      return { x: c.x + s * 16 * Math.sin(a) ** 3, y: c.y - s * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) }; })]; },
  scribble(R) { let p = centre(R, 40), a = R.range(0, TAU); const pts = [p];
    for (let i = 0, n = (R.range(25, 90)) | 0; i < n; i++) { a += R.gauss() * 0.9; p = clampPt({ x: p.x + Math.cos(a) * R.range(5, 14), y: p.y + Math.sin(a) * R.range(5, 14) }); pts.push(p); }
    return [pts]; },
  cross(R) { const c = centre(R, 50), l = R.range(18, 48), rot = R.range(-0.4, 0.4);
    return [0, Math.PI / 2].map(a => [{ x: c.x - Math.cos(a + rot) * l, y: c.y - Math.sin(a + rot) * l }, { x: c.x + Math.cos(a + rot) * l, y: c.y + Math.sin(a + rot) * l }]); },
  rune(R) { const c = centre(R, 50), n = (R.range(2, 6)) | 0;        // a few straight strokes
    return Array.from({ length: n }, () => [{ x: c.x + R.range(-30, 30), y: c.y + R.range(-45, 45) }, { x: c.x + R.range(-30, 30), y: c.y + R.range(-45, 45) }]); },
  box(R) { const c = centre(R, 55), w = R.range(20, 50), h = R.range(20, 50); const one = R() < 0.5;
    const pts = [{ x: c.x - w, y: c.y - h }, { x: c.x + w, y: c.y - h }, { x: c.x + w, y: c.y + h }, { x: c.x - w, y: c.y + h }, { x: c.x - w, y: c.y - h }];
    return one ? [pts] : [pts.slice(0, 3), pts.slice(2)]; },
  face(R) { const c = centre(R, 60), r = R.range(28, 54);
    return [arc(c.x, c.y, r, r, 0, TAU), arc(c.x - r * 0.35, c.y - r * 0.25, 2, 2, 0, TAU, 6), arc(c.x + r * 0.35, c.y - r * 0.25, 2, 2, 0, TAU, 6), arc(c.x, c.y + r * 0.15, r * 0.5, r * 0.35, 0.3, Math.PI - 0.3, 10)]; },
  glyph(R) { const cx = SW / 2 + R.range(-20, 20), cy = R.range(70, 140), n = (R.range(2, 5)) | 0, out = [];   // built to be mirrored
    for (let i = 0; i < n; i++) { const a = { x: R.range(4, 44), y: R.range(-50, 50) }, b = { x: R.range(0, 44), y: R.range(-50, 50) };
      out.push([{ x: cx + a.x, y: cy + a.y }, { x: cx + b.x, y: cy + b.y }], [{ x: cx - a.x, y: cy + a.y }, { x: cx - b.x, y: cy + b.y }]); }
    return out; },
  sprawl(R) { const m = R.range(6, 22);                                // fills the page
    return [[{ x: m, y: m }, { x: SW - m, y: SH - m }], [{ x: SW - m, y: m }, { x: m, y: SH - m }]].slice(0, R() < 0.5 ? 2 : 1)
      .concat(R() < 0.5 ? [arc(SW / 2, SH / 2, SW / 2 - m, SH / 2 - m, 0, TAU, 40)] : []); },
  word(R) { const y = R.range(60, 150), n = (R.range(3, 7)) | 0, out = []; let x = R.range(10, 30);    // a few letters
    for (let i = 0; i < n; i++) { const w = R.range(8, 16), h = R.range(14, 26), k = (R() * 4) | 0;
      if (k === 0) out.push(arc(x + w / 2, y, w / 2, h / 2, 0, TAU, 12));
      else if (k === 1) out.push([{ x, y: y + h / 2 }, { x: x + w / 2, y: y - h / 2 }, { x: x + w, y: y + h / 2 }]);
      else if (k === 2) out.push([{ x, y: y - h / 2 }, { x, y: y + h / 2 }], [{ x, y }, { x: x + w, y: y - h / 2 }]);
      else out.push([{ x, y: y - h / 2 }, { x: x + w, y: y - h / 2 }, { x, y: y + h / 2 }, { x: x + w, y: y + h / 2 }]);
      x += w + R.range(3, 8); }
    return out; },
};
ARCHETYPES.circle = R => { const c = centre(R, 55), r = R.range(16, 52), a0 = R.range(0, TAU);
  return [arc(c.x, c.y, r, r * R.range(0.8, 1.2), a0, a0 + TAU + R.range(-0.25, 0.3))]; };

/* How often each turns up, as a guess at what a crowd draws. */
const MIX = { tick: 6, line: 6, zigzag: 6, circle: 11, spiral: 7, star: 9, heart: 8, scribble: 12, cross: 6, rune: 7, box: 5, face: 6, glyph: 3, sprawl: 3, word: 5 };

/* ─── report helpers ──────────────────────────────────────────────── */
const pct = (n, d) => (d ? (100 * n / d).toFixed(1).padStart(5) + "%" : "    -");
const pad = (s, n) => String(s).padEnd(n);
const num = (v, n = 7, d = 1) => v.toFixed(d).padStart(n);
const mean = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const quant = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
const head = t => console.log("\n" + t + "\n" + "─".repeat(t.length));

/* ═══ 1. the drawings ═════════════════════════════════════════════════ */
const R0 = rng(20261112);
const perType = {}, pool = [];
for (const [name, gen] of Object.entries(ARCHETYPES)) {
  const st = { n: 0, traits: {}, rar: [0, 0, 0, 0, 0, 0], favour: 0, bumped: 0, ink: 0, nTraits: 0, fail: 0 };
  for (let i = 0; i < N_DRAW; i++) {
    const strokes = draw(gen(R0), R0, R0() < 0.3 ? R0.range(0.5, 1) : R0.range(0, 0.5));
    const a = analyse(strokes, SCRIBE.sheet);
    if (!a) { st.fail++; continue; }
    const tr = traitsOf(a);
    const r = rollScroll(a, [], (R0() * 4294967296) >>> 0);
    st.n++; st.ink += a.ink; st.nTraits += tr.length; st.rar[r.rarity]++; st.favour += FAVOUR_PER_RARITY[r.rarity];
    if (r.bumped.length) st.bumped++;
    for (const t of tr) st.traits[t] = (st.traits[t] || 0) + 1;
    pool.push({ name, a });
  }
  perType[name] = st;
}
const mixTotal = Object.values(MIX).reduce((a, b) => a + b, 0);
const weightOf = name => MIX[name] / mixTotal;
const crowd = fn => Object.entries(perType).reduce((s, [name, st]) => s + weightOf(name) * fn(st), 0);

console.log("MintForge simulation" + (QUICK ? " (quick)" : ""));
console.log(`${N_DRAW} synthetic drawings per archetype · ${N_PLAYERS} players × ${HOURS}h`);
console.log("Drawings are generated stand-ins, not player data. Timings assumed (s): " + JSON.stringify(TIME));

head("1. Traits: how often each fires, by what was drawn (%)");
const tnames = Object.keys(TRAITS);
console.log(pad("", 10) + tnames.map(t => t.slice(0, 7).padStart(8)).join("") + "   traits/drawing   ink");
for (const [name, st] of Object.entries(perType)) {
  console.log(pad(name, 10) + tnames.map(t => (100 * (st.traits[t] || 0) / st.n).toFixed(0).padStart(8)).join("")
    + num(st.nTraits / st.n, 14, 2) + num(st.ink / st.n, 9, 0));
}
console.log(pad("CROWD", 10) + tnames.map(t => (100 * crowd(st => (st.traits[t] || 0) / st.n)).toFixed(0).padStart(8)).join("")
  + num(crowd(st => st.nTraits / st.n), 14, 2) + num(crowd(st => st.ink / st.n), 9, 0));

head("2. Scroll rarity by what was drawn (%), and what it is worth to him");
console.log(pad("", 10) + RARITY.map(r => r.n.slice(0, 6).padStart(8)).join("") + "   favour/scroll   vs crowd   hinted");
const crowdFavour = crowd(st => st.favour / st.n);
for (const [name, st] of Object.entries(perType)) {
  const f = st.favour / st.n;
  console.log(pad(name, 10) + st.rar.map(v => (100 * v / st.n).toFixed(1).padStart(8)).join("")
    + num(f, 13, 2) + ("×" + (f / crowdFavour).toFixed(2)).padStart(12) + pct(st.bumped, st.n).padStart(10));
}
const crowdRar = RARITY.map((_, i) => crowd(st => st.rar[i] / st.n));
console.log(pad("CROWD", 10) + crowdRar.map(v => (100 * v).toFixed(1).padStart(8)).join("") + num(crowdFavour, 13, 2));
const ratios = Object.values(perType).map(st => st.favour / st.n / crowdFavour);
console.log(`\nbest archetype ×${Math.max(...ratios).toFixed(2)} of the crowd average, worst ×${Math.min(...ratios).toFixed(2)}`);

/* a repeat: the same drawing sealed again and again */
{
  let pen = 0, tot = 0;
  for (let i = 0; i < 400; i++) {
    const { a } = pool[(R0() * pool.length) | 0];
    const first = rollScroll(a, [], (R0() * 2 ** 32) >>> 0), again = rollScroll(a, [first.signature], (R0() * 2 ** 32) >>> 0);
    tot += FAVOUR_PER_RARITY[first.rarity]; pen += FAVOUR_PER_RARITY[again.rarity];
  }
  console.log(`redrawing the same sigil pays ${(100 * pen / tot).toFixed(0)}% of a fresh one`);
}

/* ═══ 2. the loop ═════════════════════════════════════════════════════ */
const names = Object.keys(MIX), cum = []; { let c = 0; for (const n of names) { c += MIX[n]; cum.push(c); } }
const byName = {}; for (const p of pool) (byName[p.name] ||= []).push(p.a);
function someDrawing(R) {
  const r = R() * mixTotal, name = names[cum.findIndex(c => r < c)];
  const list = byName[name]; return list[(R() * list.length) | 0];
}

const agg = {
  scrollsPerChest: [], scrollsPerChestEarly: [], chestTier: [0, 0, 0, 0, 0], metal: Array(9).fill(0), coinRar: [0, 0, 0, 0, 0, 0],
  valueByTier: [[], [], [], [], []], shiny: 0, coins: 0, marks: [], xp: [], level: [], hoursTo: { 2: [], 5: [], 10: [], 15: [], 20: [] }, value: [], gifts: {},
  marksByHour: Array(HOURS).fill(0), chestsByHour: Array(HOURS).fill(0),
};
for (let p = 0; p < N_PLAYERS; p++) {
  const R = rng(1000 + p * 7919);
  let pot = { favour: 0, tier: 0, cost: 0, best: 0, chests: 0 };
  let t = 0, xp = 0, marks = 0, since = 0, brush = 0;
  const stats = { visits: 0, sealed: 0, offered: 0, chests: 0, brushed: 0, gambles: 0 }, given = [], reached = {}, journal = { c: {} };
  const open = tier => {
    const c = rollCoin(tier, brush, R);
    const coin = Object.assign(mkCoin(c.seed, 1, c.metalIdx), { shiny: c.shiny, rarity: c.rarity });
    const v = coinValue(coin);
    t += TIME.open + TIME.brush; xp += XP.open + xpForBrush(c); stats.brushed++;
    journal.c[`${c.metalIdx}:${c.rarity}`] = (journal.c[`${c.metalIdx}:${c.rarity}`] || 0) + 1;
    marks += v; agg.value.push(v); agg.valueByTier[tier].push(v); agg.coins++; agg.metal[c.metalIdx]++; agg.coinRar[c.rarity]++; if (c.shiny) agg.shiny++;
    agg.chestTier[tier]++;
    const h = Math.min(HOURS - 1, Math.floor(t / 3600)); agg.marksByHour[h] += v; agg.chestsByHour[h]++;
  };
  const visit = () => {
    stats.visits++; t += TIME.walk;
    const g = nextGift(stats, levelOf(xp), given, journal);
    if (!g) return;
    given.push(g.id);
    if (!(g.id in agg.gifts)) agg.gifts[g.id] = [];
    agg.gifts[g.id].push(t / 3600);
    if (g.reward.type === "chest") open(g.reward.tier);
    else if (g.reward.type === "brush") brush = Math.max(brush, g.reward.level);
    else if (g.reward.type === "marks") marks += g.reward.n;
  };
  visit();
  while (t < HOURS * 3600) {
    // fill the satchel at the desk, then walk it to the door
    const batch = [];
    for (let i = 0; i < SCRIBE.scrollCap; i++) {
      const r = rollScroll(someDrawing(R), [], (R() * 2 ** 32) >>> 0);
      batch.push(r.rarity); t += TIME.seal; xp += xpForSeal(r.rarity); stats.sealed++;
    }
    visit();
    for (const rarity of batch) {
      const res = offerScroll(pot, rarity, R); pot = res.pot;
      t += TIME.offer; xp += xpForOffer(rarity); stats.offered++; since++;
      if (res.chest != null) {
        (stats.chests < 5 ? agg.scrollsPerChestEarly : agg.scrollsPerChest).push(since); since = 0;
        stats.chests++; open(res.chest);
      }
    }
    const lv = levelOf(xp);
    for (const k of Object.keys(agg.hoursTo)) if (lv >= k && !reached[k]) { reached[k] = 1; agg.hoursTo[k].push(t / 3600); }
  }
  agg.marks.push(marks); agg.xp.push(xp); agg.level.push(levelOf(xp));
}

head("3. The loop");
console.log(`scrolls per chest, first five chests:  mean ${num(mean(agg.scrollsPerChestEarly), 5)}   median ${quant(agg.scrollsPerChestEarly, 0.5)}   90th pct ${quant(agg.scrollsPerChestEarly, 0.9)}`);
console.log(`scrolls per chest, after that:         mean ${num(mean(agg.scrollsPerChest), 5)}   median ${quant(agg.scrollsPerChest, 0.5)}   90th pct ${quant(agg.scrollsPerChest, 0.9)}   worst ${agg.scrollsPerChest.reduce((a, b) => Math.max(a, b), 0)}`);
console.log(`minutes per chest by hour played:      ` + [0, 1, 4, 9, 19, 29].filter(h => h < HOURS).map(h => `h${h + 1}: ${(60 * N_PLAYERS / Math.max(1, agg.chestsByHour[h])).toFixed(1)}`).join("   "));
const chestTot = agg.chestTier.reduce((a, b) => a + b, 0);
console.log("\nchests received:  " + CHESTS.names.map((n, i) => `${n} ${pct(agg.chestTier[i], chestTot).trim()}`).join("   "));
console.log("coin metal:       " + METALS.map((m, i) => `${m.name} ${pct(agg.metal[i], agg.coins).trim()}`).join("  "));
console.log("coin rarity:      " + RARITY.map((r, i) => `${r.n} ${pct(agg.coinRar[i], agg.coins).trim()}`).join("  "));
console.log(`shiny:            ${pct(agg.shiny, agg.coins).trim()} of coins`);

head("4. What it pays");
console.log(`coin value (marks):   mean ${num(mean(agg.value), 7)}   median ${quant(agg.value, 0.5)}   90th pct ${quant(agg.value, 0.9)}   99th pct ${quant(agg.value, 0.99)}   best ${agg.value.reduce((a, b) => Math.max(a, b), 0)}`);
console.log("by chest:             " + CHESTS.names.map((n, i) => `${n} ${mean(agg.valueByTier[i]).toFixed(0)} (costs ${CHESTS.cost[i]}, ${(mean(agg.valueByTier[i]) / CHESTS.cost[i]).toFixed(1)}/favour)`).join("   "));
console.log(`marks per hour:       ` + [0, 1, 4, 9, 19, 29].filter(h => h < HOURS).map(h => `h${h + 1}: ${(agg.marksByHour[h] / N_PLAYERS).toFixed(0)}`).join("   ") + `   overall ${(mean(agg.marks) / HOURS).toFixed(0)}`);
console.log(`after ${HOURS}h:            marks median ${quant(agg.marks, 0.5)} (10th–90th pct ${quant(agg.marks, 0.1)}–${quant(agg.marks, 0.9)})   level median ${quant(agg.level, 0.5)}`);
console.log(`xp per hour:          ${(mean(agg.xp) / HOURS).toFixed(0)}`);
console.log(`hours to reach level: ` + Object.entries(agg.hoursTo).map(([k, v]) => `L${k}: ${v.length ? mean(v).toFixed(1) + "h" : "—"}${v.length && v.length < N_PLAYERS ? ` (${v.length}/${N_PLAYERS})` : ""}`).join("   "));

head("5. Gifts: hours of play before each arrives");
for (const [id, hs] of Object.entries(agg.gifts)) console.log(`${pad(id, 15)} median ${quant(hs, 0.5).toFixed(1).padStart(5)}h   reached by ${pct(hs.length, N_PLAYERS).trim()}`);

head("6. The tavern, per coin staked (expected coins back, and expected tiers gained)");
{
  const tot = GAMBLE.roulette.reduce((s, v) => s + v.weight, 0);
  const back = { lose: 0, same: 1, up1: 1, x2: 2, up2: 1, jackpot: 1 }, tiers = { lose: 0, same: 0, up1: 1, x2: 0, up2: 2, jackpot: 4 };
  console.log(`toss      coins ×${GAMBLE.toss.win.toFixed(2)}   tiers +${GAMBLE.toss.win.toFixed(2)}`);
  console.log(`crucible  coins ×${(GAMBLE.crucible.win + (1 - GAMBLE.crucible.win) / 3).toFixed(2)}   tiers +${GAMBLE.crucible.win.toFixed(2)}`);
  console.log(`roulette  coins ×${GAMBLE.roulette.reduce((s, v) => s + v.weight * back[v.outcome], 0) / tot}   tiers +${(GAMBLE.roulette.reduce((s, v) => s + v.weight * tiers[v.outcome], 0) / tot).toFixed(2)} (jackpot counted as +4)`);
  const po = plinkoOdds(), pc = GAMBLE.plinko.slots.reduce((t, o, k) => t + po[k] * back[o], 0), pt = GAMBLE.plinko.slots.reduce((t, o, k) => t + po[k] * tiers[o], 0);
  console.log(`plinko    coins ×${pc.toFixed(2)}   tiers +${pt.toFixed(2)}`);
}
head("7. The forge: what a shine costs, and how long that takes to earn");
{
  const perHour = mean(agg.marks) / HOURS, tries = 1 / FORGE.shinyChance;
  console.log(`a strike is ${Math.round(FORGE.shinyChance * 100)}% to shine, so ${tries.toFixed(1)} strikes on average; income is ${perHour.toFixed(0)} marks an hour`);
  for (const [label, v] of [["a median coin", quant(agg.value, 0.5)], ["a 90th-percentile coin", quant(agg.value, 0.9)], ["a 99th-percentile coin", quant(agg.value, 0.99)]]) {
    const c = forgeCost(v), total = c * tries;
    console.log(`${pad(label, 24)} worth ${String(v).padStart(6)}   strike ${String(c).padStart(6)}   a shine ≈ ${total.toFixed(0).padStart(7)} marks ≈ ${(total / perHour).toFixed(1)}h of play   (it then sells for ${v * SHINY_VALUE_MUL})`);
  }
  console.log("inkwells:                " + SCRIBE.wells.slice(1).map(w => `${w.name} ${w.ink} ink for ${w.cost} ≈ ${(w.cost / perHour).toFixed(1)}h`).join("   "));
  const edge = FORGE.costMul - FORGE.shinyChance * (SHINY_VALUE_MUL - 1);
  console.log(`marks destroyed per strike, net of the shine's resale: ${(edge * 100).toFixed(0)}% of the coin's value (must stay above 0)`);
}
console.log("");

/* What the goblin sees in a drawing. These pin the MEANING of each trait
 * — a circle is closed, a tick is not — rather than its exact threshold,
 * so re-tuning shared/tuning.js should not break them unless it changes
 * what a trait is. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyse, traitsOf, rollScroll, similarity, TRAITS, RARITY } from "../shared/sigil.js";
import { SCRIBE, SIGIL } from "../shared/tuning.js";
import { seeded } from "./d1.js";

const SHEET = SCRIBE.sheet;
/* a polyline drawn at a steady pace (px per ms) */
function stroke(pts, pace = 0.2, t0 = 0) {
  const out = []; let t = t0;
  for (let i = 0; i < pts.length; i++) {
    if (i) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
      for (let k = 1; k <= n; k++) {
        const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n, last = out[out.length - 1];
        t += Math.hypot(x - last.x, y - last.y) / pace; out.push({ x, y, t });
      }
    } else out.push({ x: pts[0][0], y: pts[0][1], t });
  }
  return out;
}
const ring = (cx, cy, r, n = 40, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(i / n * a1) * r, cy + Math.sin(i / n * a1) * r]);
const traits = (strokes) => traitsOf(analyse(strokes, SHEET));

test("too little to judge is refused", () => {
  assert.equal(analyse([[{ x: 1, y: 1, t: 0 }]], SHEET), null);
  assert.equal(analyse([], SHEET), null);
});

test("a circle is closed and symmetric; an open arc is neither closed nor woven", () => {
  const c = traits([stroke(ring(78, 100, 40))]);
  assert.ok(c.includes("closed") && c.includes("symmetric"), c.join());
  const arc = traits([stroke(ring(78, 100, 40, 30, Math.PI * 1.2))]);
  assert.ok(!arc.includes("closed") && !arc.includes("woven"), arc.join());
});

test("a tick has no traits at all", () => {
  assert.deepEqual(traits([stroke([[60, 60], [68, 66]])]), []);
});

test("one long unbroken stroke is continuous; the same path lifted in the middle is not", () => {
  const zig = Array.from({ length: 12 }, (_, i) => [20 + i * 10, i % 2 ? 60 : 110]);
  assert.ok(traits([stroke(zig)]).includes("continuous"));
  assert.ok(!traits([stroke(zig.slice(0, 6)), stroke(zig.slice(5), 0.2, 9000)]).includes("continuous"));
  assert.ok(!traits([stroke([[20, 20], [80, 20]])]).includes("continuous"), "a short stroke is not enough");
});

test("a knot of crossings is woven; a spiral that never crosses itself is not", () => {
  const knot = [];
  for (let i = 0; i < 8; i++) knot.push([40 + (i % 2 ? 80 : 0), 40 + i * 10], [40 + (i % 2 ? 0 : 80), 110 - i * 10]);
  assert.ok(traits([stroke(knot)]).includes("woven"));
  const spiral = Array.from({ length: 80 }, (_, i) => [78 + Math.cos(i / 8) * i * 0.5, 100 + Math.sin(i / 8) * i * 0.5]);
  assert.ok(!traits([stroke(spiral)]).includes("woven"));
});

test("a single bold line across the page is sparse; a filled-in scrawl is not", () => {
  assert.ok(traits([stroke([[20, 30], [130, 170]])]).includes("sparse"));
  const hatch = Array.from({ length: 16 }, (_, i) => stroke([[40, 40 + i * 5], [110, 40 + i * 5]], 0.2, i * 2000));
  assert.ok(!traits(hatch).includes("sparse"));
});

test("a patient hand is deliberate; the same shape dashed off is not", () => {
  assert.ok(traits([stroke(ring(78, 100, 40), 0.04)]).includes("deliberate"));
  assert.ok(!traits([stroke(ring(78, 100, 40), 0.4)]).includes("deliberate"));
});

test("a drawing that covers the sheet is vast", () => {
  assert.ok(traits([stroke([[8, 8], [147, 204]])]).includes("vast"));
  assert.ok(!traits([stroke(ring(78, 100, 20))]).includes("vast"));
});

test("every trait has a hint line and no hint states a rule in numbers", () => {
  for (const [k, t] of Object.entries(TRAITS)) {
    assert.ok(t.hint && t.hint === t.hint.toUpperCase(), k);
    assert.ok(!/\d/.test(t.hint), `${k} hint contains a number`);
  }
  assert.deepEqual(Object.keys(TRAITS).sort(), ["closed", "continuous", "deliberate", "sparse", "symmetric", "vast", "woven"]);
});

test("the roll is fixed by the drawing and the salt, and the salt changes it", () => {
  const a = analyse([stroke(ring(78, 100, 40))], SHEET);
  assert.deepEqual(rollScroll(a, [], 12345), rollScroll(a, [], 12345));
  const seeds = new Set(Array.from({ length: 50 }, (_, i) => rollScroll(a, [], i * 7919 + 1).seed));
  assert.equal(seeds.size, 50);
  const rar = new Set(Array.from({ length: 400 }, (_, i) => rollScroll(a, [], i * 7919 + 1).rarity));
  assert.ok(rar.size >= 3, "the same drawing does not always come out the same tier");
});

test("only traits the drawing has can lift it, never more than the cap, and never a repeat", () => {
  const a = analyse([stroke(ring(78, 100, 40))], SHEET), has = traitsOf(a);
  for (let i = 1; i < 500; i++) {
    const r = rollScroll(a, [], i * 104729);
    assert.ok(r.bumped.every(t => has.includes(t)));
    assert.ok(r.bumped.length <= SIGIL.maxBumps);
    assert.ok(r.rarity >= 0 && r.rarity < RARITY.length);
    const again = rollScroll(a, [r.signature], i * 104729);
    assert.equal(again.familiar, true);
    assert.deepEqual(again.bumped, []);
    assert.equal(again.rarity, Math.max(0, r.rarity - SIGIL.familiarPenalty));
  }
});

test("a different drawing is not mistaken for a repeat", () => {
  const circle = analyse([stroke(ring(78, 100, 40))], SHEET);
  const zig = analyse([stroke(Array.from({ length: 12 }, (_, i) => [20 + i * 10, i % 2 ? 60 : 110]))], SHEET);
  assert.ok(similarity(circle.signature, zig.signature) < SIGIL.familiar);
  assert.equal(rollScroll(zig, [circle.signature], 5).familiar, false);
  // …but the same circle drawn a little off-centre and a little smaller is
  const circle2 = analyse([stroke(ring(70, 120, 34))], SHEET);
  assert.equal(rollScroll(circle2, [circle.signature], 5).familiar, true);
});

test("faint marks mostly come to nothing; real drawings follow the baseline", () => {
  const tick = analyse([stroke([[60, 60], [68, 66]])], SHEET), full = analyse([stroke(ring(78, 100, 40))], SHEET);
  const R = seeded(42), N = 4000;
  let tickCommon = 0, fullCommon = 0;
  for (let i = 0; i < N; i++) {
    if (rollScroll(tick, [], (R() * 2 ** 32) >>> 0).rarity === 0) tickCommon++;
    if (rollScroll(full, [], (R() * 2 ** 32) >>> 0).rarity === 0) fullCommon++;
  }
  const base = SIGIL.baseline[0] / SIGIL.baseline.reduce((a, b) => a + b, 0);
  assert.ok(tickCommon / N > base + 0.15, `tick common ${tickCommon / N}`);
  assert.ok(fullCommon / N < base, `circle common ${fullCommon / N}`);
});

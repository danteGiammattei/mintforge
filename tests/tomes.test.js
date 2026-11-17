import { test } from "node:test";
import assert from "node:assert/strict";
import { TOMES, TOME_BY_ID, tomeFromChest, pageOf, cravedPage } from "../shared/tomes.js";
import { likeness, rollScroll, analyse } from "../shared/sigil.js";
import { SCRIBE, CHESTS, SIGIL } from "../shared/tuning.js";
import { seeded } from "./d1.js";
import { world, driver } from "./helpers.js";

/* a page as a player might copy it: at sheet size, with a shaky hand */
function copy(page, shake, seed = 1, at = { x: 20, y: 30, k: 115 }) {
  const r = seeded(seed);
  let t = 0;
  return page.strokes.map(s => {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const [a, b] = [s[Math.max(0, i - 1)], s[i]];
      const n = i ? Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 30)) : 1;
      for (let k = 1; k <= n; k++) {
        const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n;
        out.push({ x: at.x + (x + (r() - 0.5) * shake) * at.k, y: at.y + (y + (r() - 0.5) * shake) * at.k, t: (t += 40) });
      }
    }
    return out;
  });
}

test("every page is drawable: inside its square, ids unique, tiers 1–5", () => {
  const ids = new Set();
  for (const t of TOMES) {
    assert.ok(!ids.has(t.id)); ids.add(t.id);
    const pids = new Set(t.pages.map(p => p.id)); assert.equal(pids.size, t.pages.length);
    for (const p of t.pages) {
      assert.ok(p.tier >= 1 && p.tier <= 5, p.id);
      for (const s of p.strokes) { assert.ok(s.length >= 2, p.id); for (const [x, y] of s) assert.ok(x >= -0.01 && x <= 1.01 && y >= -0.01 && y <= 1.01, `${p.id} ${x},${y}`); }
    }
  }
});

test("likeness: a close copy scores high, a shaky one lower, the wrong page or a scribble low", () => {
  for (const t of TOMES) for (const p of t.pages) {
    const good = likeness(copy(p, 0.02), p), shaky = likeness(copy(p, 0.08), p);
    assert.ok(good >= SIGIL.copy.close, `${p.id} good ${good}`);
    assert.ok(shaky < good, `${p.id} shaky ${shaky} < ${good}`);
  }
  const eye = TOME_BY_ID.primer.pages[0], tide = TOME_BY_ID.primer.pages[3];
  assert.ok(likeness(copy(tide, 0.02), eye) < SIGIL.copy.fair, "iron is not salt");
  // size and place on the sheet do not matter
  const small = likeness(copy(eye, 0.02, 1, { x: 60, y: 90, k: 50 }), eye);
  assert.ok(small >= SIGIL.copy.close, `small ${small}`);
});

test("the roll: a copy lifts by its likeness, held to the page's tier; a poor one is nothing", () => {
  const star = TOME_BY_ID.primer.pages.find(p => p.id === "mercury");        // tier 2
  const a = analyse(copy(star, 0.02), SCRIBE.sheet);
  const tops = new Set();
  for (let salt = 0; salt < 200; salt++) {
    const r = rollScroll(a, [], salt, { page: star, likeness: 0.95, maxMs: Infinity });
    assert.ok(r.rarity <= star.tier); tops.add(r.rarity);
    assert.equal(r.familiar, false);
    // only the copy, care and the craving lift a copy, never its plain traits
    assert.ok(r.steps.every(st => ["fair", "close", "true", "care", "crave"].includes(st.why)), JSON.stringify(r.steps));
  }
  assert.ok(tops.has(2), "a true copy of a tier 2 page reaches rare");
  for (let salt = 0; salt < 50; salt++) assert.equal(rollScroll(a, [], salt, { page: star, likeness: 0.1 }).rarity, 0);
});

test("chests: tomes no rarer than the chest, never one you have, never from wood", () => {
  const r = seeded(9), always = [1, 1, 1, 1, 1];
  for (let i = 0; i < 300; i++) {
    const tier = i % 5, id = tomeFromChest(tier, ["primer"], always, r);
    if (tier === 0) assert.equal(id, null);
    else { assert.ok(id); assert.ok(TOME_BY_ID[id].tier <= tier); }
  }
  assert.equal(tomeFromChest(4, TOMES.map(t => t.id), always, r), null);
  assert.equal(tomeFromChest(4, ["primer"], CHESTS.tomeChance.map(() => 0), r), null);
  assert.equal(pageOf("hedge", "copper", ["primer"]), null);
});

test("a chest's tome is kept, once, and the seal can use it", async () => {
  const { db, pid } = await world();
  CHESTS.tomeChance.splice(0, 5, 1, 1, 1, 1, 1);
  try {
    const go = driver(db, pid, seeded(4));
    db.raw.prepare(`INSERT INTO chests (id, player_id, tier, created_at) VALUES ('ch_a', ?, 1, 1), ('ch_b', ?, 1, 2)`).run(pid, pid);
    const one = (await go("open", { chestId: "ch_a" }));
    assert.equal(one.result.tome, "hedge");
    assert.deepEqual(one.state.tomes, ["primer", "hedge"]);
    const two = (await go("open", { chestId: "ch_b" }));
    assert.equal(two.result.tome, undefined, "an iron chest has nothing left to give");
    assert.deepEqual(two.state.tomes, ["primer", "hedge"]);
    const sun = TOME_BY_ID.hedge.pages[0];
    const s = await go("seal", { tome: "hedge", page: "copper", strokes: copy(sun, 0.02).map(st => st.slice(0, 40)) });
    assert.ok(s.result.likeness > 0);
  } finally { CHESTS.tomeChance.splice(0, 5, 0, 0.06, 0.1, 0.16, 0.25); }
});

test("what he wants: a page of your own tomes, the same all day, not the same for everyone", () => {
  const owned = ["primer", TOMES.find(t => t.tier > 0).id];
  for (let d = 20000; d < 20060; d++) {
    const w = cravedPage(d, "p1", owned);
    assert.ok(pageOf(w.tome, w.page, owned), JSON.stringify(w));
    assert.deepEqual(cravedPage(d, "p1", owned), w);
  }
  const days = Array.from({ length: 30 }, (_, d) => d + 20000);
  assert.ok(days.some(d => cravedPage(d, "p1", owned).page !== cravedPage(d, "p2", owned).page), "players differ");
  assert.ok(new Set(days.map(d => cravedPage(d, "p1", ["primer"]).page)).size > 3, "it moves day to day");
});

test("a fair copy of the page he wants lifts; a poor one does not", () => {
  const star = TOME_BY_ID.primer.pages.find(p => p.id === "mercury");
  const a = analyse(copy(star, 0.02), SCRIBE.sheet);
  let lifted = 0;
  for (let salt = 0; salt < 200; salt++) {
    const r = rollScroll(a, [], salt, { page: star, likeness: SIGIL.copy.fair, maxMs: Infinity, craved: true });
    if (r.steps.some(st => st.why === "crave")) lifted++;
    else assert.ok(r.base >= star.tier || r.steps.length && r.steps.at(-1).to >= star.tier, "only the cap stops it");
    const plain = rollScroll(a, [], salt, { page: star, likeness: SIGIL.copy.fair, maxMs: Infinity });
    assert.ok(r.rarity >= plain.rarity);
  }
  assert.ok(lifted > 100);
  const poor = rollScroll(a, [], 1, { page: star, likeness: SIGIL.copy.fair - 0.01, maxMs: Infinity, craved: true });
  assert.ok(!poor.steps.some(st => st.why === "crave"));
});

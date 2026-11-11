/* The coin generator is frozen. These faces were produced by the
 * generator on `main` before the rebuild started (commit de25123); if
 * this test fails, a change has altered what a seed looks like, and the
 * change is what is wrong. Do not regenerate the fixture. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { genFace, mkCoin } from "../src/lib/coin.js";

const golden = JSON.parse(readFileSync(new URL("./coin.golden.json", import.meta.url), "utf8"));

test("genFace output is unchanged for pinned seeds", () => {
  for (const [seed, g] of Object.entries(golden)) {
    const face = genFace(Number(seed));
    assert.equal(face.length, 13);
    assert.ok(face.every(r => r.length === 13), "grid must stay 13×13");
    assert.equal(face.map(r => r.join("")).join("/"), g.face, `face for seed ${seed}`);
  }
});

test("faces are mirrored left to right", () => {
  for (const seed of Object.keys(golden)) {
    for (const row of genFace(Number(seed))) assert.deepEqual([...row].reverse(), row);
  }
});

test("mkCoin derives the same name, shape, condition and lore", () => {
  for (const [seed, g] of Object.entries(golden)) {
    const c = mkCoin(Number(seed), 1, 3);
    assert.deepEqual({ raw: c.raw, shape: c.shape, cond: c.cond, era: c.era, wt: c.wt, dia: c.dia },
                     { raw: g.raw, shape: g.shape, cond: g.cond, era: g.era, wt: g.wt, dia: g.dia }, `coin ${seed}`);
  }
});

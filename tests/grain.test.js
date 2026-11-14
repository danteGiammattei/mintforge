/* Every metal's look names a texture that exists: a missing one blanked
 * every screen that drew that metal (the void's, lost in 4a467a6). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { coinRamp, mkCoin, GRAIN_NAMES } from "../src/lib/coin.js";
import { METALS } from "../src/lib/data.js";

test("every metal's texture exists", () => {
  METALS.forEach((m, i) => {
    const { tex } = coinRamp({ ...mkCoin(7, 1, i), metalIdx: i });
    assert.ok(!tex || GRAIN_NAMES.includes(tex), `${m.name}: texture "${tex}" is missing`);
  });
});

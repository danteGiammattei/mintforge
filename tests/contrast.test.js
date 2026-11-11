/* Text must clear 4.5:1 against the ground it sits on (WCAG 2.1 AA).
 * These are the pairs the game actually uses: the CSS tokens on every
 * surface they appear on, and the canvas chrome colours on the darkest
 * and lightest ground each scene puts behind them. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const kit = readFileSync(new URL("../src/scenes/kit.js", import.meta.url), "utf8");
const token = name => { const m = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(css); assert.ok(m, `--${name}`); return m[1]; };
const ink = name => { const m = new RegExp(`${name}:\\s*"(#[0-9a-f]{6})"`, "i").exec(kit); assert.ok(m, `INK.${name}`); return m[1]; };

const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const clears = (fg, bg, what) => assert.ok(ratio(fg, bg) >= 4.5, `${what}: ${fg} on ${bg} is ${ratio(fg, bg).toFixed(2)}:1`);

test("HTML text tokens clear 4.5:1 on every surface", () => {
  const grounds = ["void", "stone-0", "stone-1", "stone-2", "stone-3"].map(token);
  for (const fg of ["bone", "bone-dim", "candle", "magic", "blood"]) for (const bg of grounds) clears(token(fg), bg, `--${fg}`);
  clears(token("candle"), token("candle-lo"), "gold button");
  clears(token("magic"), token("magic-lo"), "magic button");
  clears(token("blood"), token("blood-lo"), "danger button");
  clears(token("void"), token("candle"), "badge");
});

test("canvas chrome clears 4.5:1 on its scene", () => {
  for (const [name, grounds] of Object.entries({
    cold:   ["#050609", "#0b0d12"],            // door wall, drawer panel
    coldHi: ["#050609", "#0b0d12"],
    warm:   ["#080705", "#15110c", "#2a2114"], // desk dark, button, the brightest of the candle pool
    warmHi: ["#080705", "#15110c", "#2a2114"],
    warn:   ["#080705", "#2a2114"],
  })) for (const bg of grounds) clears(ink(name), bg, `INK.${name}`);
});

test("rarity colours clear 4.5:1 on the panels they label", () => {
  for (const c of ["#8a8372", "#7ad888", "#80c0ff", "#c080ff", "#f0c850", "#ff7060", "#9a8868"])
    for (const bg of ["#050403", token("stone-1"), token("stone-0")]) clears(c, bg, "rarity");
});

#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
 *  seal-report — what real players' drawings look like to the judge
 *  ────────────────────────────────────────────────────────────────────
 *    node tools/seal-report.mjs            the local database
 *    node tools/seal-report.mjs --remote   production
 *    node tools/seal-report.mjs --remote --days 7
 *
 *  Reads seal_log (one row per sealed scroll: the measures the sigil
 *  judge took and what it decided — never the drawing) and prints:
 *    · how often each trait fires on real drawings, under the thresholds
 *      in shared/tuning.js as they stand now
 *    · the rarity spread players actually got
 *    · for each trait, the spread of the measure it reads, and the
 *      threshold that would make it fire on ~15% of drawings
 *  Change a threshold in tuning.js and run it again: it re-judges the
 *  logged drawings without needing anyone to draw them again.
 * ══════════════════════════════════════════════════════════════════════ */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { SIGIL } from "../shared/tuning.js";
import { RARITY } from "../shared/sigil.js";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const days = Number(args[args.indexOf("--days") + 1]) || 0;
const TARGET = 0.15;

const wrangler = join(dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin", "wrangler.js");
const since = days ? Date.now() - days * 86400e3 : 0;
const out = execFileSync(process.execPath, [wrangler, "d1", "execute", "mintforge", remote ? "--remote" : "--local", "--json",
  "--command", `SELECT player_id, rarity, traits, bumped, familiar, well_level, m FROM seal_log WHERE created_at >= ${since}`],
  { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"], maxBuffer: 256 * 1024 * 1024 });
const rows = JSON.parse(out)[0].results.map(r => ({ ...r, m: JSON.parse(r.m) }));
if (!rows.length) { console.log("No seals logged yet."); process.exit(0); }

const T = SIGIL.thresholds;
/* the same tests as traitsOf in shared/sigil.js, on the logged measures */
const TESTS = {
  symmetric:  m => m.cells >= T.symmetricMinCells && m.symmetry > T.symmetric,
  closed:     m => m.enclosed > T.closed,
  continuous: m => m.strokes === 1 && m.ink >= T.continuousInk,
  woven:      m => m.crossings >= T.woven,
  sparse:     m => m.span > T.sparseSpan && m.filled < T.sparse,
  deliberate: m => m.ink >= T.deliberateInk && m.pace > 0 && m.pace < T.deliberate,
  vast:       m => m.span > T.vast,
};
/* which measure each threshold reads, and which way "more" fires it */
const KNOB = {
  symmetric: ["symmetry", "above", "symmetric"], closed: ["enclosed", "above", "closed"],
  continuous: ["ink", "above", "continuousInk"], woven: ["crossings", "above", "woven"],
  sparse: ["filled", "below", "sparse"], deliberate: ["pace", "below", "deliberate"], vast: ["span", "above", "vast"],
};
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const pct = (n, d) => (100 * n / d).toFixed(1).padStart(5) + "%";
const players = new Set(rows.map(r => r.player_id)).size;

console.log(`${rows.length} seals from ${players} player${players === 1 ? "" : "s"}${days ? ` in the last ${days} days` : ""} (${remote ? "production" : "local"})\n`);

console.log("Rarity players got");
RARITY.forEach((r, i) => { const n = rows.filter(x => x.rarity === i).length; console.log(`  ${r.n.padEnd(10)} ${pct(n, rows.length)}  ${"#".repeat(Math.round(40 * n / rows.length))}`); });
console.log(`  repeats   ${pct(rows.filter(r => r.familiar).length, rows.length)}  (drawn again too close to a recent one)\n`);

console.log("Traits on real drawings          now   logged   lifted a scroll");
for (const [t, test] of Object.entries(TESTS)) {
  const now = rows.filter(r => test(r.m)).length;
  const then = rows.filter(r => r.traits.split(",").includes(t)).length;
  const lift = rows.filter(r => r.bumped.split(",").includes(t)).length;
  const flag = now / rows.length > 0.4 ? "  ← fires on most drawings" : now / rows.length < 0.03 ? "  ← almost never fires" : "";
  console.log(`  ${t.padEnd(30)} ${pct(now, rows.length)}  ${pct(then, rows.length)}  ${pct(lift, rows.length)}${flag}`);
}

console.log(`\nWhat each trait reads, and a threshold that would fire it on ~${TARGET * 100}% of drawings`);
for (const [t, [key, dir, knob]] of Object.entries(KNOB)) {
  const xs = rows.map(r => r.m[key]).filter(Number.isFinite);
  const suggest = dir === "above" ? q(xs, 1 - TARGET) : q(xs, TARGET);
  const fmt = v => (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(3));
  console.log(`  ${t.padEnd(11)} ${key.padEnd(10)} 10%=${fmt(q(xs, .1)).padStart(7)}  50%=${fmt(q(xs, .5)).padStart(7)}  90%=${fmt(q(xs, .9)).padStart(7)}   now ${fmt(T[knob]).padStart(7)} → try ${fmt(suggest)}`);
}
console.log("\n(Most traits have a second condition too; see SIGIL.thresholds in shared/tuning.js.)");

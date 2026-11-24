#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
 *  gifts — put the Long Night's presents where the game looks for them
 *  ────────────────────────────────────────────────────────────────────
 *    node tools/gifts.mjs "C:\Users\you\Downloads\PixelLootGiftboxes.rar"
 *    node tools/gifts.mjs path/to/the/unpacked/GiftsPixelAnimationPack
 *
 *  The event's presents (shared/events.js) use a dozen of the animated gift
 *  boxes from cofe-man's Gifts Pixel Animation Pack (cofe-man.itch.io),
 *  each present showing one of them at random.
 *  It is someone else's art, so it is kept out of this public repo, in
 *  public/sprites/gifts/, which git ignores: run this once on the machine
 *  you build and deploy from and the build carries them to the site.
 *  Without them the game draws presents of its own (lib/presentArt.js).
 *
 *  One strip per design, gift0.png to gift11.png, 10 frames of 48×40:
 *  closed, a squash, a stretch, the lid off, the sides falling open.
 * ══════════════════════════════════════════════════════════════════════ */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// the designs: the pack's colour folder and row, in Christmas colours
const PICK = [
  ["red", 3], ["green", 1], ["red", 19], ["blue", 51], ["yellow", 1], ["red", 10],
  ["green", 11], ["green", 20], ["beige", 46], ["blue", 33], ["red", 28], ["green", 38],
];

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error("usage: node tools/gifts.mjs <PixelLootGiftboxes.rar or its unpacked folder>");
  process.exit(1);
}

let dir = src;
if (statSync(src).isFile()) {
  dir = mkdtempSync(join(tmpdir(), "mintforge-gifts-"));
  // Windows 10+ and macOS tar (bsdtar) read most rars; then unrar, then 7-Zip
  const ways = [["tar", ["-xf", src, "-C", dir]], ["unrar", ["x", "-o+", src, dir + "/"]], ["7z", ["x", "-y", `-o${dir}`, src]]];
  if (!ways.some(([cmd, args]) => { try { execFileSync(cmd, args, { stdio: "ignore" }); return true; } catch { return false; } })) {
    console.error("Could not unpack it here. Unpack it yourself (right-click > Extract All) and pass the folder instead.");
    process.exit(1);
  }
}

// find the pack's Ready_Gifts folder wherever it was unpacked to
function find(d, depth = 0) {
  if (depth > 4) return null;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("Ready_Gifts")) return join(d, e.name);
    const f = find(join(d, e.name), depth + 1);
    if (f) return f;
  }
  return null;
}
const ready = find(dir);
if (!ready) { console.error("No Ready_Gifts folder in there. Is this the Gifts Pixel Animation Pack?"); process.exit(1); }

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sprites", "gifts");
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (/^(tier|gift)\d+\.png$/.test(f)) rmSync(join(out, f));   // last run's
PICK.forEach(([colour, row], i) => {
  const from = join(ready, `boxs_${colour}`, `gifts_${colour}${row}.png`);
  if (!existsSync(from)) { console.error("Missing", from); process.exit(1); }
  copyFileSync(from, join(out, `gift${i}.png`));
});
console.log(`Presents in place: ${out} (gift0.png to gift${PICK.length - 1}.png). Rebuild, and the event uses them.`);

#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
 *  gifts — put the Long Night's presents where the game looks for them
 *  ────────────────────────────────────────────────────────────────────
 *    node tools/gifts.mjs "C:\Users\you\Downloads\PixelLootGiftboxes.rar"
 *    node tools/gifts.mjs path/to/the/unpacked/GiftsPixelAnimationPack
 *
 *  The event's presents (shared/events.js) use five of the animated gift
 *  boxes from cofe-man's Gifts Pixel Animation Pack (cofe-man.itch.io).
 *  It is someone else's art, so it is kept out of this public repo, in
 *  public/sprites/gifts/, which git ignores: run this once on the machine
 *  you build and deploy from and the build carries them to the site.
 *  Without them the game draws presents of its own (lib/presentArt.js).
 *
 *  One strip per chest tier, 10 frames of 48×40: closed, a squash, a
 *  stretch, the lid off, the sides falling open.
 * ══════════════════════════════════════════════════════════════════════ */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// by chest tier: the pack's colour folder and row
const PICK = [
  ["red", 3],       // 0  red, gold ribbon
  ["green", 1],     // 1  green, red ribbon
  ["red", 19],      // 2  red and white stripes
  ["blue", 51],     // 3  blue, white stars
  ["yellow", 1],    // 4  gold, red ribbon
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
PICK.forEach(([colour, row], tier) => {
  const from = join(ready, `boxs_${colour}`, `gifts_${colour}${row}.png`);
  if (!existsSync(from)) { console.error("Missing", from); process.exit(1); }
  copyFileSync(from, join(out, `tier${tier}.png`));
});
console.log(`Presents in place: ${out} (tier0.png to tier4.png). Rebuild, and the event uses them.`);

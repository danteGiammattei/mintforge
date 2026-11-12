#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
 *  cards — put the playing-card art where the game looks for it
 *  ────────────────────────────────────────────────────────────────────
 *    node tools/cards.mjs "C:\Users\you\Downloads\Jorels_Card_Pack.zip"
 *    node tools/cards.mjs path/to/the/unzipped/folder
 *
 *  War at the tavern uses Jorel's Card Pack (games-by-jorel.itch.io).
 *  Its licence lets the game use the cards but not redistribute them, and
 *  this repo is public, so the art lives in public/sprites/cards/, which
 *  git ignores. Run this once on the machine you build and deploy from;
 *  the build then carries the cards to the site. Without them the game
 *  falls back to plain pixel cards of its own.
 * ══════════════════════════════════════════════════════════════════════ */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('usage: node tools/cards.mjs <Jorels_Card_Pack.zip or its folder>');
  process.exit(1);
}

let dir = src;
if (statSync(src).isFile()) {
  dir = mkdtempSync(join(tmpdir(), "mintforge-cards-"));
  // Windows 10+ and macOS tar read zips; elsewhere try unzip, then PowerShell
  const ways = [
    ["tar", ["-xf", src, "-C", dir]],
    ["unzip", ["-oq", src, "-d", dir]],
    ["powershell", ["-NoProfile", "-Command", `Expand-Archive -Force -LiteralPath '${src.replace(/'/g, "''")}' -DestinationPath '${dir}'`]],
  ];
  if (!ways.some(([cmd, args]) => { try { execFileSync(cmd, args, { stdio: "ignore" }); return true; } catch { return false; } })) {
    console.error("Could not unzip it here. Unzip it yourself and pass the folder instead.");
    process.exit(1);
  }
}

// find the pack's files wherever they sit inside the folder
const files = new Map();
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.set(basename(p).toLowerCase(), p); } };
walk(dir);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sprites", "cards");
mkdirSync(out, { recursive: true });
const want = ["card_back.png"];
for (const suit of ["spade", "heart", "diamond", "club"]) for (let r = 1; r <= 13; r++) want.push(`${suit}_${String(r).padStart(4, "0")}.png`);
const missing = want.filter(f => !files.has(f));
if (missing.length) { console.error(`That does not look like Jorel's Card Pack: missing ${missing.slice(0, 3).join(", ")}…`); process.exit(1); }
for (const f of want) copyFileSync(files.get(f), join(out, f));
console.log(`Copied ${want.length} cards into public/sprites/cards/. Build and deploy as usual.`);

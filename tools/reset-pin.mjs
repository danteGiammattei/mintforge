#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
 *  reset-pin — give a player a new PIN
 *  ────────────────────────────────────────────────────────────────────
 *    node tools/reset-pin.mjs <username> <new-pin>            local D1
 *    node tools/reset-pin.mjs <username> <new-pin> --remote   production
 *
 *  Hashes the PIN exactly as the server does (server/auth.js), writes it,
 *  signs the player out everywhere and clears any lockout on the name.
 *  Their coins, scrolls and everything else are untouched.
 *
 *  Tell the player their new PIN some way other than in the game.
 * ══════════════════════════════════════════════════════════════════════ */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { hashPin, validateUsername, validatePin } from "../server/auth.js";
import { randomHex } from "../server/http.js";
import { AUTH } from "../shared/tuning.js";

const [rawName, pin, ...flags] = process.argv.slice(2);
const remote = flags.includes("--remote");
const username = validateUsername(rawName || "");
if (!username || !validatePin(pin || "")) {
  console.error("usage: node tools/reset-pin.mjs <username> <4-6 digit pin> [--remote]");
  process.exit(1);
}

const salt = randomHex(16);
const hash = await hashPin(pin, salt, AUTH.pbkdf2Iterations);
const who = `(SELECT id FROM players WHERE username = '${username}' COLLATE NOCASE)`;
const sql = [
  `UPDATE players SET password_hash = '${hash}', password_salt = '${salt}', pin_iter = ${AUTH.pbkdf2Iterations} WHERE username = '${username}' COLLATE NOCASE`,
  `DELETE FROM sessions WHERE player_id = ${who}`,
  `DELETE FROM login_attempts WHERE key = 'u:${username.toLowerCase()}'`,
  `SELECT username, pin_iter FROM players WHERE username = '${username}' COLLATE NOCASE`,
].join("; ") + ";";

console.log(`Resetting the PIN for ${username} on the ${remote ? "PRODUCTION" : "local"} database…`);
// Run the project's own wrangler with this same Node, and no shell between:
// a shell (cmd.exe in particular) would split the SQL into words.
const wrangler = join(dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin", "wrangler.js");
const out = execFileSync(process.execPath, [wrangler, "d1", "execute", "mintforge", remote ? "--remote" : "--local", "--command", sql, "--json"],
  { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] });

let found = false;
try { found = JSON.parse(out).some(r => (r.results || []).some(x => x.username)); } catch { found = /"username"/.test(out); }
if (!found) { console.error(`No player called ${username}. Nothing was changed.`); process.exit(1); }
console.log(`Done. ${username} can sign in with the new PIN; every old session is signed out.`);

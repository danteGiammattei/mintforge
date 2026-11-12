#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
 *  migrate — run a migration file through `wrangler d1 execute --command`
 *  ────────────────────────────────────────────────────────────────────
 *    node tools/migrate.mjs migrations/012_tidy_and_seal_log.sql            local
 *    node tools/migrate.mjs migrations/012_tidy_and_seal_log.sql --remote   production
 *
 *  `wrangler d1 execute --file` goes through Cloudflare's bulk-import
 *  endpoint, which can refuse an OAuth login (error 10000) that every
 *  other command accepts. This sends the same statements as a command
 *  instead. Comments are stripped; the statements run in order, and D1
 *  applies them as one unit, so a failure leaves the database as it was.
 * ══════════════════════════════════════════════════════════════════════ */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error("usage: node tools/migrate.mjs <file.sql> [--remote]"); process.exit(1); }
const remote = flags.includes("--remote");

const sql = readFileSync(file, "utf8")
  .split("\n").map(l => l.replace(/--.*$/, "").trimEnd()).filter(Boolean).join("\n").trim();
const count = sql.split(";").filter(s => s.trim()).length;

console.log(`Running ${count} statement${count === 1 ? "" : "s"} from ${file} on the ${remote ? "PRODUCTION" : "local"} database…`);
const wrangler = join(dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin", "wrangler.js");
execFileSync(process.execPath, [wrangler, "d1", "execute", "mintforge", remote ? "--remote" : "--local", "--yes", "--command", sql], { stdio: "inherit" });
console.log("Done.");

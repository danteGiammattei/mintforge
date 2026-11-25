/* ══════════════════════════════════════════════════════════════════════
 *  The tavern's notice board
 *  ────────────────────────────────────────────────────────────────────
 *  board     the notices up now, newest first, with yours marked
 *  post      put yours up (it replaces any you had): a kind, a coin if it
 *            is about one, and a few words
 *  unpost    take yours down
 *  report    someone else's; at three reports from different players it
 *            comes down for everyone
 *  Open from level 5, one post every ten minutes, no links. The text is
 *  shown as text (React escapes it), never as markup.
 * ══════════════════════════════════════════════════════════════════════ */

import { BOARD } from "../shared/tuning.js";
import { levelOf, MAX_RARITY } from "../shared/economy.js";
import { Refusal, randomHex } from "./http.js";

const METALS = 11;
// control characters and the invisible ones (zero-width, direction marks)
// eslint-disable-next-line no-control-regex -- stripping them is the point
const INVISIBLE = new RegExp("[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f]", "g");
// a link, however it is dressed: scheme, www, or a bare domain
const LINKISH = /(https?:|www\.|\b[a-z0-9-]{2,}\.(com|net|org|io|gg|xyz|au|co|me|app|dev|ly|tv)\b|discord\.gg)/i;

async function gate(db, pid) {
  const ps = await db.prepare(`SELECT xp FROM player_state WHERE player_id = ?1`).bind(pid).first();
  if (levelOf(ps?.xp || 0) < BOARD.minLevel) throw new Refusal(`The board is for level ${BOARD.minLevel} and up`, 403);
}

export function cleanText(raw) {
  const t = String(raw ?? "").replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  if (!t) throw new Refusal("Say something");
  if (t.length > BOARD.maxChars) throw new Refusal(`${BOARD.maxChars} characters at most`);
  if (LINKISH.test(t)) throw new Refusal("No links on the board");
  return t;
}

export async function board(db, pid, body, { now }) {
  await gate(db, pid);
  const rows = (await db.prepare(
    `SELECT n.id, n.player_id, n.kind, n.metal, n.rarity, n.text, n.created_at, n.expires_at, p.username
       FROM notices n JOIN players p ON p.id = n.player_id
      WHERE n.expires_at > ?1 AND (n.reports < ?2 OR n.player_id = ?3)
      ORDER BY n.created_at DESC LIMIT ?4`).bind(now, BOARD.hideAt, pid, BOARD.show).all()).results || [];
  return {
    list: rows.map(r => ({
      id: r.id, kind: r.kind, metal: r.metal, rarity: r.rarity, text: r.text, by: r.username,
      at: r.created_at, until: r.expires_at, mine: r.player_id === pid,
    })),
  };
}

export async function post(db, pid, body, { now }) {
  await gate(db, pid);
  const kind = BOARD.kinds.includes(body.kind) ? body.kind : null;
  if (!kind) throw new Refusal("Wanted, offering or a notice?");
  const metal = body.metal == null ? null : body.metal, rarity = body.rarity == null ? null : body.rarity;
  if ((metal == null) !== (rarity == null)) throw new Refusal("A coin needs a metal and a rarity");
  if (metal != null && !(Number.isInteger(metal) && metal >= 0 && metal < METALS && Number.isInteger(rarity) && rarity >= 0 && rarity <= MAX_RARITY)) throw new Refusal("Which coin?");
  const text = cleanText(body.text);
  const last = await db.prepare(`SELECT created_at FROM notices WHERE player_id = ?1`).bind(pid).first();
  if (last && now - last.created_at < BOARD.every) throw new Refusal("One notice every ten minutes", 429);
  const id = "n_" + randomHex(8);
  // yours replaces yours; a new notice starts with no reports
  await db.batch([
    db.prepare(`DELETE FROM notice_reports WHERE notice_id IN (SELECT id FROM notices WHERE player_id = ?1)`).bind(pid),
    db.prepare(
      `INSERT INTO notices (id, player_id, kind, metal, rarity, text, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT(player_id) DO UPDATE SET id = ?1, kind = ?3, metal = ?4, rarity = ?5, text = ?6, created_at = ?7, expires_at = ?8, reports = 0`
    ).bind(id, pid, kind, metal, rarity, text, now, now + BOARD.days * 86400e3),
  ]);
  return { id };
}

export async function unpost(db, pid) {
  await db.batch([
    db.prepare(`DELETE FROM notice_reports WHERE notice_id IN (SELECT id FROM notices WHERE player_id = ?1)`).bind(pid),
    db.prepare(`DELETE FROM notices WHERE player_id = ?1`).bind(pid),
  ]);
  return {};
}

export async function report(db, pid, body) {
  await gate(db, pid);
  const id = typeof body.noticeId === "string" && /^n_[0-9a-f]{1,32}$/.test(body.noticeId) ? body.noticeId : null;
  if (!id) throw new Refusal("Which notice?");
  const n = await db.prepare(`SELECT player_id FROM notices WHERE id = ?1`).bind(id).first();
  if (!n) throw new Refusal("It's already down", 404);
  if (n.player_id === pid) throw new Refusal("That one's yours", 409);
  // once each: the count only moves when the report is new
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO notice_reports (notice_id, player_id) VALUES (?1, ?2)`).bind(id, pid),
    db.prepare(`UPDATE notices SET reports = (SELECT COUNT(*) FROM notice_reports WHERE notice_id = ?1) WHERE id = ?1`).bind(id),
  ]);
  return { reported: true };
}

import { json, bad, getAuth } from "../_utils.js";

/* Valid tarot card IDs — kept in lockstep with the client TAROT_CARDS catalog.
   Anything not in this set is rejected for both purchase persistence and equip. */
const VALID_TAROT_IDS = new Set([
  "magician","high_priestess","empress","emperor","hierophant","lovers",
  "chariot","strength","hermit","wheel_of_fortune","justice","hanged_man",
]);

/*  GET  /api/vault — full hydrated player state. */
export async function onRequestGet({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const pid = auth.player.id;

  const [state, coins, tarots] = await Promise.all([
    env.DB.prepare(
      `SELECT xp, shovel_level, brush_level, frame, bio, selected_title,
              pinned_ids, marks, shovel_dur, equipped_tarots
         FROM player_state WHERE player_id = ?1`
    ).bind(pid).first(),
    env.DB.prepare(
      `SELECT id, seed, metal_idx, shiny, locked, acquired_at FROM coins
        WHERE player_id = ?1 ORDER BY acquired_at DESC`
    ).bind(pid).all(),
    env.DB.prepare(
      `SELECT card_id FROM tarot_cards WHERE player_id = ?1 ORDER BY acquired_at`
    ).bind(pid).all(),
  ]);

  if (!state) return bad("State missing — contact support", 500);

  return json({
    username: auth.player.username,
    xp: state.xp,
    shovelLevel: state.shovel_level,
    brushLevel: state.brush_level,
    frame: state.frame,
    bio: state.bio || "",
    selectedTitle: state.selected_title,
    pinnedIds: state.pinned_ids ? JSON.parse(state.pinned_ids) : null,
    marks: state.marks || 0,
    shovelDur: state.shovel_dur != null ? state.shovel_dur : 40,
    ownedTarots: (tarots.results || []).map(r => r.card_id),
    equippedTarots: state.equipped_tarots ? JSON.parse(state.equipped_tarots) : [],
    coins: (coins.results || []).map(r => ({
      id: r.id,
      seed: r.seed >>> 0,
      metalIdx: r.metal_idx,
      shiny: !!r.shiny,
      locked: !!r.locked,
    })),
  });
}

/*  POST /api/vault — transactional update.
    Body shape:
      {
        add?:    [ { id, seed, metalIdx, shiny, locked? } ],
        remove?: [ id, ... ],
        lock?:   [ { id, locked } ],
        tarotBuy?:    [ cardId, ... ],
        tarotSell?:   [ cardId, ... ],
        state?:  { xp?, shovelLevel?, brushLevel?, frame?, bio?, selectedTitle?, pinnedIds?,
                   marks?, shovelDur?, equippedTarots? }
      }
*/
export async function onRequestPost({ request, env }) {
  const auth = await getAuth(request, env);
  if (!auth) return bad("Unauthorized", 401);
  const pid = auth.player.id;

  let body;
  try { body = await request.json(); } catch { return bad("Invalid JSON"); }

  const stmts = [];
  const now = Date.now();

  // ── coin removals ────────────────────────────────────────────
  if (Array.isArray(body.remove) && body.remove.length) {
    const ids = body.remove.slice(0, 200).filter(x => typeof x === "string" && x.length <= 80);
    const placeholders = ids.map((_, i) => `?${i + 2}`).join(",");
    if (ids.length) {
      stmts.push(env.DB.prepare(
        `DELETE FROM coins WHERE player_id = ?1 AND id IN (${placeholders})`
      ).bind(pid, ...ids));
    }
  }

  // ── coin additions ───────────────────────────────────────────
  if (Array.isArray(body.add) && body.add.length) {
    for (const c of body.add.slice(0, 50)) {
      if (typeof c?.id !== "string" || c.id.length > 80) continue;
      if (typeof c.seed !== "number") continue;
      if (typeof c.metalIdx !== "number" || c.metalIdx < 0 || c.metalIdx > 6) continue;
      stmts.push(env.DB.prepare(
        `INSERT OR REPLACE INTO coins (id, player_id, seed, metal_idx, shiny, locked, acquired_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      ).bind(c.id, pid, (c.seed >>> 0), c.metalIdx | 0, c.shiny ? 1 : 0, c.locked ? 1 : 0, now));
    }
  }

  // ── lock toggle ──────────────────────────────────────────────
  if (Array.isArray(body.lock) && body.lock.length) {
    for (const op of body.lock.slice(0, 50)) {
      if (typeof op?.id !== "string" || op.id.length > 80) continue;
      stmts.push(env.DB.prepare(
        `UPDATE coins SET locked = ?3 WHERE player_id = ?1 AND id = ?2`
      ).bind(pid, op.id, op.locked ? 1 : 0));
    }
  }

  // ── tarot purchases ──────────────────────────────────────────
  // Just stores ownership — actual marks deduction is a state.marks update sent in the same request
  if (Array.isArray(body.tarotBuy) && body.tarotBuy.length) {
    for (const cid of body.tarotBuy.slice(0, 12)) {
      if (typeof cid !== "string" || !VALID_TAROT_IDS.has(cid)) continue;
      stmts.push(env.DB.prepare(
        `INSERT OR IGNORE INTO tarot_cards (player_id, card_id, acquired_at) VALUES (?1, ?2, ?3)`
      ).bind(pid, cid, now));
    }
  }

  if (Array.isArray(body.tarotSell) && body.tarotSell.length) {
    for (const cid of body.tarotSell.slice(0, 12)) {
      if (typeof cid !== "string") continue;
      stmts.push(env.DB.prepare(
        `DELETE FROM tarot_cards WHERE player_id = ?1 AND card_id = ?2`
      ).bind(pid, cid));
    }
  }

  // ── scalar state patch ───────────────────────────────────────
  if (body.state && typeof body.state === "object") {
    const s = body.state;
    const fields = [];
    const binds = [pid];
    const add = (col, value) => { binds.push(value); fields.push(`${col} = ?${binds.length}`); };

    if (Number.isFinite(s.xp))           add("xp", Math.max(0, s.xp | 0));
    if (Number.isFinite(s.shovelLevel))  add("shovel_level", Math.max(1, Math.min(7, s.shovelLevel | 0)));
    if (Number.isFinite(s.brushLevel))   add("brush_level", Math.max(0, Math.min(4, s.brushLevel | 0)));
    if (typeof s.frame === "string")     add("frame", String(s.frame).slice(0, 20));
    if (typeof s.bio === "string")       add("bio", String(s.bio).slice(0, 120));
    if (typeof s.selectedTitle === "string") add("selected_title", String(s.selectedTitle).slice(0, 40));
    if ("pinnedIds" in s) {
      if (s.pinnedIds === null) add("pinned_ids", null);
      // accept up to 8 pinned (default 6 + Lovers tarot adds 2)
      else if (Array.isArray(s.pinnedIds)) add("pinned_ids", JSON.stringify(s.pinnedIds.slice(0, 8)));
    }
    if (Number.isFinite(s.marks))        add("marks", Math.max(0, s.marks | 0));
    if (Number.isFinite(s.shovelDur))    add("shovel_dur", Math.max(0, Math.min(500, s.shovelDur | 0)));
    if (Array.isArray(s.equippedTarots)) {
      const filtered = s.equippedTarots.filter(c => typeof c === "string" && VALID_TAROT_IDS.has(c)).slice(0, 5);
      add("equipped_tarots", JSON.stringify(filtered));
    }

    if (fields.length) {
      stmts.push(env.DB.prepare(
        `UPDATE player_state SET ${fields.join(", ")} WHERE player_id = ?1`
      ).bind(...binds));
    }
  }

  if (!stmts.length) return json({ ok: true, noop: true });

  try {
    await env.DB.batch(stmts);
    return json({ ok: true });
  } catch (e) {
    return bad("Transaction failed: " + (e.message || "unknown"), 500);
  }
}

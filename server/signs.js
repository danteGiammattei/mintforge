/* The star signs a player holds: on their astral coins, and on any astral
 * coin of theirs staked at a war table (it is still theirs until the
 * table settles). See shared/tuning.js ASTRAL. */
export async function heldSigns(db, pid) {
  const r = await db.prepare(
    `SELECT sign AS s FROM coins WHERE player_id = ?1 AND sign IS NOT NULL
     UNION ALL SELECT json_extract(host_coin, '$.sign') FROM war_tables
      WHERE host_id = ?1 AND status IN ('invited', 'playing') AND json_extract(host_coin, '$.sign') IS NOT NULL
     UNION ALL SELECT json_extract(guest_coin, '$.sign') FROM war_tables
      WHERE guest_id = ?1 AND status = 'playing' AND json_extract(guest_coin, '$.sign') IS NOT NULL`
  ).bind(pid).all();
  return new Set((r.results || []).map(x => x.s));
}

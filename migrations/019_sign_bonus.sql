-- 019 · First-find bonus for star signs. The journal keeps a bitmask of
-- every sign a player held when the bonus began ($.signs). The bonus is
-- paid on load (server/state.js paySigns) for every sign held or in this
-- list and not yet paid ($.signsPaid), so these are back paid, once,
-- even if sold since. Safe to run twice.
--   npx wrangler d1 execute mintforge --remote --file=migrations/019_sign_bonus.sql
UPDATE player_state SET journal = json_set(COALESCE(journal, '{}'), '$.signs',
  COALESCE(json_extract(journal, '$.signs'), 0) |
  (SELECT COALESCE(SUM(DISTINCT 1 << sign), 0) FROM coins
    WHERE coins.player_id = player_state.player_id AND sign IS NOT NULL));

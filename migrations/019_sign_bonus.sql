-- 019 · First-find bonus for star signs. The journal keeps a bitmask of
-- every sign a player has ever found ($.signs); finding a new one pays
-- ASTRAL.firstBonus marks. This marks the signs players hold today as
-- already found, so nobody is paid again for a sign they have. Safe to
-- run twice.
--   npx wrangler d1 execute mintforge --remote --file=migrations/019_sign_bonus.sql
UPDATE player_state SET journal = json_set(COALESCE(journal, '{}'), '$.signs',
  COALESCE(json_extract(journal, '$.signs'), 0) |
  (SELECT COALESCE(SUM(DISTINCT 1 << sign), 0) FROM coins
    WHERE coins.player_id = player_state.player_id AND sign IS NOT NULL));

-- 029 · the leaderboards (shared/ranks.js, server/ranks.js): each player's
-- region (the continent they first loaded the game from, kept for good),
-- their vault's worth (kept up to date whenever their state loads), and
-- the crowns given when a season ends, one per season and board.
--
-- Run ONCE, before deploying the code that reads it (the ALTERs fail if
-- run again):
--   node tools/migrate.mjs migrations/029_leaderboards.sql --remote
--
-- Nobody has a value or a region until they next open the game, so the
-- boards fill in as people play.
ALTER TABLE players ADD COLUMN region TEXT;
ALTER TABLE player_state ADD COLUMN vault_value INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS players_region_idx ON players(region);
CREATE INDEX IF NOT EXISTS player_state_value_idx ON player_state(vault_value);
CREATE TABLE IF NOT EXISTS crowns (
  season     TEXT    NOT NULL,             -- "2026Q4"
  board      TEXT    NOT NULL,             -- "G" for the world, else a region ("OC", "EU", …)
  player_id  INTEGER NOT NULL,
  value      INTEGER NOT NULL,             -- their vault's worth when crowned
  at         INTEGER NOT NULL,
  PRIMARY KEY (season, board)
);

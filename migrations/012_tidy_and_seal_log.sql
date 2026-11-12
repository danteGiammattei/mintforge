-- 012 · clear out what the old game left behind, index for how the new
--       one reads, and start keeping numbers for tuning
--
--   npx wrangler d1 execute mintforge --remote --file=migrations/012_tidy_and_seal_log.sql
--
-- THIS ONE DELETES DATA, on purpose: the duels, tarot and artefact tables,
-- and six columns nothing has read since the rebuild. No coin, scroll,
-- chest, mark or cosmetic is touched — duels never held coins (a staked
-- coin stayed with its owner until the flip), so dropping them strands
-- nothing. Back up first:
--
--   npx wrangler d1 export mintforge --remote --output=backup-before-012.sql
--
-- Apply BEFORE deploying this code: it writes to seal_log, created below.
-- Nothing in the build already live reads what this drops. Run once.

DROP TABLE IF EXISTS duels;
DROP TABLE IF EXISTS tarot_cards;
DROP TABLE IF EXISTS artefacts;

ALTER TABLE player_state DROP COLUMN shovel_level;
ALTER TABLE player_state DROP COLUMN shovel_dur;
ALTER TABLE player_state DROP COLUMN equipped_tarots;
ALTER TABLE player_state DROP COLUMN find_streak;
ALTER TABLE player_state DROP COLUMN hanged_man_date;
ALTER TABLE player_state DROP COLUMN ore_counts;

-- every listing reads one player's rows newest first: index the order too,
-- so it is a walk down the index instead of a sort
DROP INDEX IF EXISTS coins_player_idx;
CREATE INDEX IF NOT EXISTS coins_player_time_idx   ON coins(player_id, acquired_at);
DROP INDEX IF EXISTS scrolls_player_idx;
CREATE INDEX IF NOT EXISTS scrolls_player_time_idx ON scrolls(player_id, created_at);
DROP INDEX IF EXISTS chests_player_idx;
CREATE INDEX IF NOT EXISTS chests_player_time_idx  ON chests(player_id, created_at);

-- one row per sealed scroll: the measures the sigil judge read off the
-- drawing and what it decided. The drawing itself is never kept.
-- tools/seal-report.mjs reads this to re-tune the thresholds.
CREATE TABLE IF NOT EXISTS seal_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  rarity      INTEGER NOT NULL,
  traits      TEXT    NOT NULL,          -- comma list of traits present
  bumped      TEXT    NOT NULL,          -- comma list of traits that lifted it
  familiar    INTEGER NOT NULL,
  well_level  INTEGER NOT NULL,
  m           TEXT    NOT NULL           -- JSON: the raw measures (shared/sigil.js measure)
);
CREATE INDEX IF NOT EXISTS seal_log_time_idx ON seal_log(created_at);

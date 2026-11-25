-- 027 · the tavern's notice board (server/board.js)
--
--   node tools/migrate.mjs migrations/027_notice_board.sql --remote
--
-- One notice per player at a time (posting again replaces it), each up
-- for three days. Three reports from different players take one down.

CREATE TABLE IF NOT EXISTS notices (
  id          TEXT    PRIMARY KEY,
  player_id   INTEGER NOT NULL UNIQUE,
  kind        TEXT    NOT NULL,            -- wanted | offering | notice
  metal       INTEGER,                     -- the coin it is about, if any
  rarity      INTEGER,
  text        TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  reports     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS notices_live_idx ON notices(expires_at);

CREATE TABLE IF NOT EXISTS notice_reports (
  notice_id   TEXT    NOT NULL,
  player_id   INTEGER NOT NULL,
  PRIMARY KEY (notice_id, player_id)
);

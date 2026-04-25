-- MintForge D1 schema
-- Apply with:  npx wrangler d1 execute mintforge --file=./schema.sql

CREATE TABLE IF NOT EXISTS players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT    NOT NULL,
  password_salt   TEXT    NOT NULL,
  created_at      INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_state (
  player_id       INTEGER PRIMARY KEY,
  xp              INTEGER NOT NULL DEFAULT 0,
  shovel_level    INTEGER NOT NULL DEFAULT 1,
  brush_level     INTEGER NOT NULL DEFAULT 0,
  frame           TEXT    NOT NULL DEFAULT 'stone',
  bio             TEXT    NOT NULL DEFAULT '',
  selected_title  TEXT    NOT NULL DEFAULT 'Novice Digger',
  pinned_ids      TEXT,            -- JSON array or NULL (auto)
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coins (
  id              TEXT    NOT NULL,
  player_id       INTEGER NOT NULL,
  seed            INTEGER NOT NULL,
  metal_idx       INTEGER NOT NULL,
  shiny           INTEGER NOT NULL DEFAULT 0,
  acquired_at     INTEGER NOT NULL,
  PRIMARY KEY (player_id, id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS coins_player_idx ON coins(player_id);

CREATE TABLE IF NOT EXISTS sessions (
  token           TEXT    PRIMARY KEY,
  player_id       INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_player_idx ON sessions(player_id);

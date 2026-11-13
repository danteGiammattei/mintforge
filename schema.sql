-- MintForge D1 schema (canonical — fresh databases, including local dev)
--   local:   npm run db:local
--   remote:  npx wrangler d1 execute mintforge --file=./schema.sql --remote
-- For an EXISTING database, run the missing files in ./migrations/ instead;
--
-- This file is migrations 001–012 already applied.

CREATE TABLE IF NOT EXISTS players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT    NOT NULL,
  password_salt   TEXT    NOT NULL,
  created_at      INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL,
  pin_iter        INTEGER NOT NULL DEFAULT 10000      -- PBKDF2 rounds this hash was made with
);

CREATE TABLE IF NOT EXISTS player_state (
  player_id       INTEGER PRIMARY KEY,
  xp              INTEGER NOT NULL DEFAULT 0,
  brush_level     INTEGER NOT NULL DEFAULT 0,
  frame           TEXT    NOT NULL DEFAULT 'stone',
  bio             TEXT    NOT NULL DEFAULT '',
  selected_title  TEXT    NOT NULL DEFAULT 'Novice Scribe',
  pinned_ids      TEXT,
  marks           INTEGER NOT NULL DEFAULT 0,
  owned_frames    TEXT,
  owned_titles    TEXT,
  -- the goblin's pot; hidden from the client
  favour          INTEGER NOT NULL DEFAULT 0,
  chest_tier      INTEGER NOT NULL DEFAULT 0,
  chest_cost      INTEGER NOT NULL DEFAULT 0,         -- 0 = not decided yet
  pot_best        INTEGER NOT NULL DEFAULT 0,
  chests_given    INTEGER NOT NULL DEFAULT 0,
  gifts           TEXT    NOT NULL DEFAULT '[]',
  stats           TEXT    NOT NULL DEFAULT '{}',
  recent_sigs     TEXT    NOT NULL DEFAULT '[]',
  seal_nonce      INTEGER NOT NULL DEFAULT 0,
  seal_count      INTEGER NOT NULL DEFAULT 0,
  last_seal_at    INTEGER NOT NULL DEFAULT 0,
  journal         TEXT    NOT NULL DEFAULT '{}',
  well_level      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coins (
  id              TEXT    NOT NULL,
  player_id       INTEGER NOT NULL,
  seed            INTEGER NOT NULL,
  metal_idx       INTEGER NOT NULL,
  shiny           INTEGER NOT NULL DEFAULT 0,
  locked          INTEGER NOT NULL DEFAULT 0,
  rarity          INTEGER,
  acquired_at     INTEGER NOT NULL,
  dusty           INTEGER NOT NULL DEFAULT 0,         -- fresh from a chest, not yet brushed
  nickname        TEXT,                               -- engraved at the forge
  material        TEXT,                               -- a twin in another material (migration 015)
  PRIMARY KEY (player_id, id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS coins_player_time_idx ON coins(player_id, acquired_at);

CREATE TABLE IF NOT EXISTS sessions (
  token           TEXT    PRIMARY KEY,
  player_id       INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  last_used_at    INTEGER,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_player_idx ON sessions(player_id);

CREATE TABLE IF NOT EXISTS friends (
  player_id  INTEGER NOT NULL,
  friend_id  INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, friend_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS friends_player_idx ON friends(player_id);
CREATE INDEX IF NOT EXISTS friends_friend_idx ON friends(friend_id);


-- ── grassroots loop (migration 009) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS scrolls (
  id          TEXT    PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  rarity      INTEGER NOT NULL,
  seed        INTEGER NOT NULL,
  hint        TEXT,                    -- trait that lifted it, if any. Never sent to the client.
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS scrolls_player_time_idx ON scrolls(player_id, created_at);

CREATE TABLE IF NOT EXISTS chests (
  id          TEXT    PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  tier        INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS chests_player_time_idx ON chests(player_id, created_at);

-- a retried request with the same op id gets the first answer back
-- instead of being applied twice
CREATE TABLE IF NOT EXISTS action_log (
  player_id   INTEGER NOT NULL,
  op_id       TEXT    NOT NULL,
  response    TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (player_id, op_id)
);
CREATE INDEX IF NOT EXISTS action_log_age_idx ON action_log(created_at);

-- failed logins, keyed "u:<username>" and "ip:<address>"
CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT    PRIMARY KEY,
  fails        INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  last_at      INTEGER NOT NULL DEFAULT 0
);

-- ── tuning log (migration 012) ──────────────────────────────────────
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

-- ── war (migration 013) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS war_tables (
  id          TEXT    PRIMARY KEY,
  host_id     INTEGER NOT NULL,
  guest_id    INTEGER NOT NULL,
  host_coin   TEXT    NOT NULL,          -- JSON: the coin row, in escrow
  guest_coin  TEXT,                      -- JSON, once the guest sits down
  status      TEXT    NOT NULL,          -- invited · playing · done · void
  deck        TEXT,                      -- JSON card order. Never sent to a client.
  pos         INTEGER NOT NULL DEFAULT 0,  -- unused since 014: the deck shrinks instead
  round       INTEGER NOT NULL DEFAULT 0,
  host_flip   INTEGER NOT NULL DEFAULT -1, -- the round each has flipped for
  guest_flip  INTEGER NOT NULL DEFAULT -1,
  host_pick   INTEGER,                   -- which card of the fan each pulled (migration 014)
  guest_pick  INTEGER,
  log         TEXT    NOT NULL DEFAULT '[]', -- the rounds dealt so far, face up
  winner_id   INTEGER,
  why         TEXT,                      -- how a void table ended
  settle      TEXT,                      -- which attempt settled it
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS war_host_idx  ON war_tables(host_id, status);
CREATE INDEX IF NOT EXISTS war_guest_idx ON war_tables(guest_id, status);

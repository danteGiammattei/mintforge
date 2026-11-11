-- MintForge D1 schema (canonical — fresh databases, including local dev)
--   local:   npm run db:local
--   remote:  npx wrangler d1 execute mintforge --file=./schema.sql --remote
-- For an EXISTING database, run the missing files in ./migrations/ instead;
-- this file is those migrations (001–009) already applied.
--
-- shovel_*, *tarot*, find_streak, hanged_man_date, ore_counts and the
-- tarot_cards table belonged to systems the rebuild removed. They stay so
-- this schema matches production, and nothing reads them.

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
  shovel_level    INTEGER NOT NULL DEFAULT 1,
  brush_level     INTEGER NOT NULL DEFAULT 0,
  frame           TEXT    NOT NULL DEFAULT 'stone',
  bio             TEXT    NOT NULL DEFAULT '',
  selected_title  TEXT    NOT NULL DEFAULT 'Novice Scribe',
  pinned_ids      TEXT,
  marks           INTEGER NOT NULL DEFAULT 0,
  shovel_dur      INTEGER NOT NULL DEFAULT 40,
  equipped_tarots TEXT,
  owned_frames    TEXT,
  owned_titles    TEXT,
  find_streak     INTEGER NOT NULL DEFAULT 0,
  hanged_man_date TEXT NOT NULL DEFAULT '',
  ore_counts      TEXT NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0]',
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
  PRIMARY KEY (player_id, id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS coins_player_idx ON coins(player_id);

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

CREATE TABLE IF NOT EXISTS tarot_cards (
  player_id   INTEGER NOT NULL,
  card_id     TEXT    NOT NULL,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, card_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS tarot_cards_player_idx ON tarot_cards(player_id);

-- ── duels (migration 007) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duels (
  id              TEXT    PRIMARY KEY,           -- short hex string
  challenger_id   INTEGER NOT NULL,              -- player who initiated
  challenged_id   INTEGER NOT NULL,              -- player who was challenged
  challenger_coin TEXT,                          -- coin id staked by challenger (NULL until set)
  challenged_coin TEXT,                          -- coin id staked by challenged (NULL until set)
  status          TEXT    NOT NULL DEFAULT 'pending',  -- pending | ready | resolved | declined
  flip_seed       TEXT,                          -- hex seed generated at resolve time
  flip_results    TEXT,                          -- JSON array of three booleans (true=challenger won that flip)
  winner_id       INTEGER,                       -- final winner — either challenger_id or challenged_id
  created_at      INTEGER NOT NULL,
  resolved_at     INTEGER,                       -- timestamp when flipped or declined
  expires_at      INTEGER NOT NULL,              -- 48h after creation by default

  FOREIGN KEY (challenger_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (challenged_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Look up duels involving a player quickly (their inbox + outbox)
CREATE INDEX IF NOT EXISTS duels_challenger_idx ON duels(challenger_id);
CREATE INDEX IF NOT EXISTS duels_challenged_idx ON duels(challenged_id);
CREATE INDEX IF NOT EXISTS duels_status_idx ON duels(status);

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
CREATE INDEX IF NOT EXISTS scrolls_player_idx ON scrolls(player_id);

CREATE TABLE IF NOT EXISTS chests (
  id          TEXT    PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  tier        INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS chests_player_idx ON chests(player_id);

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

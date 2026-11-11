-- 009 · the grassroots loop
--
-- Scrolls, the goblin's pot, chests and dusty coins, plus what the server
-- needs to be the authority: an idempotency log for retried actions, login
-- throttling, session expiry and a per-account PBKDF2 iteration count.
--
-- Additive only. Nothing is dropped: the columns the old game used
-- (shovel_level, shovel_dur, equipped_tarots, find_streak, hanged_man_date,
-- ore_counts) and the tarot_cards / artefacts tables are simply no longer
-- read. Existing coins keep rarity and stay clean (dusty = 0).
--
-- Apply to production yourself, once, before deploying this branch:
--   npx wrangler d1 execute mintforge --remote --file=migrations/009_grassroots.sql

-- the goblin's pot. All of it is hidden from the client.
ALTER TABLE player_state ADD COLUMN favour       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_state ADD COLUMN chest_tier   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_state ADD COLUMN chest_cost   INTEGER NOT NULL DEFAULT 0;   -- 0 = not decided yet
ALTER TABLE player_state ADD COLUMN pot_best     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_state ADD COLUMN chests_given INTEGER NOT NULL DEFAULT 0;

-- gifts already handed over, and the counters their conditions read
ALTER TABLE player_state ADD COLUMN gifts        TEXT    NOT NULL DEFAULT '[]';
ALTER TABLE player_state ADD COLUMN stats        TEXT    NOT NULL DEFAULT '{}';

-- sealing: the signatures he remembers, a secret that salts the roll, a cooldown
ALTER TABLE player_state ADD COLUMN recent_sigs  TEXT    NOT NULL DEFAULT '[]';
ALTER TABLE player_state ADD COLUMN seal_nonce   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_state ADD COLUMN seal_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_state ADD COLUMN last_seal_at INTEGER NOT NULL DEFAULT 0;

-- a coin fresh from a chest is dusty until brushed; dusty coins are not in the vault
ALTER TABLE coins ADD COLUMN dusty INTEGER NOT NULL DEFAULT 0;

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

ALTER TABLE sessions ADD COLUMN last_used_at INTEGER;
ALTER TABLE players  ADD COLUMN pin_iter     INTEGER NOT NULL DEFAULT 10000;

-- 018 · Raffles: a daily draw for each metal. A coin of that metal is a
-- ticket (more entries the rarer it is) and is gone once entered; one
-- winner takes the pot: a base for the metal plus what every entered coin
-- was worth. Safe to run twice.
CREATE TABLE IF NOT EXISTS raffle_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_at    INTEGER NOT NULL,           -- the draw it is in (ms)
  tier       INTEGER NOT NULL,           -- the metal
  player_id  INTEGER NOT NULL,
  coin       TEXT    NOT NULL,           -- JSON: the coin entered, for the record
  entries    INTEGER NOT NULL,
  value      INTEGER NOT NULL,           -- marks it adds to the pot
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS raffle_entries_draw_idx   ON raffle_entries(draw_at, tier);
CREATE INDEX IF NOT EXISTS raffle_entries_player_idx ON raffle_entries(player_id, draw_at);

CREATE TABLE IF NOT EXISTS raffle_draws (
  draw_at    INTEGER NOT NULL,
  tier       INTEGER NOT NULL,
  winner_id  INTEGER NOT NULL,
  pot        INTEGER NOT NULL,
  entries    INTEGER NOT NULL,
  players    INTEGER NOT NULL,
  drawn_at   INTEGER NOT NULL,
  PRIMARY KEY (draw_at, tier)
);

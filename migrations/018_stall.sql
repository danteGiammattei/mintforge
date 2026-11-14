-- 018 · The goblin's stall. What is on it is rolled from the player and
-- the day, so only what has been bought is kept: one row a slot a day,
-- which is also what stops a slot being bought twice. Safe to run twice.
CREATE TABLE IF NOT EXISTS stall_buys (
  player_id  INTEGER NOT NULL,
  day        INTEGER NOT NULL,           -- the player's local day number
  slot       INTEGER NOT NULL,
  price      INTEGER NOT NULL,
  item       TEXT    NOT NULL,           -- JSON: what was bought
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, day, slot)
);

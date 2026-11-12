-- 013 · War at the tavern: two friends stake a coin each, high card wins both.
-- A staked coin leaves `coins` and waits here (as JSON) until the table
-- settles: to the winner, or back to its owner if the table is voided.
CREATE TABLE IF NOT EXISTS war_tables (
  id          TEXT    PRIMARY KEY,
  host_id     INTEGER NOT NULL,
  guest_id    INTEGER NOT NULL,
  host_coin   TEXT    NOT NULL,          -- JSON: the coin row, in escrow
  guest_coin  TEXT,                      -- JSON, once the guest sits down
  status      TEXT    NOT NULL,          -- invited · playing · done · void
  deck        TEXT,                      -- JSON card order. Never sent to a client.
  pos         INTEGER NOT NULL DEFAULT 0,  -- next card to deal
  round       INTEGER NOT NULL DEFAULT 0,
  host_flip   INTEGER NOT NULL DEFAULT -1, -- the round each has flipped for
  guest_flip  INTEGER NOT NULL DEFAULT -1,
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

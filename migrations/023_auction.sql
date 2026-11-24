-- The tavern's auction house (server/auction.js).
-- A listed coin leaves its owner's vault: its row is moved here, whole,
-- as JSON, and goes back into coins for the winner (or the seller, if
-- nobody bid) when the auction is settled. A bid's marks are taken when
-- it is made and handed back when it is beaten. seller_id is NULL for
-- the goblin's own listings, which are keyed by day in house_key.
CREATE TABLE IF NOT EXISTS auctions (
  id           TEXT    PRIMARY KEY,
  seller_id    INTEGER,
  coin         TEXT    NOT NULL,
  start_price  INTEGER NOT NULL,
  bid          INTEGER,
  bidder_id    INTEGER,
  bids         INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  ends_at      INTEGER NOT NULL,
  settled      INTEGER NOT NULL DEFAULT 0,
  token        TEXT,
  house_key    TEXT    UNIQUE
);
CREATE INDEX IF NOT EXISTS auctions_open_idx ON auctions(settled, ends_at);
CREATE INDEX IF NOT EXISTS auctions_seller_idx ON auctions(seller_id, settled);

-- What happened at the auction while you were away: outbid, won, sold,
-- unsold. Read once and cleared by loadState.
CREATE TABLE IF NOT EXISTS auction_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   INTEGER NOT NULL,
  kind        TEXT    NOT NULL,
  auction_id  TEXT    NOT NULL,
  amount      INTEGER,
  coin        TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auction_notes_player_idx ON auction_notes(player_id);

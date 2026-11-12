-- 014 · War: each player picks their card from a fan of face-down cards.
-- The pick (0 .. fan-1) for the round they last flipped for.
ALTER TABLE war_tables ADD COLUMN host_pick INTEGER;
ALTER TABLE war_tables ADD COLUMN guest_pick INTEGER;

-- 016 · Astral signs: every astral coin carries one of the twelve star
-- signs (0 Aries … 11 Pisces), and a player never holds two of one sign.
-- Existing astral coins are given signs by the server the next time their
-- owner loads the game (server/state.js), distinct where there are enough.
ALTER TABLE coins ADD COLUMN sign INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS coins_one_sign_idx ON coins(player_id, sign) WHERE sign IS NOT NULL;

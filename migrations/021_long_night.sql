-- 021 · The Long Night (shared/events.js). A coin can carry a season, a
-- mark kept for good like shine ('frost26' for the 2026 event); a chest
-- can be an event's, with the grade (best scroll's rarity) of the pot
-- that paid for it; and a player can own and wear profile effects.
-- Run once, before deploying the code that reads them:
--   npx wrangler d1 execute mintforge --remote --file=migrations/021_long_night.sql
ALTER TABLE coins ADD COLUMN season TEXT;
ALTER TABLE chests ADD COLUMN season TEXT;
ALTER TABLE chests ADD COLUMN grade INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_state ADD COLUMN owned_fx TEXT NOT NULL DEFAULT '[]';
ALTER TABLE player_state ADD COLUMN profile_fx TEXT;

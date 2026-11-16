-- 020 · Tomes. Every scroll is now a copy of a tome page (shared/tomes.js);
-- the tomes a player has are kept as a JSON list of ids, the primer for
-- everyone. Chests can hold the rest. Run once (a second run stops at the
-- ALTER, harmlessly).
--   npx wrangler d1 execute mintforge --remote --file=migrations/020_tomes.sql
ALTER TABLE player_state ADD COLUMN tomes TEXT NOT NULL DEFAULT '["primer"]';

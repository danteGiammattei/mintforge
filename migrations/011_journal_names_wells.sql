-- 011 · the coin journal, engraved names, and inkwells
--
--   npx wrangler d1 execute mintforge --remote --file=migrations/011_journal_names_wells.sql
--
-- Additive. Run once (ALTER TABLE cannot be repeated).

-- a name the owner had engraved at the forge; NULL = none
ALTER TABLE coins ADD COLUMN nickname TEXT;

-- every kind of coin this player has ever cleaned or won, kept after the
-- coin itself is sold: {"c":{"<metal>:<rarity>":count}, "shiny":n, "best":marks}
ALTER TABLE player_state ADD COLUMN journal    TEXT    NOT NULL DEFAULT '{}';

-- which inkwell sits on the desk (bought with marks; decides ink per sheet)
ALTER TABLE player_state ADD COLUMN well_level INTEGER NOT NULL DEFAULT 0;

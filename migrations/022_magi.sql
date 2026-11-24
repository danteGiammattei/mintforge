-- 022 · The Magi's gifts (shared/events.js RELICS). A coin can be one of an
-- event's set of named coins, 'magi:0' to 'magi:2' (GOLD, FRANKINCENSE,
-- MYRRH): drawn with its own emblem, kept out of the tavern, war and the
-- restrike. The journal keeps which were found and paid for ($.r, $.relicsPaid).
-- Run once, before deploying the code that reads it:
--   node tools/migrate.mjs migrations/022_magi.sql --remote
ALTER TABLE coins ADD COLUMN relic TEXT;

-- 025 · seven chest tiers (shared/tuning.js CHESTS)
--
-- ALREADY RUN ON PRODUCTION (26 November 2026). DO NOT RUN IT AGAIN:
-- a second run would turn every Obsidian chest into a Void chest.
--
--   node tools/migrate.mjs migrations/025_seven_chests.sql --remote
--
-- Frost came in at 3 and Molten at 5, so Obsidian moved 3 → 4 and Void
-- 4 → 6. Every chest already made, and every pot whose chest the goblin
-- has already decided, is renumbered to the chest it was (Void first, so
-- nothing is moved twice). A decided pot takes its chest's new price.
-- Run it once, BEFORE deploying the build with seven tiers; it can't tell
-- an old 4 from a new one, so a second run would move Obsidian to Void.

UPDATE chests SET tier = CASE tier WHEN 4 THEN 6 WHEN 3 THEN 4 ELSE tier END WHERE tier IN (3, 4);

UPDATE player_state
   SET chest_tier = CASE chest_tier WHEN 4 THEN 6 WHEN 3 THEN 4 ELSE chest_tier END
 WHERE chest_tier IN (3, 4);

-- the new prices: 10, 22, 40, 70, 110, 170, 260
UPDATE player_state
   SET chest_cost = CASE chest_tier WHEN 0 THEN 10 WHEN 1 THEN 22 WHEN 2 THEN 40 WHEN 3 THEN 70
                                    WHEN 4 THEN 110 WHEN 5 THEN 170 WHEN 6 THEN 260 END
 WHERE chest_cost > 0;

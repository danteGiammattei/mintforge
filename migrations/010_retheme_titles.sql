-- 010 · titles of the old digging game, rethemed
--
-- A chosen title is stored by its label, so renaming one means rewriting
-- the rows that hold it. The app already shows the new names without this
-- (every read goes through currentTitle() in src/lib/data.js); this makes
-- the stored values match, so the map can one day be deleted.
--
--   npx wrangler d1 execute mintforge --remote --file=migrations/010_retheme_titles.sql
--
-- Safe to run more than once.

UPDATE player_state SET selected_title = 'Novice Scribe'   WHERE selected_title = 'Novice Digger';
UPDATE player_state SET selected_title = 'Sigil-Wright'    WHERE selected_title = 'Bronzesmith';
UPDATE player_state SET selected_title = 'Wax-Sealer'      WHERE selected_title = 'Silver Seeker';
UPDATE player_state SET selected_title = 'Master of Seals' WHERE selected_title = 'Master Minter';
UPDATE player_state SET selected_title = 'Eternal Quill'   WHERE selected_title = 'Eternal Forge';
UPDATE player_state SET selected_title = 'Bone Quill'      WHERE selected_title = 'Bone Reaper';

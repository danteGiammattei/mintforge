-- 024 · the secret titles, for what players did before they existed
--
--   node tools/migrate.mjs migrations/024_secret_titles.sql --remote
--
-- Data only, and safe to run again: nobody is given a title twice.
--
-- THE FAULTLESS HAND (faultless): a copy sealed at 100% likeness, as the
-- player was shown it. seal_log keeps every seal's likeness (m.like, to
-- three places), so this is exact.
UPDATE player_state
   SET owned_titles = json_insert(COALESCE(owned_titles, '[]'), '$[#]', 'faultless')
 WHERE player_id IN (SELECT DISTINCT player_id FROM seal_log WHERE json_extract(m, '$.like') >= 0.995)
   AND NOT EXISTS (SELECT 1 FROM json_each(COALESCE(owned_titles, '[]')) WHERE value = 'faultless');

-- STAR-TOUCHED (first_star): an astral coin among a player's first ten
-- coins ever. There is no record of the order coins came in, only the
-- coins still held and the journal's count of every coin ever cleaned
-- (from 12 November 2026). So it is given only where it is certain: an
-- account made since the journal began, whose earliest astral coin still
-- held is at place N among the coins it holds, and N plus every coin the
-- journal shows it has parted with is still ten or fewer (even had all
-- of those come before the star, the star was in the first ten).
WITH ranked AS (
  SELECT player_id, metal_idx, sign,
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY acquired_at, id) AS place
    FROM coins
), star AS (
  SELECT player_id, MIN(place) AS place FROM ranked WHERE metal_idx = 10 AND sign IS NOT NULL GROUP BY player_id
), gone AS (
  SELECT ps.player_id,
         MAX(0, COALESCE((SELECT SUM(value) FROM json_each(ps.journal, '$.c')), 0)
              + COALESCE((SELECT SUM(value) FROM json_each(ps.journal, '$.r')), 0)
              - (SELECT COUNT(*) FROM coins k WHERE k.player_id = ps.player_id AND k.dusty = 0)) AS n
    FROM player_state ps
)
UPDATE player_state
   SET owned_titles = json_insert(COALESCE(owned_titles, '[]'), '$[#]', 'first_star')
 WHERE player_id IN (
         SELECT star.player_id FROM star
           JOIN gone ON gone.player_id = star.player_id
           JOIN players p ON p.id = star.player_id
          WHERE star.place + gone.n <= 10
            AND p.created_at >= 1794441600000)          -- 2026-11-12T00:00:00Z, shared/tuning.js SECRET.journalSince
   AND NOT EXISTS (SELECT 1 FROM json_each(COALESCE(owned_titles, '[]')) WHERE value = 'first_star');

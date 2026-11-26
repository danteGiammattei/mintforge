-- 028 · Luck of a Thousand Lifetimes, for DanteDaddy
--
--   node tools/migrate.mjs migrations/028_luck_of_a_thousand_lifetimes.sql --remote
--
-- A one-of-a-kind title, given by hand: seven of the twelve astral coins
-- on their first day, their second coin ever among them, and back-to-back
-- jackpots on the roulette. The title (src/lib/data.js thousand_lifetimes,
-- the "ooze" effect) is secret, so nobody else ever sees it listed. The
-- message is shown once, as a popup, the next time they load the game.
-- Safe to run again: they are never given it twice, nor told twice.
UPDATE player_state
   SET owned_titles = json_insert(COALESCE(owned_titles, '[]'), '$[#]', 'thousand_lifetimes'),
       stats = json_set(COALESCE(stats, '{}'), '$.houseGift',
                        json('{"title":"thousand_lifetimes","line":"THE GODS HAVE SMILED UPON YOUR FATE. ENJOY IT WHILE IT LASTS."}'))
 WHERE player_id = (SELECT id FROM players WHERE username = 'DanteDaddy' COLLATE NOCASE)
   AND NOT EXISTS (SELECT 1 FROM json_each(COALESCE(owned_titles, '[]')) WHERE value = 'thousand_lifetimes');

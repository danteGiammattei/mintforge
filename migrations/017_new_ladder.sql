-- 017 · The ladder of November 2026: Ice takes Platinum's place (tier 4),
-- Lava and Fire come in above Obsidian (tiers 6 and 7), so Void, Eldritch
-- and Astral move up two (6 → 8, 7 → 9, 8 → 10). The ice and lava twins
-- become Ice and Lava coins. Escrowed war coins and journals move too.
--
-- SAFE TO RUN TWICE: it marks itself done, and every step checks the mark.
-- (Run twice without it, Void coins would become Astral.)
CREATE TABLE IF NOT EXISTS migration_marks (id TEXT PRIMARY KEY, at INTEGER);

UPDATE coins SET metal_idx = CASE metal_idx WHEN 8 THEN 10 WHEN 7 THEN 9 WHEN 6 THEN 8 ELSE metal_idx END
 WHERE metal_idx IN (6, 7, 8) AND NOT EXISTS (SELECT 1 FROM migration_marks WHERE id = '017');
UPDATE coins SET metal_idx = 4, material = NULL
 WHERE material = 'ice' AND NOT EXISTS (SELECT 1 FROM migration_marks WHERE id = '017');
UPDATE coins SET metal_idx = 6, material = NULL
 WHERE material = 'lava' AND NOT EXISTS (SELECT 1 FROM migration_marks WHERE id = '017');
UPDATE coins SET material = NULL
 WHERE material IS NOT NULL AND NOT EXISTS (SELECT 1 FROM migration_marks WHERE id = '017');

UPDATE war_tables SET host_coin = json_set(host_coin, '$.metal_idx',
       CASE json_extract(host_coin, '$.metal_idx') WHEN 8 THEN 10 WHEN 7 THEN 9 WHEN 6 THEN 8 ELSE json_extract(host_coin, '$.metal_idx') END)
 WHERE status IN ('invited', 'playing') AND NOT EXISTS (SELECT 1 FROM migration_marks WHERE id = '017');
UPDATE war_tables SET guest_coin = json_set(guest_coin, '$.metal_idx',
       CASE json_extract(guest_coin, '$.metal_idx') WHEN 8 THEN 10 WHEN 7 THEN 9 WHEN 6 THEN 8 ELSE json_extract(guest_coin, '$.metal_idx') END)
 WHERE status = 'playing' AND guest_coin IS NOT NULL AND NOT EXISTS (SELECT 1 FROM migration_marks WHERE id = '017');

-- journals: kinds are keyed "metal:rarity"; move the keys, drop the twins' page
UPDATE player_state SET journal = json_remove(json_set(journal, '$.c', (
         SELECT json_group_object(
                  CASE CAST(substr(key, 1, instr(key, ':') - 1) AS INTEGER)
                    WHEN 8 THEN '10' WHEN 7 THEN '9' WHEN 6 THEN '8'
                    ELSE substr(key, 1, instr(key, ':') - 1) END || substr(key, instr(key, ':')),
                  value)
           FROM json_each(player_state.journal, '$.c'))), '$.m')
 WHERE json_type(journal, '$.c') = 'object' AND NOT EXISTS (SELECT 1 FROM migration_marks WHERE id = '017');

INSERT OR IGNORE INTO migration_marks (id, at) VALUES ('017', CAST(strftime('%s', 'now') AS INTEGER) * 1000);

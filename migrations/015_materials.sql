-- 015 · Materials: a coin can be its metal tier's twin in another material
-- (wood, stone, ice, amber, pearl, lava, meteorite, jade, crystal). NULL is
-- the metal itself, which every coin before this is.
ALTER TABLE coins ADD COLUMN material TEXT;

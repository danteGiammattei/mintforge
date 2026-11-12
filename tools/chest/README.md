# Chest art

`public/sprites/chests/chest-<tier>.png` — one sheet per tier (0 wooden,
1 iron, 2 gilded, 3 obsidian, 4 void), six frames side by side, each 40 px
wide and the sheet's height tall, the chest standing on the bottom edge:

1. closed  2. lid lifted a pixel  3. a crack  4. half open  5. nearly open  6. open

They were drawn with Gemini (the prompt is below) and snapped onto a true
pixel grid with `snap.py`, because image models paint "pixels" of uneven
size with soft edges:

```sh
pip install pillow numpy
python3 tools/chest/snap.py gemini-output.png public/sprites/chests/chest-2.png
```

`snap.py` expects six frames in a row on solid magenta (#FF00FF). It finds
each frame, measures the base (which does not move), rebuilds the chest on
a 36-cell grid from it, and gives all six frames one shared palette.

Wooden (0), gilded (2) and obsidian (3) are Gemini's. Iron (1) and void (4)
are stand-ins recoloured from wooden and obsidian; replace them with real
ones the same way whenever.

The sheets are lit by the candle (low, left, in front), which is the light
of the satchel and the opening. The doorway re-grades them colder and
darker at run time (`src/lib/chestArt.js`).

## Prompt

Pixel art sprite sheet of a single treasure chest, for a dark, moody fantasy
game in the style of Buckshot Roulette and low-light dungeon games.

Layout: one row of 6 frames on a plain solid magenta (#FF00FF) background,
evenly spaced on a 32×32 pixel grid, each frame the same size and the chest
in the same position. Only the lid changes between frames: 1. Lid closed.
2. Lid closed, raised 1 pixel. 3. Lid open a crack. 4. Lid half open.
5. Lid nearly fully open. 6. Lid fully open.

Camera: dead-on front view, straight on at eye level, perfectly flat and
symmetrical. Only the front face of the chest is visible: no top, no sides,
no perspective, no three-quarter angle, no isometric view. When the lid
opens it swings up and back, so you see its edge rise above the chest. The
inside of the chest is plain dark shadow.

Chest design: <one of the lines below>

Lighting: one warm candle light from the lower left, in front of the chest.
The rest falls into deep shadow. Low-key and gloomy, muted colours, mostly
dark tones with a few warm highlights.

Style: chunky pixel art at 32×32 resolution, limited palette of about 8
colours, NO black outlines (shapes are defined by light and shadow only), no
anti-aliasing, no gradients, no dithering, hard pixel edges.

Nothing but the chest: no glow, no light effects, no sparkles, no dust, no
particles, no coins or treasure, no text, no UI, no ground shadow, no
background objects.

- Wooden: Small, squat, old and worn. Dark oak planks, iron corner brackets and two iron bands, a heavy iron lock plate centred on the front.
- Iron: Weathered grey-brown wood almost hidden under heavy riveted steel plates and bands. Steel lock. Brutal and plain.
- Gilded: Dark red lacquered wood, polished gold bands and corner brackets, ornate gold lock plate, slightly tarnished.
- Obsidian: Carved from black volcanic glass with violet sheen, thin gold bands, a violet gem set in the lock.
- Void: Deep night-blue stone, pale silver bands, a cold blue lock.

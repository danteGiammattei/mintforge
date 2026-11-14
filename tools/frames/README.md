# Cabinet frames

Gemini paints each frame (prompt in the conversation of 15 Nov 2026: one
square frame per image, 64 × 64 grid, magenta inside and out, detail in the
corners, plain repeating sides). Two steps turn one into a frame the game
can stretch to any size:

    python3 tools/frames/snap.py stone.jpg stone-64.png        # onto a true 64 × 64 grid
    python3 tools/frames/build.py stone-64.png public/sprites/frames/stone.png 12 34 12 bottom

`build.py` takes the top-right corner (K × K) and a run of one side (from
column X, L long), evens out the light Gemini painted across the frame,
and puts the frame back together by mirroring and turning them, lit our
way. Then add it to `ART` in src/components/CabinetFrame.jsx with its K and
its band (how thick the frame proper is, without the corner ornament).

| frame | grade | K X L side |
|---|---|---|
| wood  | 0 | 11 18 28 top |
| stone | 1 | 12 34 12 bottom |
| gold  | 2 | 15 30 4 top |
| void  | 3 | 10 30 12 bottom |

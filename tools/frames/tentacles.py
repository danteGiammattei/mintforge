"""Relight the eldritch frame's tentacles after build.py.
usage: python3 tentacles.py eldritch.png [margin=5]
Gemini drew them near black, which vanishes on the game's dark panels.
The outer `margin` ring (where only the corner tentacles reach) is lifted
×2.3 and nudged teal, keeping its shading; the frame itself ×1.7: Gemini
painted both dim."""
import sys
import numpy as np
from PIL import Image

path = sys.argv[1]
M = int(sys.argv[2]) if len(sys.argv) > 2 else 5
a = np.asarray(Image.open(path).convert("RGBA")).astype(float)
H, W = a.shape[:2]
on = a[..., 3] > 0
out = a.copy()
for y in range(H):
    for x in range(W):
        if not on[y, x]: continue
        d = min(x, y, W - 1 - x, H - 1 - y)
        # the frame, and the tentacles more, keeping Gemini's own shading;
        # the tentacles toward the eldritch coin's teal (src/lib/aura.js TENT)
        k = 1.7 if d >= M else 2.3
        c = np.clip(a[y, x, :3] * k + (0 if d >= M else np.array([4, 10, 10])), 0, 255)
        out[y, x, :3] = c
Image.fromarray(out.astype(np.uint8), "RGBA").save(path)
print(f"{path}: frame and tentacles (outer {M}px) relit")

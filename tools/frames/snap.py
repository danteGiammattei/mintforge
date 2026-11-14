"""Snap a Gemini cabinet frame onto a true pixel grid.
usage: python3 snap.py in.png out.png [cells=64]
The frame on magenta → the frame as `cells` × `cells` real pixels, magenta
made transparent. Each pixel takes the median of the middle of its cell."""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 64
a = np.asarray(Image.open(src).convert("RGB")).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
fg = ~((r > 150) & (g < 110) & (b > 150) & (r - g > 90) & (b - g > 90))
ys, xs = np.where(fg)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
px, py = (x1 - x0) / N, (y1 - y0) / N
out = np.zeros((N, N, 4), np.uint8)
for j in range(N):
    for i in range(N):
        xa, xb = int(x0 + (i + 0.25) * px), int(x0 + (i + 0.75) * px)
        ya, yb = int(y0 + (j + 0.25) * py), int(y0 + (j + 0.75) * py)
        m = fg[ya:yb, xa:xb]
        if m.mean() < 0.5: continue
        c = np.median(a[ya:yb, xa:xb][m], axis=0)
        if c[0] - c[1] > 50 and c[2] - c[1] > 50: continue      # magenta bleeding in at an edge
        out[j, i] = list(c.astype(int)) + [255]
Image.fromarray(out, "RGBA").save(dst)
print(f"{dst}: {N}x{N}, {px:.1f} source px per pixel")

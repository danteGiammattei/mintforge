"""Rebuild a snapped frame (snap.py) as a clean nine-slice, evenly lit.
usage: python3 build.py frame-64.png out.png K X L [top|bottom]
K: corner size in pixels (the corner ornament fits inside K × K)
X, L: the run of a side, from column X for L pixels, that repeats; taken
from the top, or from the bottom (turned over) when the top is lit oddly
The top-right corner and that run are taken, the gradient Gemini painted
across the frame is evened out, and the frame is put back together by
mirroring the corner and turning the run, then lit again our way: top and
left catch the light, bottom and right fall into shadow. Out comes a
(2K + L) square for CSS border-image, sliced at K."""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
K, X, L = (int(v) for v in sys.argv[3:6])
SIDE = sys.argv[6] if len(sys.argv) > 6 else "top"
a = np.asarray(Image.open(src).convert("RGBA")).astype(float)
N = a.shape[0]
corner = a[0:K, N - K:N].copy()             # top-right
run = (a[0:K, X:X + L] if SIDE == "top" else a[N - K:N, X:X + L][::-1]).copy()

def lum(p):
    m = p[..., 3] > 0
    return np.median((p[..., :3][m] @ [0.3, 0.59, 0.11])) if m.any() else 1
# even out: bring both pieces to the frame's own middle brightness
target = lum(a)
for p in (corner, run):
    p[..., :3] *= target / lum(p)

S = 2 * K + L
out = np.zeros((S, S, 4))
tr = corner; tl = tr[:, ::-1]; bl = tl[::-1]; br = tr[::-1]
top = run; bottom = run[::-1]; left = run.transpose(1, 0, 2)[:, :]; right = left[:, ::-1]
LIGHT = {"top": 1.12, "left": 1.0, "right": 0.78, "bottom": 0.7, "tl": 1.12, "tr": 0.95, "bl": 0.85, "br": 0.7}
def put(piece, y, x, k):
    p = piece.copy(); p[..., :3] = np.clip(p[..., :3] * LIGHT[k], 0, 255)
    out[y:y + p.shape[0], x:x + p.shape[1]] = p
put(tl, 0, 0, "tl"); put(tr, 0, K + L, "tr"); put(bl, K + L, 0, "bl"); put(br, K + L, K + L, "br")
put(top, 0, K, "top"); put(bottom, K + L, K, "bottom")
put(left.transpose(0, 1, 2), K, 0, "left"); put(right, K, K + L, "right")
Image.fromarray(out.astype(np.uint8), "RGBA").save(dst)
print(f"{dst}: {S}x{S}, slice {K}")

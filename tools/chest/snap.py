"""Snap a Gemini chest strip onto a true pixel grid.
usage: python3 snap.py in.png out.png [cells_wide=36]
Six frames on magenta → one sheet of six frames, each W×H real pixels,
bottom-aligned on the chest's base, which does not move between frames."""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 36
a = np.asarray(Image.open(src).convert("RGB")).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
magenta = (r > 150) & (g < 110) & (b > 150) & (r - g > 90) & (b - g > 90)
fg = ~magenta

cols = fg.any(axis=0)
spans, s = [], None
for x, v in enumerate(list(cols) + [False]):
    if v and s is None: s = x
    if not v and s is not None:
        if x - s > 40: spans.append((s, x))
        s = None
assert len(spans) == 6, f"expected 6 frames, found {len(spans)}"

frames = []
for s, e in spans:
    ys = np.where(fg[:, s:e].any(axis=1))[0]
    bottom = ys.max() + 1
    # the base: its left and right edge a little above the bottom
    row = fg[bottom - 12, s:e]
    xs = np.where(row)[0]
    x0, x1 = s + xs.min(), s + xs.max() + 1
    p = (x1 - x0) / N
    rows = int(np.ceil((bottom - ys.min()) / p - 0.3))
    M = 2                                   # room either side for a lid wider than the base
    cells = np.zeros((rows, N + 2 * M, 4), np.uint8)
    for j in range(rows):
        cy1 = bottom - j * p; cy0 = cy1 - p
        for i in range(-M, N + M):
            cx0 = x0 + i * p; cx1 = cx0 + p
            ya, yb = int(cy0 + p * 0.25), int(cy1 - p * 0.25)
            xa, xb = int(cx0 + p * 0.25), int(cx1 - p * 0.25)
            if yb <= ya or xb <= xa or ya < 0 or xa < s - 2 or xb > e + 2: continue
            m = fg[ya:yb, xa:xb]
            if m.mean() < 0.5: continue
            px = a[ya:yb, xa:xb][m]
            cells[rows - 1 - j, i + M] = list(np.median(px, axis=0).astype(int)) + [255]
    frames.append(cells)

H = max(f.shape[0] for f in frames); FW = frames[0].shape[1]
sheet = np.zeros((H, FW * 6, 4), np.uint8)
for k, f in enumerate(frames):
    sheet[H - f.shape[0]:, k * FW:(k + 1) * FW] = f

img = Image.fromarray(sheet, "RGBA")
# one shared palette across the six frames, so a colour stays a colour as the lid moves
rgb = img.convert("RGB"); alpha = img.getchannel("A")
q = rgb.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
q.putalpha(alpha)
q.save(dst)
print(f"{dst}: {FW}x{H} per frame")

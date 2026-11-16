import { useEffect, useRef } from "react";
import { ZODIAC, SKY } from "../lib/coin.js";
import { ASTRAL } from "../../shared/tuning.js";

/* ─── the star signs held, as badges ──────────────────────────────────────
 * Twelve signs, one astral coin each in all the game (shared/tuning.js
 * ASTRAL). Each held sign is a small badge in the astral coins' own sky:
 * a pointed hexagon, cream frame, teal field banding darker inward, the
 * sign's glyph in cream. One not held is a dark empty socket, so the row
 * says how far along you are, like a wall of earned badges. 15 × 17
 * pixels, shown at 2×. */
const W = 15, H = 17;
const rgb = c => `rgb(${c.join(",")})`;

function paint(cv, sign, held) {
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), px = (x, y, col) => { c.fillStyle = rgb(col); c.fillRect(x, y, 1, 1); };
  const mx = (W - 1) / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // pointed top and bottom, straight sides
    const dy = y < 4 ? 4 - y : y > H - 5 ? y - (H - 5) : 0;
    const half = mx - dy * 1.6;
    const d = Math.abs(x - mx);
    if (d > half + 0.01) continue;
    const edge = d > half - 1 || y === 0 || y === H - 1;
    const ring = Math.min(half - d, Math.min(y, H - 1 - y));
    if (!held) { px(x, y, edge ? [40, 46, 56] : [14, 17, 22]); continue; }
    if (edge) px(x, y, y < H / 2 ? SKY.frame : SKY.frameDark);
    else px(x, y, SKY.bands[Math.max(0, Math.min(SKY.bands.length - 1, 5 - Math.floor(ring)))]);
  }
  const g = ZODIAC[sign];
  for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 7; gx++) if (g[gy][gx] === "#") px(4 + gx, 5 + gy, held ? SKY.ink : [44, 50, 60]);
  if (held) px(4, 2, SKY.star);                    // a glint
}

function Badge({ sign, held }) {
  const ref = useRef(null);
  useEffect(() => { paint(ref.current, sign, held); }, [sign, held]);
  return <canvas ref={ref} role="img" aria-label={`${ASTRAL.signs[sign]}${held ? "" : ", not held"}`} title={ASTRAL.signs[sign]}
                 style={{ width: W * 2, height: H * 2, imageRendering: "pixelated", filter: held ? "drop-shadow(0 0 3px rgba(106,178,196,.55))" : "none" }}/>;
}

export default function SignBadges({ signs }) {
  const held = new Set(signs);
  return (
    <div className="panel" style={{ padding: 8 }} aria-label={`Star signs held: ${held.size} of 12`}>
      <div className="between" style={{ marginBottom: 6 }}>
        <span className="t-label">STAR SIGNS</span>
        <span className="t-label" style={{ color: `rgb(${SKY.bands[6].join(",")})` }}>{held.size} / 12</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", justifyItems: "center", gap: 6 }}>
        {ASTRAL.signs.map((_, i) => <Badge key={i} sign={i} held={held.has(i)}/>)}
      </div>
    </div>
  );
}

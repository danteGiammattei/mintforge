import { ICONS } from "./icons.js";

/* An 11×11 pixel icon as crisp SVG rects, in the current text colour.
 * `size` should be a multiple of 11 so every icon pixel is square. */
const paths = new Map();
function pathFor(name) {
  if (!paths.has(name)) {
    const rows = ICONS[name] || ICONS.mark;
    let d = "";
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== "#") continue;
        let w = 1; while (row[x + w] === "#") w++;
        d += `M${x} ${y}h${w}v1h-${w}z`;
        x += w - 1;
      }
    });
    paths.set(name, d);
  }
  return paths.get(name);
}

export default function PixelIcon({ name, size = 22, title, style, className }) {
  return (
    <svg viewBox="0 0 11 11" width={size} height={size} shapeRendering="crispEdges" className={className}
         role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}
         style={{ flexShrink: 0, display: "block", ...style }}>
      <path d={pathFor(name)} fill="currentColor"/>
    </svg>
  );
}

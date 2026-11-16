import { useEffect, useRef } from "react";
import { TOMES } from "../../shared/tomes.js";
import { CHESTS } from "../../shared/tuning.js";
import { RARITY } from "../../shared/sigil.js";
import { tomeCover } from "../lib/tomeArt.js";

/* ─── the shelf of tomes ──────────────────────────────────────────────
 * Every tome there is: the ones you have, to open on the desk, and the
 * ones still to find, locked, with where they turn up. */
function Cover({ tome, owned }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, art = tomeCover(tome, owned), x = c.getContext("2d");
    x.clearRect(0, 0, c.width, c.height); x.drawImage(art, 0, 0);
  }, [tome, owned]);
  return <canvas ref={ref} width={24} height={30} aria-hidden style={{ width: 72, height: 90, imageRendering: "pixelated" }}/>;
}

export default function TomeShelf({ owned, open, onPick, onClose }) {
  return (
    <div className="veil appear" style={{ zIndex: 440 }} onClick={onClose}>
      <div className="panel panel-hi sheet rise" role="dialog" aria-modal="true" aria-label="Your tomes" style={{ padding: 12 }} onClick={e => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 12 }}>
          <h2 className="t-title" style={{ margin: 0 }}>TOMES</h2>
          <span className="t-label">{owned.length} / {TOMES.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, maxHeight: "60vh", overflowY: "auto", padding: 2 }}>
          {TOMES.map(t => {
            const has = owned.includes(t.id), top = Math.max(...t.pages.map(p => p.tier));
            return (
              <button key={t.id} className="tile" disabled={!has} aria-pressed={open === t.id} onClick={() => onPick(t.id)}
                      style={{ padding: 8, gap: 6, minHeight: 168, justifyContent: "flex-start" }}
                      aria-label={has ? `${t.name}, ${t.pages.length} pages` : `A tome not yet found. ${CHESTS.names[t.tier]} chests and rarer hold it.`}>
                <Cover tome={t} owned={has}/>
                <span style={{ textAlign: "center", lineHeight: 1.3 }}>{has ? t.name : "NOT YET FOUND"}</span>
                {has
                  ? <span className="t-label">{t.pages.length} PAGES · UP TO <span style={{ color: RARITY[top].c }}>{RARITY[top].n}</span></span>
                  : <span className="t-label">IN {CHESTS.names[t.tier]} CHESTS AND RARER</span>}
              </button>
            );
          })}
        </div>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

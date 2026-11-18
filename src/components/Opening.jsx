import { useEffect, useRef, useState } from "react";
import { mount, SURROUND } from "../scenes/opening.js";
import { feel } from "../lib/feel.js";

/* ─── the beginning, over everything ──────────────────────────────────
 * The opening story (scenes/opening.js), once after sign-up and again
 * whenever it is asked for from the journal. SKIP ends it at once. */
const SEEN_KEY = "mf.introSeen";
export const introSeen = () => { try { return !!localStorage.getItem(SEEN_KEY); } catch { return true; } };
const keepSeen = () => { try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* fine */ } };

export default function Opening({ onDone }) {
  const ref = useRef(null), scene = useRef(null);
  const [line, setLine] = useState("");
  const done = useRef(false);
  const end = () => { if (done.current) return; done.current = true; keepSeen(); onDone(); };
  useEffect(() => {
    scene.current = mount(ref.current, { done: end, feel, say: setLine });
    return () => scene.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section aria-label="The beginning" style={{
      position: "fixed", inset: 0, zIndex: 900, background: `rgb(${SURROUND})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <canvas ref={ref} role="img" aria-label="The story of how you came to the door." style={{ display: "block", touchAction: "manipulation" }}/>
      </div>
      <button className="t-dim" onClick={() => { feel("tap"); end(); }}
              style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 8px)", right: "calc(env(safe-area-inset-right, 0px) + 8px)",
                       background: "none", border: 0, font: "inherit", padding: "8px 12px", minHeight: 40, cursor: "pointer" }}>
        SKIP
      </button>
      <p className="sr-only" aria-live="polite">{line}</p>
      <button className="sr-only" onClick={() => scene.current?.tap()}>Next</button>
    </section>
  );
}

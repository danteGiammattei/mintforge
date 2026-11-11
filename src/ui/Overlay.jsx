import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════════════════
 *  Overlay — in-game dialogs, toasts and the screen-reader voice
 *  ────────────────────────────────────────────────────────────────────
 *  Replaces every alert() and confirm(). Three things, one provider:
 *
 *    const ui = useUi();
 *    if (await ui.confirm({ title, body, yes: "SELL", tone: "danger" })) …
 *    ui.toast("SOLD FOR 40 MARKS");
 *    ui.say("A RARE SCROLL");       // aria-live only: for results that
 *                                   // are otherwise drawn on a canvas
 * ══════════════════════════════════════════════════════════════════════ */

const Ctx = createContext(null);
export const useUi = () => useContext(Ctx);

function Dialog({ d, onClose }) {
  const yesRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    yesRef.current?.focus();
    const key = e => { if (e.key === "Escape") onClose(false); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="veil appear" style={{ zIndex: 700 }} onClick={() => onClose(false)}>
      <div className="panel panel-hi sheet rise" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-b"
           style={{ padding: 16 }} onClick={e => e.stopPropagation()}>
        <div id="dlg-t" className="t-title t-gold" style={{ marginBottom: 8 }}>{d.title}</div>
        {d.body && <div id="dlg-b" className="t-dim" style={{ marginBottom: 16 }}>{d.body}</div>}
        <div style={{ display: "flex", gap: 12 }}>
          {d.no !== null && <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onClose(false)}>{d.no || "CANCEL"}</button>}
          <button ref={yesRef} className={`btn ${d.tone === "danger" ? "btn-danger" : "btn-gold"}`} style={{ flex: 1 }} onClick={() => onClose(true)}>{d.yes || "OK"}</button>
        </div>
      </div>
    </div>
  );
}

export function OverlayProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [live, setLive] = useState("");
  const resolver = useRef(null);
  const nextId = useRef(1);

  const say = useCallback(text => {
    // the same words twice in a row would not be re-announced; nudge them
    setLive(prev => (prev === text ? text + " " : text));
  }, []);
  const confirm = useCallback(d => new Promise(resolve => { resolver.current = resolve; setDialog(d); }), []);
  const close = useCallback(v => { resolver.current?.(v); resolver.current = null; setDialog(null); }, []);
  const toast = useCallback((text, tone = "") => {
    const id = nextId.current++;
    setToasts(t => [...t.slice(-2), { id, text, tone }]);
    say(text);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, [say]);

  const api = useMemo(() => ({
    confirm, toast, say,
    notify: d => confirm({ no: null, ...d }),
  }), [confirm, toast, say]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">{live}</div>
      <div style={{ position: "fixed", left: 0, right: 0, top: "calc(env(safe-area-inset-top, 0px) + 52px)", zIndex: 800, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none", padding: "0 16px" }}>
        {toasts.map(t => (
          <div key={t.id} className="panel panel-hi rise" style={{ padding: "8px 12px", textAlign: "center", color: t.tone === "bad" ? "var(--blood)" : t.tone === "magic" ? "var(--magic)" : "var(--candle)" }}>{t.text}</div>
        ))}
      </div>
      {dialog && <Dialog d={dialog} onClose={close}/>}
    </Ctx.Provider>
  );
}

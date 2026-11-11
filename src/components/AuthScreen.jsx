import { useState } from "react";
import { apiClient } from "../lib/api.js";
import { rune } from "../lib/coin.js";

/* ─── AUTH ────────────────────────────────────────────────────────────────
 * Sign in or make an account. Username: 3–20 letters, digits or
 * underscores. PIN: 4–6 digits. Too many wrong PINs and the server asks
 * you to wait; the message says for how long. */
export default function AuthScreen({ onAuthed }) {
  const [mode,     setMode]     = useState("login");
  const [username, setUsername] = useState("");
  const [pin,      setPin]      = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState(null);

  const canSubmit = username.trim().length >= 3 && /^\d{4,6}$/.test(pin) && !busy;
  const submit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setErr(null); setBusy(true);
    try {
      const api = apiClient(null);
      const res = await (mode === "login" ? api.login(username.trim(), pin) : api.register(username.trim(), pin));
      onAuthed(res.token);
    } catch (ex) { setErr(ex.message); setBusy(false); }
  };

  return (
    <main style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", overflowY: "auto", height: "100%" }}>
      <div style={{ width: "100%", maxWidth: 328, textAlign: "center" }}>
        {/* the door, in miniature: a slot of cold light in a black wall */}
        <div aria-hidden style={{ width: 22, height: 88, margin: "0 auto 24px", background: "linear-gradient(to bottom, #0b0d12, #394256 50%, #0b0d12)", boxShadow: "0 0 0 2px #000, 0 0 0 4px #0d0f15" }}>
          <div style={{ width: 4, height: 2, margin: "0 auto", position: "relative", top: 52, left: 4, background: "#aef0d6", boxShadow: "-6px 0 0 #aef0d6" }}/>
        </div>
        <h1 className="t-big" style={{ margin: 0 }}>MINTFORGE</h1>
        <div className="t-rune t-dim" style={{ fontSize: 16, marginTop: 4 }}>{rune("MINTFORGE")}</div>
        <p className="t-dim" style={{ margin: "16px 0 24px" }}>DRAW A SIGIL. PAY THE THING BEHIND THE DOOR. SEE WHAT HE GIVES BACK.</p>

        <form onSubmit={submit} className="panel" style={{ padding: 16, textAlign: "left" }}>
          <div className="seg" role="tablist" style={{ marginBottom: 16 }}>
            {[["login", "SIGN IN"], ["register", "NEW ACCOUNT"]].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); setErr(null); }}>{label}</button>
            ))}
          </div>

          <label className="t-label" htmlFor="auth-user">USERNAME</label>
          <input id="auth-user" className="field t-plain" style={{ margin: "4px 0 12px" }} value={username} maxLength={20}
                 autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                 onChange={e => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}/>

          <label className="t-label" htmlFor="auth-pin">PIN · 4 TO 6 DIGITS</label>
          <input id="auth-pin" className="field" style={{ margin: "4px 0 16px", letterSpacing: ".4em" }} value={pin} maxLength={6}
                 type="password" inputMode="numeric" pattern="\d*" autoComplete={mode === "login" ? "current-password" : "new-password"}
                 onChange={e => setPin(e.target.value.replace(/\D/g, ""))}/>

          {err && <div role="alert" className="t-blood" style={{ marginBottom: 12 }}>{err}</div>}

          <button type="submit" className="btn btn-gold btn-block" disabled={!canSubmit}>
            {busy ? "ONE MOMENT" : mode === "login" ? "ENTER" : "BEGIN"}
          </button>
        </form>
        {mode === "register" && <p className="t-label" style={{ marginTop: 16 }}>THERE IS NO PIN RECOVERY. CHOOSE ONE YOU WILL KEEP.</p>}
      </div>
    </main>
  );
}

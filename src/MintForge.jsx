import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameContext } from "./lib/GameContext.js";
import { useGameState } from "./state/useGameState.js";
import { OverlayProvider, useUi } from "./ui/Overlay.jsx";
import { feel } from "./lib/feel.js";
import { TITLES, TITLE_LEVELS, FRAMES } from "./lib/data.js";
import AuthScreen from "./components/AuthScreen.jsx";
import BottomNav, { TABS } from "./components/BottomNav.jsx";
import TopBar from "./components/TopBar.jsx";
import Scribe from "./screens/Scribe.jsx";
import Door from "./screens/Door.jsx";
import Satchel from "./screens/Satchel.jsx";
import Vault from "./screens/Vault.jsx";
import Tavern from "./screens/Tavern.jsx";
import Profile from "./screens/Profile.jsx";

/* ══════════════════════════════════════════════════════════════════════
 *  MintForge — the shell
 *  ────────────────────────────────────────────────────────────────────
 *  Sign-in, the frame around the six screens, and nothing else. State
 *  lives in state/useGameState.js; each screen is its own file.
 *
 *  The two canvas scenes (Scribe, Door) take the whole space above the
 *  nav — no top bar — because the door in particular must be nothing but
 *  the door.
 * ══════════════════════════════════════════════════════════════════════ */

const SCREENS = { scribe: Scribe, door: Door, satchel: Satchel, vault: Vault, tavern: Tavern, profile: Profile };
const BARE = new Set(["scribe", "door"]);
const TAB_KEY = "mintforge:tab";

function Splash({ children }) {
  return (
    <main className="app" style={{ alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <div className="t-big">MINTFORGE</div>
      {children}
    </main>
  );
}

function Game({ game }) {
  // A new player starts at the door, where the first chest is waiting.
  const [tab, setTabRaw] = useState(() => {
    if (!(game.stats.visits > 0)) return "door";
    let saved = null;
    try { saved = sessionStorage.getItem(TAB_KEY); } catch { /* fine */ }
    return TABS.some(t => t[0] === saved) ? saved : "scribe";
  });
  const setTab = useCallback(id => {
    setTabRaw(id);
    try { sessionStorage.setItem(TAB_KEY, id); } catch { /* fine */ }
  }, []);
  useEffect(() => { document.title = `${TABS.find(t => t[0] === tab)?.[2] || ""} · MintForge`; }, [tab]);

  // A level gained is said out loud, along with anything it unlocked.
  const ui = useUi(), seenLevel = useRef(game.level);
  useEffect(() => {
    const was = seenLevel.current; seenLevel.current = game.level;
    if (game.level <= was) return;
    feel("gift");
    ui.toast(`LEVEL ${game.level}`, "magic");
    TITLES.forEach((t, i) => { if (TITLE_LEVELS[i] > was && TITLE_LEVELS[i] <= game.level) ui.toast(`NEW TITLE: ${t}`); });
    Object.values(FRAMES).forEach(f => { if (!f.premium && f.minLvl > was && f.minLvl <= game.level) ui.toast(`NEW BANNER: ${f.lbl}`); });
  }, [game.level, ui]);

  const ctx = useMemo(() => ({ ...game, tab, setTab }), [game, tab, setTab]);
  const Screen = SCREENS[tab] || Scribe;
  const waiting = game.chests.length + game.dusty.length;

  return (
    <GameContext.Provider value={ctx}>
      <div className="app">
        <a className="sr-only" href="#main">Skip to the game</a>
        {!BARE.has(tab) && <TopBar marks={game.marks} level={game.level} xp={game.xp} onRetry={game.retrySaves}/>}
        <main id="main" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingTop: BARE.has(tab) ? "env(safe-area-inset-top, 0px)" : 0 }}>
          <Screen key={tab}/>
        </main>
        <BottomNav tab={tab} setTab={setTab} badges={{ satchel: waiting }}/>
      </div>
    </GameContext.Provider>
  );
}

export default function MintForge() {
  const game = useGameState();
  const { boot } = game;

  let body;
  if (boot.status === "anon") body = <AuthScreen onAuthed={game.onAuthed}/>;
  else if (boot.status === "error") body = (
    <Splash>
      <p className="t-blood" role="alert" style={{ margin: 0, maxWidth: 300 }}>{boot.error}</p>
      <p className="t-dim" style={{ margin: 0, maxWidth: 300 }}>YOU ARE STILL SIGNED IN. NOTHING HAS BEEN LOST.</p>
      <button className="btn btn-gold" style={{ minWidth: 200 }} onClick={game.reload}>TRY AGAIN</button>
      <button className="btn btn-ghost" style={{ minWidth: 200 }} onClick={game.signOut}>SIGN OUT</button>
    </Splash>
  );
  else if (boot.status !== "ready" || !game.snap) body = <Splash><p className="t-dim blink" role="status" style={{ margin: 0 }}>OPENING THE VAULT</p></Splash>;
  else body = <Game game={game}/>;

  return <OverlayProvider>{body}</OverlayProvider>;
}

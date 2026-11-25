import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import MintForge from "./MintForge.jsx";
import { restoreAppIcon } from "./lib/appIcon.js";

// the coin you chose as the icon, back in place before anything draws
restoreAppIcon();

// a long press is a game move (opening a chest, brushing), never a page's
// context menu; typing fields keep theirs
document.addEventListener("contextmenu", e => {
  if (!e.target.closest?.("input, textarea, [contenteditable='true']")) e.preventDefault();
});

// iOS scrolls the whole page up to make room for the keyboard and does
// not always put it back, which leaves the app shifted and the nav over
// the content. Nothing here scrolls the page itself (the screens scroll
// inside), so whenever the keyboard goes or the visible area changes,
// put the page back at the top.
const settle = () => { if (window.scrollY || document.documentElement.scrollTop) window.scrollTo(0, 0); };
document.addEventListener("focusout", () => setTimeout(settle, 50));
window.visualViewport?.addEventListener("resize", () => setTimeout(settle, 50));
window.addEventListener("orientationchange", () => setTimeout(settle, 300));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MintForge />
  </React.StrictMode>
);

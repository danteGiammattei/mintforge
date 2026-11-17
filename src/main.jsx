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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MintForge />
  </React.StrictMode>
);

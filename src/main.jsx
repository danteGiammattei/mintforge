import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import MintForge from "./MintForge.jsx";

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

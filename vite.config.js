import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";

/* War's playing cards are not in the repo (their licence forbids it): see
 * tools/cards.mjs. Say so, loudly, whenever a build goes out without them. */
const cardsCheck = () => ({
  name: "mintforge-cards-check",
  apply: "build",
  buildStart() {
    if (!existsSync("public/sprites/cards/card_back.png")) {
      this.warn("\n\n  ⚠  THE PLAYING CARDS ARE MISSING: war will deal plain cards.\n" +
                "     Run once on this machine, then build again:\n" +
                "       node tools/cards.mjs path/to/Jorels_Card_Pack.zip\n");
    }
  },
});

export default defineConfig({
  plugins: [react(), cardsCheck()],
  build: { outDir: "dist", sourcemap: false }
});

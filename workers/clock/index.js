/* The server's clock: a small Worker that wakes every minute and settles
 * the auctions whose time has run out (server/auction.js), so a sale
 * closes on time even when nobody is playing. It shares MintForge's D1
 * database. The game also settles anything due whenever someone loads,
 * so if this is ever not running nothing is lost, only late.
 *
 * Deploy once from the repo root:
 *   npx wrangler deploy --config workers/clock/wrangler.toml
 */
import { settleDue } from "../../server/auction.js";
import { crownDue } from "../../server/ranks.js";

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      // up to a few hundred a minute; anything past that waits a minute
      for (let i = 0; i < 8; i++) if (await settleDue(env.DB, Date.now(), 25) < 25) break;
      // and when a season has ended, its leaderboards are crowned (server/ranks.js)
      await crownDue(env.DB, Date.now());
    })());
  },
};

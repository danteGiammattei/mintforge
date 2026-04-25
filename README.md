# MintForge

Hunt, forge, and gamble ancient coins from lost civilisations.
Runs on Cloudflare Pages + D1.

## Architecture

- **Frontend** — Vite + React, built into `dist/`
- **API** — Cloudflare Pages Functions (`functions/api/...`)
- **Storage** — D1 (SQLite), bound as `DB`
- **Auth** — username + 4-6 digit PIN, PBKDF2-hashed, session tokens in `localStorage`

All API routes are same-origin; no separate Worker.

## Local dev

```bash
npm install
npm run dev           # Vite only — API returns 404 locally
```

For full-stack local after D1 is set up:
```bash
npx wrangler pages dev -- npm run dev
```

## Deploy walkthrough

### 1. Create the D1 database

```bash
npx wrangler d1 create mintforge
```

Copy the printed `database_id` into `wrangler.toml` under `[[d1_databases]]`.

### 2. Apply the schema

```bash
npx wrangler d1 execute mintforge --file=./schema.sql --remote
```

Verify:
```bash
npx wrangler d1 execute mintforge --command="SELECT name FROM sqlite_master WHERE type='table'" --remote
```
Expect: `players`, `player_state`, `coins`, `sessions`.

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial MintForge deploy"
git remote add origin <your-repo-url>
git push -u origin main
```

### 4. Connect to Cloudflare Pages

Dashboard → Workers & Pages → Create → Pages → Connect to Git → pick repo.

Build settings:
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- Env var: `NODE_VERSION` = `20`

### 5. Bind D1 to the Pages project

After first deploy: Pages project → **Settings** → **Functions** → **D1 database bindings** → Add:
- Variable name: `DB`
- D1 database: `mintforge`

Then **Retry deployment**. API endpoints only work after binding is attached.

### 6. Smoke test

```bash
curl -X POST https://<your-pages-url>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","pin":"1234"}'
```

Expect: `{ "token": "...", "player": { ... } }`.

### 7. Custom domain (optional)

Pages project → Custom domains → `mintforge.projectthoth.com` (auto-DNS if zone is already on your CF account).

## Schema reference

See `schema.sql`. Four tables:
- **players** — account credentials (PBKDF2 + salt, 10k iterations)
- **player_state** — xp, shovel_level, brush_level, frame, bio, selected_title, pinned_ids (JSON)
- **coins** — id, seed, metal_idx, shiny, acquired_at (rest derives from seed via `mkCoin(seed)`)
- **sessions** — token → player_id

## API surface

| Method | Path                 | Auth | Purpose                                  |
|--------|----------------------|------|------------------------------------------|
| POST   | `/api/auth/register` | —    | Create account + session                 |
| POST   | `/api/auth/login`    | —    | Authenticate + session                   |
| POST   | `/api/auth/logout`   | ✓    | Revoke session                           |
| GET    | `/api/vault`         | ✓    | Full player state + coin list            |
| POST   | `/api/vault`         | ✓    | Transactional `{remove?, add?, state?}`  |

All coin mutations flow through the single transactional endpoint — forges and gambles stay atomic.

## Sync model

- **Coin add/remove**: explicit API call inline with each mutation (immediate)
- **Scalar state** (xp, levels, bio, title, frame, pinnedIds): debounced `useEffect`, 800ms after last change
- **Failures are swallowed** — game stays playable offline; next load may be stale until reconnected

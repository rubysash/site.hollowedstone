# Deploying Hollowed Stone to Cloudflare Workers (Free Tier)

This guide deploys the site to Cloudflare's free tier using GitHub. The site hosts multiple games, each at its own path (e.g., `hollowedstone.com/play/oroboros/`).

**GitHub repo:** `https://github.com/rubysash/site.hollowedstone`

> **Note:** Cloudflare deprecated Pages in April 2025. This project uses **Cloudflare Workers** with static assets — the current recommended approach.

---

## What You Need

- A GitHub account (free)
- A Cloudflare account (free — sign up at https://dash.cloudflare.com/sign-up)
- No credit card required

## Free Tier Limits

| Resource | Free Tier Limit |
|----------|----------------|
| Worker requests | 100,000 per day |
| KV reads | 100,000 per day |
| KV writes | 1,000 per day |
| KV storage | 1 GB |

A typical Ouroboros game uses ~200 KV reads and ~50 writes. Hundreds of concurrent games fit in free tier.

---

## How It Works

```
wrangler.toml defines:
  main = "worker/index.js"        ← Worker script (API router)
  [assets] directory = "./public"  ← Static files (HTML, CSS, JS)

Requests:
  /play/oroboros/api/*  →  Worker handles it (game logic, KV read/write)
  everything else       →  Served as static file from public/
```

The `run_worker_first` setting in `wrangler.toml` tells Cloudflare to route API paths through the Worker before checking static files. All other requests serve directly from the CDN.

---

## Step 1: Push to GitHub

### 1a. Initialize and push

```bash
cd site.hollowedstone
git init
git add -A
git commit -m "Initial commit — Hollowed Stone game site"
git remote add origin https://github.com/rubysash/site.hollowedstone.git
git branch -M main
git push -u origin main
```

### What gets pushed

```
public/                  ← Static files (DEPLOYED to CDN)
worker/index.js          ← Worker script (DEPLOYED as edge function)
wrangler.toml            ← Cloudflare configuration
package.json             ← npm dependencies (wrangler)
docs/                    ← Reference material (NOT deployed)
start.bat                ← Local dev launcher
*.md                     ← Documentation
```

### What's excluded (.gitignore)

```
node_modules/            ← Cloudflare installs during build
.npm-cache/              ← Local npm cache
.wrangler/               ← Local dev state
.claude/                 ← Claude Code settings
.dev.vars                ← Local env vars
package-lock.json        ← Regenerated during build
```

---

## Step 2: Create a Worker from GitHub

1. Log in to https://dash.cloudflare.com
2. Go to **Compute (Workers & Pages)** in the sidebar
3. Click **Create**
4. You'll see **"Create a Worker"** — click **Import from GitHub**
   (or "Connect to Git" if prompted)
5. Authorize Cloudflare to access your GitHub account
6. Select the `site.hollowedstone` repository
7. Configure the build settings:

| Setting | Value |
|---------|-------|
| **Production branch** | `main` |
| **Build command** | `npm install` |
| **Deploy command** | `npx wrangler deploy` *(should be the default)* |
| **Root directory** | `/` *(leave default)* |

8. Click **Save and Deploy**

The first deploy may fail because KV isn't bound yet — that's expected. Continue to Step 3.

> **What happens:** On every push to `main`, Cloudflare runs `npm install` (installs wrangler), then `npx wrangler deploy` (reads `wrangler.toml`, uploads static assets from `public/`, bundles and deploys `worker/index.js`).

---

## Step 3: Create the KV Namespace

### 3a. Create the namespace

1. In the Cloudflare dashboard sidebar, go to **Storage & Databases** → **KV**
2. Click **Create a namespace**
3. Name it `GAME_STATE`
4. Click **Add**
5. Copy the **Namespace ID** (long hex string)

### 3b. Update wrangler.toml

Replace the placeholder in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "GAME_STATE"
id = "your-actual-namespace-id-here"
```

Commit and push:
```bash
git add wrangler.toml
git commit -m "Add KV namespace ID"
git push
```

This triggers a new deploy with the KV binding active.

> **Alternative:** You can also bind KV through the dashboard under your Worker's **Settings → Bindings** instead of putting the ID in `wrangler.toml`. Either approach works.

---

## Step 4: Connect Custom Domain

To serve at `hollowedstone.com`:

1. Ensure `hollowedstone.com` is added to your Cloudflare account (DNS managed by Cloudflare)
2. Go to your Worker → **Settings** → **Domains & Routes**
3. Click **Add** → **Custom domain**
4. Enter `hollowedstone.com`
5. Cloudflare provisions a free SSL certificate automatically

After DNS propagates (usually minutes):
```
https://hollowedstone.com/                    ← Landing page
https://hollowedstone.com/play/oroboros/      ← Ouroboros lobby
```

---

## Step 5: Verify

1. Open `https://hollowedstone.com/` — you should see the landing page
2. Click **Ouroboros** → game lobby at `/play/oroboros/`
3. Click **Create Game** → get a 6-character access code
4. Open the same URL in a second browser tab (or incognito)
5. Join via the game link → both tabs enter split selection

---

## Adding Future Games

Each game is self-contained. To add a second game:

1. Create static files in `public/play/new-game/`
2. Add API route handling in `worker/index.js` (new route prefix)
3. Add a card to `public/index.html` linking to `/play/new-game/`
4. Add rulebooks to `docs/rulebooks/new-game/`
5. Update the `run_worker_first` pattern in `wrangler.toml` if needed
6. Push to `main` — auto-deploys

Games share the KV namespace (keys are prefixed by access code, no collisions).

---

## Local Development

**Windows:** Double-click `start.bat`

**Any OS:**
```bash
npm install
npx wrangler dev --port 8788
```

- http://localhost:8788/ — Landing page
- http://localhost:8788/play/oroboros/ — Game lobby
- LAN play: share `http://YOUR_LAN_IP:8788` with the other player

Local KV data is stored in `.wrangler/` and does not affect production.

---

## Troubleshooting

### API returns 404

Check that `wrangler.toml` has:
```toml
main = "worker/index.js"
[assets]
run_worker_first = ["/play/*/api/*"]
```
The `run_worker_first` pattern tells Cloudflare to route API paths through the Worker instead of looking for a static file.

### "Game not found" errors

KV binding is missing:
1. Check `wrangler.toml` has the correct namespace ID
2. Or check Worker **Settings → Bindings** in the dashboard
3. The binding variable name must be `GAME_STATE` (case-sensitive)

### "Unknown theme" on game creation

Theme JSON files must exist in `public/play/oroboros/themes/`. The Worker loads them via `env.ASSETS.fetch()`.

### Build fails with import errors

The Worker imports shared engine code:
```
worker/index.js → import from '../public/play/oroboros/js/shared/engine.js'
```
Wrangler's bundler (esbuild) resolves this at deploy time. If it fails, verify the path matches the actual file location.

---

## Architecture

```
Browser                          Cloudflare Edge (hollowedstone.com)
  |                                   |
  |  GET /                            |
  |  ─────────────────────────────>  static: public/index.html
  |                                   |
  |  GET /play/oroboros/              |
  |  ─────────────────────────────>  static: public/play/oroboros/index.html
  |                                   |
  |  POST /play/oroboros/api/create   |
  |  ─────────────────────────────>  worker/index.js → handleCreate()
  |  <──── { code, token }           |──> KV.put(game state)
  |                                   |
  |  GET /play/oroboros/api/state     |
  |  ─────────────────────────────>  worker/index.js → handleState()
  |  <──── { board, turn, log }      |──> KV.get(game state)
  |                                   |
  |  POST /play/oroboros/api/move     |
  |  ─────────────────────────────>  worker/index.js → handleMove()
  |  <──── { ok }                    |──> validate + KV.put
```

One Worker script (`worker/index.js`) handles all API routes. Static files served directly from CDN. Game state in KV.

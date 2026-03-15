# Deploying Hollowed Stone to Cloudflare Workers (Free Tier)

This guide deploys the site to Cloudflare's free tier. The site hosts multiple games, each at its own path (e.g., `hollowedstone.com/play/oroboros/`).

**GitHub repo:** `https://github.com/rubysash/site.hollowedstone`

> **Note:** Cloudflare deprecated Pages in April 2025. This project uses **Cloudflare Workers** with static assets — the current recommended approach.

---

## What You Need

- A GitHub account (free)
- A Cloudflare account (free — sign up at https://dash.cloudflare.com/sign-up)
- [Node.js](https://nodejs.org/) LTS installed locally (for wrangler CLI)
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

## Step 1: Set Up the Repo

### 1a. Initialize and push to GitHub

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
node_modules/            ← Installed locally, not committed
.npm-cache/              ← Local npm cache
.wrangler/               ← Local dev state
.claude/                 ← Claude Code settings
.dev.vars                ← Local env vars
package-lock.json        ← Regenerated on install
```

---

## Step 2: Create the KV Namespace

Before deploying, you need a KV namespace for game state storage.

### 2a. Create the namespace

1. In the Cloudflare dashboard sidebar, go to **Storage & Databases** → **Workers KV**
2. Click **Create a namespace**
3. Name it `GAME_STATE`
4. Click **Create**
5. Copy the **Namespace ID** (long hex string — visible in the URL or on the namespace page)

> The namespace ID is not a secret. It's safe to commit in `wrangler.toml`. It's just an identifier — no one can read or write your KV data without your Cloudflare account credentials.

### 2b. Update wrangler.toml

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

The namespace starts empty — that's correct. KV pairs (`game:ABCD12`, `code:ABCD12`) are created automatically when players create games.

---

## Step 3: Deploy

### Deploy from the command line (recommended)

The most reliable way to deploy is directly from your local machine using the wrangler CLI:

```bash
npm install
npx wrangler deploy
```

On first run, wrangler will open a browser window asking you to log in to Cloudflare. After auth, it deploys directly.

You should see output like:
```
Uploaded 19 of 19 assets
✨ Success! Uploaded 19 files
Your Worker has access to the following bindings:
  env.GAME_STATE    KV Namespace
  env.ASSETS        Assets
Published hollowedstone
  https://hollowedstone.YOUR_SUBDOMAIN.workers.dev
```

### Redeploying after changes

Every time you make changes:

```bash
git add -A
git commit -m "Description of changes"
git push
npx wrangler deploy
```

Push to GitHub for version control, then `npx wrangler deploy` to go live. Deploy takes ~5 seconds.

### GitHub auto-deploy (optional, may not work reliably)

Cloudflare offers GitHub integration that auto-deploys on push. To set it up:

1. Go to **Compute (Workers & Pages)** in the sidebar
2. Click **Create** → **Import from GitHub**
3. Select the `site.hollowedstone` repository
4. Build command: `npm install`, Deploy command: `npx wrangler deploy`

However, dashboard-triggered deploys and retries have been unreliable. If auto-deploy doesn't trigger, fall back to `npx wrangler deploy` from the command line — it always works.

---

## Step 4: Connect Custom Domain

### 4a. DNS records

In your Cloudflare DNS settings for `hollowedstone.com`, set up:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `192.0.2.1` | **Proxied** (orange cloud ON) |
| CNAME | `www` | `hollowedstone.com` | **Proxied** (orange cloud ON) |

The `192.0.2.1` IP is a dummy address — traffic never reaches it. The orange cloud proxy intercepts all requests and routes them to your Worker instead.

> **Important:** The proxy (orange cloud) MUST be on. If it's set to DNS-only (gray cloud), requests will try to connect to the dummy IP and fail with a timeout error.

### 4b. Worker routes

1. Go to your domain settings for `hollowedstone.com` in the Cloudflare dashboard
2. Find the **Workers Routes** section
3. Add two routes:

| Route | Worker |
|-------|--------|
| `hollowedstone.com/*` | `hollowedstone` |
| `*.hollowedstone.com/*` | `hollowedstone` |

The first route handles the bare domain. The second handles subdomains (like `www`).

> **Note:** `*.hollowedstone.com/*` does NOT match `hollowedstone.com` — you need both routes.

### 4c. SSL

Cloudflare provisions a free SSL certificate automatically. No action needed.

After DNS propagates (usually minutes):
```
https://hollowedstone.com/                    ← Landing page
https://hollowedstone.com/play/oroboros/      ← Ouroboros lobby
```

---

## Step 5: Verify

1. Open `https://hollowedstone.com/` — you should see the Hollowed Stone landing page
2. Click **Ouroboros** → game lobby at `/play/oroboros/`
3. Click **Create Game** → get a 6-character access code
4. Open the same URL in a second browser tab (or incognito window)
5. Join via the game link → both tabs enter split selection
6. Check Cloudflare dashboard → **Storage & Databases** → **Workers KV** → your namespace should now have entries

---

## Adding Future Games

Each game is self-contained. To add a second game:

1. Create static files in `public/play/new-game/`
2. Add API route handling in `worker/index.js` (new route prefix)
3. Add a card to `public/index.html` linking to `/play/new-game/`
4. Add rulebooks to `docs/rulebooks/new-game/`
5. Update the `run_worker_first` pattern in `wrangler.toml` if needed
6. Deploy: `npx wrangler deploy`

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

## Command Reference

| Command | What it does |
|---------|-------------|
| `npm install` | Install wrangler locally |
| `npx wrangler dev --port 8788` | Run locally (dev server) |
| `npx wrangler deploy` | Deploy to Cloudflare (production) |
| `npx wrangler kv:namespace list` | List your KV namespaces |
| `npx wrangler kv:key list --namespace-id=YOUR_ID` | List KV keys (see active games) |
| `npx wrangler tail` | Stream live Worker logs |

---

## Troubleshooting

### Site shows "Hello World" instead of the game

The Worker route is pointing to Cloudflare's default template, not your deployed code. Redeploy:
```bash
npx wrangler deploy
```

### Error 1016 (Origin DNS error)

Missing DNS record. Add a proxied A record:
- Type: `A`, Name: `@`, Content: `192.0.2.1`, Proxy: ON (orange cloud)

### Error 522 (Connection timed out)

The Worker route pattern doesn't match, so Cloudflare is trying to connect to the dummy IP. Check:
1. Route pattern is `hollowedstone.com/*` (not just `*.hollowedstone.com/*`)
2. The DNS A record proxy is ON (orange cloud, not gray)

### API returns 404

Check that `wrangler.toml` has:
```toml
main = "worker/index.js"
[assets]
run_worker_first = ["/play/*/api/*"]
```

### "Game not found" errors

KV binding is missing:
1. Check `wrangler.toml` has the correct namespace ID (not "placeholder")
2. The binding variable name must be `GAME_STATE` (case-sensitive)
3. Redeploy after fixing: `npx wrangler deploy`

### "Unknown theme" on game creation

Theme JSON files must exist in `public/play/oroboros/themes/`. The Worker loads them via `env.ASSETS.fetch()`.

### Deploy fails with import errors

The Worker imports shared engine code:
```
worker/index.js → import from '../public/play/oroboros/js/shared/engine.js'
```
Wrangler's bundler (esbuild) resolves this at deploy time. Verify the relative path matches the actual file location.

### Dashboard deploy doesn't trigger / retry fails

Use the CLI instead — it always works:
```bash
npx wrangler deploy
```

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

One Worker script (`worker/index.js`) handles all API routes. Static files served directly from CDN. Game state in KV. No servers to manage.

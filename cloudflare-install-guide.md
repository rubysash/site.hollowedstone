# Deploying Hollowed Stone to Cloudflare Pages (Free Tier)

This guide deploys the site to Cloudflare's free tier. The site hosts multiple games, each at its own path (e.g., `hollowedstone.com/play/oroboros/`).

**GitHub repo:** `https://github.com/rubysash/site.hollowedstone`

---

## What You Need

- A GitHub account (free)
- A Cloudflare account (free — sign up at https://dash.cloudflare.com/sign-up)
- No credit card required for any of this

## Free Tier Limits

| Resource | Free Tier Limit |
|----------|----------------|
| Pages deployments | 500 per month |
| Functions (API) requests | 100,000 per day |
| KV reads | 100,000 per day |
| KV writes | 1,000 per day |
| KV storage | 1 GB |

A typical Ouroboros game uses ~200 KV reads and ~50 writes. Hundreds of concurrent games fit in free tier.

---

## URL Structure

```
hollowedstone.com/                      ← Site landing page (links to all games)
hollowedstone.com/play/oroboros/        ← Ouroboros game lobby
hollowedstone.com/play/oroboros/game    ← Active game board
hollowedstone.com/play/oroboros/replay  ← Replay viewer
hollowedstone.com/play/oroboros/api/    ← Game API endpoints
hollowedstone.com/play/another-game/    ← Future games go here
```

---

## Project Structure

```
site.hollowedstone/
├── public/                              ← DEPLOYED as static site
│   ├── index.html                       ← hollowedstone.com landing page
│   └── play/
│       └── oroboros/                    ← One game
│           ├── index.html               ← Game lobby (create/join)
│           ├── game.html                ← Game board
│           ├── replay.html              ← Replay viewer
│           ├── css/                     ← Game styles + theme CSS
│           ├── js/                      ← Client JS + shared engine
│           └── themes/                  ← Theme JSON files
│
├── functions/                           ← DEPLOYED as Cloudflare Workers
│   └── play/
│       └── oroboros/
│           └── api/                     ← Game API endpoints
│               ├── create.js
│               ├── join.js
│               ├── state.js
│               ├── setup.js
│               ├── move.js
│               └── replay/[id].js
│
├── docs/                                ← NOT deployed (reference only)
│   ├── css/
│   │   └── style.css                   ← Shared rulebook styles
│   └── rulebooks/
│       └── oroboros/                    ← Design rulebooks (HTML)
│
├── package.json
├── wrangler.toml
├── start.bat                            ← Local dev launcher (Windows)
├── .gitignore
├── .npmrc
├── CLAUDE.md
├── SPEC.md
└── cloudflare-install-guide.md
```

**What gets deployed:** Only `public/` (static files) and `functions/` (API workers).
**What stays in Git only:** `docs/`, config files, markdown files.

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

### Files excluded by .gitignore

```
node_modules/            ← Cloudflare installs these during build
.npm-cache/              ← Local npm cache
.wrangler/               ← Local dev state and KV data
.claude/                 ← Claude Code local settings
.dev.vars                ← Local environment variables
package-lock.json        ← Regenerated during build
```

---

## Step 2: Create a Cloudflare Pages Project

### 2a. Connect GitHub

1. Log in to https://dash.cloudflare.com
2. In the left sidebar, click **Workers & Pages**
3. Click **Create** → select the **Pages** tab
4. Click **Connect to Git**
5. Authorize Cloudflare to access your GitHub account
6. Select the `site.hollowedstone` repository
7. Click **Begin setup**

### 2b. Configure Build Settings

| Setting | Value |
|---------|-------|
| **Project name** | `hollowedstone` |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | `npm install` |
| **Build output directory** | `public` |
| **Root directory** | `/` (leave as default) |

> **Note:** Cloudflare Pages auto-detects the `functions/` directory and bundles them with esbuild. The shared engine code imported by functions (from `public/play/oroboros/js/shared/`) gets bundled at build time. If function imports fail, try the explicit build command: `npm install && npx wrangler pages functions build --outdir=_worker.js`

### 2c. Click "Save and Deploy"

The first deploy will take 1-2 minutes. It may fail because KV isn't set up yet — that's expected.

---

## Step 3: Create the KV Namespace

### 3a. Create via Dashboard

1. In the Cloudflare dashboard, go to **Workers & Pages** → **KV**
2. Click **Create a namespace**
3. Name it `GAME_STATE`
4. Click **Add**

### 3b. Bind KV to your Pages Project

1. Go to **Workers & Pages** → click on your `hollowedstone` project
2. Click the **Settings** tab
3. Click **Bindings** in the left menu
4. Click **Add**
5. Select **KV namespace**
6. Set **Variable name** to: `GAME_STATE` (must match exactly)
7. Select the `GAME_STATE` namespace you created
8. Click **Save**

### 3c. Redeploy

Trigger a new deploy after adding the binding:

- Go to **Deployments** tab → click **...** → **Retry deployment**
- Or push any commit to `main`

---

## Step 4: Connect Custom Domain

To serve at `hollowedstone.com` instead of `hollowedstone.pages.dev`:

1. Ensure `hollowedstone.com` is added to your Cloudflare account (DNS managed by Cloudflare)
2. Go to your Pages project → **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter `hollowedstone.com`
5. Cloudflare adds the DNS record and provisions a free SSL certificate automatically
6. Also add `www.hollowedstone.com` if desired (it will redirect to the apex)

After DNS propagates (usually minutes):
```
https://hollowedstone.com/                    ← Landing page
https://hollowedstone.com/play/oroboros/      ← Ouroboros lobby
```

---

## Step 5: Verify

1. Open `https://hollowedstone.com/` — you should see the Hollowed Stone landing page
2. Click **Ouroboros** → lands on the game lobby at `/play/oroboros/`
3. Click **Create Game** → get a 6-character access code
4. Open the same URL in a second browser tab or incognito window
5. Click **Create Game** code link or enter the code → join as Player 2
6. Both tabs should enter the split selection phase

---

## Adding Future Games

To add a new game to the site:

1. Create `public/play/new-game/` with its static files (HTML, CSS, JS, themes)
2. Create `functions/play/new-game/api/` with its API endpoints
3. Add a card to `public/index.html` linking to `/play/new-game/`
4. Add rulebooks to `docs/rulebooks/new-game/`
5. Push to `main` — auto-deploys

Each game is fully isolated: its own static files, its own API paths, its own theme system. They share only the KV namespace (game keys are prefixed with the access code, so no collisions).

---

## Local Development

**Windows:** Double-click `start.bat` or run:
```bash
cd site.hollowedstone
start.bat
```

**Any OS:**
```bash
cd site.hollowedstone
npm install
npx wrangler pages dev public --kv GAME_STATE --port 8788
```

Then open:
- http://localhost:8788/ — Landing page
- http://localhost:8788/play/oroboros/ — Game lobby

Local KV data is stored in `.wrangler/` and does not affect production.

---

## Automatic Deploys

Every push to `main` on GitHub triggers Cloudflare to:

1. Pull the code
2. Run the build command
3. Deploy the new version (zero downtime)

KV data (game states) persists across deploys. Active games are not interrupted.

---

## Troubleshooting

### API returns 404

Functions must be in the `functions/` directory, mirroring the URL path. Verify:
- `functions/play/oroboros/api/create.js` handles `POST /play/oroboros/api/create`
- File exists in Git (check GitHub, not just local)

### "Game not found" errors

The KV binding isn't connected:
1. Settings → Bindings → variable name is `GAME_STATE` (case-sensitive)
2. It's bound to the correct KV namespace
3. You redeployed after adding the binding

### "Unknown theme" on game creation

Theme JSON files must be in `public/play/oroboros/themes/`. Verify they exist in the repo.

### Build fails with import errors

Functions import shared engine code via relative paths:
```
functions/play/oroboros/api/create.js
  → import from '../../../../public/play/oroboros/js/shared/engine.js'
```
The wrangler bundler (esbuild) resolves these at build time. If it fails, verify the relative paths match the actual file locations.

---

## Architecture

```
Browser                          Cloudflare Edge (hollowedstone.com)
  |                                   |
  |  GET /                    ──>  public/index.html (landing page)
  |  GET /play/oroboros/      ──>  public/play/oroboros/index.html
  |  GET /play/oroboros/game  ──>  public/play/oroboros/game.html
  |                                   |
  |  POST /play/oroboros/api/create   |
  |  ─────────────────────────────>  functions/play/oroboros/api/create.js
  |  <──── { code, token }           |──> KV.put(game state, TTL 7d)
  |                                   |
  |  GET /play/oroboros/api/state     |
  |  ─────────────────────────────>  functions/play/oroboros/api/state.js
  |  <──── { board, turn, log }      |──> KV.get(game state)
  |                                   |
  |  POST /play/oroboros/api/move     |
  |  ─────────────────────────────>  functions/play/oroboros/api/move.js
  |  <──── { ok }                    |──> validate + KV.put
  |                                   |
  |  (Player 2 polls /api/state every 2s)
```

Static files from `public/`. API via `functions/`. Game state in KV. No servers to manage.

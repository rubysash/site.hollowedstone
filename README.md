# Hollowed Stone

A platform for hosting strategic 2-player board games at [hollowedstone.com](https://hollowedstone.com). Built on Cloudflare Workers (free tier) with static assets and KV for game state persistence. No backend servers to manage.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Static hosting | Cloudflare Workers (static assets) | Free tier, global CDN |
| API / game logic | Cloudflare Worker (`worker/index.js`) | Free tier: 100k requests/day |
| Game state | Cloudflare KV | JSON game states, TTL-based expiration |
| Real-time sync | Polling with exponential backoff | No WebSocket/Durable Objects needed |
| Auth | Access code + per-player token | No accounts, no passwords |
| Frontend | Vanilla JS, ES modules, SVG rendering | No frameworks, no build step |
| Deploy | GitHub → Cloudflare auto-deploy | Push to `main` = live in ~60s |

Total cost: **$0**

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- npm (comes with Node.js)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free) for deployment

## Local Development

**Windows:** Double-click `start.bat`

**Any OS:**
```bash
npm install
npx wrangler pages dev public --kv GAME_STATE --port 8788
```

**Same machine (testing):** Open http://localhost:8788 in two browser tabs.

**LAN play (two computers):** The host machine runs the server. The other player connects using the host's LAN IP:
```
http://192.168.x.x:8788
```
To find your LAN IP: `ipconfig` (Windows) or `ifconfig` / `ip a` (Mac/Linux). Both players must be on the same network. No port forwarding or NAT configuration needed for LAN.

All dependencies install locally in `node_modules/` — nothing is installed globally. The `.npmrc` forces the npm cache into the project directory. Delete the folder and everything is gone.

## Deployment

See **[cloudflare-install-guide.md](cloudflare-install-guide.md)** for full step-by-step instructions covering:

1. Pushing to GitHub (`rubysash/site.hollowedstone`)
2. Creating a Worker from the GitHub repo
3. Build and deploy settings (`npm install` → `npx wrangler deploy`)
4. Creating and binding the KV namespace (`GAME_STATE`)
5. Custom domain setup (`hollowedstone.com`)
6. Adding future games

**Build settings summary:**

| Setting | Value |
|---------|-------|
| Build command | `npm install` |
| Deploy command | `npx wrangler deploy` *(default)* |
| KV binding variable | `GAME_STATE` |

## URL Structure

```
hollowedstone.com/                          Landing page (links to all games)
hollowedstone.com/play/oroboros/            Ouroboros game lobby
hollowedstone.com/play/oroboros/game        Active game board
hollowedstone.com/play/oroboros/replay      Replay viewer
hollowedstone.com/play/oroboros/api/...     Game API endpoints
hollowedstone.com/play/future-game/         Future games follow the same pattern
```

## Project Structure

```
site.hollowedstone/
│
├── public/                                  DEPLOYED — static files (Cloudflare CDN)
│   ├── index.html                           Site landing page
│   └── play/
│       └── oroboros/                        Ouroboros game
│           ├── index.html                   Game lobby (create / join)
│           ├── game.html                    Game board
│           ├── replay.html                  Replay viewer
│           ├── css/
│           │   ├── board.css                Board layout + UI styles
│           │   └── themes/
│           │       ├── wyrd.css             Norse dark theme
│           │       ├── inner-work.css       Psychology warm parchment theme
│           │       └── neutral.css          Plain minimal theme
│           ├── js/
│           │   ├── board.js                 SVG hex board rendering + interaction
│           │   ├── game.js                  Game controller (ties everything together)
│           │   ├── net.js                   API client, polling, auth, backoff
│           │   ├── ui.js                    UI state, modals, overlays, status
│           │   ├── themes.js                Theme loader (JSON + CSS)
│           │   └── shared/
│           │       ├── board-data.js        Hex grid: coordinates, adjacency, rings
│           │       ├── constants.js         Displacement cycle, win conditions
│           │       └── engine.js            Full rules engine (used by client + server)
│           └── themes/
│               ├── wyrd.json                Norse: roles, colors, lore, objectives
│               ├── inner-work.json          Psychology: roles, colors, quotes, objectives
│               └── neutral.json             Plain: roles, colors, no lore
│
├── worker/                                 DEPLOYED — Cloudflare Worker (API router)
│   └── index.js                            Routes /play/*/api/* to game logic,
│                                            everything else to static assets
│
├── docs/                                    NOT DEPLOYED — design reference only
│   ├── css/
│   │   └── style.css                        Shared rulebook stylesheet
│   └── rulebooks/
│       ├── boards/
│       │   └── hex-5x5.html                 SVG board layout reference (61 hexes)
│       └── oroboros/
│           ├── wyrd.v1.html                 Norse theme rulebook
│           ├── dominion.html                Christian theme rulebook
│           ├── inner-work.html              Psychology theme rulebook
│           └── mechanics.html               Theme-neutral rules reference
│
├── package.json                             npm config (wrangler dependency)
├── wrangler.toml                            Cloudflare Worker config (assets, KV, routing)
├── start.bat                                Windows: double-click to run dev server
├── .gitignore                               Excludes node_modules, .wrangler, .claude, etc.
├── .npmrc                                   Keeps npm cache local to project
├── CLAUDE.md                                AI assistant project instructions
├── SPEC.md                                  Detailed game specification
├── cloudflare-install-guide.md              Step-by-step deployment guide
└── README.md                                This file
```

## Adding a New Game

Each game is self-contained under its own path. To add a second game:

1. Create static files in `public/play/new-game/` (lobby, board, CSS, JS, themes)
2. Add API route handling in `worker/index.js` (new route prefix)
3. Add a card to `public/index.html` linking to `/play/new-game/`
4. Add design rulebooks to `docs/rulebooks/new-game/`
5. Push to `main` — Cloudflare auto-deploys

Games share the KV namespace (keys are prefixed by access code, so no collisions) but are otherwise fully independent — their own engine, themes, styles, and API. The `worker/index.js` router dispatches to the correct game's logic based on the URL path.

## Games

### Ouroboros

A strategic displacement game on a 61-hex Agon board. Four forces form a closed cycle — each beats one and is beaten by another. Two players each control two non-adjacent forces and race to 5 displacement points.

**Key mechanics:**
- **2 moves per turn** (3 while holding the center hex)
- **Partnership rule** — a stone may only advance toward center if adjacent to a friendly stone
- **Displacement cycle** — each force beats exactly one other (rock-paper-scissors-lizard style, with 4)
- **Nothing is permanently lost** — displaced stones return via restoration moves
- **Center hex is wild** — any force can claim or contest it, but you're locked there once you enter
- **Secret split** — each player chooses their 3/2 force ratio simultaneously before placement

**Themes** reskin the same mechanics with different names, colors, and lore:

| Theme | Forces | Lore |
|-------|--------|------|
| Wyrd (Norse) | Ice, Fire, Wood, Wind | Norse myths, Yggdrasil, Valkyries |
| Inner Work (Psychology) | Courage, Planning, Compassion, Discipline | Jung, Frankl, Angelou, Rumi, Brene Brown |
| Neutral | Red, Blue, Green, Gold | No lore, mechanics only |

**Multiplayer flow:**
1. Player 1 creates a game → gets a 6-character access code
2. Player 1 shares the game URL → Player 2 clicks it and auto-joins
3. Both choose their force split secretly
4. Alternate placing stones on starting edges
5. Player 2 gets one free move, then normal play begins
6. Polling syncs state every 2-5 seconds (with exponential backoff on inactivity)

## Game State

All game state is stored as JSON in Cloudflare KV:

- **Active games** expire after 7 days of inactivity (TTL refreshed on every move)
- **Finished games** persist for 30 days (available for replay, then auto-cleaned)
- **Access codes** recycle automatically after TTL expiration
- **Full move log** preserved for every game (enables replay)

## Polling Strategy

The client uses adaptive polling with exponential backoff to minimize Cloudflare usage:

| State | Poll interval |
|-------|--------------|
| Waiting for opponent's move | 2 seconds |
| Your turn (you're thinking) | 5 seconds |
| No activity | Doubles each cycle: 4s → 8s → 16s → 32s → 60s |
| After ~4 minutes idle | Stops entirely, shows "Connection Paused" |
| Tab hidden | Jumps to 30s, continues backoff |
| Any click/keypress | Instantly resets to fast polling |
| Server sends new data | Resets backoff automatically |

A forgotten tab generates ~12 requests over 4 minutes, then zero.

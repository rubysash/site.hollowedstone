# Hollowed Stone

A platform for hosting strategic 2-player board games at [hollowedstone.com](https://hollowedstone.com). Built on Cloudflare Pages (free tier) with Cloudflare KV for game state persistence. No backend servers — static files + edge functions + key-value storage.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Static hosting | Cloudflare Pages | Free tier, global CDN |
| API / game logic | Pages Functions (Cloudflare Workers) | Free tier: 100k requests/day |
| Game state | Cloudflare KV | JSON game states, TTL-based expiration |
| Real-time sync | Polling with exponential backoff | No WebSocket/Durable Objects needed (free tier) |
| Auth | Access code + per-player token | No accounts, no passwords |
| Frontend | Vanilla JS, ES modules, SVG rendering | No frameworks, no build step |

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

Open http://localhost:8788. Create a game in one browser tab, open the game link in another tab to play as both players.

All dependencies install locally in `node_modules/` — nothing is installed globally. The `.npmrc` forces the npm cache into the project directory. Delete the folder and everything is gone.

## Deployment

See **[cloudflare-install-guide.md](cloudflare-install-guide.md)** for full step-by-step instructions covering:

1. Pushing to GitHub (`rubysash/site.hollowedstone`)
2. Connecting Cloudflare Pages to the repo
3. Build settings (`npm install`, output directory: `public`)
4. Creating and binding the KV namespace (`GAME_STATE`)
5. Custom domain setup (`hollowedstone.com`)
6. Adding future games

**Build settings summary:**

| Setting | Value |
|---------|-------|
| Framework preset | None |
| Build command | `npm install` |
| Build output directory | `public` |
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
├── functions/                               DEPLOYED — Cloudflare Workers (API)
│   └── play/
│       └── oroboros/
│           └── api/
│               ├── create.js                POST — create game, return access code
│               ├── join.js                  POST — join game with access code
│               ├── state.js                 GET  — poll current game state
│               ├── setup.js                 POST — split selection + stone placement
│               ├── move.js                  POST — submit a move
│               └── replay/
│                   └── [id].js              GET  — full move log for replay
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
├── package.json                             wrangler dev dependency
├── wrangler.toml                            Cloudflare Workers config
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
2. Create API endpoints in `functions/play/new-game/api/`
3. Add a card to `public/index.html` linking to `/play/new-game/`
4. Add design rulebooks to `docs/rulebooks/new-game/`
5. Push to `main` — Cloudflare auto-deploys

Games share the KV namespace (keys are prefixed by access code, so no collisions) but are otherwise fully independent — their own engine, themes, styles, and API.

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

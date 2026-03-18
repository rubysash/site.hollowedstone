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
| Deploy | GitHub to Cloudflare auto-deploy | Push to `main` = live in ~60s |

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

All dependencies install locally in `node_modules/`. Nothing is installed globally. The `.npmrc` forces the npm cache into the project directory. Delete the folder and everything is gone.

## Cloud Deployment

See **[cloudflare-install-guide.md](docs/hollowedstone/cloudflare-install-guide.md)** for full step-by-step instructions covering:

1. Pushing to GitHub (`rubysash/site.hollowedstone`)
2. Creating a Worker from the GitHub repo
3. Build and deploy settings (`npm install` / `npx wrangler deploy`)
4. Creating and binding the KV namespace (`GAME_STATE`)
5. Custom domain setup (`hollowedstone.com`)
6. Adding future games

See **[zero-trust.md](docs/hollowedstone/zero-trust.md)** for protecting the admin dashboard (`/admin`) with Cloudflare Access.

**Build settings summary:**

| Setting | Value |
|---------|-------|
| Build command | `npm install` |
| Deploy command | `npx wrangler deploy` *(default)* |
| KV binding variable | `GAME_STATE` |

## URL Structure

```
hollowedstone.com/                          Landing page (links to all games)
hollowedstone.com/play/{game-slug}/         Game lobby (create / join)
hollowedstone.com/play/{game-slug}/game     Active game board
hollowedstone.com/play/{game-slug}/replay   Replay viewer
hollowedstone.com/play/{game-slug}/api/...  Game API endpoints
```

## Project Structure

Each game is self-contained under `public/play/{game-slug}/`. Games share the KV namespace (keys are prefixed by access code, so no collisions) but are otherwise fully independent with their own engine, themes, styles, and API. The `worker/index.js` router dispatches to the correct game based on URL path.

```
site.hollowedstone/
|
|-- public/                                  DEPLOYED: static files (Cloudflare CDN)
|   |-- index.html                           Site landing page
|   |-- admin.html                           Admin dashboard
|   +-- play/
|       +-- oroboros/                         Example game layout (all games follow this)
|           |-- index.html                   Game lobby (create / join)
|           |-- game.html                    Game board
|           |-- replay.html                  Replay viewer
|           |-- css/
|           |   |-- board.css                Board layout and UI styles
|           |   +-- themes/                  Theme-specific color overrides
|           |-- js/
|           |   |-- board.js                 SVG board rendering and interaction
|           |   |-- game.js                  Game controller
|           |   |-- net.js                   API client, polling, auth, backoff
|           |   |-- ui.js                    UI state, modals, overlays, status
|           |   |-- help.js                  Rules overlay
|           |   |-- version.js               Build version and date
|           |   +-- shared/
|           |       |-- board-data.js        Board geometry: coordinates, adjacency
|           |       |-- constants.js         Game phases, actions, limits
|           |       +-- engine.js            Rules engine (used by client + server)
|           +-- themes/                      Theme data (JSON: roles, colors, objectives)
|
|-- worker/                                  DEPLOYED: Cloudflare Worker (API router)
|   +-- index.js                             Routes /play/*/api/* to game logic
|
|-- docs/                                    NOT DEPLOYED: reference and project docs
|   |-- hollowedstone/                       Project-level documentation
|   |   |-- security.md                      Threat model and known gaps
|   |   |-- win-methods.md                   Win method taxonomy
|   |   |-- cloudflare-install-guide.md      Deployment guide
|   |   |-- zero-trust.md                    Cloudflare Access setup
|   |   |-- version-history.md               Changelog for all games
|   |   |-- future-games.md                  Game candidates under consideration
|   |   +-- archive/
|   |       +-- oroboros-original-spec.md     Early planning doc (outdated)
|   |-- rulebooks/                           Per-game rules and board references
|   |   |-- boards/                          SVG board layout references
|   |   |-- oroboros/                         Ouroboros rules (by theme)
|   |   |-- nine-mens-morris/                Nine Men's Morris rules
|   |   |-- fanorona/                        Fanorona rules
|   |   |-- lines-of-action/                 Lines of Action rules
|   |   |-- abalone/                         Abalone rules
|   |   |-- tablut/                          Tablut rules
|   |   |-- surakarta/                       Surakarta rules
|   |   +-- seega/                           Seega rules
|   +-- css/
|       +-- style.css                        Shared rulebook stylesheet
|
|-- README.md                                This file
|-- CLAUDE.md                                AI assistant project instructions
|-- package.json                             npm config (wrangler dependency)
|-- wrangler.toml                            Cloudflare Worker config (assets, KV, routing)
|-- start.bat                                Windows: double-click to run dev server
|-- .gitignore                               Excludes node_modules, .wrangler, .claude, etc.
+-- .npmrc                                   Keeps npm cache local to project
```

## Adding a New Game

1. Create static files in `public/play/new-game/` (lobby, board, CSS, JS, themes)
2. Add API route handling in `worker/index.js` (new route prefix)
3. Add a card to `public/index.html` linking to `/play/new-game/`
4. Add design rulebooks to `docs/rulebooks/new-game/`
5. Push to `main` and Cloudflare auto-deploys

See [CLAUDE.md](CLAUDE.md) for the full new-game build process with detailed steps.

## Documentation

| Document | Description |
|----------|-------------|
| [Security](docs/hollowedstone/security.md) | Threat model, mitigations, and known gaps |
| [Win Methods](docs/hollowedstone/win-methods.md) | Taxonomy of how abstract strategy games are won |
| [Future Games](docs/hollowedstone/future-games.md) | Candidates under consideration for the platform |
| [Version History](docs/hollowedstone/version-history.md) | Changelog for all games |
| [Cloudflare Install Guide](docs/hollowedstone/cloudflare-install-guide.md) | Step-by-step deployment instructions |
| [Zero Trust Setup](docs/hollowedstone/zero-trust.md) | Protecting the admin dashboard with Cloudflare Access |
| [Original Ouroboros Spec](docs/hollowedstone/archive/oroboros-original-spec.md) | Early planning doc (archived, outdated) |
| [CLAUDE.md](CLAUDE.md) | AI assistant project instructions and build process |

## Current Games

| Game | Board | Win Method |
|------|-------|------------|
| [Ouroboros](/public/play/oroboros/) | 61-hex Agon board | Accumulate (first to 5 displacement points) |
| [Nine Men's Morris](/public/play/nine-mens-morris/) | 3 concentric squares, 24 intersections | Capture (mill to remove, reduce below 3) |
| [Fanorona](/public/play/fanorona/) | 5x9 grid, 45 intersections | Capture (approach/withdrawal elimination) |
| [Lines of Action](/public/play/lines-of-action/) | 8x8 checkerboard, 64 squares | Connection (unite all pieces into one group) |
| [Abalone](/public/play/abalone/) | 61-hex hexagonal board | Capture (push 6 opponent marbles off the edge) |
| [Tablut](/public/play/tablut/) | 9x9 grid, asymmetric | Regicide / Race (capture king or escape to corner) |
| [Surakarta](/public/play/surakarta/) | 6x6 grid, corner loops | Capture (loop-based elimination) |
| [Seega](/public/play/seega/) | 5x5 grid, center safe zone | Capture (custodian sandwich) |

Rules for each game are in `docs/rulebooks/{game-slug}/`.

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
| No activity | Doubles each cycle: 4s, 8s, 16s, 32s, 60s |
| After ~4 minutes idle | Stops entirely, shows "Connection Paused" |
| Tab hidden | Jumps to 30s, continues backoff |
| Any click/keypress | Instantly resets to fast polling |
| Server sends new data | Resets backoff automatically |

A forgotten tab generates about 12 requests over 4 minutes, then zero.

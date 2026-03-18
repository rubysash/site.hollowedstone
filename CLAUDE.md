# Hollowed Stone

A platform for hosting strategic 2-player abstract board games at hollowedstone.com. Built on Cloudflare Workers with static assets and KV for game state.

## Current Games

| Game | Slug | Board | Rules |
|------|------|-------|-------|
| Ouroboros | `oroboros` | 61-hex Agon board | `docs/rulebooks/oroboros/` |
| Nine Men's Morris | `nine-mens-morris` | 3 concentric squares, 24 nodes | `docs/rulebooks/nine-mens-morris/` |
| Fanorona | `fanorona` | 5x9 grid, 45 intersections | `docs/rulebooks/fanorona/` |
| Lines of Action | `lines-of-action` | 8x8 checkerboard, 64 squares | `docs/rulebooks/lines-of-action/` |
| Abalone | `abalone` | 61-hex hexagonal board (5 per side) | `docs/rulebooks/abalone/` |
| Tablut | `tablut` | 9x9 grid, asymmetric | `docs/rulebooks/tablut/` |

Game rules live in the rulebooks, not in this file.

## Architecture

- **Static frontend:** Vanilla JS, ES modules, SVG rendering. No frameworks, no build step.
- **API:** Single Cloudflare Worker (`worker/index.js`) routes `/play/{game-slug}/api/*` to game-specific handlers. Everything else serves static files from `public/`.
- **Persistence:** Cloudflare KV stores game state as JSON. Key format: `game:{accessCode}`.
- **Auth:** Access code to join, random token per player (passed as query param, stored in localStorage). No accounts.
- **Sync:** Adaptive polling with exponential backoff. No WebSockets.
- **Engine:** Each game has a shared `engine.js` imported by both the worker (validation) and the client (UI hints). The engine is the single source of truth for rules.

## Project Layout

```
public/play/{game-slug}/          Each game is self-contained here
    index.html                    Lobby (create/join)
    game.html                     Game board
    css/board.css                 Layout and component styles
    css/themes/{theme}.css        Theme color overrides
    themes/{theme}.json           Theme data (names, colors, objectives)
    js/shared/engine.js           Rules engine (client + server)
    js/shared/board-data.js       Board geometry and adjacency
    js/shared/constants.js        Phases, actions, limits
    js/board.js                   SVG board rendering
    js/game.js                    Game controller
    js/net.js                     API calls, polling, session
    js/ui.js                      Status, panels, overlays
    js/help.js                    Rules overlay
    js/version.js                 Build version and date

worker/index.js                   API router, all game handlers
docs/rulebooks/{game-slug}/
    mechanics.md                  Game rules in Markdown (viewable on GitHub)
docs/rulebooks/boards/
    {game-slug}.svg               Board diagram in SVG (embeddable in Markdown)
```

## Build Rules

### Web Research
- Wikipedia blocks Claude from fetching pages. Do not use WebFetch on wikipedia.org URLs.
- Other sites are generally fine for research.

### Version Bumping
Before every deploy, update `js/version.js` for each changed game:
- Patch for bug fixes (0.1.12 to 0.1.13)
- Minor for new features (0.1.13 to 0.2.0)
- Major for breaking changes (0.2.0 to 1.0.0)
- Update `BUILD_DATE` to today's date
- Add a summary entry to `docs/version-history.md` (newest first)

### Writing Style
- Do not use em dashes or other obvious AI fingerprints in any writing.
- Keep prose direct and concise.

---

## Design Conventions

### Colors
- **Page background:** `#0d1117` (near-black)
- **Panel background:** `#161b22` (dark grey)
- **Panel border:** `#30363d` (subtle grey)
- **Primary text:** `#c9d1d9` (light grey)
- **Muted text:** `#7a8599` (dim grey)
- **Accent:** `#6a0dad` (purple) for buttons, links, active states
- **Accent light:** `#b388ff` (light purple) for hover, highlights
- **Success/your-turn:** `#4ade80` (green)
- **Error/remove:** `#f85149` (red)
- **Board background:** `#1a1520` (dark purple-black)
- **Board lines:** `#5a4a6a` (muted purple)
- **Empty nodes:** `#2a2a44` (dark indigo)

### Typography
- **Body/UI font:** `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Monospace (codes, stats):** `ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace`
- **Headings:** Same sans-serif stack with `letter-spacing` and `text-transform: uppercase`
- **Do NOT use:** Georgia, Times New Roman, Crimson Text, Cinzel, or other serif fonts in game UI. They are hard to read at small sizes on screens.
- **Minimum font size:** `0.75rem` for tertiary info (build tags, poll status). Body text should be `0.85rem` or larger.
- Docs/rulebooks may use decorative fonts since they are reference-only.

### Layout
- Dark theme only. No light mode.
- Responsive: desktop uses side panels flanking the board; mobile stacks vertically.
- Breakpoint: `768px` for mobile layout switch.
- Board SVG uses `vmin` units to stay square and responsive.
- Game pages use flexbox centering with `min-height: 100vh`.
- Add `<meta name="color-scheme" content="dark">` to all game pages.
- Add `forced-color-adjust: none` on board SVGs to prevent browser theme overrides.

### Footer
Every page must include: `Home | Git | Rulebooks | Donate` links + version tag.
- Game pages use `.site-footer` class.
- Lobby/landing pages use `.footer` or `.links` class with the same links.

### SVG Board Rendering
- Layers in order (bottom to top): background, lines, nodes (clickable), pieces, rings (selectable/selected indicators), markers (valid targets)
- Pieces have `pointer-events: none`; clicks pass through to the node layer.
- Interactive markers (valid targets) go on the top layer with their own click handlers.
- Selectable/selected rings go above pieces so highlights are visible regardless of piece color.
- Selected piece: green ring (`#00cc44`)
- Valid targets: green markers (`rgba(0,255,102,...)`)
- Removable pieces: red pulse animation
- Use inline `style.fill`/`style.stroke` for piece colors to prevent browser theme overrides.

### Interactive State Persistence
- Active selections (e.g., selected piece during movement phase) MUST survive poll updates.
- Phase handlers should check for valid active selection before resetting highlights.
- Never do `clearHighlights(); _selectedNode = null;` unconditionally in a poll handler.

### Player Panel Highlighting
- When it is your turn, your panel gets the `you-active` class (green border).
- The `setTurnIndicator` function must manage `you-active` on panels, not just the status bar.

---

## KV Storage Conventions

- Key: `game:{accessCode}` for full state JSON
- Active TTL: 7 days (refreshed on moves)
- Finished TTL: 30 days
- Request counter persisted every 25 polls (not every request)
- Free tier limit: 1,000 writes/day. A typical game uses 35-45 writes.

---

## New Game Build Process

Follow these steps in order when building a new game. Each step should be completed and verified before moving to the next. Use existing games as reference implementations.

### Step 1: Rulebook and Board Reference

Create design reference documents in `docs/`. These are not loaded at runtime.

- `docs/rulebooks/{game-slug}/mechanics.md` -- Complete rules reference (Markdown)
  - Covers: components, board layout, setup, movement, capture/scoring, winning, draws
  - Includes implementation notes (settings, game state shape, board data model, phase machine, API endpoints)
  - Embed the board SVG with `![Board diagram](../boards/{game-slug}.svg)`
  - Use blockquotes (`> `) for callouts, `> **Warning:**` for warnings
  - Use Markdown tables, fenced code blocks, standard formatting
  - Do not use em dashes. Use ` - ` instead.
- `docs/rulebooks/boards/{game-slug}.svg` -- Standalone SVG board diagram
  - Shows all intersections/cells with labels
  - Shows initial piece placement with correct colors
  - Include a background rect, board lines, pieces, and coordinate labels
  - Viewable directly on GitHub and embeddable in Markdown

Follow the structure of existing rulebooks (see `docs/rulebooks/lines-of-action/mechanics.md` as a reference).

### Step 2: Architecture and Data Model

Plan the game's technical architecture before writing code. Define:

**Game state shape** (the JSON object stored in KV):
```
{
  accessCode, game: '{game-slug}',
  phase,
  createdAt, updatedAt,
  players: {
    p1: { token, ip, name, title, ...game-specific },
    p2: { token, ip, name, title, ...game-specific }
  },
  board: { ... },
  turn: { player, action },
  settings: { ... },
  log: [],
  logSeq: 0,
  result: null,
  requests: 0
}
```

**Board data model:** Node naming convention, adjacency map, SVG positions.

**Game phases:** State machine from `waiting` through `playing` to `finished`. What actions are valid in each phase. Turn structure.

**API endpoints:** Always need `create`, `join`, `state`, `leave`, `stats`, `replay`. Plus game-specific actions (`place`, `move`, `remove`, `capture`, etc.).

### Step 3: Shared Engine and Board Data

Create files under `public/play/{game-slug}/js/shared/`:

1. `constants.js` -- PHASE enum, ACTION enum, numeric constants
2. `board-data.js` -- ALL_NODES, ADJACENCY, NODE_POSITIONS, helper functions
3. `engine.js` -- createGame(), action functions, sanitizeForPlayer(), addLog()

Key principles:
- Engine is the single source of truth for rules.
- Every action returns `{ ok: true }` or `{ error: 'message' }`.
- Engine mutates state in place; worker saves to KV after.
- Client imports engine for UI hints (legal move highlighting) but server validates.

### Step 4: Frontend (Board, UI, Networking)

Create files under `public/play/{game-slug}/`:

- `js/board.js` -- SVG board renderer with initBoard, updateBoard, highlight functions
- `js/ui.js` -- Status display, panels, overlays, move log
- `js/net.js` -- API calls + adaptive polling (copy polling pattern from existing games)
- `js/game.js` -- Game controller tying everything together
- `js/help.js` -- Rules overlay
- `js/version.js` -- Build version
- `css/board.css` -- Layout and component styles
- `css/themes/{theme}.css` -- Theme color overrides
- `themes/{theme}.json` -- Theme data
- `index.html` -- Lobby page (create/join)
- `game.html` -- Game page

### Step 5: Worker API Integration

Modify `worker/index.js`:

1. Import engine functions at top of file.
2. Add route in the main fetch handler for `/play/{game-slug}/api/`.
3. Implement API handlers following the exact pattern from existing games: handleCreate, handleJoin, handleState, game-specific action handlers, handleLeave, handleStats, handleReplay.
4. Update route comments at top of worker/index.js.

### Step 6: Platform Integration

- Add game card + SVG thumbnail + stats fetch to `public/index.html`
- Add game to `themeColors` map and `gameLabel` logic in `public/admin.html`
- Verify `handleAdminGames` in the worker extracts scores correctly for the new game
- Consistent footer on all new pages

### Step 7: Testing and Polish

- Create, join, and play through a complete game
- Test all game-specific mechanics, edge cases, draw conditions
- Verify move log, selection persistence, session recovery
- Check responsive layout, status bar, browser title, help overlay
- Verify admin page and home page stats
- Bump `version.js` (start at `0.1.0`) and add entry to `docs/version-history.md`
- Run through the Pre-Ship Checklist below

---

## Pre-Ship Checklist

Run through this list before considering any work done. It covers recurring mistakes from past builds.

### Security
- [ ] All game actions validated server-side in `worker/index.js` (never trust client)
- [ ] `sanitizeForPlayer()` strips tokens and IPs before sending state to clients
- [ ] New API handlers require a valid player token (call `identifyPlayer`, return 403 if null)
- [ ] Access code input validated against `/^[A-Z2-9]{6}$/` before KV lookup
- [ ] Error catch blocks do not include `detail: e.message` in responses
- [ ] No new endpoints added without auth checks (except `stats` and `replay`)
- [ ] POST handlers do not accept unbounded input (check Content-Length if accepting new fields)

### SVG Board
- [ ] Layers in correct order: background, lines, nodes, pieces, rings, markers
- [ ] Pieces use `pointer-events: none` so clicks pass through to nodes
- [ ] Selectable indicators use the ring layer (above pieces), not the node layer (below pieces)
- [ ] Piece colors set via inline `style.fill`/`style.stroke`, not SVG attributes, to resist browser theme overrides
- [ ] `updateBoard()` removes stale CSS classes but does not remove `empty` from nodes that gain pieces (CSS specificity handles it)
- [ ] Node radius < piece radius < ring radius < marker radius (each layer visible around the one below)

### UI
- [ ] `setTurnIndicator()` manages `you-active` class on player panels (green border when it is your turn)
- [ ] `updatePlayerPanels()` sets both `active` (whose turn) and `you` (which panel is mine) classes
- [ ] Player name shows "(You)" suffix on your panel
- [ ] Active selections survive poll updates (do not unconditionally clear `_selectedNode` in poll handler)
- [ ] Status bar shows distinct messages for your turn vs opponent's turn
- [ ] Browser title changes on turn change (e.g., ">> YOUR TURN <<")
- [ ] Overlays (waiting, game over, abandoned) are dismissed on phase change

### HTML Pages
- [ ] `<meta name="color-scheme" content="dark">` on all game pages
- [ ] `forced-color-adjust: none` on `.board-svg` in CSS
- [ ] Footer on every page: Home | Git | Rulebooks | Donate + version tag
- [ ] Lobby page disables button and shows loading text during create/join
- [ ] Lobby page supports Enter key on code input
- [ ] Game page has Help button, Leave button, poll status indicator

### Networking
- [ ] `net.js` polling uses `since` parameter to avoid re-fetching full log
- [ ] `addLogEntries()` in `ui.js` filters by `seq` to prevent duplicate log entries
- [ ] `saveSession`/`loadSession` uses localStorage keyed by game slug + access code
- [ ] Idle tracking resets backoff on click, keydown, touchstart, and visibility change
- [ ] Poll rate slows when it is your turn (you are thinking) and speeds up on opponent's turn

### Worker API
- [ ] `handleCreate` generates token with `crypto.getRandomValues`, not `Math.random`
- [ ] `handleJoin` checks `phase === 'waiting'` and rejects if game already has two players
- [ ] `handleState` sets `sanitized.you = player` so the client knows which side it is
- [ ] `handleState` filters log by `since` param before returning
- [ ] `handleLeave` sets winner to opponent and marks game as abandoned/finished
- [ ] `handleStats` filters by `state.game === '{game-slug}'` when counting
- [ ] `handleReplay` strips tokens and IPs from returned data
- [ ] KV TTL set to `SEVEN_DAYS` for active games, `THIRTY_DAYS` for finished
- [ ] Request counter incremented in state but only written to KV every 25 polls

### Versioning
- [ ] `js/version.js` bumped (patch for fixes, minor for features, major for breaking changes)
- [ ] `BUILD_DATE` updated to today
- [ ] Entry added to `docs/version-history.md` (newest first)

### Platform Integration
- [ ] Game card added to `public/index.html` with SVG thumbnail and stats fetch
- [ ] Game added to `public/admin.html` (themeColors, gameLabel, score extraction)
- [ ] Worker route comment updated at top of `worker/index.js`

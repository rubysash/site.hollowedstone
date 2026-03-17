# Ouroboros

A strategic 2-player board game played on a 5x5 Agon hex board (61 hexes). The game has multiple thematic skins (Wyrd/Norse, Dominion/Christian, The Inner Work/Psychology) but identical core mechanics. We are building a JavaScript version for remote 2-player play.

## Core Mechanics

### Components
- 61-hex Agon board (5 concentric rings + 1 center hex)
- Each player has 5 stones: 3 of one role and 2 of another (or any agreed 3+2 split)
- 4 roles forming a displacement cycle: Role 1 > Role 2 > Role 3 > Role 4 > Role 1
- Player 1 controls Roles 1 & 3 (non-adjacent in cycle). Player 2 controls Roles 2 & 4.

### Displacement Cycle (varies by theme)
| Theme | Role 1 | Role 2 | Role 3 | Role 4 |
|-------|--------|--------|--------|--------|
| Wyrd | Ice (Blue) | Fire (Red) | Wood (Yellow) | Wind (White) |
| Dominion | Teacher (Blue) | Herald (Red) | Shepherd (Yellow) | Servant (White) |
| Inner Work | Planning (Blue) | Courage (Red) | Compassion (Green) | Discipline (Gold) |
| Neutral | Red | Blue | Green | Gold |

### Setup
- Each player places 5 stones across their 5-hex starting edge in any order
- Player 2 gets one free move before Player 1's first turn (balances going second)

### Turns
- Players alternate turns. Each turn = **2 moves** (one stone, one step to adjacent empty hex)
- Holding the center hex = **3 moves** per turn (center stone is locked, moves apply to other stones)
- No legal moves = must pass

### Partnership Rule
- A stone may only advance toward center if it **starts adjacent to at least one friendly stone**
- Isolated stones may only move sideways or away from center
- **Suspended entirely** when opponent holds center (see Restoration Turn)

### Displacement (Capture)
- Move onto a hex occupied by an enemy stone your role beats in the cycle
- Displaced stone goes to opponent's holding area
- **Restoration:** Spend 1 of your moves to return any held stone to any empty hex on your starting edge
- Nothing is permanently lost

### Ko Rule
- A stone may not return to a hex it occupied 2 or fewer moves ago

### Center Hex (Yggdrasil / Public Stance / The Inner Work)
Three game states:

| State | Moves | Partnership | Displacement |
|-------|-------|-------------|--------------|
| **Normal** (center empty) | 2 | Required | Cycle applies |
| **Holding** (you hold center) | 3 (center stone locked) | Required for all 3 | Any role displaces any role at center |
| **Restoration** (opponent holds center) | 2, partnership suspended | Suspended | 1 displacement max across both moves |

- Center stone can displace any adjacent enemy regardless of cycle
- Any adjacent enemy can displace the center stone regardless of cycle
- Center stone cannot leave voluntarily

### Winning
- First to **5 displacement points** wins (each displacement = 1 point)
- Tiebreaker: higher total displacement count > later scorer > Player 2

## Project Goal

Build a JavaScript web application for remote 2-player play with these requirements:

### Multiplayer via Access Code
- One player creates a game and receives an access code
- Second player joins by entering the access code
- Both players see the board and take turns in real time

### Persistent Move Storage
- Every move is automatically saved as it happens
- Games can be paused and resumed across sessions
- Full move history is preserved for extended play sessions

### Reference Assets (in `docs/rulebooks/`)
- `hexobard5.html` — SVG board layout (61 hexes with ring structure and coordinates)
- `mechanics.html` — Theme-neutral rules reference
- `dominion.html` — Christian theme rulebook
- `inner-work.html` — Psychology theme rulebook
- `wyrd.v1.html` — Norse theme rulebook
- `style.css` — Shared styles for rulebook pages

These are design references only — the game does not load them at runtime.

---

# Nine Men's Morris

A classic 2-player strategy game played on a board of 3 concentric squares with 24 intersections. Single theme (neutral). We are building a JavaScript version for remote 2-player play using the same framework as Ouroboros.

## Core Mechanics

### Components
- Board: 3 concentric squares connected at midpoints (24 intersections)
- Each player has 9 pieces (men) of their color
- Player 1 = Dark, Player 2 = Light

### Game Phases
1. **Placement** — Players alternate placing 1 piece per turn onto any empty intersection (18 turns total)
2. **Movement** — Players alternate sliding 1 piece along a line to an adjacent empty intersection
3. **Flying** (optional, enabled by default) — When reduced to 3 pieces, a player may move to any empty intersection

### Mills
- A mill = 3 of your pieces in a row along a drawn line (16 possible mills)
- Forming a mill → immediately remove 1 opponent piece from the board
- Cannot remove a piece in an opponent's mill unless all their pieces are in mills
- Removed pieces are permanently out of the game
- A mill may be opened and closed repeatedly for repeated captures

### Winning
- Opponent reduced to **fewer than 3 pieces**
- Opponent has **no legal moves**

### Draws
- Mutual agreement
- 50 moves with no capture (optional, default on)
- Threefold repetition (optional, default on)

## Reference Assets
- `docs/rulebooks/boards/nine-mens-morris.html` — SVG board layout (24 nodes with labels)
- `docs/rulebooks/nine-mens-morris/mechanics.html` — Complete rules reference

These are design references only — the game does not load them at runtime.

## Build Rules (shared)

All games on this platform share the same multiplayer infrastructure (access codes, persistent move storage, Cloudflare Workers backend).

## Build Rules

### Web Research
- Wikipedia blocks Claude from fetching pages — do not use WebFetch on wikipedia.org URLs
- Other sites are generally fine for research

### Version Bumping
Before every deploy, update the build version in each game's `js/version.js`:
- Increment the patch number for bug fixes and small changes (0.1.12 → 0.1.13)
- Increment the minor number for new features (0.1.13 → 0.2.0)
- Increment the major number for breaking changes or major milestones (0.2.0 → 1.0.0)
- Update the `BUILD_DATE` to today's date
- These files are the single source of truth — all pages read from them

### Version History
After updating the version, add a summary entry to `version-history.md` in the project root:
- Each entry should include the version number, date, and a brief list of changes
- Keep entries in reverse chronological order (newest first)
- This file serves as a human-readable changelog for the project

---

## Design Conventions

### Colors
- **Page background:** `#0d1117` (near-black)
- **Panel background:** `#161b22` (dark grey)
- **Panel border:** `#30363d` (subtle grey)
- **Primary text:** `#c9d1d9` (light grey)
- **Muted text:** `#7a8599` (dim grey)
- **Accent:** `#6a0dad` (purple) — buttons, links, active states
- **Accent light:** `#b388ff` (light purple) — hover, highlights
- **Success/your-turn:** `#4ade80` (green)
- **Error/remove:** `#f85149` (red)
- **Board background:** `#1a1520` (dark purple-black)
- **Board lines:** `#5a4a6a` (muted purple)
- **Empty nodes:** `#2a2a44` (dark indigo)

### Typography
- **Body/UI font:** `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Monospace (codes, stats):** `ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace`
- **Headings:** Same sans-serif stack with `letter-spacing` and `text-transform: uppercase` for style
- **Do NOT use:** Georgia, Times New Roman, Crimson Text, Cinzel, or other serif fonts in game UI — they are hard to read at small sizes on screens
- **Minimum font size:** `0.75rem` for tertiary info (build tags, poll status). Body text should be `0.85rem` or larger.
- Docs/rulebooks (`docs/`) may use decorative fonts since they are reference-only and not part of the game UI

### Layout
- Dark theme only — no light mode
- Responsive: desktop uses side panels flanking the board; mobile stacks vertically
- Breakpoint: `768px` for mobile layout switch
- Board SVG uses `vmin` units to stay square and responsive
- Game pages use flexbox centering with `min-height: 100vh`

### Footer
Every page must include: `Home | Git Source | Donate` links + version tag
- Game pages use `.site-footer` class
- Lobby/landing pages use `.footer` or `.links` class with same links

### SVG Board Rendering
- Layers in order (bottom to top): background → lines → nodes (clickable) → pieces → markers (interactive, on top)
- Pieces have `pointer-events: none`; clicks pass through to the node layer
- Interactive markers (valid targets) go on TOP layer with their own click handlers
- Selected piece: green highlight (`#00cc44`)
- Valid targets: green markers (`rgba(0,255,102,...)`)
- Removable pieces: red pulse animation

### Interactive State Persistence
- Active selections (e.g., selected piece during movement phase) MUST survive poll updates
- Phase handlers should check for valid active selection before resetting highlights
- Never do `clearHighlights(); _selectedNode = null;` unconditionally in a poll handler

---

## New Game Build Process

Follow these steps in order when building a new game for the platform. Each step should be completed and verified before moving to the next. Use existing games (Oroboros, 9 Men's Morris) as reference implementations.

### Step 1 — Rulebook & Board Reference

Create the design reference documents. These are not loaded at runtime but define the game's rules and board geometry authoritatively.

**Create:**
- `docs/rulebooks/{game-slug}/mechanics.html` — Complete rules reference
  - Uses shared stylesheet: `../../css/style.css`
  - Defines `:root` color variables for the game
  - Covers: components, board layout, setup, movement, capture/scoring, winning, draws
  - Includes implementation notes (settings, game state shape)
- `docs/rulebooks/boards/{game-slug}.html` — SVG board layout
  - Shows all intersections/cells with labels
  - Shows initial piece placement
  - Includes legend for piece colors and line types
  - Print-optimized

**Conventions:**
- Follow the HTML structure pattern: `title-block` → `role-grid` → sections with `h2`/`h3` → `callout` boxes → tables
- Use the same CSS classes as existing rulebooks (`.role-grid`, `.callout`, `.callout.warning`, `.move-table`, etc.)

### Step 2 — Architecture & Data Model

Plan the game's technical architecture before writing code. Define:

**Game state shape** — the full JSON object stored in KV:
```
{
  accessCode, game: '{game-slug}',
  phase,                    // from PHASE constants
  createdAt, updatedAt,
  players: {
    p1: { token, ip, name, title, ...game-specific },
    p2: { token, ip, name, title, ...game-specific }
  },
  board: { ... },           // game-specific board representation
  turn: { player, action }, // current turn info
  settings: { ... },        // configurable options
  log: [],                  // move history with seq numbers
  logSeq: 0,
  result: null,             // { winner, reason, finalScore } when finished
  requests: 0
}
```

**Board data model** — how the board is represented:
- Node/cell naming convention (e.g., algebraic like `a1`, coordinate like `3,4`)
- Adjacency map
- Which nodes connect to which (diagonals, special connections)
- Node positions in SVG coordinate space

**Game phases** — the state machine:
- `waiting` → (player 2 joins) → `placing`/`playing` → `finished`
- What actions are valid in each phase
- Turn structure (single move? multi-step? chain captures?)

**API endpoints** — what actions the game needs:
- Always: `create`, `join`, `state`, `leave`, `stats`, `replay`
- Game-specific: `place`, `move`, `remove`, `capture`, etc.

### Step 3 — Shared Engine & Board Data

Build the authoritative game logic that runs on both server and client.

**Create files under `public/play/{game-slug}/js/shared/`:**

1. **`constants.js`** — Game constants
   - `PHASE` enum (WAITING, PLACING, PLAYING, FINISHED, etc.)
   - `ACTION` enum (PLACE, MOVE, REMOVE, etc.)
   - Numeric constants (pieces per player, board size, win threshold, draw limits)

2. **`board-data.js`** — Static board geometry
   - `ALL_NODES` — array of all intersection/cell IDs
   - `ADJACENCY` — map of node → adjacent nodes
   - `NODE_POSITIONS` — map of node → `{x, y}` for SVG rendering
   - Helper functions: `isAdjacent()`, game-specific queries (mills, lines, etc.)

3. **`engine.js`** — Authoritative rules engine
   - `createGame(accessCode)` — initialize full game state
   - Action functions (e.g., `placePiece`, `makeMove`, `removePiece`) — validate and execute
   - `sanitizeForPlayer(state, player)` — strip tokens, IPs, hidden info
   - Helper functions for validation (legal moves, win detection, draw detection)
   - Internal `addLog(state, entry)` — appends to log with `seq` and `ts`

**Key principles:**
- Engine is the single source of truth for rules
- Every action returns `{ ok: true }` or `{ error: 'message' }`
- Engine mutates state in place; worker saves to KV after
- Client imports engine for UI hints (legal move highlighting) but server validates

### Step 4 — Frontend (Board, UI, Networking)

Build the client-side game experience.

**Create files under `public/play/{game-slug}/`:**

1. **`js/board.js`** — SVG board renderer
   - `initBoard(svgElement, onNodeClick)` — draw board lines, nodes, layers
   - `updateBoard(boardState, theme, lastMove)` — redraw pieces from state
   - `highlightSelectable(nodes)`, `highlightSelected(node)`, `showValidTargets(nodes)` — interaction feedback
   - `clearHighlights()` — reset all visual states
   - Layers: background → lines → nodes (clickable) → pieces → markers (on top)

2. **`js/ui.js`** — Status display, panels, overlays
   - `setTurnIndicator(isMyTurn)` — status bar color + browser title
   - `setStatus(msg)` — turn info text
   - `updatePlayerPanels(state, myPlayer, theme)` — scores, piece counts
   - `addLogEntries(entries, theme)` — move log (filter by `seq` to prevent duplicates)
   - `showWaiting(accessCode)`, `showGameOver(result, theme)`, `showAbandoned(result, theme)` — overlays

3. **`js/net.js`** — API calls + adaptive polling
   - Copy the polling pattern from 9 Men's Morris (burst/waiting/my-turn/backoff/idle)
   - `createGame(settings)`, `joinGame(code)` — lobby API calls
   - Game-specific action senders (e.g., `sendPlace`, `sendMove`, `sendRemove`)
   - `pollState(callback)` with `since` parameter for incremental log
   - `saveSession`/`loadSession` — localStorage persistence
   - Idle tracking + visibility change handling

4. **`js/game.js`** — Game controller (ties everything together)
   - `startGame()` — session recovery → theme load → init board → start polling
   - `onStateUpdate(state)` — the main update loop:
     - Update board, panels, log
     - Preserve active selection across polls (don't reset `_selectedNode`)
     - Handle phase transitions (waiting → playing → finished)
   - `onNodeClick(node)` — dispatch clicks based on phase and turn
   - `leaveGame()` — confirm + send leave + redirect

5. **`js/help.js`** — Rules overlay
   - `initHelp()`, `toggleHelp()` — keyboard shortcut (?) + button
   - Renders game-specific rules HTML in a modal

6. **`js/version.js`** — Build version
   - `export const BUILD = '0.1.0';`
   - `export const BUILD_DATE = 'YYYY-MM-DD';`

**Create CSS/theme files:**

7. **`css/board.css`** — Layout and component styles
   - CSS variables (`:root`) for colors
   - Layout: `.game-layout`, `.board-container`, `.player-panel`, `.status-bar`
   - Board: `.board-svg`, `.board-node`, `.board-line`, `.piece`, `.valid-target-marker`
   - Interactive states: `.selectable`, `.selected`, `.removable`, `.last-move`
   - Overlays, help panel, footer, responsive breakpoints
   - `.site-footer` with Home | Git Source | Donate links

8. **`css/themes/{theme}.css`** — Theme color overrides (at least one)

9. **`themes/{theme}.json`** — Theme data
   - Player names, titles, colors (pieceColor, strokeColor)
   - Objective text strings for each phase
   - Game-specific terminology

**Create HTML pages:**

10. **`index.html`** — Lobby page
    - Create Game card (with settings if applicable)
    - Join Game card (code input)
    - Footer: Home | Git Source | Donate + version tag
    - Button disable + loading text on create/join
    - Enter key on code input

11. **`game.html`** — Game page
    - Player panels (left/right or top/bottom on mobile)
    - SVG board container
    - Status bar with turn info
    - Game footer: Help + Leave buttons + poll status
    - Site footer: Home | Git Source | Donate + version tag
    - Move log container

### Step 5 — Worker API Integration

Wire the game into the Cloudflare Workers backend.

**Modify `worker/index.js`:**

1. **Import** engine functions at top of file:
   ```
   import { createGame, ...actions, sanitizeForPlayer } from '../public/play/{game-slug}/js/shared/engine.js';
   ```

2. **Add route** in the main fetch handler:
   ```
   if (path.startsWith('/play/{game-slug}/api/')) {
     return handle{GameName}Api(path, request, env);
   }
   ```

3. **Implement API handlers** — follow the exact pattern from existing games:
   - `handleCreate` — generate code + token, create state, store player name/title/theme, save to KV
   - `handleJoin` — validate code, check phase=waiting, assign p2 token, advance phase
   - `handleState` — identify player by token, increment requests, sanitize, filter log by `since`
   - Game-specific action handlers — validate token, increment requests, call engine, save to KV
   - `handleLeave` — mark abandoned, set winner to opponent
   - `handleStats` — iterate KV with cursor, filter by `state.game`, count by phase/date
   - `handleReplay` — return full log + player info (no tokens/IPs)

4. **Update route comments** at top of worker/index.js

**KV storage conventions:**
- Key: `game:{accessCode}` — full state JSON
- Active TTL: 7 days (`SEVEN_DAYS`)
- Finished TTL: 30 days (`THIRTY_DAYS`)
- Request counter persisted every 25 polls

### Step 6 — Platform Integration

Connect the new game to the rest of the site.

**Modify `public/index.html` (home page):**
- Add a game card with link to `/play/{game-slug}/`
- Add an SVG thumbnail (procedurally generated, showing the board with sample pieces)
- Add stats fetch from `/play/{game-slug}/api/stats`

**Modify `public/admin.html`:**
- Add game to `themeColors` map (choose a distinct color)
- Update the `gameLabel` logic to recognize the new `game` identifier
- Verify score display makes sense for the new game type

**Modify `worker/index.js` admin handler:**
- Ensure `handleAdminGames` correctly extracts scores/names for the new game type

**Ensure consistent footer** on all new pages: `Home | Git Source | Donate` + version tag

### Step 7 — Testing & Polish

Verify everything works end-to-end.

**Functional testing:**
- Create a game → get access code
- Join from second tab → game starts
- Play through a complete game to victory
- Test all game-specific mechanics (captures, special moves, chain moves, etc.)
- Test edge cases (no legal moves, draw conditions, abandoned games)
- Verify move log displays correctly with no duplicates
- Verify selection/highlighting persists across poll updates

**Integration testing:**
- Admin page shows the new game with correct labels and scores
- Home page stats load and display
- Replay endpoint returns valid data
- Leave game works (abandoned state, opponent wins)
- Session recovery works (refresh page mid-game)

**UI/UX testing:**
- Responsive layout (desktop + mobile)
- Status bar updates correctly (your turn vs opponent's turn)
- Browser title flashes on turn change
- Help overlay renders game-specific rules
- Pieces are visually distinct on the board (contrast check)
- Polling adapts correctly (burst after moves, backoff on idle)

**Update versions:**
- Bump `version.js` for the new game (start at `0.1.0`)
- Add entry to `version-history.md`

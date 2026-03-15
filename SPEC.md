# Ouroboros — Project Specification

## Overview

A 2-player strategic board game on a 61-hex Agon board, playable in a browser with remote multiplayer via access codes. Themed variants (Wyrd/Norse first, others wired in). Hosted on Cloudflare free tier.

---

## Architecture

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Static frontend** | Cloudflare Pages | Free, global CDN, zero config |
| **API / game logic** | Pages Functions (Cloudflare Workers) | Free tier: 100k requests/day |
| **Persistence** | Cloudflare KV | Free tier: 100k reads/day, 1k writes/day |
| **Real-time sync** | Short polling (2s interval) | Free-tier compatible (no Durable Objects needed) |

### Why polling over WebSockets

Cloudflare WebSockets require Durable Objects ($5/mo paid plan). For a turn-based game where moves happen every 10-30 seconds, polling every 2 seconds is imperceptible and stays fully within the free tier. Each game generates ~100-200 reads per session — well within KV limits.

### No Docker, no Node.js server

Everything runs as static files + edge functions. `wrangler` CLI for local dev and deployment.

---

## Project Structure

```
oroboros/
├── CLAUDE.md                  # Project instructions
├── SPEC.md                    # This file
├── wrangler.toml              # Cloudflare Workers config
├── package.json               # wrangler + dev dependencies only
│
├── public/                    # Static files (Cloudflare Pages)
│   ├── index.html             # Landing page: create/join game
│   ├── game.html              # Main game board + UI
│   ├── replay.html            # Replay viewer for saved games
│   ├── css/
│   │   ├── board.css          # Board layout, hex styling
│   │   └── themes/
│   │       ├── wyrd.css       # Norse: dark palette, rune fonts
│   │       ├── dominion.css   # Christian: gold/cream palette
│   │       ├── inner-work.css # Psychology: muted earth tones
│   │       └── neutral.css    # Plain/mechanical theme
│   ├── js/
│   │   ├── board.js           # SVG hex board rendering + interaction
│   │   ├── game.js            # Core game engine (rules, validation)
│   │   ├── net.js             # Polling client, API calls
│   │   ├── ui.js              # UI state, modals, status messages
│   │   ├── replay.js          # Replay playback engine
│   │   └── themes.js          # Theme loader (text, colors, labels)
│   └── themes/
│       ├── wyrd.json          # Norse labels, lore snippets, color map
│       ├── dominion.json      # Christian labels, lore, colors
│       ├── inner-work.json    # Psychology labels, lore, colors
│       └── neutral.json       # Plain labels, no lore
│
├── functions/                 # Cloudflare Pages Functions (API)
│   └── api/
│       ├── create.js          # POST: create game, return access code
│       ├── join.js            # POST: join game with access code
│       ├── state.js           # GET: poll current game state
│       ├── move.js            # POST: submit a move
│       ├── setup.js           # POST: place stone during setup phase
│       └── replay/[id].js     # GET: full move log for replay
│
├── src/                       # Shared logic (imported by functions)
│   ├── engine.js              # Server-side move validation
│   ├── board-data.js          # Hex grid topology, adjacency, rings
│   └── constants.js           # Displacement cycle, win conditions
│
├── rulebooks/                 # Existing HTML rulebooks (reference)
│   ├── wyrd.v1.html
│   ├── dominion.html
│   ├── inner-work.html
│   ├── mechanics.html
│   └── hexobard5.html
│
└── style.css                  # Original shared rulebook styles
```

---

## Data Model

### Game State (stored in KV as JSON)

Key: `game:{accessCode}`

```jsonc
{
  "id": "game:ABCD1234",
  "accessCode": "ABCD1234",
  "theme": "wyrd",
  "phase": "setup" | "play" | "finished",
  "createdAt": "2026-03-14T...",
  "updatedAt": "2026-03-14T...",

  // Players
  "players": {
    "p1": {
      "token": "random-secret",   // Auth cookie value
      "name": "The Vanir",        // Theme-driven default
      "split": null,              // Set during setup: { "ice": 3, "wood": 2 } or { "ice": 2, "wood": 3 }
      "score": 0,
      "holding": []               // Captured stones awaiting restoration
    },
    "p2": {
      "token": "random-secret",
      "name": "The Aesir",
      "split": null,
      "score": 0,
      "holding": []
    }
  },

  // Board — sparse map, only occupied hexes
  // Keys are hex IDs (e.g., "3,1"), values are stone objects
  "board": {
    "0,0": { "owner": "p1", "role": "ice" },
    "0,1": { "owner": "p1", "role": "wood" }
    // ...
  },

  // Center hex state
  "center": {
    "holder": null,              // "p1" | "p2" | null
    "stone": null                // role of stone on center, or null
  },

  // Turn tracking
  "turn": {
    "player": "p1",             // Whose turn
    "movesLeft": 2,             // 2 normally, 3 if holding center
    "movesMade": [],            // Moves made this turn (for Ko tracking)
    "phase": "normal"           // "normal" | "berserker" | "setup_p1" | "setup_p2" | "free_move"
  },

  // Ko history — last 2 positions per stone for Ko rule
  "koHistory": {
    // stoneId: [hex2ago, hex1ago]
  },

  // Setup tracking
  "setup": {
    "p1SplitChosen": false,
    "p2SplitChosen": false,
    "p1Placed": 0,              // Stones placed so far (0-5)
    "p2Placed": 0,
    "phase": "splits"           // "splits" | "p1_placing" | "p2_placing" | "free_move" | "done"
  },

  // Complete move log for replay
  "log": [
    {
      "seq": 1,
      "player": "p1",
      "action": "place",        // "place" | "move" | "displace" | "restore" | "split"
      "from": null,
      "to": "0,0",
      "role": "ice",
      "displaced": null,
      "timestamp": "2026-03-14T..."
    }
  ],

  // Game result
  "result": null                // { winner: "p1", reason: "score", finalScore: [5, 3] }
}
```

### Access Codes

- 6-character alphanumeric (uppercase), e.g., `WYRD7K`
- Generated server-side, checked for uniqueness in KV
- Also stored as KV key `code:{WYRD7K}` → `game:{id}` for fast lookup

### Player Auth

- On create/join, server generates a random token and sets it as an HttpOnly cookie
- All subsequent requests authenticated by this cookie
- No accounts, no passwords — the cookie IS the identity
- Access code is what you share; cookie is what proves you're a specific player

---

## Game Flow

### 1. Create Game

```
Player 1 → POST /api/create { theme: "wyrd" }
         ← { accessCode: "WYRD7K", playerToken: (set as cookie) }
         → Shown waiting screen with access code to share
```

### 2. Join Game

```
Player 2 → POST /api/join { accessCode: "WYRD7K" }
         ← { joined: true, playerToken: (set as cookie) }
         → Both players proceed to setup
```

### 3. Setup Phase

**Step A: Secret Split Selection (simultaneous)**
- Both players see a choice screen: "3 Ice + 2 Wood" or "2 Ice + 3 Wood" (themed labels)
- Each submits secretly via `POST /api/setup { action: "split", split: { ice: 3, wood: 2 } }`
- Neither sees the other's choice until both have chosen
- Once both submitted → reveal both splits, proceed to placement

**Step B: Stone Placement (alternating)**
- Player 1 places one stone at a time on their top-edge hexes (5 hexes)
- After each P1 stone, Player 2 places one stone on their bottom-edge hexes
- Continue alternating until all 10 stones placed
- Each placement: `POST /api/setup { action: "place", hex: "0,4", role: "ice" }`
- Players see opponent's placements in real time

**Step C: Free Move**
- Player 2 (Aesir) gets one free move before P1's first turn
- `POST /api/move { from: "4,8", to: "3,7" }`

### 4. Play Phase

**Polling loop** (every 2 seconds):
```
GET /api/state?game=WYRD7K&since={lastSeq}
← { turn: {...}, board: {...}, log: [new entries], ... }
```

**Submitting moves:**
```
POST /api/move {
  game: "WYRD7K",
  from: "2,3",       // Hex the stone is on (or "holding" for restoration)
  to: "2,4",         // Target hex
  stoneRole: "ice"   // Which stone (needed when restoring from holding)
}
```

Server validates:
- It's your turn
- You have moves left
- The stone belongs to you
- The target hex is adjacent (or valid starting edge for restoration)
- Partnership/shield wall rule is satisfied (unless berserker turn)
- Displacement cycle is correct (or center wild rules apply)
- Ko rule not violated
- If berserker turn: max 1 displacement across all moves

Server returns updated state or error with reason.

**End of turn:** When `movesLeft` reaches 0, turn passes to opponent. Server checks win condition (score >= 5) and updates phase to "finished" if met.

### 5. Game End

- Winner declared, final state saved
- Full move log available at `GET /api/replay/WYRD7K`
- Replay viewer loads log and steps through moves with play/pause/step controls

---

## Hex Board Model

### Coordinate System

Axial coordinates `(q, r)` for the 61-hex Agon board. The center hex is `(0, 0)`.

**Ring structure:**
- Ring 0: center hex (1 hex) — Yggdrasil/wild
- Ring 1: 6 hexes (inner ring)
- Ring 2: 12 hexes
- Ring 3: 18 hexes
- Ring 4: 24 hexes (outer ring, contains starting edges)

**Starting edges:**
- Player 1 (top): 5 northernmost hexes of ring 4
- Player 2 (bottom): 5 southernmost hexes of ring 4

**Adjacency:** Each hex has up to 6 neighbors. Precomputed adjacency map in `board-data.js`.

**"Toward center":** A move is "toward center" if the destination hex is in a lower-numbered ring than the origin. Same ring = sideways. Higher ring = away.

### Mapping SVG to Axial Coordinates

The existing `hexobard5.html` SVG uses pixel coordinates for 61 `<path>` elements. We will:
1. Compute center point of each hex path from its vertices
2. Assign axial `(q, r)` coordinates based on position
3. Store the mapping in `board-data.js` as a lookup table
4. Render the game board using the same hex geometry but with interactive elements (click handlers, highlights)

---

## Theme System

Each theme is a JSON file with this structure:

```jsonc
// themes/wyrd.json
{
  "id": "wyrd",
  "name": "Wyrd",
  "subtitle": "A game of fate for two",
  "cssFile": "css/themes/wyrd.css",

  "players": {
    "p1": { "name": "The Vanir", "title": "Player 1" },
    "p2": { "name": "The Aesir", "title": "Player 2" }
  },

  "roles": {
    "role1": {
      "id": "ice",
      "name": "Ice",
      "color": "#2471a3",
      "strokeColor": "#1a5276",
      "element": "Water",
      "beats": "fire",
      "beatsLabel": "melts Fire"
    },
    "role2": {
      "id": "fire",
      "name": "Fire",
      "color": "#c0392b",
      "strokeColor": "#922b21",
      "element": "Fire",
      "beats": "wood",
      "beatsLabel": "burns Wood"
    },
    "role3": {
      "id": "wood",
      "name": "Wood",
      "color": "#d4ac0d",
      "strokeColor": "#9a7d0a",
      "element": "Earth",
      "beats": "wind",
      "beatsLabel": "blocks Wind"
    },
    "role4": {
      "id": "wind",
      "name": "Wind",
      "color": "#f0f0f0",
      "strokeColor": "#888888",
      "element": "Air",
      "beats": "ice",
      "beatsLabel": "erodes Ice"
    }
  },

  "center": {
    "name": "Yggdrasil",
    "description": "The World Tree",
    "color": "#6a0dad"
  },

  "terms": {
    "displace": "capture",
    "holding": "Valhalla",
    "restore": "return from Valhalla",
    "partnership": "shield wall",
    "berserker": "berserker turn",
    "advance": "advance",
    "ko": "Ko"
  },

  "lore": {
    "intro": "The Norns sit at the roots of Yggdrasil...",
    "onCapture": "The Valkyries ride...",
    "onCenter": "At the center of all nine realms...",
    "onWin": "Your Wyrd is woven."
  }
}
```

The UI reads theme JSON at game load and applies:
- CSS theme file for colors/fonts/background
- All text labels from `terms` and `roles`
- Lore snippets shown contextually (capture, center claim, win)
- Player names from theme defaults (overridable)

---

## Core Game Engine Rules (server-enforced)

### Displacement Cycle

```
ice > fire > wood > wind > ice
```

P1 controls: `ice` + `wood` (roles 1 & 3 — non-adjacent in cycle)
P2 controls: `fire` + `wind` (roles 2 & 4 — non-adjacent in cycle)

### Move Validation Checklist

For each move submitted, validate in order:

1. **Phase check:** Game is in `play` phase
2. **Turn check:** It is this player's turn
3. **Moves remaining:** `movesLeft > 0`
4. **Stone ownership:** Stone at `from` belongs to current player
5. **Adjacency:** `to` is adjacent to `from` (or `from` is "holding" and `to` is on player's starting edge)
6. **Target hex:**
   - If empty → normal move, proceed to partnership check
   - If occupied by friendly → illegal
   - If occupied by enemy → displacement check (step 7)
7. **Displacement legality:**
   - Normal state: attacker's role must beat defender's role in cycle
   - Attacker is on center: any role beats any role
   - Defender is on center: any role beats any role
   - Berserker turn: max 1 displacement per turn (check `movesMade`)
8. **Partnership / shield wall:**
   - If move is "toward center" (destination ring < origin ring):
     - Normal/holding state: stone must start adjacent to at least one friendly stone
     - Berserker state (opponent holds center): partnership suspended, skip this check
   - Sideways or away from center: no partnership needed
9. **Ko rule:** Destination hex must not appear in this stone's Ko history (last 2 positions)
10. **Center hex special rules:**
    - Moving TO center: stone becomes locked (cannot voluntarily leave)
    - Stone ON center: cannot move (it's locked) — skip if `from` is center
    - Restoration: if `from` is "holding", `to` must be on player's starting edge and empty

### After Valid Move

1. Update board state
2. If displacement occurred:
   - Move displaced stone to opponent's `holding` array
   - Increment current player's `score`
   - Check win condition (score >= 5)
3. Update Ko history for the moved stone
4. Decrement `movesLeft`
5. If `movesLeft === 0`:
   - Switch turn to opponent
   - Calculate opponent's `movesLeft` (2 normally, 3 if they hold center)
   - Determine turn phase (normal, berserker)
6. Append to move log
7. Save state to KV

---

## Client UI

### Board Rendering

- SVG-based, derived from existing `hexobard5.html` geometry
- Each hex is a clickable `<path>` with data attributes for coordinates
- Stones rendered as colored circles with role symbols inside
- Visual states:
  - **Selectable:** Subtle glow on stones the current player can move
  - **Selected:** Bright highlight on the clicked stone
  - **Valid targets:** Green tint on hexes the selected stone can legally move to
  - **Last move:** Faint trail showing opponent's most recent moves
  - **Center hex:** Pulsing purple border, special icon (Yggdrasil tree / cross / mandala per theme)

### UI Panels

```
┌──────────────────────────────────────────┐
│  WYRD — A Game of Fate                   │
│  Access code: WYRD7K                     │
├──────────────────────────────────────────┤
│           ┌─────────────┐                │
│  P2 info  │             │  P2 holding    │
│  Score: 2 │   HEX BOARD │  [ice] [ice]   │
│           │   (SVG)     │                │
│  P1 info  │             │  P1 holding    │
│  Score: 3 │             │  [fire]        │
│           └─────────────┘                │
├──────────────────────────────────────────┤
│  Turn: The Vanir — 2 moves left          │
│  [Move log / lore text area]             │
│  [Undo last move] [Pass] [Resign]        │
└──────────────────────────────────────────┘
```

### Interactions

- **Click stone** → highlights it, shows valid moves
- **Click valid target** → submits move to server
- **Click elsewhere** → deselects
- **Holding area stones** → clickable during your turn to restore (shows valid starting-edge hexes)
- **Undo** → only available for moves within current turn (before turn ends)
- **Move log** → scrollable list of all moves with themed descriptions

### Responsive

- Board scales with viewport (vmin-based like existing SVG)
- Panels stack vertically on mobile
- Touch-friendly hex targets (minimum 44px tap area)

---

## Replay System

### Saving

Every move is appended to the `log` array in game state. The complete log persists in KV after game ends.

### Replay Viewer (`replay.html`)

- Enter a game access code to load its replay
- Controls: Play / Pause / Step Forward / Step Back / Speed slider
- Board re-renders at each step
- Move descriptions shown in themed language
- Exportable as JSON (download button)

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/create` | None | Create game, set P1 cookie |
| POST | `/api/join` | None | Join game, set P2 cookie |
| GET | `/api/state` | Cookie | Poll game state (accepts `since` seq for delta) |
| POST | `/api/setup` | Cookie | Split selection or stone placement |
| POST | `/api/move` | Cookie | Submit a move during play |
| GET | `/api/replay/[id]` | None | Get full move log (public after game ends) |

All endpoints return JSON. Errors return `{ error: "message", code: "INVALID_MOVE" }`.

---

## Development Plan

### Phase 1: Foundation
- [ ] Set up Cloudflare Pages + wrangler project
- [ ] Build hex coordinate system and adjacency map (`board-data.js`)
- [ ] Map SVG hex paths to axial coordinates
- [ ] Render interactive SVG board (`board.js`)

### Phase 2: Game Engine
- [ ] Implement full rules engine with all validation (`engine.js`)
- [ ] Unit tests for: displacement cycle, partnership rule, Ko rule, center mechanics, berserker turn, win condition
- [ ] Setup phase logic (split selection, alternating placement, free move)

### Phase 3: API + Persistence
- [ ] KV schema and game state CRUD
- [ ] All 6 API endpoints
- [ ] Cookie-based player auth
- [ ] Polling client (`net.js`)

### Phase 4: Client UI
- [ ] Game board with click interaction
- [ ] Setup screens (split choice, placement)
- [ ] Turn management UI (move counter, status messages)
- [ ] Holding area + restoration flow
- [ ] Valid move highlighting
- [ ] Win/loss screen

### Phase 5: Themes
- [ ] Wyrd theme JSON + CSS (primary)
- [ ] Theme loader in UI
- [ ] Lore text integration (contextual snippets)
- [ ] Stub out Dominion, Inner Work, Neutral themes

### Phase 6: Replay + Polish
- [ ] Replay viewer
- [ ] Move log panel with themed descriptions
- [ ] Mobile responsiveness
- [ ] Error handling and edge cases
- [ ] Local dev instructions in README

---

## Local Development

```bash
npm install wrangler --save-dev
npx wrangler pages dev public/ --kv GAME_STATE
```

This runs the full stack locally — Pages serves static files, Functions handle API routes, and a local KV emulator stores game state. No cloud account needed for development.

---

## Deployment

```bash
npx wrangler pages deploy public/
```

KV namespace created once via:
```bash
npx wrangler kv:namespace create GAME_STATE
```

Bind in `wrangler.toml`. Free tier covers hundreds of concurrent games easily.

---

## Open Questions / Future

- **Timer per turn?** Not in v1, but the data model supports adding it later.
- **Chat?** Could add a simple message array to game state. Low priority.
- **ELO / player accounts?** Out of scope. Access code is the only identity.
- **Multiple concurrent games?** Supported by design — each game is an independent KV entry.
- **Spectator mode?** The replay system is the v1 answer. Live spectating could be added by making `/api/state` work without a player cookie.

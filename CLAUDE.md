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

### Version Bumping
Before every deploy, update the build version in `public/play/oroboros/js/version.js`:
- Increment the patch number for bug fixes and small changes (0.1.12 → 0.1.13)
- Increment the minor number for new features (0.1.13 → 0.2.0)
- Increment the major number for breaking changes or major milestones (0.2.0 → 1.0.0)
- Update the `BUILD_DATE` to today's date
- This file is the single source of truth — all pages read from it

# Version History

## Platform (Hollowed Stone)

### 2026-03-18
- All games: consistent layout update
  - Board shrunk to `min(68vmin, 560px)` so controls and footer fit on screen
  - Move log moved from fixed bottom bar to left column under player panel
  - Left-column wrapper groups p2 panel + log; right-panel class on p1
  - Tablut board cell size reduced from 75px to 65px to fit 9x9 grid in viewBox
  - Abalone hex outline corrected from pointy-top to flat-top orientation
- Rulebooks converted from HTML to Markdown for GitHub readability
- Board diagrams extracted as standalone SVG files viewable on GitHub
- Tablut v0.1.0: full game implementation
  - Engine: 9x9 grid, rook movement, custodian capture, hostile squares (throne/corners), king capture (4-side/3-side/2-side), raichi/tuichi detection
  - Frontend: 9x9 SVG board with throne/corner markers, king piece with crown, selectable/selected rings
  - Worker API: create, join, state, move, leave, stats, replay
  - Admin and home page integration
- Abalone v0.1.0: full game implementation
  - Engine: cube coordinate hex geometry, inline/broadside moves, sumito push logic, elimination scoring
  - Frontend: 61-hex SVG board, multi-marble selection, direction arrows for move input
  - Worker API: create, join, state, move, leave, stats, replay
  - Admin and home page integration
- Lines of Action v0.1.0: full game implementation
  - Engine: line-count movement, enemy blocking, connection win detection (flood-fill)
  - Frontend: 8x8 checkerboard SVG, selectable/selected rings, valid target markers
  - Worker API: create, join, state, move, leave, stats, replay
  - Admin and home page integration
- Added Lines of Action rulebook and SVG board reference (`docs/rulebooks/lines-of-action/`)

### 2026-03-17
- Added Tablut rulebook and SVG board reference (`docs/rulebooks/tablut/`)
- Added Abalone rulebook and SVG board reference (`docs/rulebooks/abalone/`)
- Updated footer on all pages: `Home | Git | Rulebooks | Donate`
- Moved project docs into `docs/hollowedstone/` subfolder
- Restructured project docs: all .md files moved to `docs/` (except README.md and CLAUDE.md)
- Rewrote CLAUDE.md as platform-level project guide (was Ouroboros-specific)
- Added pre-ship checklist to CLAUDE.md covering security, UI, SVG, networking, and versioning
- Added `docs/security.md` with threat model, mitigations, and known gaps
- Added `docs/win-methods.md` with taxonomy of abstract game win conditions
- Added `docs/future-games.md` with 21 game candidates under evaluation
- Archived original Ouroboros spec to `docs/archive/oroboros-original-spec.md`
- Updated README.md: removed inline game rules, added documentation table, simplified project structure tree
- Updated README.md: added Nine Men's Morris and Fanorona to current games table

## Ouroboros

### 0.2.1 - 2026-03-15
- Stats endpoint, doc updates
- Help file, thumbnail, better UI
- Changed tab off polling
- Better turn indicator
- Faster polling

## Fanorona

### 0.1.2 - 2026-03-17
- Fix: hardcoded piece colors (black #111111, cream #f0e6d3) via inline styles to prevent browser theme overrides
- Added `color-scheme: dark` meta tag and `forced-color-adjust: none` on board SVG
- Fix: selectable/selected piece highlights now visible above pieces (ring layer)
- Fix: player panel green border on your turn (you-active class)
- Added click debug logging to console

### 0.1.0 - 2026-03-17
- Initial release
- Full game engine: movement, approach/withdrawal captures, chain captures
- Multiplayer via access codes with persistent move storage
- Board flipping for player 2 perspective
- Capture choice modal (approach vs withdrawal)
- Adaptive poll-based state sync
- Help overlay, player panels, move log
- Admin dashboard integration

## 9 Men's Morris

### 0.1.0 - 2026-03-16
- Initial release
- Full game engine: placement, movement, flying, mill detection, removal
- Multiplayer via access codes with persistent move storage
- Adaptive poll-based state sync
- Help overlay, player panels, move log
- Admin dashboard integration

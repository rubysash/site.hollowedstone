# Win Methods in Abstract Strategy Games

A reference taxonomy of how abstract 2-player games are won. Most games combine two or more of these methods. Understanding the categories helps when evaluating new game candidates for the platform.

---

## Capture

Pieces are removed from the board through various mechanics. The win condition is usually total elimination or reducing the opponent below a functioning threshold.

| Method | How it works | Examples |
|--------|-------------|----------|
| **Replacement** | Land on an occupied space to remove the piece | Chess, Checkers (after jump) |
| **Jumping** | Hop over a piece to capture it | Checkers/Draughts, Konane, Fanorona |
| **Surrounding** | Flank a piece on two or more sides (custodian capture) | Tafl family, Seega, Hasami Shogi, Watermelon Chess |
| **Blocking** | Hunters immobilize the prey by surrounding it | Bear games, Fox and Geese |
| **Approach/Withdrawal** | Slide adjacent to or away from a piece to capture it | Fanorona |
| **Pushing off** | Shove pieces off the edge of the board | Abalone, Kuba |

---

## Occupy (Area Control)

Place or move pieces into a contested area. The goal is not necessarily to capture enemies but to hold specific ground at the end of the game or for a required duration.

- Often scoring-based rather than elimination-based
- Can combine with Enclosure mechanics
- Examples: many abstract wargames, Ouroboros center hex control

---

## Race

Reach a specific point or goal line before the opponent. Strategy-based race games focus on forcing the opponent to take inefficient paths.

- **Anti-stalemate rules** are often needed to prevent a losing player from repeating moves to force a draw
- **Multi-race (asymmetric):** One side tries to reach a destination while the other tries to capture (Fox and Geese, Hnefatafl)
- Examples: Breakthrough, Halma/Chinese Checkers

---

## X in a Row

Arrange pieces in a specific alignment pattern. Simple versions (Tic-Tac-Toe) are trivially solved; complex versions offer real depth.

- **Variations:** Straight lines, diagonal lines, corners, specific shapes
- **Solvability risk:** Without sufficient board size or complexity, these games are often mathematically solved for perfect play
- Examples: Gomoku, Pente, Connect Four, Bolix

---

## Connection

Form a continuous chain of pieces connecting two distinct sides of the board. The path does not need to be straight — it only needs to be unbroken. Distinct from X in a Row because shape and direction don't matter.

- Relies on graph theory — build a path through a network while the opponent tries to cut it
- Many connection games have elegant no-draw proofs
- Examples: Hex, Twixt, Bridg-It, Y

---

## Enclosure (Territory)

Surround empty space rather than capturing pieces. Players score based on the empty intersections their pieces have enclosed.

- Focus on building secure walls rather than direct attack
- Capturing enemy pieces is usually a secondary consequence of the enclosure mechanic
- Examples: Go (Weiqi), Dots and Boxes, Slither

---

## Regicide (Checkmate)

A specialized form of Capture where the game ends immediately once a specific "VIP" piece is trapped or taken. Material advantage is secondary to the safety of the leader.

- The game revolves around tactical positioning to trap a single unit
- Often combined with other capture mechanics for the supporting pieces
- Examples: Chess, Xiangqi, Shogi, Onitama, The Duke, Hnefatafl (king capture variant)

---

## Pattern Match

Collect or arrange a specific set of components. While often luck-based in card/tile games (Rummy, Hearts), abstract versions combine strategy with placement.

- Good pattern-match games require managing probability and board manipulation to force the pattern to appear
- Less common in pure abstract strategy

---

## Loop Formation

Create a closed circuit (ring) of your own pieces anywhere on the board. Distinct from Connection because it does not require touching the board edges.

- Examples: Havannah, Trax

---

## Poison Token (Last Move Loses)

Force the opponent to take the last piece or make the last move. Often math-based (impartial games).

- With strong logic or math skills, these are often 100% solvable by the starting or second player depending on the initial count
- **Solvability risk:** High for simple variants — need sufficient complexity to avoid deterministic play
- Examples: Nim, Wythoff's game

---

## No Legal Moves (Blockade)

If a player cannot make a legal move on their turn, they lose. Often used as an end condition layered onto other game types.

- **Variation:** In some games, the winner is the last person to play a legal move — effectively a spatial version of the Poison Token mechanic
- Examples: Amazons, Hepta, many Morris endgames

---

## Survival (Attrition)

The board actively shrinks, dissolves, or fills up, forcing a "last man standing" scenario. The goal is to remain on the board longer than the opponent.

- Players do not necessarily attack each other directly — they attack the ground the opponent is standing on
- Examples: Hey! That's My Fish!, Tsuro, Amazons (board fills with arrows)

---

## Delivery

A variation of Race involving a payload. Retrieve an object and return it to a base, or move a specific object from point A to point B while under attack.

- Splits strategy between offense (stopping the enemy) and defense (protecting the payload)
- Examples: Flag capture games, some Breakthrough variants

---

## Accumulate

The winner is determined by who possesses the most of a specific resource (points, tiles, tokens, territory) when the game ends. Can combine with a Race element where the game ends once a player hits a threshold.

- Examples: Ouroboros (first to 5 displacement points), Go (most territory), Kuba (most red marbles pushed off)

---

## Platform Coverage

How the current games on Hollowed Stone map to these win methods:

| Game | Primary method | Secondary methods |
|------|---------------|-------------------|
| **Ouroboros** | Accumulate (5 displacement points) | Capture (displacement cycle), Occupy (center hex) |
| **Nine Men's Morris** | Capture (milling → removal) | No Legal Moves (blocked player loses) |
| **Fanorona** | Capture (approach/withdrawal elimination) | No Legal Moves (blocked player loses) |

**Gaps to fill:** Connection, Race, Enclosure, Regicide, Loop Formation, Survival, Pushing

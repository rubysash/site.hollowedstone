# Security Overview

Threat model and mitigation status for the Hollowed Stone game platform.

This is a casual game platform with no user accounts, no payments, and no sensitive personal data beyond IP addresses. The security posture reflects that scope. The goal is not bank-grade hardening but reasonable protection against abuse, data leaks, and cheating.

---

## What We Protect

| Asset | Sensitivity | Storage |
|-------|------------|---------|
| Player tokens | Medium (game identity) | localStorage on client, KV on server |
| Player IP addresses | Medium (PII) | KV game state, exposed in admin only |
| Game state | Low (game moves) | KV |
| Access codes | Low (shared openly) | URL params, KV |
| Admin dashboard | Medium (shows all games + IPs) | Protected by Cloudflare Access |

---

## Authentication Model

Players authenticate with a random token generated at game creation or join. Tokens are 48-character hex strings (192 bits of entropy) generated with `crypto.getRandomValues()`. This is cryptographically secure and not practically brute-forceable.

Tokens are transmitted as URL query parameters (for GET/poll) and in POST request bodies. They are stored in the browser's localStorage keyed by game access code.

There are no user accounts, passwords, sessions, or cookies.

---

## Mitigations In Place

### [x] Server-side move validation
All game moves are validated by the engine on the server before being accepted. The client imports the same engine for UI hints (highlighting legal moves) but the server never trusts client input. A modified client cannot make illegal moves.

### [x] Token-based player identity
Every game action (move, leave, poll) requires a valid player token. The token is checked against both players' stored tokens to identify who is making the request. Invalid tokens return 403.

### [x] Token/IP stripping from responses
The `sanitizeForPlayer()` function in each game engine strips tokens and IP addresses before sending state to clients. Players cannot see each other's tokens or IPs through the game API.

### [x] Strong token entropy
Player tokens use `crypto.getRandomValues()` with 24 bytes (192 bits). At 100,000 guesses per second, brute-forcing a token would take longer than the age of the universe.

### [x] Game expiration
Active games expire from KV after 7 days. Finished games expire after 30 days. This limits the window for any stored data exposure.

### [x] KV write batching
Request counters are only persisted every 25 polls, reducing KV write pressure and limiting the impact of poll-based abuse.

### [x] Adaptive polling with backoff
The client reduces poll frequency when idle, and stops entirely after ~4 minutes of inactivity. This is client-side only and can be bypassed, but reduces accidental load.

### [x] Admin endpoint behind Cloudflare Access
The `/admin/api/` route is protected by Cloudflare Access Zero Trust, which requires authentication before the request reaches the worker.

### [x] Phase-based access control
Players can only perform actions valid for the current game phase. You cannot make a move during the waiting phase, join an already-started game, or act out of turn.

---

## Known Gaps

### [ ] CORS allows all origins
**Severity: High**
**File:** `worker/index.js`, `json()` helper function

Every API response includes `Access-Control-Allow-Origin: *`. This means any website can make requests to the API. If a player's token is ever leaked (through XSS, shared URLs, or shoulder surfing), a malicious site could make moves on their behalf from a different origin.

**Fix:** Set `Access-Control-Allow-Origin` to the actual domain (`https://hollowedstone.com`) or remove the header entirely since the API is same-origin.

---

### [ ] Access codes use Math.random()
**Severity: Medium**
**File:** `worker/index.js`, `generateCode()`

Access codes (6 characters, shared openly to join games) are generated with `Math.random()`, which is not cryptographically secure. The PRNG state could theoretically be predicted to guess future access codes.

**Practical risk is low** because access codes are not secrets (they are shared with opponents), and the 10-attempt loop to find a unique code means collisions are checked. However, switching to `crypto.getRandomValues()` would eliminate the concern entirely.

**Fix:** Replace `Math.random()` with a crypto-safe alternative:
```js
const arr = new Uint8Array(1);
crypto.getRandomValues(arr);
code += chars[arr[0] % chars.length];
```

---

### [ ] No rate limiting on any endpoint
**Severity: Medium**

There is no server-side rate limiting. A malicious client can:
- Poll `/api/state` hundreds of times per second
- Attempt to brute-force access codes via `/api/join`
- Spam move submissions

The adaptive polling backoff is client-side only and easily bypassed.

Cloudflare Workers do have some built-in DDoS protection at the network layer, but nothing application-level.

**Fix:** Add per-IP or per-token rate limiting. Cloudflare Workers don't have persistent in-memory state between requests, so this would need to use KV (costly for writes) or accept that rate limiting is best-effort. A simpler approach: validate that the `since` parameter in state polls is not regressing, and reject polls that come faster than 500ms apart by checking a timestamp in KV.

---

### [ ] Error responses include exception details
**Severity: Medium**
**File:** `worker/index.js`, catch blocks

Error responses include `detail: e.message`, which could leak internal file paths, module names, or data structure information to an attacker probing the API.

**Fix:** Remove the `detail` field from error responses. Log the full error server-side for debugging.

---

### [ ] No input validation on access code format
**Severity: Medium**
**File:** `worker/index.js`, join handlers

Access codes from user input are uppercased and trimmed but not validated against the expected format (6 characters from `[A-Z2-9]`). A user could submit extremely long strings or unexpected characters.

**Fix:** Reject any access code that doesn't match `/^[A-Z2-9]{6}$/`.

---

### [ ] No request body size limit
**Severity: Low**
**File:** `worker/index.js`, all POST handlers

POST bodies are parsed with `request.json()` without checking `Content-Length`. An attacker could send a very large JSON payload to consume worker memory.

Cloudflare Workers have a built-in memory limit (~128MB), so this would cause the worker to crash rather than consume unbounded resources. The impact is a failed request, not a persistent outage.

**Fix:** Check `Content-Length` header and reject payloads over 10KB before parsing.

---

### [ ] Admin endpoint has no in-application auth
**Severity: Medium**

The admin endpoint relies entirely on Cloudflare Access for authentication. If Access is misconfigured, disabled during testing, or bypassed, the admin API is fully open. It exposes all active games, player names, IP addresses, scores, and request counts.

**Fix:** Add a secondary check: require an `X-Admin-Token` header or verify the `CF-Access-Authenticated-User-Email` header is present and matches an allowed list.

---

### [ ] IP addresses stored in game state
**Severity: Medium**

Player IP addresses are captured from the `CF-Connecting-IP` header at create/join time and stored in the KV game state. They are stripped from player-facing responses but exposed in the admin endpoint. IPs persist for the lifetime of the game (up to 30 days for finished games).

If the admin endpoint is ever exposed or KV data is accessed directly, IP addresses for all players are available.

**Fix options:**
- Stop storing IPs entirely (simplest)
- Store only a hash for analytics (e.g., SHA-256 of IP + salt)
- Store IPs in a separate KV namespace with shorter TTL

---

### [ ] Replay endpoint is unauthenticated
**Severity: Low**

The `/api/replay/{code}` endpoint returns full move history for any game if you know the access code. No player token is required. This is by design (replays are meant to be shareable), but it means anyone with a 6-character code can view the game history.

Tokens and IPs are stripped from replay data. Only moves, player names, and scores are exposed.

**Acceptable for current scope.** If private games are ever needed, add optional token-based replay access.

---

### [ ] No Content Security Policy headers
**Severity: Low**

API responses include `Content-Type: application/json` but no `X-Content-Type-Options: nosniff` or other security headers. Static HTML pages do not set Content Security Policy headers.

Low practical risk since the platform serves no user-generated content and does not use inline scripts from untrusted sources.

**Fix:** Add `X-Content-Type-Options: nosniff` to API responses. Consider adding CSP headers to HTML pages.

---

### [ ] Token transmitted in URL query params
**Severity: Low**

Player tokens appear in URL query parameters during polling (`/api/state?token=...`). URL parameters can appear in:
- Browser history
- Server access logs (Cloudflare logs requests)
- Referrer headers if the user clicks an external link from the game page

The token is also in the initial page URL (`/game?code=...&token=...&player=...`), which could be shared accidentally.

**Practical risk is low** because tokens are only meaningful for the duration of a game (7-30 days) and only grant the ability to make moves in a casual board game.

**Fix:** Move token to a request header (`Authorization: Bearer {token}`) for API calls. Remove token from the game page URL after initial load (use `history.replaceState`).

---

## Cheating Vectors

These are not security vulnerabilities but gameplay integrity concerns.

### Bot play
A player could write a script that polls game state and submits optimal moves via the API. There is no detection or prevention for automated play. For a casual platform this is acceptable.

### State inspection
Players can read the full game state from the API response, including all board positions. There is no hidden information in any current game, so this reveals nothing the UI doesn't already show. If a game with hidden information (e.g., fog of war) is added, the `sanitizeForPlayer()` function would need to strip hidden data.

### Abandoned game abuse
A player who is losing can simply close their tab instead of resigning. The game remains in "playing" state until it expires after 7 days. The opponent has no way to claim a win except by the other player explicitly clicking "Leave."

**Possible fix:** Add an inactivity timeout (e.g., if a player hasn't polled in 10 minutes, auto-forfeit). This would require checking timestamps during the opponent's poll.

---

## Priority Order

**Fix first (high impact, low effort):**
1. Remove `detail` field from error responses
2. Validate access code format (regex check)
3. Restrict CORS to actual domain

**Fix soon (medium impact):**
4. Add in-application admin auth check
5. Switch access code generation to crypto.getRandomValues()
6. Add request body size check

**Consider later (low impact or larger effort):**
7. Rate limiting (needs design decisions about storage)
8. Remove or hash stored IP addresses
9. Move token from URL params to headers
10. Add security headers (CSP, nosniff)
11. Add inactivity forfeit for abandoned games

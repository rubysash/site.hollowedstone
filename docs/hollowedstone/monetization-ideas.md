# Monetization Ideas

Revenue strategies for Hollowed Stone, evaluated against the current platform: 10 abstract strategy games, zero accounts, zero cost infrastructure, niche audience of strategy board game players.

All projections are based on **10,000 games played per month** as a baseline. At ~2 players per game and some repeat visitors, that implies roughly 5,000-8,000 unique monthly visitors.

---

## 1. Physical Game Sets (3D Print / CNC / Laser Cut)

Sell handmade board game sets for the games on the platform. Players who enjoy a game online want the physical version.

### What to sell
- 3D printed piece sets (stones, marbles, tokens)
- CNC routed or laser cut wooden boards
- Complete boxed sets (board + pieces + printed rules card)
- Premium materials: hardwood, resin, metal tokens

### Revenue estimate (10k games/month)
- Conversion rate: 0.5-1% of unique visitors = 25-80 orders/month
- Average order: $25-60 depending on materials
- Monthly revenue: $625-$4,800
- Gross margin: 60-75% (materials are cheap, labor is the cost)

### Pros
- High margin on handmade goods
- Players already know and like the game (warm leads)
- No inventory risk (print on demand)
- Differentiator: nobody else sells physical Surakarta or Tablut sets
- The online game IS the demo

### Cons
- Labor intensive (each set takes time to produce)
- Shipping logistics and costs
- Scale ceiling (you can only make so many per week)
- Returns/quality issues with handmade items

### Steps to implement
1. Pick 3-5 games with the most visual appeal (Abalone, Tablut, Surakarta, Nine Men's Morris)
2. Design and prototype one set per game
3. Photograph finished sets
4. Add a "Buy Physical Set" link on each game's lobby page
5. Set up a simple Etsy shop or Shopify store (avoid building your own checkout)
6. Add a small banner on the game-over screen: "Enjoyed this game? Get the physical set."
7. Price at $30-50 for basic sets, $80-120 for premium hardwood

---

## 2. Downloadable Print-and-Play PDFs

Sell (or give away for email signup) printable PDF versions of each game: board, rules, and token cutout sheets.

### What to sell
- Free tier: basic PDF board + rules (drives traffic and email signups)
- Paid tier ($3-5): high-quality PDF with nice artwork, multiple board sizes, scoring sheets, strategy guide

### Revenue estimate (10k games/month)
- Free PDF downloads for email: 5-10% of visitors = 250-800 signups/month
- Paid PDF purchases: 0.5-1% = 25-80 purchases/month at $3-5
- Monthly revenue: $75-$400 from PDFs alone
- Real value: the email list (see Newsletter below)

### Pros
- Zero marginal cost (create once, sell forever)
- Builds email list for upselling
- Establishes authority in the niche
- Low friction (instant download)

### Cons
- Low price point means low individual revenue
- Piracy is trivial (it's a PDF)
- Requires design work to make the PDFs look professional

### Steps to implement
1. Create print-optimized PDF for each game (board, rules, piece cutouts)
2. Set up email capture: "Download free print-and-play PDF" on each game page
3. Use a service like Gumroad, Lemon Squeezy, or Ko-fi for paid PDFs (no checkout to build)
4. Gate the premium version behind payment, give the basic version for an email address
5. Add download links to the game lobby pages and game-over screens

---

## 3. Newsletter / Email List

Build an email list of strategy board game enthusiasts. Monetize through affiliate links, product launches, and sponsor placements.

### What to send
- Weekly or biweekly: "Game of the Week" deep dive (strategy tips, history, variants)
- New game announcements
- Tournament/event invitations
- Curated links to board game deals (affiliate)
- Sponsor spots ($50-200 per placement from game publishers)

### Revenue estimate (10k games/month)
- List size after 6 months: 1,500-4,000 subscribers (assuming 300-700 new signups/month)
- Affiliate revenue: $50-200/month (Amazon board game links, 4-8% commission)
- Sponsor placements: $50-200/issue, 2-4 per month = $100-800/month
- Product launch emails (physical sets, PDFs): adds 20-30% lift to those channels
- Total newsletter-driven revenue: $200-$1,200/month

### Pros
- Owned audience (not dependent on social media algorithms)
- Compounds over time (list grows, revenue grows)
- Multiple monetization paths (affiliate, sponsor, direct sales)
- Positions you as a niche authority
- Very low cost (free tier on Buttondown, Mailchimp, or Substack)

### Cons
- Requires consistent content creation
- Takes 3-6 months to build a meaningful list
- Unsubscribe rates can be high if content isn't valuable
- Writing good content takes time

### Steps to implement
1. Choose a platform: Substack (free, built-in monetization) or Buttondown (simple, cheap)
2. Add email signup to the home page and game lobby pages
3. Create a lead magnet: free print-and-play PDF in exchange for email
4. Write the first 4-5 issues before launching (buffer)
5. Commit to a biweekly schedule
6. After 500+ subscribers, start pitching sponsors in the board game niche

---

## 4. Advertisements (Display Ads)

Show ads on the site. Board game enthusiasts are a defined niche with decent ad value.

### Ad placement options
- Banner on the home page (above or below game cards)
- Small ad in the game lobby (below the create/join cards)
- Post-game ad on the game-over overlay
- Never on the game board itself (ruins the experience)

### Revenue estimate (10k games/month)
- Page views: ~50,000/month (home page + lobbies + game pages + polls)
- Display ad CPM: $2-8 for niche hobby content
- Fill rate: 60-80%
- Monthly revenue: $60-$320
- With direct-sold sponsors (game publishers, board game shops): $200-500/month

### Pros
- Passive income (set up once)
- Scales with traffic
- Direct sponsor deals pay better than programmatic

### Cons
- Low revenue at this traffic level
- Ads make the site look less premium
- Ad blockers reduce effective impressions by 30-40%
- Users hate ads, especially on a clean dark-theme site
- Can degrade the game experience

### Steps to implement
1. Choose between programmatic (Google AdSense, Mediavine) or direct sponsors only
2. Recommendation: skip programmatic at this scale. Go direct-sponsor only.
3. Approach 3-5 board game retailers or publishers for sponsored placements
4. Create a simple "Advertise" page with rates and audience demographics
5. Place sponsor logos/links in non-intrusive spots (footer area, lobby page sidebar)

---

## 5. Pay to Remove Ads

If ads are implemented, offer a one-time or annual payment to remove them.

### Revenue estimate (10k games/month)
- Price: $5 one-time or $3/year
- Conversion: 1-3% of regular players = 50-240 purchases
- Monthly revenue: $15-$60/month (one-time) or recurring $150-720/year
- This only works if ads are annoying enough to pay to remove but not annoying enough to drive people away

### Pros
- Simple value proposition
- Recurring revenue if annual
- Validates that users value the ad-free experience

### Cons
- Requires an account system (currently none exists)
- Only works if ads exist and are noticeable
- Low price point, low conversion at this traffic level
- Adds complexity to every page (check payment status, show/hide ads)

### Steps to implement
1. Implement ads first (see above)
2. Add a simple account system (email + token, stored in KV)
3. Integrate payment (Stripe Checkout or Lemon Squeezy)
4. Store "ad-free" status per account
5. Check status on page load and hide ad elements
6. Not recommended until traffic exceeds 50k games/month

---

## 6. Sponsorships (Game Publishers / Retailers)

Partner with board game publishers or retailers who want to reach strategy game players.

### What to offer
- "Powered by" or "Sponsored by" badge on the home page
- Featured game of the month (sponsor pays to highlight their game)
- Custom game implementation sponsored by a publisher ("Play [Publisher's Game] free on Hollowed Stone")
- Newsletter sponsor spot (see Newsletter above)

### Revenue estimate (10k games/month)
- Small sponsors: $100-300/month for a logo placement
- Game publisher deal: $500-2,000 one-time to build and host their game on the platform
- Ongoing sponsorship: $200-500/month
- Total: $300-$2,500/month depending on deal size

### Pros
- Aligns with the audience (game publishers want to reach game players)
- Does not degrade user experience (sponsor logo is unobtrusive)
- Higher revenue per deal than programmatic ads
- Could fund development of new games

### Cons
- Requires sales outreach (pitching publishers, negotiating deals)
- Inconsistent income (deals come and go)
- Need to prove audience size and engagement (analytics)
- Small audience is hard to sell at premium rates

### Steps to implement
1. Add Google Analytics or Plausible (privacy-friendly) to track traffic
2. Create a one-page media kit: traffic stats, audience profile, placement options, rates
3. Research 10-20 board game publishers and retailers with online presence
4. Send cold emails or DMs pitching a small sponsorship trial ($100-200/month)
5. Start with 1-2 sponsors and build case studies from there

---

## 7. Tournament Entry Fees

Host paid tournaments with prize pools. Entry fees fund the prizes and your margin.

### Revenue estimate (10k games/month)
- Tournament size: 16-64 players
- Entry fee: $5-10
- Frequency: 1-2 per month
- Gross per tournament: $80-$640
- Your margin (20-30% after prizes): $16-$192 per tournament
- Monthly revenue: $32-$384

### Pros
- Creates community engagement and repeat visitors
- Prize pools attract competitive players
- Generates content (tournament results, leaderboards, recaps)
- Can be combined with sponsor deals (sponsor funds the prize pool)

### Cons
- Requires payment processing and account system
- Legal considerations vary by jurisdiction (gambling laws)
- Organizing tournaments takes time (scheduling, brackets, disputes)
- Need a critical mass of players first (too early at 10k games)

### Steps to implement
1. Not feasible until monthly active players exceed 500+
2. Start with free tournaments to test logistics
3. Use a third-party bracket tool (Challonge, start.gg)
4. Add a "Tournaments" page with sign-up links
5. Collect entry fees via PayPal or Stripe
6. Only do this after building a community first (Discord, newsletter)

---

## Recommendation: Priority Order

Based on your capabilities (3D printing, CNC, low overhead) and the current platform size:

### Phase 1 (Now, no accounts needed)
1. **Print-and-Play PDFs** for email capture. Zero cost, builds the list.
2. **Physical game sets** via Etsy. You already have the skills. Start with 2-3 games.
3. **Donate button** (already exists). Low effort, some income.

### Phase 2 (After 1,000+ email subscribers)
4. **Newsletter** monetized with affiliate links and game publisher sponsors.
5. **Direct sponsorships** from board game retailers (logo on home page).

### Phase 3 (After 50k+ games/month)
6. **Display ads** (only if direct sponsors aren't covering costs).
7. **Pay to remove ads** (only if ads are implemented).
8. **Tournaments** (only with a large enough player base).

### Revenue projection at 10k games/month

| Channel | Monthly low | Monthly high | Effort |
|---------|------------|-------------|--------|
| Physical sets (Etsy) | $625 | $4,800 | High (production) |
| PDFs (paid) | $75 | $400 | Low (create once) |
| Newsletter sponsors | $100 | $800 | Medium (content) |
| Direct sponsors | $100 | $500 | Medium (sales) |
| Affiliate links | $50 | $200 | Low (links) |
| Donate button | $10 | $50 | None |
| **Total** | **$960** | **$6,750** | |

The physical sets are the clear winner in terms of revenue potential, especially with your existing production capabilities. The email list is the enabler for everything else. Start there.

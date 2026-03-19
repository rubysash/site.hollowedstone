# Infrastructure Costs

Cloudflare Workers + KV pricing breakdown for Hollowed Stone.

## Current Status: Free Tier

The platform runs entirely on Cloudflare's free tier. $0/month.

## Free Tier Limits

| Resource | Limit | Reset |
|----------|-------|-------|
| Worker requests | 100,000/day | Daily at 00:00 UTC |
| KV reads | 100,000/day | Daily |
| KV writes | 1,000/day | Daily |
| KV deletes | 1,000/day | Daily |
| KV list operations | 1,000/day | Daily |
| KV storage | 1 GB | N/A |
| CPU time per request | 10 ms | Per request |
| Static assets | Unlimited | N/A |

## What Each Game Costs

| Action | KV writes | KV reads | Worker requests |
|--------|-----------|----------|----------------|
| Create game | 2 | 1 | 1 |
| Join game | 1 | 1 | 1 |
| Each move | 1 | 1 | 1 |
| Each poll (state check) | 0 (every 25th = 1) | 1 | 1 |
| Leave/finish | 1 | 1 | 1 |
| Feedback submit | 2 | 1 | 1 |

A typical game (30 moves, 30-minute session):
- KV writes: ~35-45 (moves + create/join/finish + periodic request counter)
- KV reads: ~400-800 (polling every 3-8 seconds for 30 minutes, 2 players)
- Worker requests: same as reads

## Capacity on Free Tier

| Metric | Daily capacity | Games per day |
|--------|---------------|---------------|
| KV writes (bottleneck) | 1,000 | ~25 games |
| KV reads | 100,000 | ~150 games |
| Worker requests | 100,000 | ~150 games |

**KV writes are the first bottleneck.** At ~40 writes per game, the free tier supports roughly 25 games per day.

## Paid Tier ($5/month)

| Resource | Included | Overage |
|----------|----------|---------|
| Worker requests | 10 million/month | $0.30/million |
| KV reads | 10 million/month | $0.50/million |
| KV writes | 1 million/month | $5.00/million |
| KV deletes | 1 million/month | $5.00/million |
| KV list operations | 1 million/month | $5.00/million |
| KV storage | 1 GB | $0.50/GB-month |
| CPU time | 30 million ms/month | $0.02/million ms |

## Capacity on Paid Tier

| Metric | Monthly capacity | Games per month |
|--------|-----------------|----------------|
| KV writes | 1,000,000 | ~25,000 |
| KV reads | 10,000,000 | ~15,000 |
| Worker requests | 10,000,000 | ~15,000 |

At $5/month, the platform can handle roughly 500 games per day or 15,000 per month before hitting any overage.

## Growth Thresholds

| Games per day | Tier needed | Monthly cost |
|---------------|-------------|-------------|
| 1-25 | Free | $0 |
| 25-500 | Paid | $5 |
| 500-1,000 | Paid + minor overage | $5-8 |
| 1,000-5,000 | Paid + moderate overage | $8-25 |
| 5,000+ | Paid + significant overage | $25+ |

## What Triggers an Upgrade

1. **25+ games per day** - KV writes exceed 1,000/day. First bottleneck.
2. **150+ games per day** - KV reads and worker requests approach 100k/day.
3. **500+ games per day** - Need paid tier write capacity.

## Cost Optimization Already in Place

- Request counter only written to KV every 25 polls (not every poll)
- Games expire from KV after 7-30 days (auto-cleanup)
- Adaptive polling reduces request volume when players are idle
- Static assets (HTML, CSS, JS, SVG) are served from CDN and do not count against worker limits
- No database, no external APIs, no third-party services

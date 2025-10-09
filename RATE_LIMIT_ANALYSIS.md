# Rate Limit Analysis - How Many Coins Can We Track?

## Binance Futures API Limits

**Default limits (per IP):**
- **2,400 requests/minute** (general limit)
- **10,000 requests/minute** (weight-based limit)
- Each endpoint has a "weight" (simple queries = 1, complex = 5-40)

**Our endpoint (klines/OHLCV):**
- Weight: **5 per request** (for 50 candles)
- Limit: **2,000 requests/minute** (10,000 weight / 5)

## Current Architecture

### What We're Doing

**On Startup (Initial Fetch):**
```
4 intervals × N coins = 4N requests
```

**Every 15 minutes:**
```
1 interval × N coins = N requests
```

**Every 30 minutes:**
```
1 interval × N coins = N requests
```

**Every 1 hour:**
```
1 interval × N coins = N requests
```

**Every 4 hours:**
```
1 interval × N coins = N requests
```

### Requests Per Hour

Let's calculate for 1 hour:

```
Initial fetch: 4N requests (one-time)

Recurring per hour:
- 15m job: runs 4 times = 4N requests
- 30m job: runs 2 times = 2N requests
- 1h job:  runs 1 time  = 1N requests
- 4h job:  runs 0.25 times = 0.25N requests

Total per hour = 7.25N requests
```

**Per minute average:** `7.25N / 60 = 0.12N requests/min`

## Maximum Coins Calculation

### Constraint 1: Startup Burst

**Initial fetch:** 4N requests in ~2-5 minutes

Assuming we want to complete startup in **5 minutes**:
```
4N / 5 = 0.8N requests/min
Limit: 2,000 requests/min
Max N = 2,000 / 0.8 = 2,500 coins
```

### Constraint 2: Peak Load (15-minute mark)

At the 15-minute mark, multiple jobs may overlap:

**Worst case (at :00):**
- 15m job + 30m job + 1h job + (maybe) 4h job = up to 4N requests

If all N coins fetch in **1 minute**:
```
4N requests/min (worst case)
Limit: 2,000 requests/min
Max N = 2,000 / 4 = 500 coins
```

If we spread over **2 minutes**:
```
4N / 2 = 2N requests/min
Max N = 2,000 / 2 = 1,000 coins
```

### Constraint 3: Sustained Load

**Average:** 0.12N requests/min
```
0.12N < 2,000
Max N = 16,666 coins (not a constraint)
```

## Practical Recommendations

### Conservative (No Rate Limit Risk)

**Max coins: 200-300**

**Why?**
- Startup completes in 1-2 minutes
- Peak jobs (4N requests) complete in 1-2 minutes
- Plenty of headroom for other API calls (ticker WebSocket, etc.)
- Safe margin for retries

**Calculation:**
```
300 coins × 4 intervals = 1,200 requests
At startup: 1,200 / 1 min = 1,200 req/min (60% of limit) ✅
Peak overlap: 1,200 / 1 min = 1,200 req/min (60% of limit) ✅
```

### Aggressive (Using Most of Limit)

**Max coins: 400-500**

**Why?**
- Uses ~80% of rate limit
- Still have buffer for retries
- Startup takes 2-3 minutes

**Calculation:**
```
500 coins × 4 intervals = 2,000 requests
At startup: 2,000 / 2 min = 1,000 req/min (50% of limit) ✅
Peak overlap: 2,000 / 2 min = 1,000 req/min (50% of limit) ✅
```

### Extreme (Maximum Possible)

**Max coins: 1,000-1,500**

**Requires:**
- Sequential fetching with delays
- Spread requests over 3-5 minutes
- Smart scheduling to avoid overlaps
- Retry logic with exponential backoff

**Calculation:**
```
1,000 coins × 4 intervals = 4,000 requests
Spread over 5 min: 4,000 / 5 = 800 req/min (40% of limit) ✅
```

## Current Implementation

**Right now: 1 coin (BTCUSDT)** 🎯

You have **plenty of room** to add more!

## Optimization Strategies

### 1. Batch with Delay (Current)
```typescript
for (const coin of SYMBOLS) {
  await fetchKline(coin);
  // Sequential, ~100-200ms per request
}
```

**Pros:** Simple, safe
**Cons:** Slow for many coins
**Max coins:** 200-300

### 2. Parallel Batches
```typescript
// Process 10 coins at a time
const batches = chunk(SYMBOLS, 10);
for (const batch of batches) {
  await Promise.all(batch.map(fetchKline));
  await delay(100); // Small delay between batches
}
```

**Pros:** Much faster
**Cons:** More complex
**Max coins:** 400-500

### 3. Rate-Limited Queue
```typescript
const queue = new RateLimitQueue(2000, 60000); // 2000/min
for (const coin of SYMBOLS) {
  queue.add(() => fetchKline(coin));
}
```

**Pros:** Maximum throughput, handles retries
**Cons:** Needs library (p-queue, bottleneck)
**Max coins:** 1,000-1,500

### 4. Smart Scheduling (Avoid Overlaps)
```typescript
// Stagger job execution
15m job: runs at :00, :15, :30, :45
30m job: runs at :05, :35  (offset by 5 min)
1h job:  runs at :10       (offset by 10 min)
4h job:  runs at :20       (offset by 20 min)
```

**Pros:** No peak overlaps
**Cons:** Slight delay in data freshness
**Max coins:** 400-600

## Recommendation for Your Use Case

### For Top 50 Coins (Current Goal)

**50 coins = SAFE** ✅

```
50 coins × 4 intervals = 200 requests
Startup: 200 / 1 min = 200 req/min (10% of limit)
Peak: 200 / 1 min = 200 req/min (10% of limit)
```

**No changes needed!** Just uncomment the full SYMBOLS array.

### For Top 100-200 Coins

**100-200 coins = SAFE** ✅

```
200 coins × 4 intervals = 800 requests
Startup: 800 / 2 min = 400 req/min (20% of limit)
Peak: 800 / 2 min = 400 req/min (20% of limit)
```

**No changes needed!** Current implementation handles this fine.

### For 500+ Coins

**500 coins = ADD BATCHING** ⚠️

Implement parallel batches (Strategy #2) to speed up fetching.

### For 1,000+ Coins

**1,000 coins = ADD RATE LIMITER** ⚠️

Use rate-limited queue (Strategy #3) and smart scheduling (Strategy #4).

## Monitoring

Add these to track usage:

```typescript
console.log(`[Rate Limit] ${requestCount}/${rateLimit} (${percent}%)`);
```

Watch for 429 errors (rate limit exceeded) and implement exponential backoff.

## CCXT Rate Limiting

CCXT has built-in rate limiting:
```typescript
exchange.rateLimit = 100; // ms between requests
```

This automatically throttles requests to stay under limits! 🎉

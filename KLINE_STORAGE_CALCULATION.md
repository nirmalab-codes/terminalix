# Kline Storage Calculation - Records Per Day

## Current Configuration

**Intervals tracked:** 15m, 30m, 1h, 4h
**Coins:** 1 (BTCUSDT) - can be expanded to 50
**Candles fetched:** 50 per interval per fetch

## How Many Candles Per Day?

### 15-minute candles
- **1 day** = 24 hours = 1,440 minutes
- **1,440 / 15** = **96 candles per day**

### 30-minute candles
- **1 day** = 24 hours = 1,440 minutes
- **1,440 / 30** = **48 candles per day**

### 1-hour candles
- **1 day** = 24 hours
- **24 / 1** = **24 candles per day**

### 4-hour candles
- **1 day** = 24 hours
- **24 / 4** = **6 candles per day**

## Total Records Per Coin Per Day

```
15m: 96 candles
30m: 48 candles
1h:  24 candles
4h:  6 candles
-------------------
TOTAL: 174 records/day per coin
```

## Database Growth Projections

### 1 Coin (Current - BTCUSDT)

| Period | Records |
|--------|---------|
| **1 day** | 174 |
| **1 week** | 1,218 |
| **1 month** | 5,220 |
| **1 year** | 63,510 |

### 50 Coins (Original Plan)

| Period | Records |
|--------|---------|
| **1 day** | 8,700 |
| **1 week** | 60,900 |
| **1 month** | 261,000 |
| **1 year** | 3,175,500 (~3.2M) |

### 200 Coins (If Scaling Up)

| Period | Records |
|--------|---------|
| **1 day** | 34,800 |
| **1 week** | 243,600 |
| **1 month** | 1,044,000 (~1M) |
| **1 year** | 12,702,000 (~12.7M) |

## Storage Size Estimation

### Single Kline Record Size

```typescript
{
  id: 8 bytes (bigint)
  symbol: ~10 bytes (varchar)
  interval: ~4 bytes (varchar)
  openTime: 8 bytes (timestamp)
  closeTime: 8 bytes (timestamp)
  open: 8 bytes (float)
  high: 8 bytes (float)
  low: 8 bytes (float)
  close: 8 bytes (float)
  volume: 8 bytes (float)
  quoteVolume: 8 bytes (float)
  trades: 4 bytes (int)
  createdAt: 8 bytes (timestamp)
}
```

**Approximate size:** ~100 bytes per record (including indexes)

### Storage Requirements

| Coins | 1 Month | 1 Year | 5 Years |
|-------|---------|--------|---------|
| **1** | 0.5 MB | 6.4 MB | 32 MB |
| **50** | 26 MB | 318 MB | 1.6 GB |
| **200** | 104 MB | 1.3 GB | 6.4 GB |

## Fetch vs. Storage

### What We Fetch (Every Run)

**15m job runs 4x per hour:**
- Fetches: 50 candles
- Saves: 50 records (but 49 are UPDATES, 1 is INSERT)

**Per day for all intervals:**
```
15m: 4 jobs/hour × 24 hours = 96 fetches × 50 candles = 4,800 fetches
30m: 2 jobs/hour × 24 hours = 48 fetches × 50 candles = 2,400 fetches
1h:  1 job/hour × 24 hours = 24 fetches × 50 candles = 1,200 fetches
4h:  6 jobs/day × 50 candles = 300 fetches
----------------------------------------
TOTAL: 8,700 candle fetches per day
```

**BUT:** Most are updates to existing records!

### Actual New Records Per Day

Only **174 new records** per coin per day (one per timeframe per candle close).

## Why We Fetch 50 Candles?

**For RSI calculation:**
- RSI needs 14 periods minimum
- StochRSI needs RSI history (36+ values)
- **50 candles** gives us enough history for accurate calculations

## Database Cleanup Strategy

Since we only need 50 candles per interval for calculations, we can implement cleanup:

### Option 1: Keep Last 100 Candles Only
```sql
DELETE FROM kline
WHERE id NOT IN (
  SELECT id FROM kline
  WHERE symbol = 'BTCUSDT' AND interval = '15m'
  ORDER BY openTime DESC
  LIMIT 100
)
```

**Storage:** 100 candles × 4 intervals × 50 coins = **20,000 records** (2 MB)

### Option 2: Keep Last 30 Days
```sql
DELETE FROM kline
WHERE openTime < NOW() - INTERVAL '30 days'
```

**Storage:** ~5,220 records × 50 coins = **261,000 records** (~26 MB)

### Option 3: Keep Everything (Current)
- No cleanup
- Unlimited historical data
- Good for backtesting

## Current Status (1 Coin, No Cleanup)

**After 1 month of running:**
- Records: ~5,220
- Storage: ~0.5 MB
- Query performance: Excellent (small dataset)

**After 1 year of running:**
- Records: ~63,510
- Storage: ~6.4 MB
- Query performance: Still excellent

## Recommendation

For your use case with 50 coins:

**No cleanup needed yet!** Even after 1 year:
- 3.2M records × 100 bytes = **320 MB**
- PostgreSQL handles this easily
- Indexes keep queries fast

**Add cleanup only if:**
1. You scale to 200+ coins
2. You want to save disk space
3. Database grows beyond 5 GB

## Summary

**Per coin per day:** **174 new kline records**

**Current setup (1 coin):**
- Day: 174 records
- Month: 5,220 records
- Year: 63,510 records (~6 MB)

**With 50 coins:**
- Day: 8,700 records
- Month: 261,000 records (~26 MB)
- Year: 3.2M records (~320 MB)

**Verdict:** ✅ Very manageable! No concerns about storage or performance.

# StochRSI Calculation - How It Works Now

## Overview

**Problem with old approach:** We were calculating StochRSI from ticker prices (real-time updates), which is incorrect.

**New approach:** We calculate StochRSI from candlestick close prices, which is the correct way.

## Step-by-Step Process

### 1. Fetch Kline Data (Candlesticks)

```typescript
// Get last 50 klines for this symbol and interval (e.g., 15m)
const klines = await prisma.kline.findMany({
  where: { symbol: 'BTCUSDT', interval: '15m' },
  orderBy: { openTime: 'desc' },
  take: 50,
});
```

**Example data:**
- 50 completed 15-minute candles
- Each candle has: open, high, low, **close**, volume
- We only use the **close prices**

### 2. Extract Close Prices

```typescript
// Reverse to get chronological order (oldest → newest)
const prices = klines.reverse().map(k => k.close);

// Example:
// prices = [43500, 43520, 43480, 43550, ..., 43720] // 50 values
```

### 3. Calculate RSI (14-period)

```typescript
const rsi = calculateRSI(prices, 14);

// Uses trading-signals library
// RSI = Relative Strength Index (0-100)
// Based on last 14 close prices
```

**What RSI means:**
- RSI > 70 = Overbought
- RSI < 30 = Oversold
- RSI ≈ 50 = Neutral

### 4. Build RSI History for StochRSI

**This is the key step!** StochRSI needs a history of RSI values.

```typescript
const rsiHistoryValues: number[] = [];

// Calculate RSI for each sliding window
for (let i = 14; i < prices.length; i++) {
  const periodPrices = prices.slice(i - 14, i + 1);
  const periodRsi = calculateRSI(periodPrices, 14);
  rsiHistoryValues.push(periodRsi);
}
```

**Example with 50 prices:**
- Window 1: prices[0-14] → RSI = 52.3
- Window 2: prices[1-15] → RSI = 53.1
- Window 3: prices[2-16] → RSI = 54.8
- ...
- Window 36: prices[35-49] → RSI = 51.2

Result: `rsiHistoryValues = [52.3, 53.1, 54.8, ..., 51.2]` (36 values)

### 5. Calculate StochRSI

```typescript
const stochRsi = calculateStochRSI(rsiHistoryValues, 14, 3, 3);
//                                  ^^^^^^^^^^^^^^^^  ^^  ^  ^
//                                  RSI values       |  |  |
//                                                  Period K D
```

**Parameters:**
- `rsiHistoryValues`: Array of RSI values (from step 4)
- `14`: StochRSI period (looks at last 14 RSI values)
- `3`: K period (smoothing for %K line)
- `3`: D period (smoothing for %D line)

**Returns:**
```typescript
{
  value: 0.65,  // StochRSI value (0-1 range)
  k: 68.5,      // %K line (0-100 range)
  d: 72.3       // %D line (0-100 range)
}
```

### 6. Store in Database

```typescript
updates[`stochRsi${suffix}`] = stochRsi.value;     // 0.65 → stored as-is
updates[`stochRsiK${suffix}`] = stochRsi.k / 100;  // 68.5 / 100 = 0.685
updates[`stochRsiD${suffix}`] = stochRsi.d / 100;  // 72.3 / 100 = 0.723
```

**Database values (all in 0-1 range):**
- `stochRsi15m: 0.65`
- `stochRsiK15m: 0.685`
- `stochRsiD15m: 0.723`

## What Each Value Means

### StochRSI Value (0-1 range)
- **> 0.8** = RSI is overbought (been high recently)
- **< 0.2** = RSI is oversold (been low recently)
- **≈ 0.5** = RSI is neutral

### %K and %D Lines
- **%K** = Fast line (more sensitive)
- **%D** = Slow line (smoother, moving average of %K)
- **Crossovers** = Trading signals
  - %K crosses above %D = Bullish signal
  - %K crosses below %D = Bearish signal

## Example Calculation

**Given 50 BTC 15m candles:**

1. Close prices: [43500, 43520, ..., 43720] (50 values)
2. Current RSI (14-period): 52.5
3. RSI history: [52.3, 53.1, 54.8, ..., 51.2] (36 values)
4. StochRSI calculation:
   - Looks at last 14 RSI values: [50.1, 51.2, 52.5, ..., 51.2]
   - Highest RSI in period: 56.8
   - Lowest RSI in period: 48.2
   - Current RSI: 51.2
   - StochRSI = (51.2 - 48.2) / (56.8 - 48.2) = 3.0 / 8.6 = **0.349**
5. %K (3-period SMA of StochRSI): **38.2**
6. %D (3-period SMA of %K): **42.5**

**Stored in DB:**
- `rsi15m: 52.5`
- `stochRsi15m: 0.349`
- `stochRsiK15m: 0.382` (38.2 / 100)
- `stochRsiD15m: 0.425` (42.5 / 100)

## Why This Approach is Correct

✅ **Uses candlestick closes** - Not ticker prices
✅ **Proper RSI history** - Rolling window of RSI values
✅ **Standard calculation** - Matches TradingView/Binance
✅ **Per timeframe** - Separate calculation for 15m, 30m, 1h, 4h

## Common Issues

### "I see 0 or 1 values"

**Possible reasons:**
1. Not enough data yet (need 50 klines minimum)
2. Initial fetch still running
3. Database hasn't been updated yet

**Solution:** Wait for initial fetch to complete, check logs for:
```
[Scheduler] ✅ Completed 15m klines update: 1 success, 0 errors
[Scheduler] 📈 Updated multi-TF RSI for BTCUSDT: rsi15m, stochRsi15m, ...
```

### "Values don't match TradingView"

**Possible reasons:**
1. Different timeframe alignment
2. TradingView uses different settings (period, K, D)
3. Data lag (we fetch every 15m, TradingView updates real-time)

**Note:** Our values should be close but may not match exactly due to timing differences.

# Binance Scheduler Refactoring Summary

## Overview
Refactored the binance-scheduler to use a more accurate and efficient approach for calculating RSI indicators across multiple timeframes.

## Changes Made

### 1. **Added CCXT Library** ✅
- Installed `ccxt` package for unified cryptocurrency exchange API
- Installed `protobufjs` dependency required by CCXT
- Created `lib/ccxt-client.ts` wrapper for easy integration

### 2. **Removed Kline WebSocket** ✅
- Removed the entire `connectKlineWebSocket()` function
- Eliminated WebSocket streams for kline data (was using 200 simultaneous streams)
- Reduced WebSocket bandwidth and complexity

### 3. **Fixed Incorrect RSI Calculation** ✅
- **Before**: RSI was calculated from ticker price updates (incorrect)
  - Used in-memory `priceHistories` array
  - Calculated RSI from real-time ticker prices instead of candle closes
- **After**: RSI is calculated from proper candlestick close prices
  - Fetches complete OHLCV data via REST API
  - Uses actual candle close prices for accurate RSI

### 4. **Implemented Scheduled Jobs** ✅
Added 4 cron jobs using `node-cron`:
- **15m job**: Runs every 15 minutes (`*/15 * * * *`)
- **30m job**: Runs every 30 minutes (`*/30 * * * *`)
- **1h job**: Runs every hour (`0 * * * *`)
- **4h job**: Runs every 4 hours (`0 */4 * * *`)

Each job:
1. Fetches OHLCV data for all 50 symbols via CCXT
2. Saves klines to database
3. Calculates multi-timeframe RSI
4. Updates indicator table

### 5. **Simplified Ticker Stream** ✅
- Ticker WebSocket now **only** handles real-time price updates
- Removed all RSI calculation logic from ticker stream
- Cleaner separation of concerns

## Architecture Comparison

### Before:
```
Ticker WebSocket (50 symbols)
  ↓
  → Saves price to DB
  → Calculates RSI from ticker prices (❌ WRONG)
  → Saves indicators to DB

Kline WebSocket (200 streams = 50 symbols × 4 intervals)
  ↓
  → Saves klines to DB
  → Calculates multi-timeframe RSI
  → Saves indicators to DB
```

### After:
```
Ticker WebSocket (50 symbols)
  ↓
  → Saves price to DB only
  → Broadcasts price updates

Cron Jobs (4 jobs)
  ↓
  → Fetch klines via CCXT REST API
  → Save klines to DB
  → Calculate multi-timeframe RSI (✅ CORRECT)
  → Save indicators to DB
```

## Benefits

1. **More Accurate RSI**: Uses proper candlestick close prices instead of ticker prices
2. **Reduced Complexity**: No need to manage 200 WebSocket streams
3. **Better Resource Usage**: REST API calls on schedule vs. continuous WebSocket data
4. **Easier to Debug**: Scheduled jobs with clear logging
5. **Future-Proof**: CCXT makes it easy to add more exchanges later
6. **Separation of Concerns**: Ticker = real-time price, Jobs = indicators

## Files Modified

1. `lib/ccxt-client.ts` - New CCXT wrapper
2. `lib/scheduler/binance-scheduler.ts` - Complete refactor
   - Removed `priceHistories` and `MAX_HISTORY`
   - Removed `connectKlineWebSocket()`
   - Added `fetchAndSaveKlines()`
   - Added `getIntervalMs()`
   - Added `setupCronJobs()`
   - Updated `startScheduler()` and `stopScheduler()`

## Questions Answered

### Q1: Do we need WebSocket data to collect RSI?
**A**: No. You can hit Binance REST API with `interval=15m&limit=50` and calculate RSI from the close prices. This is actually more accurate.

### Q2: Can we refactor to ticker + scheduled jobs?
**A**: Yes, and this is now implemented. Ticker WebSocket for real-time price, 4 scheduled jobs for RSI calculation.

### Q3: Can we use CCXT? Does it support WebSocket?
**A**: Yes, CCXT works great for REST API. WebSocket support requires CCXT Pro (paid), so we kept native Binance WebSocket for ticker updates.

## Testing Recommendations

1. Monitor initial kline fetch on startup
2. Verify cron jobs run at correct intervals
3. Check RSI values are being calculated correctly
4. Ensure database is being updated properly
5. Test graceful shutdown (cron jobs stop cleanly)

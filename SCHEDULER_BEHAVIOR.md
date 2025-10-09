# Scheduler Behavior - How Cron Jobs Work

## Startup Sequence

When you start the app, here's what happens:

1. **Ticker WebSocket** connects immediately
2. **Initial Data Fetch** runs immediately for all timeframes (15m, 30m, 1h, 4h)
3. **Cron Jobs** are scheduled and wait for their next scheduled time

## Cron Job Schedules

### Important: Jobs run at **clock times**, NOT relative to startup!

| Interval | Cron Expression | Runs At | Example |
|----------|----------------|---------|---------|
| 15m | `*/15 * * * *` | :00, :15, :30, :45 | If you start at 12:08, next run is 12:15 |
| 30m | `*/30 * * * *` | :00, :30 | If you start at 12:08, next run is 12:30 |
| 1h | `0 * * * *` | :00 of each hour | If you start at 12:08, next run is 13:00 |
| 4h | `0 */4 * * *` | 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 | If you start at 12:08, next run is 16:00 |

## Example Timeline

**Startup at 12:08 PM:**

```
12:08:00 - App starts
12:08:01 - Ticker WebSocket connects
12:08:02 - Initial fetch starts (15m, 30m, 1h, 4h)
12:08:45 - Initial fetch completes
12:15:00 - 15m cron job runs (1st scheduled run)
12:30:00 - 15m + 30m cron jobs run
12:45:00 - 15m cron job runs
13:00:00 - 15m + 30m + 1h cron jobs run
...
16:00:00 - 15m + 30m + 1h + 4h cron jobs run
```

## Why This Design?

1. **Initial Fetch** - Users see data immediately, no waiting
2. **Clock-aligned Cron** - Consistent with candle close times
   - 15m candles close at :00, :15, :30, :45
   - Fetching at these times ensures we get the latest completed candles
3. **No Data Gaps** - Even if app restarts, cron times stay consistent with market data

## Debugging

To check when cron jobs run, look for these logs:

```
[Scheduler] 🔄 Fetching 15m klines for 1 symbols...
[Scheduler] ✅ Completed 15m klines update: 1 success, 0 errors in 2.34s
[Scheduler] 📈 Updated multi-TF RSI for BTCUSDT: rsi15m, stochRsi15m, ...
```

## Current Configuration

- **Symbols**: BTCUSDT (testing with 1 symbol)
- **Intervals**: 15m, 30m, 1h, 4h
- **Fetch Limit**: 50 candles per request
- **API**: CCXT → Binance Futures

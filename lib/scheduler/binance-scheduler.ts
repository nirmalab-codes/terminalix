// Background job that connects to Binance WebSocket and saves data to PostgreSQL
import WebSocket from 'ws';
import * as cron from 'node-cron';
import pLimit from 'p-limit';
import { prisma } from '@/lib/db';
import { calculateRSI, calculateStochRSI } from '@/lib/indicators';
import { broadcaster } from '@/lib/ws-broadcaster';
import { ccxtClient, CCXTClient } from '@/lib/ccxt-client';

// Calculate multi-timeframe RSI from kline data
async function calculateMultiTimeframeRSI(symbol: string) {
  try {
    const updates: any = {};

    // Calculate RSI for each timeframe
    for (const interval of KLINE_INTERVALS) {
      // Get last 50 klines for this symbol and interval
      const klines = await prisma.kline.findMany({
        where: { symbol, interval },
        orderBy: { openTime: 'desc' },
        take: 50,
      });

      if (klines.length >= 14) {
        // Extract close prices (reverse to get chronological order: oldest → newest)
        const prices = klines.reverse().map(k => k.close);

        // Calculate RSI (uses last 14 prices)
        const rsi = calculateRSI(prices, 14);

        // Calculate StochRSI (pass raw prices, it calculates RSI internally)
        const stochRsi = calculateStochRSI(prices, 14, 3, 3);

        // Map interval to field names
        const suffix = interval === '15m' ? '15m' : interval === '30m' ? '30m' : interval === '1h' ? '1h' : '4h';

        updates[`rsi${suffix}`] = rsi;
        updates[`stochRsi${suffix}`] = stochRsi.value;
        updates[`stochRsiK${suffix}`] = stochRsi.k;
        updates[`stochRsiD${suffix}`] = stochRsi.d;

        // Calculate price change for this timeframe (current vs previous candle)
        if (klines.length >= 2) {
          const currentPrice = klines[klines.length - 1].close;
          const previousPrice = klines[klines.length - 2].close;
          const priceChangePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
          updates[`priceChange${suffix}`] = priceChangePercent;
        }
      }
    }

    // Update indicator table with multi-timeframe data if we have any updates
    if (Object.keys(updates).length > 0) {
      await prisma.indicator.upsert({
        where: { symbol },
        create: {
          symbol,
          // Required fields (will be overwritten by updates if present)
          rsi: 0,
          stochRsi: 0,
          stochRsiK: 0,
          stochRsiD: 0,
          isOverbought: false,
          isOversold: false,
          trend: 'neutral',
          // Multi-timeframe data from updates
          ...updates,
        },
        update: updates,
      });

      console.log(`[Scheduler] 📈 Updated multi-TF RSI for ${symbol}: ${Object.keys(updates).join(', ')}`);
    }
  } catch (error) {
    console.error(`[Scheduler] Error calculating multi-timeframe RSI for ${symbol}:`, error);
  }
}

// Dynamic top USDT Perpetual Futures symbols (fetched by 24h volume)
// Updated every 15 minutes to track the most active/liquid coins
let SYMBOLS: string[] = [];
export const TOP_SYMBOLS_LIMIT = 200;

// Kline intervals to track
const KLINE_INTERVALS = ['15m', '30m', '1h', '4h'];

// Rate limiter: Max 20 concurrent API requests to Binance
const apiLimiter = pLimit(20);

let tickerWs: WebSocket | null = null;
const cronJobs: cron.ScheduledTask[] = [];
let isRunning = false;
let isReconnecting = false;

// Update top symbols by 24h volume
async function updateTopSymbols(): Promise<boolean> {
  try {
    console.log('[Scheduler] 🔄 Updating top symbols by 24h volume...');

    const newSymbols = await ccxtClient.fetchTopSymbolsByVolume(TOP_SYMBOLS_LIMIT);

    // Check if symbols changed
    const oldSymbols = new Set(SYMBOLS);
    const newSymbolsSet = new Set(newSymbols);

    const added = newSymbols.filter(s => !oldSymbols.has(s));
    const removed = SYMBOLS.filter(s => !newSymbolsSet.has(s));

    if (added.length > 0 || removed.length > 0) {
      console.log(`[Scheduler] 📊 Symbol changes detected:`);
      if (added.length > 0) console.log(`  ➕ Added (${added.length}):`, added.slice(0, 5).join(', '), added.length > 5 ? '...' : '');
      if (removed.length > 0) console.log(`  ➖ Removed (${removed.length}):`, removed.slice(0, 5).join(', '), removed.length > 5 ? '...' : '');

      // Update SYMBOLS array
      SYMBOLS = newSymbols;

      return true; // Symbols changed
    } else {
      console.log('[Scheduler] ✅ No symbol changes');
      return false; // No changes
    }
  } catch (error) {
    console.error('[Scheduler] ⚠️ Error updating top symbols:', error);
    return false;
  }
}

// Reconnect ticker WebSocket with new symbols
async function reconnectTickerWebSocket() {
  if (isReconnecting) {
    console.log('[Scheduler] Already reconnecting WebSocket, skipping...');
    return;
  }

  isReconnecting = true;

  try {
    console.log('[Scheduler] 🔄 Reconnecting ticker WebSocket with updated symbols...');

    // Close existing WebSocket
    if (tickerWs) {
      tickerWs.removeAllListeners(); // Remove listeners to prevent auto-reconnect
      tickerWs.close();
      tickerWs = null;
    }

    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Connect with new symbols
    connectTickerWebSocket();

    console.log('[Scheduler] ✅ WebSocket reconnected successfully');
  } catch (error) {
    console.error('[Scheduler] ⚠️ Error reconnecting WebSocket:', error);
  } finally {
    isReconnecting = false;
  }
}

// Connect to Binance ticker WebSocket (24hr ticker for all symbols)
function connectTickerWebSocket() {
  if (SYMBOLS.length === 0) {
    console.log('[Scheduler] ⚠️ No symbols available, skipping WebSocket connection');
    return;
  }

  const streams = SYMBOLS.map(s => `${s.toLowerCase()}@ticker`).join('/');
  const wsUrl = `wss://fstream.binance.com/stream?streams=${streams}`;

  console.log(`[Scheduler] Connecting to Binance ticker WebSocket for ${SYMBOLS.length} symbols...`);
  tickerWs = new WebSocket(wsUrl);

  tickerWs.on('open', () => {
    console.log('[Scheduler] ✅ Ticker WebSocket connected');
  });

  tickerWs.on('message', async (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());
      const ticker = message.data;

      if (!ticker || ticker.e !== '24hrTicker') return;

      const symbol = ticker.s;
      const price = parseFloat(ticker.c);

      // Save ticker data to PostgreSQL
      await prisma.ticker.upsert({
        where: { symbol },
        create: {
          symbol,
          price: parseFloat(ticker.c),
          priceChange: parseFloat(ticker.p),
          priceChangePercent: parseFloat(ticker.P),
          volume: parseFloat(ticker.v),
          quoteVolume: parseFloat(ticker.q),
          high: parseFloat(ticker.h),
          low: parseFloat(ticker.l),
          open: parseFloat(ticker.o),
          close: parseFloat(ticker.c),
          timestamp: new Date(ticker.E),
        },
        update: {
          price: parseFloat(ticker.c),
          priceChange: parseFloat(ticker.p),
          priceChangePercent: parseFloat(ticker.P),
          volume: parseFloat(ticker.v),
          quoteVolume: parseFloat(ticker.q),
          high: parseFloat(ticker.h),
          low: parseFloat(ticker.l),
          open: parseFloat(ticker.o),
          close: parseFloat(ticker.c),
          timestamp: new Date(ticker.E),
        },
      });

      console.log(`[Scheduler] 💾 Saved ticker: ${symbol} @ $${price.toFixed(2)}`);

      // Broadcast ticker update to WebSocket clients
      broadcaster.queueUpdate('ticker', symbol, {
        price: parseFloat(ticker.c),
        priceChange: parseFloat(ticker.p),
        priceChangePercent: parseFloat(ticker.P),
        volume: parseFloat(ticker.v),
        high: parseFloat(ticker.h),
        low: parseFloat(ticker.l),
      });
    } catch (error) {
      console.error('[Scheduler] Error saving data:', error);
    }
  });

  tickerWs.on('error', (error) => {
    console.error('[Scheduler] Ticker WebSocket error:', error);
  });

  tickerWs.on('close', () => {
    console.log('[Scheduler] Ticker WebSocket disconnected, reconnecting in 5s...');
    setTimeout(() => {
      if (isRunning && !isReconnecting) connectTickerWebSocket();
    }, 5000);
  });
}

// Fetch klines for a single symbol (helper function)
async function fetchAndSaveKlinesForSymbol(binanceSymbol: string, interval: string) {
  try {
    // Convert to CCXT format (e.g., BTCUSDT -> BTC/USDT)
    const ccxtSymbol = CCXTClient.toCCXTSymbol(binanceSymbol);

    // Fetch OHLCV data from Binance via CCXT
    const ohlcv = await ccxtClient.fetchOHLCV(ccxtSymbol, interval, 50);

    // Prepare batch upsert operations for all candles
    const upsertOperations = [];

    for (const candle of ohlcv) {
      const [timestamp, open, high, low, close, volume] = candle;

      // Skip if any value is null or undefined
      if (!timestamp || !open || !high || !low || !close || !volume) continue;

      upsertOperations.push(
        prisma.kline.upsert({
          where: {
            symbol_interval_openTime: {
              symbol: binanceSymbol,
              interval,
              openTime: new Date(timestamp),
            },
          },
          create: {
            symbol: binanceSymbol,
            interval,
            openTime: new Date(timestamp),
            closeTime: new Date(timestamp + getIntervalMs(interval)),
            open,
            high,
            low,
            close,
            volume,
            quoteVolume: volume * close, // Approximate
            trades: 0, // Not available from CCXT OHLCV
          },
          update: {
            closeTime: new Date(timestamp + getIntervalMs(interval)),
            open,
            high,
            low,
            close,
            volume,
            quoteVolume: volume * close,
          },
        })
      );
    }

    // Execute all upserts in a single transaction (OPTIMIZATION #1: Batch DB operations)
    if (upsertOperations.length > 0) {
      await prisma.$transaction(upsertOperations);
    }

    // Calculate RSI for this symbol after updating klines
    await calculateMultiTimeframeRSI(binanceSymbol);

    return { success: true, symbol: binanceSymbol };
  } catch (error) {
    console.error(`[Scheduler] ⚠️ Error fetching ${interval} klines for ${binanceSymbol}:`, error);
    return { success: false, symbol: binanceSymbol, error };
  }
}

// Fetch klines via CCXT and save to database (OPTIMIZED)
async function fetchAndSaveKlines(interval: string) {
  console.log(`[Scheduler] 🔄 Fetching ${interval} klines for ${SYMBOLS.length} symbols...`);

  const startTime = Date.now();

  // OPTIMIZATION #2 & #3: Parallel fetching with rate limiting
  // Process all symbols in parallel with max 20 concurrent requests
  const results = await Promise.all(
    SYMBOLS.map(symbol =>
      apiLimiter(() => fetchAndSaveKlinesForSymbol(symbol, interval))
    )
  );

  // Count successes and errors
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Scheduler] ✅ Completed ${interval} klines update: ${successCount} success, ${errorCount} errors in ${duration}s`);
}

// Helper function to convert interval string to milliseconds
function getIntervalMs(interval: string): number {
  const value = parseInt(interval.slice(0, -1));
  const unit = interval.slice(-1);

  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}

// Setup cron jobs for each timeframe
function setupCronJobs() {
  console.log('[Scheduler] 📅 Setting up cron jobs for kline updates...');

  // 15m: Run every 15 minutes
  const job15m = cron.schedule('*/15 * * * *', () => {
    fetchAndSaveKlines('15m');
  });
  cronJobs.push(job15m);

  // 30m: Run every 30 minutes
  const job30m = cron.schedule('*/30 * * * *', () => {
    fetchAndSaveKlines('30m');
  });
  cronJobs.push(job30m);

  // 1h: Run every hour
  const job1h = cron.schedule('0 * * * *', () => {
    fetchAndSaveKlines('1h');
  });
  cronJobs.push(job1h);

  // 4h: Run every 4 hours
  const job4h = cron.schedule('0 */4 * * *', () => {
    fetchAndSaveKlines('4h');
  });
  cronJobs.push(job4h);

  // Top symbols update: Run every 15 minutes to update symbol list
  const jobSymbols = cron.schedule('*/15 * * * *', async () => {
    const symbolsChanged = await updateTopSymbols();
    if (symbolsChanged) {
      await reconnectTickerWebSocket();
    }
  });
  cronJobs.push(jobSymbols);

  const now = new Date();
  console.log('[Scheduler] ✅ Cron jobs configured:');
  console.log(`  - 15m: Every 15 minutes at :00, :15, :30, :45`);
  console.log(`  - 30m: Every 30 minutes at :00, :30`);
  console.log(`  - 1h: Every hour at :00`);
  console.log(`  - 4h: Every 4 hours at :00 (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)`);
  console.log(`  - Symbols: Every 15 minutes (updates top ${TOP_SYMBOLS_LIMIT} coins by volume)`);
  console.log(`  - Current time: ${now.toLocaleTimeString()}`);

  // Run initial fetch for all intervals to populate data immediately
  console.log('[Scheduler] 🚀 Running initial kline fetch...');
  fetchAndSaveKlines('15m');
  fetchAndSaveKlines('30m');
  fetchAndSaveKlines('1h');
  fetchAndSaveKlines('4h');
}

// Start the background scheduler
export async function startScheduler() {
  if (isRunning) {
    console.log('[Scheduler] Already running');
    return;
  }

  console.log('[Scheduler] 🚀 Starting background scheduler...');
  isRunning = true;

  // STEP 1: Fetch top symbols BEFORE any other operations
  console.log('[Scheduler] 📊 Fetching top symbols on startup...');
  await updateTopSymbols();

  if (SYMBOLS.length === 0) {
    console.error('[Scheduler] ⚠️ Failed to fetch symbols on startup. Scheduler will not start.');
    isRunning = false;
    return;
  }

  // STEP 2: Connect to ticker WebSocket
  connectTickerWebSocket();

  // STEP 3: Setup cron jobs for kline updates (includes initial fetch)
  setupCronJobs();

  console.log('[Scheduler] ✅ Background scheduler started successfully');
}

// Stop the scheduler
export function stopScheduler() {
  console.log('[Scheduler] 🛑 Stopping scheduler...');
  isRunning = false;

  if (tickerWs) {
    tickerWs.close();
    tickerWs = null;
  }

  // Stop all cron jobs
  for (const job of cronJobs) {
    job.stop();
  }
  cronJobs.length = 0;

  console.log('[Scheduler] Scheduler stopped');
}

// Background job that connects to Binance WebSocket and saves data to PostgreSQL
import WebSocket from 'ws';
import * as cron from 'node-cron';
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
      await prisma.indicator.update({
        where: { symbol },
        data: updates,
      });

      console.log(`[Scheduler] 📈 Updated multi-TF RSI for ${symbol}: ${Object.keys(updates).join(', ')}`);
    }
  } catch (error) {
    console.error(`[Scheduler] Error calculating multi-timeframe RSI for ${symbol}:`, error);
  }
}

// Top 50 USDT Perpetual Futures symbols (Binance format)
// Testing with BTC only first
const SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'LTCUSDT',
  'AVAXUSDT', 'LINKUSDT', 'ATOMUSDT', 'ETCUSDT', 'XLMUSDT',
  'UNIUSDT', 'FILUSDT', 'APTUSDT', 'ARBUSDT', 'NEARUSDT',
  'OPUSDT', 'ICPUSDT', 'LDOUSDT', 'INJUSDT', 'STXUSDT',
  'RNDRUSDT', 'SUIUSDT', 'TIAUSDT', 'SEIUSDT', 'THETAUSDT',
  'IMXUSDT', 'RUNEUSDT', 'AAVEUSDT', 'ALGOUSDT', 'FTMUSDT',
  'SANDUSDT', 'GRTUSDT', 'MKRUSDT', 'WLDUSDT', 'GALAUSDT',
  'PENDLEUSDT', 'GMXUSDT', 'ENSUSDT', 'SNXUSDT', 'CFXUSDT',
  'AXSUSDT', 'FLOWUSDT', 'MANAUSDT', 'CHZUSDT', 'APEUSDT',
];

// Kline intervals to track
const KLINE_INTERVALS = ['15m', '30m', '1h', '4h'];

let tickerWs: WebSocket | null = null;
const cronJobs: cron.ScheduledTask[] = [];
let isRunning = false;

// Connect to Binance ticker WebSocket (24hr ticker for all symbols)
function connectTickerWebSocket() {
  const streams = SYMBOLS.map(s => `${s.toLowerCase()}@ticker`).join('/');
  const wsUrl = `wss://fstream.binance.com/stream?streams=${streams}`;

  console.log(`[Scheduler] Connecting to Binance ticker WebSocket...`);
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
      if (isRunning) connectTickerWebSocket();
    }, 5000);
  });
}

// Fetch klines via CCXT and save to database
async function fetchAndSaveKlines(interval: string) {
  console.log(`[Scheduler] 🔄 Fetching ${interval} klines for ${SYMBOLS.length} symbols...`);

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (const binanceSymbol of SYMBOLS) {
    try {
      // Convert to CCXT format (e.g., BTCUSDT -> BTC/USDT)
      const ccxtSymbol = CCXTClient.toCCXTSymbol(binanceSymbol);

      // Fetch OHLCV data from Binance via CCXT
      const ohlcv = await ccxtClient.fetchOHLCV(ccxtSymbol, interval, 50);

      // Save each kline to database
      for (const candle of ohlcv) {
        const [timestamp, open, high, low, close, volume] = candle;

        // Skip if any value is null or undefined
        if (!timestamp || !open || !high || !low || !close || !volume) continue;

        await prisma.kline.upsert({
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
        });
      }

      // Calculate RSI for this symbol after updating klines
      await calculateMultiTimeframeRSI(binanceSymbol);

      successCount++;
    } catch (error) {
      console.error(`[Scheduler] ⚠️ Error fetching ${interval} klines for ${binanceSymbol}:`, error);
      errorCount++;
    }
  }

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

  const now = new Date();
  console.log('[Scheduler] ✅ Cron jobs configured:');
  console.log(`  - 15m: Every 15 minutes at :00, :15, :30, :45`);
  console.log(`  - 30m: Every 30 minutes at :00, :30`);
  console.log(`  - 1h: Every hour at :00`);
  console.log(`  - 4h: Every 4 hours at :00 (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)`);
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

  // Connect to ticker WebSocket
  connectTickerWebSocket();

  // Setup cron jobs for kline updates
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

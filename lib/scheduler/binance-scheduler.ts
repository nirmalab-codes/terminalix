// Background job that connects to Binance WebSocket and saves data to PostgreSQL
import WebSocket from 'ws';
import { prisma } from '@/lib/db';
import { calculateRSI, calculateStochRSI, determineTrend } from '@/lib/indicators';
import { broadcaster } from '@/lib/ws-broadcaster';

// Price history storage for indicator calculations
const priceHistories = new Map<string, number[]>();
const MAX_HISTORY = 100;

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
        // Extract close prices (reverse to get chronological order)
        const prices = klines.reverse().map(k => k.close);

        // Calculate RSI
        const rsi = calculateRSI(prices, 14);

        // Calculate RSI history for StochRSI
        const rsiHistoryValues: number[] = [];
        for (let i = 14; i < prices.length; i++) {
          const periodPrices = prices.slice(i - 14, i + 1);
          const periodRsi = calculateRSI(periodPrices, 14);
          rsiHistoryValues.push(periodRsi);
        }

        // Calculate StochRSI
        const stochRsi = calculateStochRSI(rsiHistoryValues, 14, 3, 3);

        // Map interval to field names
        const suffix = interval === '15m' ? '15m' : interval === '30m' ? '30m' : interval === '1h' ? '1h' : '4h';

        updates[`rsi${suffix}`] = rsi;
        updates[`stochRsi${suffix}`] = stochRsi.value;
        updates[`stochRsiK${suffix}`] = stochRsi.k / 100;
        updates[`stochRsiD${suffix}`] = stochRsi.d / 100;

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

// Top 50 USDT Perpetual Futures symbols
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
let klineWs: WebSocket | null = null;
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

      // Update price history
      if (!priceHistories.has(symbol)) {
        priceHistories.set(symbol, []);
      }
      const history = priceHistories.get(symbol)!;
      history.push(price);
      if (history.length > MAX_HISTORY) {
        history.shift();
      }

      // Calculate indicators if we have enough data
      const rsi = calculateRSI(history, 14);
      const stochResult = calculateStochRSI(history, 14, 3, 3);
      const trend = determineTrend(rsi, parseFloat(ticker.P));
      const isOverbought = rsi > 70;
      const isOversold = rsi < 30;
      const reversalSignal = isOverbought || isOversold;

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

      // Save indicators to PostgreSQL (only if we have enough data)
      if (history.length >= 20) {
        await prisma.indicator.upsert({
          where: { symbol },
          create: {
            symbol,
            rsi,
            stochRsi: stochResult.value,
            stochRsiK: stochResult.k / 100, // Convert to 0-1 range
            stochRsiD: stochResult.d / 100,
            isOverbought,
            isOversold,
            trend,
            reversalSignal,
          },
          update: {
            rsi,
            stochRsi: stochResult.value,
            stochRsiK: stochResult.k / 100,
            stochRsiD: stochResult.d / 100,
            isOverbought,
            isOversold,
            trend,
            reversalSignal,
          },
        });

        // Broadcast indicator update to WebSocket clients
        broadcaster.queueUpdate('indicator', symbol, {
          rsi,
          stochRsi: stochResult.value,
          stochRsiK: stochResult.k / 100,
          stochRsiD: stochResult.d / 100,
          isOverbought,
          isOversold,
          trend,
          reversalSignal,
        });

        console.log(`[Scheduler] 💾 Saved ${symbol}: $${price.toFixed(2)} | RSI: ${rsi.toFixed(1)} | ${trend.toUpperCase()}`);
      } else {
        console.log(`[Scheduler] 💾 Saved ticker: ${symbol} @ $${price.toFixed(2)} (collecting data: ${history.length}/20)`);
      }

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

// Batched Kline WebSocket connection (all symbols and intervals)
function connectKlineWebSocket() {
  console.log(`[Scheduler] Connecting to batched kline WebSocket...`);

  // Create all streams: symbol@kline_interval
  const streams: string[] = [];
  for (const symbol of SYMBOLS) {
    for (const interval of KLINE_INTERVALS) {
      streams.push(`${symbol.toLowerCase()}@kline_${interval}`);
    }
  }

  // Binance allows up to 1024 streams per connection
  // We have 50 symbols × 4 intervals = 200 streams (well under limit)
  const wsUrl = `wss://fstream.binance.com/stream?streams=${streams.join('/')}`;

  klineWs = new WebSocket(wsUrl);

  klineWs.on('open', () => {
    console.log(`[Scheduler] ✅ Kline WebSocket connected with ${streams.length} streams (${SYMBOLS.length} symbols × ${KLINE_INTERVALS.length} intervals)`);
  });

  klineWs.on('message', async (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());
      const kline = message.data?.k;

      if (!kline) return;

      // Only save completed candles
      if (!kline.x) return;

      // Save kline data to PostgreSQL
      await prisma.kline.upsert({
        where: {
          symbol_interval_openTime: {
            symbol: kline.s,
            interval: kline.i,
            openTime: new Date(kline.t),
          },
        },
        create: {
          symbol: kline.s,
          interval: kline.i,
          openTime: new Date(kline.t),
          closeTime: new Date(kline.T),
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
          quoteVolume: parseFloat(kline.q),
          trades: kline.n,
        },
        update: {
          closeTime: new Date(kline.T),
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
          quoteVolume: parseFloat(kline.q),
          trades: kline.n,
        },
      });

      console.log(`[Scheduler] 📊 Saved kline: ${kline.s} ${kline.i} @ $${parseFloat(kline.c).toFixed(2)}`);

      // Calculate multi-timeframe RSI when kline closes
      await calculateMultiTimeframeRSI(kline.s);
    } catch (error) {
      console.error(`[Scheduler] Error saving kline:`, error);
    }
  });

  klineWs.on('error', (error) => {
    console.error(`[Scheduler] Kline WebSocket error:`, error);
  });

  klineWs.on('close', () => {
    console.log(`[Scheduler] Kline WebSocket disconnected, reconnecting in 5s...`);
    setTimeout(() => {
      if (isRunning) connectKlineWebSocket();
    }, 5000);
  });
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

  // Connect to batched kline WebSocket
  connectKlineWebSocket();

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

  if (klineWs) {
    klineWs.close();
    klineWs = null;
  }

  console.log('[Scheduler] Scheduler stopped');
}

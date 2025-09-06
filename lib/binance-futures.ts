// Optimized Binance Futures API for parallel data fetching
import { MarketData } from './types';

// Use API routes to avoid CORS issues
const BINANCE_SPOT_API = '/api/binance';
const BINANCE_FUTURES_API = '/api/binance';

interface FuturesSymbolInfo {
  symbol: string;
  status: string;
  contractType: string;
  baseAsset: string;
  quoteAsset: string;
  marginAsset: string;
}

export class BinanceFuturesAPI {
  private futuresSymbols: Set<string> = new Set();
  private lastFetchTime = 0;
  private cacheTimeout = 60000; // 1 minute cache
  
  // Get all active Futures USDT perpetual contracts
  async getFuturesSymbols(): Promise<string[]> {
    try {
      if (this.futuresSymbols.size > 0 && Date.now() - this.lastFetchTime < this.cacheTimeout) {
        return Array.from(this.futuresSymbols);
      }

      const response = await fetch('/api/binance/exchangeInfo');
      const data = await response.json();
      
      const symbols = data.symbols
        .filter((s: FuturesSymbolInfo) => 
          s.contractType === 'PERPETUAL' && 
          s.quoteAsset === 'USDT' &&
          s.status === 'TRADING'
        )
        .map((s: FuturesSymbolInfo) => s.symbol);
      
      this.futuresSymbols = new Set(symbols);
      this.lastFetchTime = Date.now();
      
      console.log(`Found ${symbols.length} active USDT perpetual futures`);
      return symbols;
    } catch (error) {
      console.error('Error fetching futures symbols:', error);
      return [];
    }
  }

  // Get top futures pairs by volume with all data in parallel
  async getTopFuturesData(limit?: number): Promise<{
    symbols: string[];
    marketData: MarketData[];
  }> {
    try {
      // Fetch futures symbols and 24hr tickers in parallel
      const [futuresSymbols, tickerResponse] = await Promise.all([
        this.getFuturesSymbols(),
        fetch('/api/binance/ticker')
      ]);

      const tickerData = await tickerResponse.json();
      
      // Filter and sort by volume
      const futuresSet = new Set(futuresSymbols);
      let topFutures = tickerData
        .filter((t: any) => futuresSet.has(t.symbol))
        .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
      
      // Only apply limit if specified
      if (limit) {
        topFutures = topFutures.slice(0, limit);
      }

      // Map to MarketData format
      const marketData: MarketData[] = topFutures.map((item: any) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        priceChange: parseFloat(item.priceChange),
        priceChangePercent: parseFloat(item.priceChangePercent),
        volume: parseFloat(item.volume),
        quoteVolume: parseFloat(item.quoteVolume),
        high: parseFloat(item.highPrice),
        low: parseFloat(item.lowPrice),
        open: parseFloat(item.openPrice),
        close: parseFloat(item.lastPrice),
        timestamp: Date.now(),
      }));

      const symbols = marketData.map(d => d.symbol);
      
      return { symbols, marketData };
    } catch (error) {
      console.error('Error fetching top futures data:', error);
      return { symbols: [], marketData: [] };
    }
  }

  // Batch fetch klines for multiple symbols and timeframes
  async batchFetchKlines(
    symbols: string[], 
    intervals: string[] = ['15m', '30m', '1h', '4h'],
    limit: number = 50
  ): Promise<Map<string, Map<string, number[]>>> {
    const result = new Map<string, Map<string, number[]>>();
    
    // Create all fetch promises
    const fetchPromises: Promise<{ symbol: string; interval: string; data: number[] }>[] = [];
    
    for (const symbol of symbols) {
      for (const interval of intervals) {
        fetchPromises.push(
          fetch(`/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)
            .then(res => res.json())
            .then(data => ({
              symbol,
              interval,
              data: data.map((k: any[]) => parseFloat(k[4])) // Close prices
            }))
            .catch(err => {
              console.error(`Error fetching ${interval} klines for ${symbol}:`, err);
              return { symbol, interval, data: [] };
            })
        );
      }
    }
    
    // Execute all fetches in parallel with batching to avoid rate limits
    const batchSize = 10; // Process 10 requests at a time
    const results: any[] = [];
    
    for (let i = 0; i < fetchPromises.length; i += batchSize) {
      const batch = fetchPromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < fetchPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Organize results into nested map
    for (const { symbol, interval, data } of results) {
      if (!result.has(symbol)) {
        result.set(symbol, new Map());
      }
      result.get(symbol)!.set(interval, data);
    }
    
    return result;
  }

  // Get initial klines for current interval
  async getInitialKlines(symbols: string[], interval: string, limit: number = 50): Promise<Map<string, number[]>> {
    const result = new Map<string, number[]>();
    
    // Batch fetch for better performance
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol =>
        fetch(`${BINANCE_SPOT_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)
          .then(res => res.json())
          .then(data => ({
            symbol,
            klines: data.map((k: any[]) => parseFloat(k[4])) // Close prices
          }))
          .catch(err => {
            console.error(`Error fetching klines for ${symbol}:`, err);
            return { symbol, klines: [] };
          })
      );
      
      const batchResults = await Promise.all(promises);
      for (const { symbol, klines } of batchResults) {
        result.set(symbol, klines);
      }
      
      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return result;
  }
}
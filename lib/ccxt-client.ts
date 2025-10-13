// CCXT client wrapper for fetching cryptocurrency market data
import ccxt, { type Exchange } from 'ccxt';

class CCXTClient {
  private exchange: Exchange;

  constructor() {
    // Initialize Binance futures exchange
    this.exchange = new ccxt.binance({
      options: {
        defaultType: 'future', // Use futures market
      },
    });
  }

  /**
   * Fetch OHLCV (kline) data for a symbol
   * @param symbol - Trading pair (e.g., 'BTC/USDT')
   * @param timeframe - Candlestick interval (e.g., '15m', '1h', '4h')
   * @param limit - Number of candles to fetch
   * @returns Array of OHLCV data [timestamp, open, high, low, close, volume]
   */
  async fetchOHLCV(symbol: string, timeframe: string, limit: number = 50) {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      return ohlcv;
    } catch (error) {
      console.error(`[CCXT] Error fetching OHLCV for ${symbol} ${timeframe}:`, error);
      throw error;
    }
  }

  /**
   * Fetch multiple symbols OHLCV data in parallel
   * @param symbols - Array of trading pairs
   * @param timeframe - Candlestick interval
   * @param limit - Number of candles to fetch per symbol
   */
  async fetchMultipleOHLCV(symbols: string[], timeframe: string, limit: number = 50) {
    const promises = symbols.map(symbol =>
      this.fetchOHLCV(symbol, timeframe, limit)
        .then(data => ({ symbol, data, error: null }))
        .catch(error => ({ symbol, data: null, error }))
    );

    return Promise.all(promises);
  }

  /**
   * Fetch top symbols by 24h quote volume (USDT pairs only)
   * Uses Binance's native API for efficiency
   * @param limit - Number of top symbols to return (default: 50)
   * @returns Array of symbol strings in Binance format (e.g., ['BTCUSDT', 'ETHUSDT'])
   */
  async fetchTopSymbolsByVolume(limit: number = 50): Promise<string[]> {
    try {
      console.log(`[CCXT] Fetching top ${limit} symbols by 24h volume...`);

      // Use Binance's native API directly for 24hr ticker statistics
      // This is more efficient than fetchTickers() and returns all data at once
      const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const tickers = await response.json();

      console.log(`[CCXT] Fetched ${tickers.length} total tickers from Binance`);

      // Filter for USDT pairs and extract quote volume
      const usdtPairs = tickers
        .filter((ticker: any) => {
          // Only include USDT pairs (e.g., BTCUSDT, ETHUSDT)
          if (!ticker.symbol || !ticker.symbol.endsWith('USDT')) return false;

          // Must have valid quote volume
          if (!ticker.quoteVolume || parseFloat(ticker.quoteVolume) <= 0) return false;

          return true;
        })
        .map((ticker: any) => ({
          symbol: ticker.symbol,
          quoteVolume: parseFloat(ticker.quoteVolume),
        }));

      console.log(`[CCXT] Filtered to ${usdtPairs.length} USDT pairs with volume`);

      // Debug: Show sample of data
      if (usdtPairs.length > 0) {
        const samples = usdtPairs.slice(0, 3);
        console.log(`[CCXT] Sample pairs:`, samples.map((p: any) => `${p.symbol} (vol: $${(p.quoteVolume / 1_000_000).toFixed(1)}M)`).join(', '));
      } else {
        // Debug: Show what we got
        console.log(`[CCXT] DEBUG - No USDT pairs found. Sample ticker:`, JSON.stringify(tickers[0], null, 2));
      }

      // Sort by quote volume (highest first)
      usdtPairs.sort((a: any, b: any) => b.quoteVolume - a.quoteVolume);

      // Take top N symbols
      const topSymbols = usdtPairs
        .slice(0, limit)
        .map((pair: any) => pair.symbol);

      console.log(`[CCXT] ✅ Fetched top ${topSymbols.length} symbols:`, topSymbols.slice(0, 10).join(', '), topSymbols.length > 10 ? '...' : '');

      return topSymbols;
    } catch (error) {
      console.error('[CCXT] Error fetching top symbols:', error);
      throw error;
    }
  }

  /**
   * Convert CCXT symbol format to Binance format
   * @param ccxtSymbol - CCXT format (e.g., 'BTC/USDT')
   * @returns Binance format (e.g., 'BTCUSDT')
   */
  static toBinanceSymbol(ccxtSymbol: string): string {
    return ccxtSymbol.replace('/', '');
  }

  /**
   * Convert Binance symbol format to CCXT format
   * @param binanceSymbol - Binance format (e.g., 'BTCUSDT')
   * @returns CCXT format (e.g., 'BTC/USDT')
   */
  static toCCXTSymbol(binanceSymbol: string): string {
    // Assume all symbols end with USDT for simplicity
    if (binanceSymbol.endsWith('USDT')) {
      const base = binanceSymbol.slice(0, -4);
      return `${base}/USDT`;
    }
    return binanceSymbol;
  }
}

// Export singleton instance
export const ccxtClient = new CCXTClient();
export { CCXTClient };

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
    console.log(`[CCXT] Fetching top ${limit} symbols by 24h volume...`);

    // Try direct API first (faster), fallback to CCXT if blocked
    try {
      const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');

      // Check if response is JSON (not HTML error page)
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType?.includes('application/json')) {
        throw new Error(`Direct API blocked or unavailable (${response.status})`);
      }

      const tickers = await response.json();

      if (!Array.isArray(tickers)) {
        throw new Error('Unexpected response format from direct API');
      }

      console.log(`[CCXT] ✓ Direct API: ${tickers.length} tickers`);

      // Filter, sort, and take top N
      const topSymbols = tickers
        .filter((t: any) => t.symbol?.endsWith('USDT') && parseFloat(t.quoteVolume || '0') > 0)
        .map((t: any) => ({ symbol: t.symbol, quoteVolume: parseFloat(t.quoteVolume) }))
        .sort((a, b) => b.quoteVolume - a.quoteVolume)
        .slice(0, limit)
        .map(p => p.symbol);

      console.log(`[CCXT] ✅ Top ${topSymbols.length}:`, topSymbols.slice(0, 10).join(', '), '...');
      return topSymbols;

    } catch (directError) {
      console.warn('[CCXT] Direct API failed, using CCXT fallback:', (directError as Error).message);

      // Fallback to CCXT (handles restrictions better)
      const tickers = await this.exchange.fetchTickers();
      console.log(`[CCXT] ✓ CCXT Fallback: ${Object.keys(tickers).length} tickers`);

      // Filter, sort, and take top N
      const topSymbols = Object.entries(tickers)
        .filter(([symbol, ticker]) => {
          if (!symbol.endsWith('/USDT')) return false;
          const vol = ticker.quoteVolume || parseFloat(ticker.info?.quoteVolume || '0');
          return vol > 0;
        })
        .map(([symbol, ticker]) => ({
          symbol,
          quoteVolume: ticker.quoteVolume || parseFloat(ticker.info?.quoteVolume || '0'),
        }))
        .sort((a, b) => b.quoteVolume - a.quoteVolume)
        .slice(0, limit)
        .map(p => CCXTClient.toBinanceSymbol(p.symbol));

      console.log(`[CCXT] ✅ Top ${topSymbols.length}:`, topSymbols.slice(0, 10).join(', '), '...');
      return topSymbols;
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

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

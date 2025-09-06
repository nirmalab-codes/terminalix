import axios from 'axios';
import { MarketData } from './types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';

export class BinanceAPI {
  private cache: Map<string, { data: number[]; timestamp: number }> = new Map();
  private cacheTimeout = 1000;

  async getTopSymbols(limit: number = 50): Promise<string[]> {
    try {
      const response = await axios.get(`${BINANCE_API_BASE}/ticker/24hr`);
      const tickers = response.data
        .filter((t: { symbol: string }) => t.symbol.endsWith('USDT'))
        .sort((a: { quoteVolume: string }, b: { quoteVolume: string }) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map((t: { symbol: string }) => t.symbol);
      return tickers;
    } catch (error) {
      console.error('Error fetching top symbols:', error);
      return [];
    }
  }

  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    try {
      const response = await axios.get(`${BINANCE_API_BASE}/ticker/24hr`);
      const data = response.data
        .filter((item: { symbol: string }) => symbols.includes(item.symbol))
        .map((item: {
          symbol: string;
          lastPrice: string;
          priceChange: string;
          priceChangePercent: string;
          volume: string;
          quoteVolume: string;
          highPrice: string;
          lowPrice: string;
          openPrice: string;
        }) => ({
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
      return data;
    } catch (error) {
      console.error('Error fetching market data:', error);
      return [];
    }
  }

  async getKlines(
    symbol: string,
    interval: string = '15m',
    limit: number = 100
  ): Promise<number[]> {
    const cacheKey = `klines_${symbol}_${interval}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${BINANCE_API_BASE}/klines`, {
        params: { symbol, interval, limit },
      });

      const closePrices = response.data.map((kline: string[]) =>
        parseFloat(kline[4])
      );

      this.cache.set(cacheKey, {
        data: closePrices,
        timestamp: Date.now(),
      });

      return closePrices;
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      return [];
    }
  }

  createWebSocket(
    symbols: string[],
    onMessage: (data: Partial<MarketData>) => void
  ): WebSocket {
    const streams = symbols
      .map((s) => `${s.toLowerCase()}@ticker`)
      .join('/');
    const ws = new WebSocket(`${BINANCE_WS_BASE}/${streams}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const marketData: Partial<MarketData> = {
        symbol: data.s,
        price: parseFloat(data.c),
        priceChange: parseFloat(data.p),
        priceChangePercent: parseFloat(data.P),
        volume: parseFloat(data.v),
        quoteVolume: parseFloat(data.q),
        high: parseFloat(data.h),
        low: parseFloat(data.l),
        open: parseFloat(data.o),
        timestamp: data.E,
      };
      onMessage(marketData);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }
}
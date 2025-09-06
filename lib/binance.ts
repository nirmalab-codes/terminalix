import axios, { AxiosError } from 'axios';
import { MarketData } from './types';

// Use API routes to avoid CORS issues
const BINANCE_API_BASE = '/api/binance';
const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';

interface QueuedRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class BinanceAPI {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds cache to reduce API calls significantly
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private minRequestInterval = 200; // 200ms between requests (max 5 requests per second)
  private banEndTime = 0;
  private retryCount = new Map<string, number>();
  
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Check if we're still banned
      if (Date.now() < this.banEndTime) {
        const waitTime = this.banEndTime - Date.now();
        console.log(`Waiting ${waitTime}ms for ban to expire...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Enforce minimum interval between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        );
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        try {
          const result = await request.execute();
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private async queueRequest<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ execute, resolve, reject });
      this.processQueue();
    });
  }

  private async makeRequest(url: string, params?: any): Promise<any> {
    const requestKey = `${url}_${JSON.stringify(params || {})}`;
    let retries = this.retryCount.get(requestKey) || 0;
    
    try {
      const response = await axios.get(url, {
        params,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      // Reset retry count on success
      this.retryCount.delete(requestKey);
      return response;
    } catch (error) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        const headers = axiosError.response.headers;
        
        // Handle rate limit errors
        if (status === 429 || status === 418) {
          // Get retry-after header if available
          const retryAfter = headers['retry-after'];
          let waitTime = 60000; // Default 1 minute
          
          if (retryAfter) {
            waitTime = parseInt(retryAfter) * 1000;
          } else if (status === 418) {
            // For 418 errors, implement exponential backoff
            waitTime = Math.min(300000, 60000 * Math.pow(2, retries)); // Max 5 minutes
          }
          
          this.banEndTime = Date.now() + waitTime;
          console.error(`Rate limited (${status}). Waiting ${waitTime}ms before retry...`);
          
          // Increase retry count
          retries++;
          this.retryCount.set(requestKey, retries);
          
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Retry the request
          if (retries < 3) {
            return this.makeRequest(url, params);
          }
        }
      }
      
      throw error;
    }
  }

  async getTopSymbols(limit: number = 50): Promise<string[]> {
    const cacheKey = 'top_symbols';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const result = await this.queueRequest(async () => {
        const response = await this.makeRequest(`${BINANCE_API_BASE}/ticker`);
        const tickers = response.data
          .filter((t: { symbol: string }) => t.symbol.endsWith('USDT'))
          .sort((a: { quoteVolume: string }, b: { quoteVolume: string }) => 
            parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, limit)
          .map((t: { symbol: string }) => t.symbol);
        return tickers;
      });
      
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      
      return result;
    } catch (error) {
      console.error('Error fetching top symbols:', error);
      // Return cached data if available, even if expired
      if (cached) {
        return cached.data;
      }
      return [];
    }
  }

  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    const cacheKey = 'market_data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data.filter((item: MarketData) => symbols.includes(item.symbol));
    }

    try {
      const result = await this.queueRequest(async () => {
        const response = await this.makeRequest(`${BINANCE_API_BASE}/ticker`);
        const allData = response.data.map((item: {
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
        return allData;
      });
      
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      
      return result.filter((item: MarketData) => symbols.includes(item.symbol));
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Return cached data if available, even if expired
      if (cached) {
        return cached.data.filter((item: MarketData) => symbols.includes(item.symbol));
      }
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
      const result = await this.queueRequest(async () => {
        const response = await this.makeRequest(`${BINANCE_API_BASE}/klines`, {
          symbol,
          interval,
          limit,
        });

        const closePrices = response.data.map((kline: string[]) =>
          parseFloat(kline[4])
        );
        return closePrices;
      });

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      // Return cached data if available, even if expired
      if (cached) {
        return cached.data;
      }
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

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return ws;
  }
}
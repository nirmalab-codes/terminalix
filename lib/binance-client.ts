// Client-side Binance API wrapper with fallback strategies
import { MarketData } from './types';

// Try different strategies to fetch Binance data
export class BinanceClient {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds
  
  async fetchTicker(): Promise<any[]> {
    const cacheKey = 'ticker';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // Strategy 1: Try our API route first
    try {
      const response = await fetch('/api/binance/ticker');
      if (response.ok) {
        const data = await response.json();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      console.log('API route failed, trying alternative...');
    }
    
    // Strategy 2: Try public CORS proxy (for development/demo)
    try {
      const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.binance.com/api/v3/ticker/24hr'));
      if (response.ok) {
        const data = await response.json();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      console.log('CORS proxy failed');
    }
    
    // Strategy 3: Return cached data if available
    if (cached) {
      console.log('Using expired cache data');
      return cached.data;
    }
    
    throw new Error('Unable to fetch ticker data. Binance API is blocked in your deployment region.');
  }
  
  async fetchKlines(symbol: string, interval: string = '30m', limit: number = 100): Promise<number[]> {
    const cacheKey = `klines_${symbol}_${interval}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // Strategy 1: Try our API route
    try {
      const response = await fetch(`/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        const prices = data.map((k: any[]) => parseFloat(k[4]));
        this.cache.set(cacheKey, { data: prices, timestamp: Date.now() });
        return prices;
      }
    } catch (error) {
      console.log('API route failed for klines');
    }
    
    // Strategy 2: Try CORS proxy
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
      if (response.ok) {
        const data = await response.json();
        const prices = data.map((k: any[]) => parseFloat(k[4]));
        this.cache.set(cacheKey, { data: prices, timestamp: Date.now() });
        return prices;
      }
    } catch (error) {
      console.log('CORS proxy failed for klines');
    }
    
    // Return cached data or empty array
    return cached?.data || [];
  }
  
  async fetchExchangeInfo(): Promise<any> {
    const cacheKey = 'exchangeInfo';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout * 60) { // Cache for 30 minutes
      return cached.data;
    }
    
    // Strategy 1: Try our API route
    try {
      const response = await fetch('/api/binance/exchangeInfo');
      if (response.ok) {
        const data = await response.json();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      console.log('API route failed for exchangeInfo');
    }
    
    // Strategy 2: Try CORS proxy for futures
    try {
      const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://fapi.binance.com/fapi/v1/exchangeInfo'));
      if (response.ok) {
        const data = await response.json();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      console.log('CORS proxy failed for exchangeInfo');
    }
    
    // Return cached data or empty
    return cached?.data || { symbols: [] };
  }
}
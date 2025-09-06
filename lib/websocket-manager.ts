import { MarketData } from './types';

export interface KlineData {
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private activeStreams: Set<string> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // Binance WebSocket endpoint for multiple streams
      const wsUrl = 'wss://stream.binance.com:9443/ws';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupPing();
        
        // Resubscribe to all active streams
        this.activeStreams.forEach(stream => {
          this.subscribeToStream(stream);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.e === '24hrTicker') {
            this.handleTickerUpdate(data);
          } else if (data.e === 'kline') {
            this.handleKlineUpdate(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.cleanup();
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private setupPing() {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'ping' }));
      }
    }, 30000);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Reconnecting in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private subscribeToStream(stream: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now()
    };

    this.ws.send(JSON.stringify(message));
    this.activeStreams.add(stream);
  }

  private unsubscribeFromStream(stream: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      method: 'UNSUBSCRIBE',
      params: [stream],
      id: Date.now()
    };

    this.ws.send(JSON.stringify(message));
    this.activeStreams.delete(stream);
  }

  private handleTickerUpdate(data: any) {
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
      close: parseFloat(data.c),
      timestamp: data.E,
    };

    // Notify all ticker subscribers
    const tickerKey = `ticker:${data.s.toLowerCase()}`;
    this.notifySubscribers(tickerKey, marketData);
  }

  private handleKlineUpdate(data: any) {
    const kline = data.k;
    const klineData: KlineData = {
      symbol: data.s,
      interval: kline.i,
      open: parseFloat(kline.o),
      high: parseFloat(kline.h),
      low: parseFloat(kline.l),
      close: parseFloat(kline.c),
      volume: parseFloat(kline.v),
      closeTime: kline.T,
      quoteVolume: parseFloat(kline.q),
      trades: kline.n,
    };

    // Notify all kline subscribers
    const klineKey = `kline:${data.s.toLowerCase()}:${kline.i}`;
    this.notifySubscribers(klineKey, klineData);
  }

  private notifySubscribers(key: string, data: any) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // Public methods
  subscribeTicker(symbol: string, callback: (data: Partial<MarketData>) => void) {
    const stream = `${symbol.toLowerCase()}@ticker`;
    const key = `ticker:${symbol.toLowerCase()}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);
    
    if (!this.activeStreams.has(stream)) {
      this.subscribeToStream(stream);
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(key);
          this.unsubscribeFromStream(stream);
        }
      }
    };
  }

  subscribeKline(symbol: string, interval: string, callback: (data: KlineData) => void) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const key = `kline:${symbol.toLowerCase()}:${interval}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);
    
    if (!this.activeStreams.has(stream)) {
      this.subscribeToStream(stream);
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(key);
          this.unsubscribeFromStream(stream);
        }
      }
    };
  }

  subscribeMultipleTickers(symbols: string[], callback: (data: Partial<MarketData>) => void) {
    const unsubscribes = symbols.map(symbol => 
      this.subscribeTicker(symbol, callback)
    );
    
    // Return function to unsubscribe all
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }

  isConnectionActive() {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.cleanup();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscribers.clear();
    this.activeStreams.clear();
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}
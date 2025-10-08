'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MarketData } from '@/lib/types';

interface StreamMessage {
  type: 'connected' | 'market_data' | 'error';
  data?: MarketData[];
  message?: string;
  timestamp: number;
}

interface UseMarketDataStreamOptions {
  symbols?: string[]; // Optional: filter by specific symbols
  enabled?: boolean; // Optional: control when to connect
}

export function useMarketDataStream(options: UseMarketDataStreamOptions = {}) {
  const { symbols, enabled = true } = options;
  const [data, setData] = useState<MarketData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    // Build URL with optional symbol filter
    const url = new URL('/api/stream/market-data', window.location.origin);
    if (symbols && symbols.length > 0) {
      url.searchParams.set('symbols', symbols.join(','));
    }

    console.log('[SSE] Connecting to', url.toString());

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const message: StreamMessage = JSON.parse(event.data);

        if (message.type === 'connected') {
          console.log('[SSE] Connection confirmed');
        } else if (message.type === 'market_data' && message.data) {
          setData(message.data);
        } else if (message.type === 'error') {
          setError(message.message || 'Unknown error');
        }
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      setIsConnected(false);
      setError('Connection lost');

      // Close and cleanup
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt reconnect after 3 seconds
      setTimeout(() => {
        if (enabled) {
          connect();
        }
      }, 3000);
    };
  }, [enabled, symbols]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[SSE] Disconnecting');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    data,
    isConnected,
    error,
    connect,
    disconnect,
  };
}

// WebSocket broadcaster for sending database updates to clients
import { WebSocketServer, WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  subscriptions: Set<string>;
}

class MarketDataBroadcaster {
  private wss: WebSocketServer | null = null;
  private clients: Set<Client> = new Set();
  private updateBuffer: Map<string, any> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;

  initialize(port: number = 3002) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WS Broadcaster] Client connected');

      const client: Client = {
        ws,
        subscriptions: new Set(['*']), // Subscribe to all by default
      };

      this.clients.add(client);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'subscribe') {
            const symbols = Array.isArray(message.symbols) ? message.symbols : [message.symbols];
            symbols.forEach((symbol: string) => client.subscriptions.add(symbol));
            console.log(`[WS Broadcaster] Client subscribed to: ${symbols.join(', ')}`);
          } else if (message.type === 'unsubscribe') {
            const symbols = Array.isArray(message.symbols) ? message.symbols : [message.symbols];
            symbols.forEach((symbol: string) => client.subscriptions.delete(symbol));
          } else if (message.type === 'subscribe_all') {
            client.subscriptions.clear();
            client.subscriptions.add('*');
          }
        } catch (error) {
          console.error('[WS Broadcaster] Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('[WS Broadcaster] Client disconnected');
        this.clients.delete(client);
      });

      ws.on('error', (error) => {
        console.error('[WS Broadcaster] Client error:', error);
        this.clients.delete(client);
      });

      ws.send(JSON.stringify({ type: 'connected', clients: this.clients.size }));
    });

    this.startBroadcasting();

    console.log(`[WS Broadcaster] WebSocket server started on port ${port}`);
  }

  // Queue market data updates
  queueUpdate(type: 'ticker' | 'indicator' | 'kline', symbol: string, data: any) {
    const key = `${symbol}_${type}`;
    this.updateBuffer.set(key, {
      type,
      symbol,
      data,
      timestamp: Date.now(),
    });
  }

  private startBroadcasting() {
    if (this.broadcastInterval) return;

    // Broadcast batched updates every 1 second
    this.broadcastInterval = setInterval(() => {
      if (this.updateBuffer.size === 0 || this.clients.size === 0) return;

      const updates = Array.from(this.updateBuffer.values());
      this.updateBuffer.clear();

      this.clients.forEach((client) => {
        if (client.ws.readyState !== WebSocket.OPEN) return;

        const relevantUpdates = updates.filter(
          (update) =>
            client.subscriptions.has('*') || client.subscriptions.has(update.symbol)
        );

        if (relevantUpdates.length > 0) {
          try {
            client.ws.send(
              JSON.stringify({
                type: 'market_data',
                updates: relevantUpdates,
                timestamp: Date.now(),
              })
            );
          } catch (error) {
            console.error('[WS Broadcaster] Error sending to client:', error);
          }
        }
      });
    }, 1000);
  }

  stop() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }

    this.clients.forEach((client) => client.ws.close());
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    console.log('[WS Broadcaster] Stopped');
  }

  getStats() {
    return {
      clients: this.clients.size,
      bufferedUpdates: this.updateBuffer.size,
    };
  }
}

export const broadcaster = new MarketDataBroadcaster();

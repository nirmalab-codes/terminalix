// WebSocket server for broadcasting database updates to clients
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface Client {
  ws: WebSocket;
  subscriptions: Set<string>; // Symbols the client is subscribed to
}

class MarketDataBroadcaster {
  private wss: WebSocketServer | null = null;
  private clients: Set<Client> = new Set();
  private updateBuffer: Map<string, any> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;

  initialize(server: any) {
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      console.log('[WS] Client connected');

      const client: Client = {
        ws,
        subscriptions: new Set(),
      };

      this.clients.add(client);

      // Handle client messages (subscribe/unsubscribe)
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'subscribe') {
            const symbols = Array.isArray(message.symbols) ? message.symbols : [message.symbols];
            symbols.forEach((symbol: string) => client.subscriptions.add(symbol));
            console.log(`[WS] Client subscribed to: ${symbols.join(', ')}`);
          } else if (message.type === 'unsubscribe') {
            const symbols = Array.isArray(message.symbols) ? message.symbols : [message.symbols];
            symbols.forEach((symbol: string) => client.subscriptions.delete(symbol));
            console.log(`[WS] Client unsubscribed from: ${symbols.join(', ')}`);
          } else if (message.type === 'subscribe_all') {
            client.subscriptions.add('*');
            console.log('[WS] Client subscribed to all symbols');
          }
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        this.clients.delete(client);
      });

      ws.on('error', (error) => {
        console.error('[WS] Client error:', error);
        this.clients.delete(client);
      });

      // Send initial connection success
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
    });

    // Start broadcasting batched updates every 500ms
    this.startBroadcasting();

    console.log('[WS] WebSocket server initialized');
  }

  // Buffer updates and broadcast them in batches
  queueUpdate(symbol: string, data: any) {
    this.updateBuffer.set(symbol, {
      symbol,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  private startBroadcasting() {
    if (this.broadcastInterval) return;

    this.broadcastInterval = setInterval(() => {
      if (this.updateBuffer.size === 0) return;

      // Broadcast all buffered updates
      const updates = Array.from(this.updateBuffer.values());
      this.updateBuffer.clear();

      this.clients.forEach((client) => {
        if (client.ws.readyState !== WebSocket.OPEN) return;

        // Filter updates based on subscriptions
        const relevantUpdates = updates.filter(
          (update) =>
            client.subscriptions.has('*') || client.subscriptions.has(update.symbol)
        );

        if (relevantUpdates.length > 0) {
          try {
            client.ws.send(
              JSON.stringify({
                type: 'market_update',
                data: relevantUpdates,
              })
            );
          } catch (error) {
            console.error('[WS] Error sending to client:', error);
          }
        }
      });
    }, 500); // Broadcast every 500ms
  }

  handleUpgrade(request: IncomingMessage, socket: any, head: Buffer) {
    if (!this.wss) {
      console.error('[WS] WebSocket server not initialized');
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss!.emit('connection', ws, request);
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  stop() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('[WS] WebSocket server stopped');
  }
}

// Singleton instance
export const broadcaster = new MarketDataBroadcaster();

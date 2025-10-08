// Server-Sent Events endpoint for real-time market data updates
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Get symbols from query params (optional)
  const symbols = request.nextUrl.searchParams.get('symbols')?.split(',');

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)
      );

      // Polling interval (check DB every 1 second)
      const intervalId = setInterval(async () => {
        try {
          // Query latest market data from DB
          const query = symbols && symbols.length > 0
            ? prisma.ticker.findMany({
                where: { symbol: { in: symbols } },
                orderBy: { timestamp: 'desc' },
                take: symbols.length,
              })
            : prisma.ticker.findMany({
                orderBy: { timestamp: 'desc' },
                take: 50, // Limit to top 50 latest updates
              });

          const marketData = await query;

          if (marketData.length > 0) {
            // Send market data update
            const message = {
              type: 'market_data',
              data: marketData,
              timestamp: Date.now(),
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
            );
          }

          // Send heartbeat every iteration
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          console.error('[SSE] Error fetching market data:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'Failed to fetch data' })}\n\n`
            )
          );
        }
      }, 1000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

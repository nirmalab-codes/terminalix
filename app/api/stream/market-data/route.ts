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
          // Query latest market data from DB with indicators
          const tickers = symbols && symbols.length > 0
            ? await prisma.ticker.findMany({
                where: { symbol: { in: symbols } },
                orderBy: { timestamp: 'desc' },
                take: symbols.length,
              })
            : await prisma.ticker.findMany({
                orderBy: { timestamp: 'desc' },
                take: 50, // Limit to top 50 latest updates
              });

          if (tickers.length > 0) {
            // Fetch indicators for these symbols
            const symbolList = tickers.map(t => t.symbol);
            const indicators = await prisma.indicator.findMany({
              where: { symbol: { in: symbolList } }
            });

            // Create a map for quick lookup
            const indicatorMap = new Map(indicators.map(i => [i.symbol, i]));

            // Merge ticker data with indicator data
            const marketData = tickers.map(ticker => {
              const indicator = indicatorMap.get(ticker.symbol);
              return {
                ...ticker,
                // Add main indicator data
                rsi: indicator?.rsi ?? 50,
                stochRsi: indicator?.stochRsi ?? 0.5,
                stochRsiK: indicator?.stochRsiK ?? 0.5,
                stochRsiD: indicator?.stochRsiD ?? 0.5,
                isOverbought: indicator?.isOverbought ?? false,
                isOversold: indicator?.isOversold ?? false,
                trend: indicator?.trend ?? 'neutral',
                reversalSignal: indicator?.reversalSignal ?? false,
                // Add multi-timeframe RSI data
                rsi15m: indicator?.rsi15m ?? undefined,
                rsi30m: indicator?.rsi30m ?? undefined,
                rsi1h: indicator?.rsi1h ?? undefined,
                rsi4h: indicator?.rsi4h ?? undefined,
                stochRsi15m: indicator?.stochRsi15m ?? undefined,
                stochRsi30m: indicator?.stochRsi30m ?? undefined,
                stochRsi1h: indicator?.stochRsi1h ?? undefined,
                stochRsi4h: indicator?.stochRsi4h ?? undefined,
                stochRsiK15m: indicator?.stochRsiK15m ?? undefined,
                stochRsiK30m: indicator?.stochRsiK30m ?? undefined,
                stochRsiK1h: indicator?.stochRsiK1h ?? undefined,
                stochRsiK4h: indicator?.stochRsiK4h ?? undefined,
                stochRsiD15m: indicator?.stochRsiD15m ?? undefined,
                stochRsiD30m: indicator?.stochRsiD30m ?? undefined,
                stochRsiD1h: indicator?.stochRsiD1h ?? undefined,
                stochRsiD4h: indicator?.stochRsiD4h ?? undefined,
                // Add multi-timeframe price change data
                priceChange15m: indicator?.priceChange15m ?? undefined,
                priceChange30m: indicator?.priceChange30m ?? undefined,
                priceChange1h: indicator?.priceChange1h ?? undefined,
                priceChange4h: indicator?.priceChange4h ?? undefined,
              };
            });

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
          controller.enqueue(
            encoder.encode(
              `${error}`
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

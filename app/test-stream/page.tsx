'use client';

import { useMarketDataStream } from '@/hooks/useMarketDataStream';

export default function TestStreamPage() {
  const { data, isConnected, error } = useMarketDataStream({
    // symbols: ['BTCUSDT', 'ETHUSDT'], // Optional: filter specific symbols
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Market Data Stream Test</h1>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {error && (
          <div className="mt-2 text-red-500">Error: {error}</div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">
          Live Market Data ({data.length} symbols)
        </h2>
        <div className="grid gap-2">
          {data.slice(0, 20).map((item) => (
            <div
              key={item.symbol}
              className="p-4 bg-gray-800 rounded border border-gray-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{item.symbol}</div>
                  <div className="text-2xl">${item.price.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-semibold ${
                      item.priceChangePercent >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}
                  >
                    {item.priceChangePercent >= 0 ? '+' : ''}
                    {item.priceChangePercent.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-400">
                    Vol: {(item.volume / 1000000).toFixed(2)}M
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Last update: {new Date(item.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.length === 0 && (
        <div className="text-gray-500 mt-4">
          Waiting for market data updates from database...
        </div>
      )}
    </div>
  );
}

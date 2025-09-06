'use client';

import React from 'react';
import { CryptoData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CryptoIcon } from './crypto-icon';

interface SignalMarqueeProps {
  cryptoData: CryptoData[];
}

export function SignalMarquee({ cryptoData }: SignalMarqueeProps) {
  // Filter for strong signals only
  const strongSignals = cryptoData.filter(
    crypto => crypto.signal && crypto.signal.strength === 'STRONG'
  );

  // Separate LONG and SHORT signals
  const longSignals = strongSignals.filter(
    crypto => crypto.signal?.type === 'LONG'
  ).slice(0, 5); // Take top 5 LONG signals
  
  const shortSignals = strongSignals.filter(
    crypto => crypto.signal?.type === 'SHORT'
  ).slice(0, 5); // Take top 5 SHORT signals

  // Combine for top 10 total (5 LONG + 5 SHORT)
  const topSignals = [...longSignals, ...shortSignals].slice(0, 10);

  if (topSignals.length === 0) {
    return (
      <div className="bg-background/95 backdrop-blur border rounded-lg p-4">
        <div className="text-center text-muted-foreground text-sm">
          No strong signals detected at the moment
        </div>
      </div>
    );
  }

  // Duplicate signals multiple times for seamless loop
  const duplicatedSignals = [...topSignals, ...topSignals, ...topSignals, ...topSignals];

  return (
    <div className="bg-background/95 backdrop-blur border rounded-lg p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-foreground">TOP 10 STRONG SIGNALS</span>
        </div>
      </div>
      
      <div className="relative">
        <div className="marquee-container">
          <div className="marquee-content">
            {duplicatedSignals.map((crypto, index) => (
              <div
                key={`${crypto.symbol}-${index}`}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg mr-4",
                  "border transition-all duration-200",
                  crypto.signal?.type === 'LONG' 
                    ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20" 
                    : "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                )}
              >
                <CryptoIcon symbol={crypto.symbol} size={20} />
                <span className="font-medium text-sm">
                  {crypto.symbol.replace('USDT', '')}
                </span>
                
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold",
                  crypto.signal?.type === 'LONG'
                    ? "bg-green-500/20 text-green-500"
                    : "bg-red-500/20 text-red-500"
                )}>
                  {crypto.signal?.type === 'LONG' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{crypto.signal?.type}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">RSI:</span>
                  <span className={cn(
                    "font-mono font-bold",
                    crypto.rsi > 70 ? "text-red-500" : 
                    crypto.rsi < 30 ? "text-green-500" : 
                    "text-foreground"
                  )}>
                    {crypto.rsi.toFixed(1)}
                  </span>
                </div>

                <div className={cn(
                  "text-xs font-mono",
                  crypto.priceChangePercent > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {crypto.priceChangePercent > 0 ? '+' : ''}{crypto.priceChangePercent.toFixed(2)}%
                </div>

                <div className="text-xs text-muted-foreground">
                  {crypto.signal?.timeframe}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
        }

        .marquee-content {
          display: inline-block;
          animation: marquee 60s linear infinite;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-25%);
          }
        }

        .marquee-container:hover .marquee-content {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
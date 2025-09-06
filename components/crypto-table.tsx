'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { CryptoData, SortConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CryptoIcon } from './crypto-icon';

interface CryptoTableProps {
  data: CryptoData[];
  sort: SortConfig;
  onSort: (sort: SortConfig) => void;
  onSymbolToggle: (symbol: string) => void;
  selectedSymbols: string[];
  isLoading: boolean;
}

export function CryptoTable({ 
  data, 
  sort,
  onSort,
  onSymbolToggle,
  selectedSymbols,
  isLoading 
}: CryptoTableProps) {
  const handleSort = (field: keyof CryptoData) => {
    const newDirection = sort.field === field && sort.direction === 'desc' ? 'asc' : 'desc';
    onSort({ field, direction: newDirection });
  };
  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toFixed(1);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return formatNumber(price, 0);
    if (price >= 1) return formatNumber(price, 2);
    if (price >= 0.01) return formatNumber(price, 4);
    return formatNumber(price, 6);
  };

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-red-500';
    if (rsi <= 30) return 'text-green-500';
    return 'text-zinc-400';
  };

  const getRSIBadge = (rsi: number | undefined) => {
    // If RSI is undefined or exactly 50, show loading
    if (rsi === undefined || rsi === null) {
      return (
        <div className="text-zinc-500 text-xs">
          -
        </div>
      );
    }
    
    if (rsi >= 70) {
      return (
        <div className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-xs font-medium">
          {Math.round(rsi)}
        </div>
      );
    }
    if (rsi <= 30) {
      return (
        <div className="bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded text-xs font-medium">
          {Math.round(rsi)}
        </div>
      );
    }
    return (
      <div className="text-zinc-400 text-xs">
        {Math.round(rsi)}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table className="relative">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead rowSpan={2} className="sticky left-0 z-20 bg-background w-24 p-2 border-r">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('symbol')}
                className="h-7 px-2 text-xs font-medium"
              >
                Coin
                <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
            </TableHead>
            <TableHead rowSpan={2} className="text-right p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('price')}
                className="h-7 px-2 text-xs font-medium"
              >
                Price
                <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
            </TableHead>
            <TableHead rowSpan={2} className="text-right p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('priceChangePercent')}
                className="h-7 px-2 text-xs font-medium"
              >
                24h
                <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
            </TableHead>
            <TableHead rowSpan={2} className="text-right p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('volume')}
                className="h-7 px-2 text-xs font-medium"
              >
                Vol
                <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
            </TableHead>
            
            {/* Merged RSI header */}
            <TableHead colSpan={4} className="text-center p-2 border-x">
              <div className="text-sm font-medium">
                Relative Strength Index
              </div>
            </TableHead>
            
            <TableHead rowSpan={2} className="text-center p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('stochRsi')}
                className="h-7 px-2 text-xs font-medium"
                title="StochRSI - K: Fast line (momentum), D: Slow line (signal). Crossovers indicate potential reversals."
              >
                StochRSI
                <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
            </TableHead>
            <TableHead rowSpan={2} className="text-center p-2">
              <div className="text-xs font-medium">Status</div>
            </TableHead>
            <TableHead rowSpan={2} className="text-center p-2">
              <div className="text-xs font-medium">Signal</div>
            </TableHead>
          </TableRow>
          <TableRow className="hover:bg-transparent">
            {/* Sub-headers for RSI timeframes */}
            <TableHead className="text-center p-1 border-l text-xs text-muted-foreground">
              15m
            </TableHead>
            <TableHead className="text-center p-1 text-xs text-muted-foreground">
              30m
            </TableHead>
            <TableHead className="text-center p-1 text-xs text-muted-foreground">
              1h
            </TableHead>
            <TableHead className="text-center p-1 border-r text-xs text-muted-foreground">
              4h
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow 
              key={item.id} 
              className="hover:bg-muted/30 cursor-pointer h-12"
              onClick={() => onSymbolToggle(item.symbol)}
            >
              <TableCell className="sticky left-0 z-10 bg-background font-medium p-2 border-r">
                <div className="flex items-center gap-2">
                  <CryptoIcon symbol={item.symbol} size={20} />
                  <span className="font-semibold text-sm">{item.symbol.replace('USDT', '')}</span>
                  {item.trend === 'bullish' && (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                  {item.trend === 'bearish' && (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </div>
              </TableCell>
              
              <TableCell className="text-right p-2">
                <span className="font-mono text-sm">
                  ${formatPrice(item.price)}
                </span>
              </TableCell>
              
              <TableCell className="text-right p-2">
                <span
                  className={cn(
                    'font-medium text-sm',
                    item.priceChangePercent > 0 ? 'text-green-500' : 
                    item.priceChangePercent < 0 ? 'text-red-500' : 'text-zinc-400'
                  )}
                >
                  {item.priceChangePercent > 0 && '+'}
                  {formatNumber(item.priceChangePercent, 1)}%
                </span>
              </TableCell>
              
              <TableCell className="text-right p-2">
                <span className="text-xs text-muted-foreground">
                  ${formatVolume(item.quoteVolume)}
                </span>
              </TableCell>
              
              {/* Multi-timeframe RSI cells */}
              <TableCell className="text-center p-1 border-l">
                {getRSIBadge(item.rsi15m)}
              </TableCell>
              <TableCell className="text-center p-1">
                {getRSIBadge(item.rsi30m)}
              </TableCell>
              <TableCell className="text-center p-1">
                {getRSIBadge(item.rsi1h)}
              </TableCell>
              <TableCell className="text-center p-1 border-r">
                {getRSIBadge(item.rsi4h)}
              </TableCell>
              
              <TableCell className="text-center p-2">
                <div className="flex flex-col items-center">
                  <span className={cn('text-sm font-medium', getRSIColor(item.stochRsi * 100))}>
                    {Math.round(item.stochRsi * 100)}%
                  </span>
                  <div className="flex gap-1 text-[10px] text-muted-foreground">
                    <span>K:{Math.round(item.stochRsiK * 100)}</span>
                    <span>D:{Math.round(item.stochRsiD * 100)}</span>
                  </div>
                </div>
              </TableCell>
              
              <TableCell className="text-center p-2">
                {item.isOverbought ? (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                    OB
                  </Badge>
                ) : item.isOversold ? (
                  <Badge className="bg-green-600 text-[10px] px-1.5 py-0 h-5">
                    OS
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">-</span>
                )}
              </TableCell>
              
              <TableCell className="text-center p-2">
                {item.reversalSignal ? (
                  <div className="flex justify-center">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                No data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
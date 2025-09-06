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
} from 'lucide-react';
import { CryptoData, SortConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CryptoTableProps {
  data: CryptoData[];
  sort: SortConfig;
  onSort: (field: keyof CryptoData) => void;
}

export function CryptoTable({ data, onSort }: CryptoTableProps) {
  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toFixed(2);
  };

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-red-500';
    if (rsi <= 30) return 'text-green-500';
    return 'text-gray-400';
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('symbol')}
                className="h-8 gap-1"
              >
                Symbol
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('price')}
                className="h-8 gap-1"
              >
                Price
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('priceChangePercent')}
                className="h-8 gap-1"
              >
                24h Change
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('volume')}
                className="h-8 gap-1"
              >
                Volume
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('rsi')}
                className="h-8 gap-1"
              >
                RSI
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('stochRsi')}
                className="h-8 gap-1"
              >
                Stoch RSI
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Signals</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{item.symbol.replace('USDT', '')}</span>
                  {item.trend === 'bullish' && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                  {item.trend === 'bearish' && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                ${formatNumber(item.price, item.price < 1 ? 6 : 2)}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    'font-medium',
                    getPriceChangeColor(item.priceChangePercent)
                  )}
                >
                  {item.priceChangePercent > 0 ? '+' : ''}
                  {formatNumber(item.priceChangePercent)}%
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">
                ${formatVolume(item.quoteVolume)}
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={cn('font-medium', getRSIColor(item.rsi))}
                >
                  {formatNumber(item.rsi, 1)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className={getRSIColor(item.stochRsi)}>
                    {formatNumber(item.stochRsi, 1)}
                  </span>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>K:{formatNumber(item.stochRsiK, 0)}</span>
                    <span>D:{formatNumber(item.stochRsiD, 0)}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-1">
                  {item.isOverbought && (
                    <Badge variant="destructive" className="text-xs">
                      OB
                    </Badge>
                  )}
                  {item.isOversold && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      OS
                    </Badge>
                  )}
                  {!item.isOverbought && !item.isOversold && (
                    <Badge variant="secondary" className="text-xs">
                      Neutral
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                {item.reversalSignal && (
                  <Badge variant="default" className="bg-yellow-600">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Reversal
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
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
  Info,
  Triangle,
  LineChart,
  ChevronUp,
} from 'lucide-react';
import { CryptoData, SortConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CryptoIcon } from './crypto-icon';
import { getSignalColor, getSignalBg, getSignalIcon, getTimeframeLabel } from '@/lib/signal-detector';
import { TradingViewChart } from './tradingview-chart';

interface CryptoTableProps {
  data: CryptoData[];
  sort: SortConfig;
  onSort: (sort: SortConfig) => void;
  onSymbolToggle: (symbol: string) => void;
  selectedSymbols: string[];
  isLoading: boolean;
  config?: { interval: string; [key: string]: any };
}

export function CryptoTableV2({ 
  data, 
  sort,
  onSort,
  onSymbolToggle,
  selectedSymbols,
  isLoading,
  config
}: CryptoTableProps) {
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());

  const handleSort = (field: keyof CryptoData) => {
    const newDirection = sort.field === field && sort.direction === 'desc' ? 'asc' : 'desc';
    onSort({ field, direction: newDirection });
  };

  const toggleChart = (symbol: string) => {
    setExpandedCharts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return formatNumber(price, 0);
    if (price >= 1) return formatNumber(price, 2);
    if (price >= 0.01) return formatNumber(price, 4);
    return formatNumber(price, 8);
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-zinc-400';
  };

  const getPriceChangeBg = (change: number) => {
    if (change > 5) return 'bg-green-500/10';
    if (change < -5) return 'bg-red-500/10';
    return '';
  };

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-red-500';
    if (rsi <= 30) return 'text-green-500';
    return 'text-zinc-400';
  };

  const getRSIBadge = (rsi: number | undefined) => {
    if (rsi === undefined || rsi === null) {
      return <span className="text-zinc-500 text-xs">-</span>;
    }
    
    const color = rsi >= 70 ? 'text-red-500 bg-red-500/10' : 
                  rsi <= 30 ? 'text-green-500 bg-green-500/10' : 
                  'text-zinc-400';
    
    return (
      <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', color)}>
        {Math.round(rsi)}
      </span>
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
    <div className="rounded-lg border bg-card">
      {/* Legend - Moved to top */}
      <div className="p-3 border-b bg-muted/30">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground mb-1">Indicators</div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Overbought (RSI &gt; 70)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Oversold (RSI &lt; 30)</span>
              </div>
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>K/D = StochRSI Fast/Slow</span>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground mb-1">Signals</div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="text-green-500 font-semibold">LONG</span>
                <span>= Buy Signal</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500 font-semibold">SHORT</span>
                <span>= Sell Signal</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">ST/MT/LT</span>
                <span>= Short/Mid/Long Term</span>
              </div>
              <div className="flex items-center gap-1">
                <span>↑↑↑/↓↓↓</span>
                <span>= Signal Strength</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="relative">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              {/* Coin Column - Sticky */}
              <TableHead className="sticky left-0 z-20 bg-background min-w-[120px] p-2 border-r">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('symbol')}
                  className="h-7 px-2 text-xs font-medium w-full justify-start"
                >
                  Coin
                  <ArrowUpDown className="h-3 w-3 ml-auto" />
                </Button>
              </TableHead>

              {/* Price Column */}
              <TableHead className="text-right min-w-[100px] p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('price')}
                  className="h-7 px-2 text-xs font-medium w-full justify-end"
                >
                  Price
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
              </TableHead>

              {/* Price Changes Section */}
              <TableHead className="text-center p-1 border-x" colSpan={4}>
                <div className="text-xs font-medium">% Change</div>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('priceChange15m' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    15m
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('priceChange1h' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    1h
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('priceChange4h' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    4h
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('priceChangePercent' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    24h
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
                </div>
              </TableHead>

              {/* Volume */}
              <TableHead className="text-right min-w-[80px] p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('volume')}
                  className="h-7 px-2 text-xs font-medium w-full justify-end"
                >
                  Volume
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
              </TableHead>

              {/* RSI Section */}
              <TableHead className="text-center p-1 border-x" colSpan={4}>
                <div className="text-xs font-medium">RSI</div>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi15m' as keyof CryptoData)}
                    className="h-5 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    15m
                    <ArrowUpDown className="h-2 w-2 ml-0.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi30m' as keyof CryptoData)}
                    className="h-5 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    30m
                    <ArrowUpDown className="h-2 w-2 ml-0.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi1h' as keyof CryptoData)}
                    className="h-5 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    1h
                    <ArrowUpDown className="h-2 w-2 ml-0.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi4h' as keyof CryptoData)}
                    className="h-5 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    4h
                    <ArrowUpDown className="h-2 w-2 ml-0.5" />
                  </Button>
                </div>
              </TableHead>

              {/* Current StochRSI */}
              <TableHead className="text-center min-w-[80px] p-2">
                <div className="text-xs font-medium">StochRSI</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{config?.interval || '15m'}</div>
              </TableHead>

              {/* Multi-timeframe StochRSI Section */}
              <TableHead className="text-center p-1 border-x" colSpan={4}>
                <div className="text-xs font-medium">StochRSI % (Multi-TF)</div>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  <div className="text-[10px] text-center">15m</div>
                  <div className="text-[10px] text-center">30m</div>
                  <div className="text-[10px] text-center">1h</div>
                  <div className="text-[10px] text-center">4h</div>
                </div>
              </TableHead>

              {/* Status & Signal */}
              <TableHead className="text-center min-w-[80px] p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('isOverbought')}
                  className="h-7 px-2 text-xs font-medium w-full"
                >
                  Status
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
              </TableHead>
              <TableHead className="text-center min-w-[60px] p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('signal')}
                  className="h-7 px-2 text-xs font-medium w-full"
                >
                  Signal
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
              </TableHead>
              
              {/* Chart Button */}
              <TableHead className="text-center min-w-[60px] p-2">
                <div className="flex items-center justify-center gap-1">
                  <LineChart className="h-3 w-3" />
                  <span className="text-xs font-medium">Chart</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <React.Fragment key={item.id}>
                <TableRow 
                  className="hover:bg-muted/30 h-12 border-b"
                >
                {/* Coin Cell - Sticky */}
                <TableCell className="sticky left-0 z-10 bg-background font-medium p-2 border-r">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol={item.symbol} size={20} />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{item.symbol.replace('USDT', '')}</span>
                      <span className="text-[10px] text-muted-foreground">USDT</span>
                    </div>
                    {item.trend === 'bullish' && (
                      <TrendingUp className="h-3 w-3 text-green-500 ml-auto" />
                    )}
                    {item.trend === 'bearish' && (
                      <TrendingDown className="h-3 w-3 text-red-500 ml-auto" />
                    )}
                  </div>
                </TableCell>

                {/* Price */}
                <TableCell className="text-right p-2">
                  <span className="font-mono text-sm font-medium">
                    ${formatPrice(item.price)}
                  </span>
                </TableCell>

                {/* Price Changes - Multi-timeframe */}
                <TableCell className="p-1 border-l" colSpan={4}>
                  <div className="grid grid-cols-4 gap-1">
                    {/* 15m change */}
                    <div className={cn('text-center text-xs px-1 py-0.5 rounded', 
                      item.priceChange15m !== undefined ? getPriceChangeBg(item.priceChange15m) : ''
                    )}>
                      {item.priceChange15m !== undefined ? (
                        <span className={getPriceChangeColor(item.priceChange15m)}>
                          {item.priceChange15m > 0 && '+'}
                          {formatNumber(item.priceChange15m, 1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    {/* 1h change */}
                    <div className={cn('text-center text-xs px-1 py-0.5 rounded', 
                      item.priceChange1h !== undefined ? getPriceChangeBg(item.priceChange1h) : ''
                    )}>
                      {item.priceChange1h !== undefined ? (
                        <span className={getPriceChangeColor(item.priceChange1h)}>
                          {item.priceChange1h > 0 && '+'}
                          {formatNumber(item.priceChange1h, 1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    {/* 4h change */}
                    <div className={cn('text-center text-xs px-1 py-0.5 rounded', 
                      item.priceChange4h !== undefined ? getPriceChangeBg(item.priceChange4h) : ''
                    )}>
                      {item.priceChange4h !== undefined ? (
                        <span className={getPriceChangeColor(item.priceChange4h)}>
                          {item.priceChange4h > 0 && '+'}
                          {formatNumber(item.priceChange4h, 1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    {/* 24h change */}
                    <div className={cn('text-center text-xs px-1 py-0.5 rounded font-medium', 
                      getPriceChangeBg(item.priceChange24h || item.priceChangePercent)
                    )}>
                      <span className={getPriceChangeColor(item.priceChange24h || item.priceChangePercent)}>
                        {(item.priceChange24h || item.priceChangePercent) > 0 && '+'}
                        {formatNumber(item.priceChange24h || item.priceChangePercent, 1)}%
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Volume */}
                <TableCell className="text-right p-2 border-x">
                  <span className="text-xs font-medium">
                    {formatVolume(item.quoteVolume)}
                  </span>
                </TableCell>

                {/* RSI Multi-timeframe */}
                <TableCell className="p-1" colSpan={4}>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="text-center">{getRSIBadge(item.rsi15m)}</div>
                    <div className="text-center">{getRSIBadge(item.rsi30m)}</div>
                    <div className="text-center">{getRSIBadge(item.rsi1h)}</div>
                    <div className="text-center">{getRSIBadge(item.rsi4h)}</div>
                  </div>
                </TableCell>

                {/* Current StochRSI */}
                <TableCell className="text-center p-2">
                  <div className="flex flex-col items-center">
                    <span className={cn('text-sm font-medium', getRSIColor(item.stochRsi * 100))}>
                      {Math.round(item.stochRsi * 100)}%
                    </span>
                    <div className="flex gap-0.5 text-[10px] text-muted-foreground">
                      <span>{Math.round(item.stochRsiK * 100)}</span>
                      <span>/</span>
                      <span>{Math.round(item.stochRsiD * 100)}</span>
                    </div>
                  </div>
                </TableCell>

                {/* StochRSI Multi-timeframe */}
                <TableCell className="p-1 border-x" colSpan={4}>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="text-center">
                      {item.stochRsi15m !== undefined ? (
                        <div className="flex flex-col items-center">
                          <span className={cn('text-xs font-medium', getRSIColor(item.stochRsi15m * 100))}>
                            {Math.round(item.stochRsi15m * 100)}
                          </span>
                          <div className="flex gap-0.5 text-[9px] text-muted-foreground">
                            <span>{Math.round((item.stochRsiK15m || 0) * 100)}/{Math.round((item.stochRsiD15m || 0) * 100)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="text-center">
                      {item.stochRsi30m !== undefined ? (
                        <div className="flex flex-col items-center">
                          <span className={cn('text-xs font-medium', getRSIColor(item.stochRsi30m * 100))}>
                            {Math.round(item.stochRsi30m * 100)}
                          </span>
                          <div className="flex gap-0.5 text-[9px] text-muted-foreground">
                            <span>{Math.round((item.stochRsiK30m || 0) * 100)}/{Math.round((item.stochRsiD30m || 0) * 100)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="text-center">
                      {item.stochRsi1h !== undefined ? (
                        <div className="flex flex-col items-center">
                          <span className={cn('text-xs font-medium', getRSIColor(item.stochRsi1h * 100))}>
                            {Math.round(item.stochRsi1h * 100)}
                          </span>
                          <div className="flex gap-0.5 text-[9px] text-muted-foreground">
                            <span>{Math.round((item.stochRsiK1h || 0) * 100)}/{Math.round((item.stochRsiD1h || 0) * 100)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="text-center">
                      {item.stochRsi4h !== undefined ? (
                        <div className="flex flex-col items-center">
                          <span className={cn('text-xs font-medium', getRSIColor(item.stochRsi4h * 100))}>
                            {Math.round(item.stochRsi4h * 100)}
                          </span>
                          <div className="flex gap-0.5 text-[9px] text-muted-foreground">
                            <span>{Math.round((item.stochRsiK4h || 0) * 100)}/{Math.round((item.stochRsiD4h || 0) * 100)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="text-center p-2">
                  {item.isOverbought ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                      Overbought
                    </Badge>
                  ) : item.isOversold ? (
                    <Badge className="bg-green-600 text-[10px] px-1.5 py-0 h-5 hover:bg-green-700">
                      Oversold
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                      Neutral
                    </Badge>
                  )}
                </TableCell>

                {/* Signal */}
                <TableCell className="text-center p-1">
                  {item.signal && item.signal.type !== 'NEUTRAL' ? (
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold",
                      item.signal.type === 'LONG' 
                        ? item.signal.strength === 'STRONG' 
                          ? "bg-green-500 text-white" 
                          : item.signal.strength === 'MEDIUM'
                          ? "bg-green-500/80 text-white"
                          : "bg-green-500/60 text-white"
                        : item.signal.type === 'SHORT'
                        ? item.signal.strength === 'STRONG'
                          ? "bg-red-500 text-white"
                          : item.signal.strength === 'MEDIUM'
                          ? "bg-red-500/80 text-white"
                          : "bg-red-500/60 text-white"
                        : "bg-zinc-500/20 text-zinc-500"
                    )}>
                      {item.signal.type === 'LONG' ? (
                        <Triangle className="h-2 w-2 fill-current" />
                      ) : item.signal.type === 'SHORT' ? (
                        <Triangle className="h-2 w-2 fill-current rotate-180" />
                      ) : null}
                      <span>{item.signal.type}</span>
                      <span className="text-[8px] opacity-80">
                        {getTimeframeLabel(item.signal.timeframe)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">-</span>
                  )}
                </TableCell>
                
                {/* Chart Button */}
                <TableCell className="text-center p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleChart(item.symbol);
                    }}
                  >
                    <LineChart className={cn(
                      "h-3 w-3",
                      expandedCharts.has(item.symbol) ? "text-primary" : "text-muted-foreground"
                    )} />
                  </Button>
                </TableCell>
              </TableRow>
              
              {/* Expandable Chart Row */}
              {expandedCharts.has(item.symbol) && (
                <TableRow>
                  <TableCell colSpan={20} className="p-0 bg-background/50">
                    <div className="p-2 border-b-2">
                      <div className="mb-1 flex items-center justify-between px-2">
                        <h3 className="text-xs font-semibold flex items-center gap-1">
                          <CryptoIcon symbol={item.symbol} size={14} />
                          {item.symbol.replace('USDT', '')}/USDT
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => toggleChart(item.symbol)}
                        >
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Close
                        </Button>
                      </div>
                      <TradingViewChart symbol={item.symbol} height={350} theme="dark" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
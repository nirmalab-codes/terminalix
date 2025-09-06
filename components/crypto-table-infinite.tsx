'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CryptoData, SortConfig } from '@/lib/types';
import { ArrowUpDown, Triangle, Loader2, Info, LineChart, Search, X } from 'lucide-react';
import { CryptoIcon } from './crypto-icon';
import { getSignalColor, getSignalBg, getSignalIcon, getTimeframeLabel } from '@/lib/signal-detector';
import { TradingViewChart } from './tradingview-chart';

interface CryptoTableInfiniteProps {
  data: CryptoData[];
  sort: SortConfig;
  onSort: (sort: SortConfig) => void;
  onSymbolToggle: (symbol: string) => void;
  selectedSymbols: string[];
  isLoading: boolean;
  config?: { interval: string; [key: string]: any };
}

export function CryptoTableInfinite({ 
  data, 
  sort,
  onSort,
  onSymbolToggle,
  selectedSymbols,
  isLoading,
  config
}: CryptoTableInfiniteProps) {
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter data based on search term
  const displayedItems = useMemo(() => {
    if (!searchTerm) return data;
    
    const search = searchTerm.toUpperCase();
    return data.filter(item => 
      item.symbol.toUpperCase().includes(search) ||
      item.symbol.replace('USDT', '').toUpperCase().includes(search)
    );
  }, [data, searchTerm]);

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
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(decimals);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(0);
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
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

  if (isLoading && displayedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Fetching market data...</p>
          <p className="text-xs text-muted-foreground">Loading Binance Futures USDT pairs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header with Search and Legend */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex flex-col gap-3">
          {/* Search and Stats Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search coin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-8 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-foreground text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            {/* Stats Badge */}
            <Badge variant="outline" className="text-xs">
              <span className="font-bold">{displayedItems.length}</span>
              {searchTerm && (
                <span className="text-muted-foreground ml-1">/ {data.length}</span>
              )}
              <span className="text-muted-foreground ml-1">coins</span>
            </Badge>
          </div>
          
          {/* Legend Row */}
          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Overbought</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Oversold</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <Info className="h-3 w-3" />
              <span>RSI / StochRSI</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-background">
            <TableRow className="hover:bg-transparent">
              {/* Coin */}
              <TableHead className="sticky left-0 z-30 bg-background min-w-[120px] p-2 border-r">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('symbol')}
                  className="h-7 px-2 text-xs font-medium w-full justify-start"
                >
                  Coin
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
              </TableHead>

              {/* Price */}
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
              <TableHead className="text-center p-1 border-x hidden sm:table-cell" colSpan={4}>
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

              {/* RSI / StochRSI Combined Section */}
              <TableHead className="text-center p-1 border-x hidden md:table-cell" colSpan={5}>
                <div className="text-xs font-medium">RSI / StochRSI</div>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    Trend
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi15m' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    15m
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi30m' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    30m
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi1h' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    1h
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rsi4h' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    4h
                    <ArrowUpDown className="h-1.5 w-1.5 ml-0.5 opacity-60" />
                  </Button>
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
            {displayedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={20} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? `No coins found matching "${searchTerm}"` : 'No data available'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedItems.map((item) => (
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
                  </div>
                </TableCell>

                {/* Price */}
                <TableCell className="text-right font-mono text-sm p-2">
                  ${formatPrice(item.price)}
                </TableCell>

                {/* Price Changes - Combined cell */}
                <TableCell className="p-1 border-x hidden sm:table-cell" colSpan={4}>
                  <div className="grid grid-cols-4 gap-1">
                    <div className={cn("text-center text-xs font-medium", 
                      (item.priceChange15m ?? 0) > 0 ? "text-green-500" : "text-red-500")}>
                      {item.priceChange15m !== undefined ? 
                        `${item.priceChange15m > 0 ? '+' : ''}${item.priceChange15m.toFixed(1)}%` : '-'}
                    </div>
                    <div className={cn("text-center text-xs font-medium", 
                      (item.priceChange1h ?? 0) > 0 ? "text-green-500" : "text-red-500")}>
                      {item.priceChange1h !== undefined ? 
                        `${item.priceChange1h > 0 ? '+' : ''}${item.priceChange1h.toFixed(1)}%` : '-'}
                    </div>
                    <div className={cn("text-center text-xs font-medium", 
                      (item.priceChange4h ?? 0) > 0 ? "text-green-500" : "text-red-500")}>
                      {item.priceChange4h !== undefined ? 
                        `${item.priceChange4h > 0 ? '+' : ''}${item.priceChange4h.toFixed(1)}%` : '-'}
                    </div>
                    <div className={cn("text-center text-xs font-medium", 
                      item.priceChangePercent > 0 ? "text-green-500" : "text-red-500")}>
                      {item.priceChangePercent > 0 ? '+' : ''}{item.priceChangePercent.toFixed(1)}%
                    </div>
                  </div>
                </TableCell>

                {/* Volume */}
                <TableCell className="text-right text-xs text-muted-foreground p-2">
                  ${formatNumber(item.quoteVolume)}
                </TableCell>

                {/* RSI / StochRSI Combined Values */}
                <TableCell className="p-1 border-x hidden md:table-cell" colSpan={5}>
                  <div className="grid grid-cols-5 gap-1">
                    {/* Trend */}
                    <div className="text-center">
                      {(() => {
                        const rsi = item.rsi;
                        const priceChange = item.priceChangePercent;
                        
                        // Determine trend based on RSI and price movement
                        let trend = 'NEUTRAL';
                        let trendColor = 'text-gray-500';
                        let bgColor = 'bg-gray-500/10';
                        let icon = '→';
                        
                        if (rsi >= 60 && priceChange > 0) {
                          trend = 'BULLISH';
                          trendColor = 'text-green-500';
                          bgColor = 'bg-green-500/10';
                          icon = '↑';
                        } else if (rsi <= 40 && priceChange < 0) {
                          trend = 'BEARISH';
                          trendColor = 'text-red-500';
                          bgColor = 'bg-red-500/10';
                          icon = '↓';
                        } else if (rsi >= 50 && priceChange > 0) {
                          trend = 'UPTREND';
                          trendColor = 'text-emerald-500';
                          bgColor = 'bg-emerald-500/10';
                          icon = '↗';
                        } else if (rsi <= 50 && priceChange < 0) {
                          trend = 'DOWNTREND';
                          trendColor = 'text-orange-500';
                          bgColor = 'bg-orange-500/10';
                          icon = '↘';
                        }
                        
                        return (
                          <Badge className={cn(
                            "text-[10px] font-bold px-1.5 py-0",
                            trendColor,
                            bgColor
                          )}>
                            <span className="mr-1">{icon}</span>
                            {trend}
                          </Badge>
                        );
                      })()}
                    </div>
                    {/* 15m */}
                    <div className="text-center">
                      {item.rsi15m !== undefined ? (
                        (() => {
                          const rsi = item.rsi15m;
                          const stochRsi = (item.stochRsi15m || 0) * 100;
                          const bothOversold = rsi <= 30 && stochRsi <= 20;
                          const bothOverbought = rsi >= 70 && stochRsi >= 80;
                          
                          return (
                            <div className={cn(
                              "inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded",
                              bothOversold && "bg-green-500/20 border border-green-500/30",
                              bothOverbought && "bg-red-500/20 border border-red-500/30"
                            )}>
                              <span className={cn("text-xs font-medium", getRSIColor(rsi))}>
                                {Math.round(rsi)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">/</span>
                              {item.stochRsi15m !== undefined ? (
                                <span className={cn("text-xs", getRSIColor(stochRsi))}>
                                  {stochRsi.toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-500">-</span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-zinc-500">-</span>
                      )}
                    </div>
                    {/* 30m */}
                    <div className="text-center">
                      {item.rsi30m !== undefined ? (
                        (() => {
                          const rsi = item.rsi30m;
                          const stochRsi = (item.stochRsi30m || 0) * 100;
                          const bothOversold = rsi <= 30 && stochRsi <= 20;
                          const bothOverbought = rsi >= 70 && stochRsi >= 80;
                          
                          return (
                            <div className={cn(
                              "inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded",
                              bothOversold && "bg-green-500/20 border border-green-500/30",
                              bothOverbought && "bg-red-500/20 border border-red-500/30"
                            )}>
                              <span className={cn("text-xs font-medium", getRSIColor(rsi))}>
                                {Math.round(rsi)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">/</span>
                              {item.stochRsi30m !== undefined ? (
                                <span className={cn("text-xs", getRSIColor(stochRsi))}>
                                  {stochRsi.toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-500">-</span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-zinc-500">-</span>
                      )}
                    </div>
                    {/* 1h */}
                    <div className="text-center">
                      {item.rsi1h !== undefined ? (
                        (() => {
                          const rsi = item.rsi1h;
                          const stochRsi = (item.stochRsi1h || 0) * 100;
                          const bothOversold = rsi <= 30 && stochRsi <= 20;
                          const bothOverbought = rsi >= 70 && stochRsi >= 80;
                          
                          return (
                            <div className={cn(
                              "inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded",
                              bothOversold && "bg-green-500/20 border border-green-500/30",
                              bothOverbought && "bg-red-500/20 border border-red-500/30"
                            )}>
                              <span className={cn("text-xs font-medium", getRSIColor(rsi))}>
                                {Math.round(rsi)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">/</span>
                              {item.stochRsi1h !== undefined ? (
                                <span className={cn("text-xs", getRSIColor(stochRsi))}>
                                  {stochRsi.toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-500">-</span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-zinc-500">-</span>
                      )}
                    </div>
                    {/* 4h */}
                    <div className="text-center">
                      {item.rsi4h !== undefined ? (
                        (() => {
                          const rsi = item.rsi4h;
                          const stochRsi = (item.stochRsi4h || 0) * 100;
                          const bothOversold = rsi <= 30 && stochRsi <= 20;
                          const bothOverbought = rsi >= 70 && stochRsi >= 80;
                          
                          return (
                            <div className={cn(
                              "inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded",
                              bothOversold && "bg-green-500/20 border border-green-500/30",
                              bothOverbought && "bg-red-500/20 border border-red-500/30"
                            )}>
                              <span className={cn("text-xs font-medium", getRSIColor(rsi))}>
                                {Math.round(rsi)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">/</span>
                              {item.stochRsi4h !== undefined ? (
                                <span className={cn("text-xs", getRSIColor(stochRsi))}>
                                  {stochRsi.toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-500">-</span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-zinc-500">-</span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="text-center p-2">
                  {item.isOverbought && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                      OB
                    </Badge>
                  )}
                  {item.isOversold && (
                    <Badge className="bg-green-500/20 text-green-500 text-[10px] px-1 py-0">
                      OS
                    </Badge>
                  )}
                  {!item.isOverbought && !item.isOversold && (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Signal */}
                <TableCell className="text-center p-1">
                  {item.signal ? (
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
                    onClick={() => toggleChart(item.symbol)}
                    className="h-6 w-6 p-0"
                  >
                    <LineChart className={cn(
                      "h-3 w-3",
                      expandedCharts.has(item.symbol) ? "text-primary" : "text-muted-foreground"
                    )} />
                  </Button>
                </TableCell>
              </TableRow>
              {expandedCharts.has(item.symbol) && (
                <TableRow>
                  <TableCell colSpan={20} className="p-0 border-b-2">
                    <div className="p-4 bg-muted/20">
                      <TradingViewChart symbol={item.symbol} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </React.Fragment>
            ))
          )}
          </TableBody>
        </Table>
      </div>
      
    </div>
  );
}
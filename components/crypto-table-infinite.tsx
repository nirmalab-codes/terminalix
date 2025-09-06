'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const ITEMS_PER_PAGE = 50;

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
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    const search = searchTerm.toUpperCase();
    return data.filter(item => 
      item.symbol.toUpperCase().includes(search) ||
      item.symbol.replace('USDT', '').toUpperCase().includes(search)
    );
  }, [data, searchTerm]);
  
  // Get displayed items based on pagination
  const displayedItems = useMemo(() => {
    return filteredData.slice(0, displayedCount);
  }, [filteredData, displayedCount]);
  
  // Reset pagination when search changes
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [searchTerm]);
  
  // Load more items
  const loadMore = useCallback(() => {
    if (isLoadingMore || displayedCount >= filteredData.length) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredData.length));
      setIsLoadingMore(false);
    }, 300);
  }, [displayedCount, filteredData.length, isLoadingMore]);
  
  // Setup intersection observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && displayedCount < filteredData.length && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, displayedCount, filteredData.length, isLoadingMore]);

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
  
  // Detect divergence/convergence patterns based on 8 types
  const detectPattern = (
    rsi: number | undefined,
    priceChange: number | undefined,
    prevRsi?: number,
    prevPrice?: number
  ): { type: 'D' | 'C' | null; direction: 'B' | 'T' | null; signal: 'bullish' | 'bearish' | null } => {
    if (!rsi || priceChange === undefined) {
      return { type: null, direction: null, signal: null };
    }

    // For simplified detection without historical data, use current values
    const isOverbought = rsi >= 70;
    const isOversold = rsi <= 30;
    const priceRising = priceChange > 0.5;
    const priceFalling = priceChange < -0.5;

    // BEARISH PATTERNS (Sell signals)
    if (isOverbought) {
      if (priceFalling) {
        // Top Divergence: Price weakening while RSI overbought
        return { type: 'D', direction: 'T', signal: 'bearish' };
      } else if (priceRising) {
        // Top Convergence: Price and RSI both high (trend continuation)
        return { type: 'C', direction: 'T', signal: 'bearish' };
      }
    }

    // BULLISH PATTERNS (Buy signals)
    if (isOversold) {
      if (priceRising) {
        // Bottom Divergence: Price strengthening while RSI oversold
        return { type: 'D', direction: 'B', signal: 'bullish' };
      } else if (priceFalling) {
        // Bottom Convergence: Price and RSI both low (trend continuation)
        return { type: 'C', direction: 'B', signal: 'bullish' };
      }
    }

    // Check mid-range divergences
    if (rsi > 30 && rsi < 70) {
      // Hidden divergences in trending markets
      if (rsi > 50 && priceChange < -1) {
        return { type: 'D', direction: 'T', signal: 'bearish' };
      }
      if (rsi < 50 && priceChange > 1) {
        return { type: 'D', direction: 'B', signal: 'bullish' };
      }
    }

    return { type: null, direction: null, signal: null };
  };

  // Helper to render RSI/StochRSI with divergence/convergence detection
  const renderRSICell = (
    rsi: number | undefined, 
    stochRsi: number | undefined, 
    priceChange: number | undefined
  ) => {
    if (rsi === undefined || rsi === null) {
      return <span className="text-[10px] text-zinc-400 opacity-50">—</span>;
    }
    
    // StochRSI is now returned as K value in 0-100 range from the calculation
    const stochRsiValue = stochRsi !== undefined ? stochRsi : 50;
    const bothOversold = rsi <= 30 && stochRsiValue <= 20;
    const bothOverbought = rsi >= 70 && stochRsiValue >= 80;
    
    // Detect pattern
    const pattern = detectPattern(rsi, priceChange);
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <div className={cn(
          "inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded",
          bothOversold && "bg-green-500/20 border border-green-500/30",
          bothOverbought && "bg-red-500/20 border border-red-500/30"
        )}>
          <span className={cn("text-xs font-medium", getRSIColor(rsi))}>
            {Math.round(rsi)}
          </span>
          <span className="text-[10px] text-muted-foreground">/</span>
          {stochRsi !== undefined ? (
            <span className={cn("text-xs", getRSIColor(stochRsiValue))}>
              {stochRsiValue.toFixed(0)}
            </span>
          ) : (
            <span className="text-xs text-zinc-500">-</span>
          )}
        </div>
        {pattern.type && pattern.direction && (
          <Badge className={cn(
            "absolute -top-1 -right-1 h-3 w-6 px-0 py-0 text-[7px] font-bold border-0 flex items-center justify-center",
            pattern.type === 'D' && pattern.direction === 'B' && "bg-green-500 text-white",
            pattern.type === 'D' && pattern.direction === 'T' && "bg-orange-500 text-white",
            pattern.type === 'C' && pattern.direction === 'B' && "bg-blue-500 text-white",
            pattern.type === 'C' && pattern.direction === 'T' && "bg-purple-500 text-white"
          )}>
            {`${pattern.type}${pattern.direction}`}
          </Badge>
        )}
      </div>
    );
  };

  // Loading text variations
  const loadingTexts = useMemo(() => [
    { primary: "Analyzing market trends", secondary: "Calculating RSI divergences across timeframes" },
    { primary: "Processing price action", secondary: "Detecting overbought and oversold conditions" },
    { primary: "Scanning 200+ pairs", secondary: "Identifying bullish and bearish signals" },
    { primary: "Computing indicators", secondary: "Analyzing StochRSI momentum shifts" },
    { primary: "Evaluating divergences", secondary: "Finding reversal opportunities" },
    { primary: "Streaming live data", secondary: "Connecting to Binance Futures USDT pairs" },
  ], []);

  // Animated dots state
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    if (isLoading && displayedItems.length === 0) {
      // Text rotation - slower at 4 seconds
      const textInterval = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % loadingTexts.length);
      }, 4000);
      
      // Dots animation
      const dotsInterval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      
      return () => {
        clearInterval(textInterval);
        clearInterval(dotsInterval);
      };
    }
  }, [isLoading, displayedItems.length, loadingTexts.length]);

  if (isLoading && displayedItems.length === 0) {
    const currentText = loadingTexts[loadingTextIndex];
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={loadingTextIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-center space-y-3"
          >
            <motion.p 
              className="text-base font-semibold flex items-center justify-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {currentText.primary}
              <span className="inline-block w-8 text-left">{dots}</span>
            </motion.p>
            <motion.p 
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {currentText.secondary}
            </motion.p>
          </motion.div>
        </AnimatePresence>
        
        <motion.div 
          className="flex gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 bg-primary rounded-full"
              animate={{
                y: [0, -12, 0],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header with Search and Legend */}
      <div className="p-3 border-b bg-muted/30">
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
          
          {/* Stats and Legend inline */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">OB</Badge>
                <span>Overbought</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge className="bg-green-500/20 text-green-500 text-[10px] px-1 py-0 h-4">OS</Badge>
                <span>Oversold</span>
              </div>
              <div className="flex items-center gap-1" title="Divergence Bottom: Price & RSI moving opposite - Bullish reversal">
                <Badge className="h-4 px-1.5 bg-green-500 text-white text-[8px] font-bold">DB</Badge>
                <span className="text-xs">Div Bottom</span>
              </div>
              <div className="flex items-center gap-1" title="Divergence Top: Price & RSI moving opposite - Bearish reversal">
                <Badge className="h-4 px-1.5 bg-orange-500 text-white text-[8px] font-bold">DT</Badge>
                <span className="text-xs">Div Top</span>
              </div>
              <div className="flex items-center gap-1" title="Convergence Bottom: Price & RSI aligned - Trend continuation">
                <Badge className="h-4 px-1.5 bg-blue-500 text-white text-[8px] font-bold">CB</Badge>
                <span className="text-xs">Conv Bottom</span>
              </div>
              <div className="flex items-center gap-1" title="Convergence Top: Price & RSI aligned - Trend continuation">
                <Badge className="h-4 px-1.5 bg-purple-500 text-white text-[8px] font-bold">CT</Badge>
                <span className="text-xs">Conv Top</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs ml-auto">
              <span className="font-bold">{displayedItems.length}</span>
              {displayedCount < filteredData.length && (
                <span className="text-muted-foreground ml-1">/ {filteredData.length}</span>
              )}
              <span className="text-muted-foreground ml-1">coins</span>
            </Badge>
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
              <TableHead className="text-center p-1 border-x hidden sm:table-cell" colSpan={5}>
                <div className="text-xs font-medium">% Change</div>
                <div className="grid grid-cols-5 gap-1 mt-1">
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
                    onClick={() => handleSort('priceChange30m' as keyof CryptoData)}
                    className="h-4 p-0 text-[10px] font-normal hover:bg-transparent hover:text-foreground"
                  >
                    30m
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
                  onClick={() => handleSort('quoteVolume')}
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
                <TableCell className="p-1 border-x hidden sm:table-cell" colSpan={5}>
                  <div className="grid grid-cols-5 gap-1">
                    <div className={cn("text-center text-xs font-medium", 
                      (item.priceChange15m ?? 0) > 0 ? "text-green-500" : "text-red-500")}>
                      {item.priceChange15m !== undefined ? 
                        `${item.priceChange15m > 0 ? '+' : ''}${item.priceChange15m.toFixed(1)}%` : '-'}
                    </div>
                    <div className={cn("text-center text-xs font-medium", 
                      (item.priceChange30m ?? 0) > 0 ? "text-green-500" : "text-red-500")}>
                      {item.priceChange30m !== undefined ? 
                        `${item.priceChange30m > 0 ? '+' : ''}${item.priceChange30m.toFixed(1)}%` : '-'}
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
                        
                        // Simplified trend: BULLISH or BEARISH based on RSI momentum
                        let trend = 'NEUTRAL';
                        let trendColor = 'text-gray-500';
                        let bgColor = 'bg-gray-500/10';
                        let icon = '→';
                        
                        if (rsi >= 55) {
                          trend = 'BULLISH';
                          trendColor = 'text-green-500';
                          bgColor = 'bg-green-500/10';
                          icon = '↑';
                        } else if (rsi <= 45) {
                          trend = 'BEARISH';
                          trendColor = 'text-red-500';
                          bgColor = 'bg-red-500/10';
                          icon = '↓';
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
                      {renderRSICell(item.rsi15m, item.stochRsi15m, item.priceChange15m)}
                    </div>
                    {/* 30m */}
                    <div className="text-center">
                      {renderRSICell(item.rsi30m, item.stochRsi30m, item.priceChange30m)}
                    </div>
                    {/* 1h */}
                    <div className="text-center">
                      {renderRSICell(item.rsi1h, item.stochRsi1h, item.priceChange1h)}
                    </div>
                    {/* 4h */}
                    <div className="text-center">
                      {renderRSICell(item.rsi4h, item.stochRsi4h, item.priceChange4h)}
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
                    <span className="text-[10px] text-zinc-400 opacity-50">—</span>
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
      
      {/* Infinite scroll trigger */}
      {displayedCount < filteredData.length && (
        <div 
          ref={loadMoreRef}
          className="flex items-center justify-center p-4 border-t"
        >
          {isLoadingMore ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading more coins...</span>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              className="text-xs"
            >
              Load More ({filteredData.length - displayedCount} remaining)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
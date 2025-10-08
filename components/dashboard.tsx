'use client';

import React, { useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useMarketDataStream } from '@/hooks/useMarketDataStream';
import { CryptoData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CryptoTableInfinite as CryptoTable } from './crypto-table-infinite';
import { SignalMarquee } from './signal-marquee';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wifi, Triangle } from 'lucide-react';

export function Dashboard() {
  const {
    cryptoData,
    config,
    filter,
    sort,
    isLoading,
    error,
    selectedSymbols,
    setCryptoData,
    setSort,
    setLoading,
    setError,
    toggleSymbol,
  } = useStore();

  // Use the market data stream hook - gets data directly from DB
  // The binance-scheduler is already populating the database with market data + indicators
  const { data: streamData, isConnected } = useMarketDataStream({
    symbols: selectedSymbols.length > 0 ? selectedSymbols : undefined,
    enabled: true,
  });

  // Process incoming stream data - now includes indicators from the database!
  useEffect(() => {
    if (streamData && streamData.length > 0) {
      setLoading(false);
      setError(null);

      // Map stream data to CryptoData format
      // The API route now joins Ticker + Indicator tables
      const processedData: CryptoData[] = streamData.map((data) => ({
        ...data,
        id: data.symbol,
        lastUpdate: Date.now(),
      })) as CryptoData[];

      setCryptoData(processedData);
    }
  }, [streamData, setCryptoData, setLoading, setError]);

  const filteredData = useMemo(() => {
    let filtered = [...cryptoData];

    if (filter.showOverbought) {
      filtered = filtered.filter((item) => item.isOverbought);
    }

    if (filter.showOversold) {
      filtered = filtered.filter((item) => item.isOversold);
    }

    if (filter.showReversals) {
      filtered = filtered.filter((item) => item.reversalSignal);
    }

    if (filter.minVolume > 0) {
      filtered = filtered.filter((item) => item.quoteVolume >= filter.minVolume);
    }

    if (filter.minPriceChange !== -100) {
      filtered = filtered.filter(
        (item) => item.priceChangePercent >= filter.minPriceChange
      );
    }

    if (filter.searchTerm) {
      filtered = filtered.filter((item) =>
        item.symbol.toLowerCase().includes(filter.searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const modifier = sort.direction === 'asc' ? 1 : -1;

      // Special handling for signal sorting
      if (sort.field === 'signal') {
        const aSignal = a.signal;
        const bSignal = b.signal;

        // Prioritize signals over no signals
        if (!aSignal && !bSignal) return 0;
        if (!aSignal) return modifier;
        if (!bSignal) return -modifier;

        // Sort by signal type (LONG > NEUTRAL > SHORT)
        const typeOrder = { 'LONG': 3, 'NEUTRAL': 2, 'SHORT': 1 };
        const typeDiff = (typeOrder[aSignal.type] || 0) - (typeOrder[bSignal.type] || 0);
        if (typeDiff !== 0) return typeDiff * -modifier;

        // Then by strength (STRONG > MEDIUM > WEAK)
        const strengthOrder = { 'STRONG': 3, 'MEDIUM': 2, 'WEAK': 1 };
        const strengthDiff = (strengthOrder[aSignal.strength] || 0) - (strengthOrder[bSignal.strength] || 0);
        return strengthDiff * -modifier;
      }

      // Special handling for status (isOverbought/isOversold)
      if (sort.field === 'isOverbought') {
        // Get status values
        const aHasStatus = a.isOverbought || a.isOversold;
        const bHasStatus = b.isOverbought || b.isOversold;

        // Push items with no status to the end
        if (!aHasStatus && bHasStatus) return 1;
        if (aHasStatus && !bHasStatus) return -1;
        if (!aHasStatus && !bHasStatus) return 0;

        // Both have status, sort by priority: Overbought > Oversold
        const aStatus = a.isOverbought ? 2 : 1;
        const bStatus = b.isOverbought ? 2 : 1;
        return (aStatus - bStatus) * -modifier;
      }

      const aVal = a[sort.field];
      const bVal = b[sort.field];

      // Handle null/undefined values - push them to the end regardless of sort direction
      if (aVal === null || aVal === undefined) {
        return 1; // Always push null/undefined to the end
      }
      if (bVal === null || bVal === undefined) {
        return -1; // Always push null/undefined to the end
      }

      // For RSI fields, handle special sorting
      if (sort.field.toString().includes('rsi') || sort.field.toString().includes('stochRsi')) {
        // Both values exist, sort normally
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * modifier;
        }
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * modifier;
      }

      return String(aVal).localeCompare(String(bVal)) * modifier;
    });

    return filtered;
  }, [cryptoData, filter, sort]);

  const stats = useMemo(() => {
    const overbought = cryptoData.filter((item) => item.isOverbought).length;
    const oversold = cryptoData.filter((item) => item.isOversold).length;
    const reversals = cryptoData.filter((item) => item.reversalSignal).length;
    const bullish = cryptoData.filter((item) => item.trend === 'bullish').length;
    const bearish = cryptoData.filter((item) => item.trend === 'bearish').length;

    return { overbought, oversold, reversals, bullish, bearish };
  }, [cryptoData]);

  return (
    <div className="space-y-4">
      {/* Signal Marquee */}
      <SignalMarquee cryptoData={cryptoData} />

      {/* Connection Status and Stats */}
      <div className="flex items-center gap-3 px-4">
        {/* Connection Badge */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          isConnected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          <Wifi className="h-3 w-3" />
          {isConnected ? 'Live' : 'Offline'}
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-xs">
            <span className="text-red-500 font-medium">{stats.overbought}</span>
            <span className="text-red-400 text-[10px]">OB</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-xs">
            <span className="text-green-500 font-medium">{stats.oversold}</span>
            <span className="text-green-400 text-[10px]">OS</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-xs">
            <span className="text-yellow-500 font-medium">{stats.reversals}</span>
            <span className="text-yellow-400 text-[10px]">REV</span>
          </div>

          <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-zinc-500/10 text-xs">
            <div className="flex items-center gap-0.5">
              <span className="text-green-500 font-medium">{stats.bullish}</span>
              <Triangle className="h-2 w-2 fill-green-500 text-green-500" />
            </div>
            <span className="text-zinc-400">/</span>
            <div className="flex items-center gap-0.5">
              <span className="text-red-500 font-medium">{stats.bearish}</span>
              <Triangle className="h-2 w-2 fill-red-500 text-red-500 rotate-180" />
            </div>
          </div>
        </div>
      </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="gap-2">
              All <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filteredData.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="overbought" className="gap-2">
              Overbought <Badge variant="destructive" className="ml-1 h-5 px-1.5">{stats.overbought}</Badge>
            </TabsTrigger>
            <TabsTrigger value="oversold" className="gap-2">
              Oversold <Badge className="ml-1 h-5 px-1.5 bg-green-500/20 text-green-500">{stats.oversold}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reversals" className="gap-2">
              Reversals <Badge variant="outline" className="ml-1 h-5 px-1.5">{stats.reversals}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <CryptoTable
              data={filteredData}
              onSort={setSort}
              sort={sort}
              onSymbolToggle={toggleSymbol}
              selectedSymbols={selectedSymbols}
              isLoading={isLoading}
              config={config}
            />
          </TabsContent>

          <TabsContent value="overbought" className="mt-4">
            <CryptoTable
              data={filteredData.filter((item) => item.isOverbought)}
              onSort={setSort}
              sort={sort}
              onSymbolToggle={toggleSymbol}
              selectedSymbols={selectedSymbols}
              isLoading={isLoading}
              config={config}
            />
          </TabsContent>

          <TabsContent value="oversold" className="mt-4">
            <CryptoTable
              data={filteredData.filter((item) => item.isOversold)}
              onSort={setSort}
              sort={sort}
              onSymbolToggle={toggleSymbol}
              selectedSymbols={selectedSymbols}
              isLoading={isLoading}
              config={config}
            />
          </TabsContent>

          <TabsContent value="reversals" className="mt-4">
            <CryptoTable
              data={filteredData.filter((item) => item.reversalSignal)}
              onSort={setSort}
              sort={sort}
              onSymbolToggle={toggleSymbol}
              selectedSymbols={selectedSymbols}
              isLoading={isLoading}
              config={config}
            />
          </TabsContent>
        </Tabs>
    </div>
  );
}

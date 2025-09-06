'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { BinanceAPI } from '@/lib/binance';
import {
  calculateRSI,
  calculateStochRSI,
  detectReversal,
  determineTrend,
} from '@/lib/indicators';
import { CryptoData } from '@/lib/types';
import { CryptoTable } from './crypto-table';
import { ConfigPanel } from './config-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
    updateCryptoItem,
    setConfig,
    setFilter,
    setSort,
    setLoading,
    setError,
    toggleSymbol,
  } = useStore();

  const [binanceAPI] = useState(() => new BinanceAPI());
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [priceHistory, setPriceHistory] = useState<Map<string, number[]>>(new Map());
  const [rsiHistory, setRsiHistory] = useState<Map<string, number[]>>(new Map());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let symbols = selectedSymbols;
      
      if (symbols.length === 0) {
        symbols = await binanceAPI.getTopSymbols(30);
      }

      const marketData = await binanceAPI.getMarketData(symbols);
      const cryptoDataPromises = marketData.map(async (data) => {
        const klines = await binanceAPI.getKlines(data.symbol, config.interval, 100);
        
        let history = priceHistory.get(data.symbol) || [];
        history = [...history, ...klines].slice(-100);
        setPriceHistory((prev) => new Map(prev).set(data.symbol, history));

        const rsi = calculateRSI(history, config.rsiPeriod);
        
        let rsiHist = rsiHistory.get(data.symbol) || [];
        rsiHist = [...rsiHist, rsi].slice(-50);
        setRsiHistory((prev) => new Map(prev).set(data.symbol, rsiHist));

        const stochRsi = calculateStochRSI(rsiHist, config.stochRsiPeriod);
        const previousRsi = rsiHist[rsiHist.length - 2] || rsi;
        const previousStochRsi = rsiHist.length > 1 
          ? calculateStochRSI(rsiHist.slice(0, -1), config.stochRsiPeriod).value 
          : stochRsi.value;

        const isOverbought = rsi >= config.overboughtLevel;
        const isOversold = rsi <= config.oversoldLevel;
        const reversalSignal = detectReversal(
          rsi,
          previousRsi,
          stochRsi.value,
          previousStochRsi,
          config.overboughtLevel,
          config.oversoldLevel
        );
        const trend = determineTrend(rsi, data.priceChangePercent);

        return {
          ...data,
          id: data.symbol,
          rsi,
          stochRsi: stochRsi.value,
          stochRsiK: stochRsi.k,
          stochRsiD: stochRsi.d,
          isOverbought,
          isOversold,
          reversalSignal,
          trend,
          lastUpdate: Date.now(),
        } as CryptoData;
      });

      const completeData = await Promise.all(cryptoDataPromises);
      setCryptoData(completeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [
    selectedSymbols,
    config,
    binanceAPI,
    priceHistory,
    rsiHistory,
    setCryptoData,
    setLoading,
    setError,
  ]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  useEffect(() => {
    if (ws) {
      ws.close();
    }

    if (selectedSymbols.length > 0) {
      const websocket = binanceAPI.createWebSocket(selectedSymbols, (data) => {
        updateCryptoItem(data.symbol || '', data);
      });
      setWs(websocket);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbols, binanceAPI, updateCryptoItem]);

  const handleSort = (field: keyof CryptoData) => {
    const direction = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    setSort({ field, direction });
  };

  const filteredData = cryptoData
    .filter((item) => {
      if (filter.showOverbought && !item.isOverbought) return false;
      if (filter.showOversold && !item.isOversold) return false;
      if (filter.showReversals && !item.reversalSignal) return false;
      if (item.quoteVolume < filter.minVolume) return false;
      if (item.priceChangePercent < filter.minPriceChange) return false;
      if (filter.searchTerm) {
        const search = filter.searchTerm.toUpperCase();
        if (!item.symbol.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  const stats = {
    overbought: cryptoData.filter((d) => d.isOverbought).length,
    oversold: cryptoData.filter((d) => d.isOversold).length,
    reversals: cryptoData.filter((d) => d.reversalSignal).length,
    bullish: cryptoData.filter((d) => d.trend === 'bullish').length,
    bearish: cryptoData.filter((d) => d.trend === 'bearish').length,
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-[1920px]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Crypto Trading Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time RSI monitoring and reversal detection
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Overbought</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.overbought}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Oversold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.oversold}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reversals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.reversals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bullish</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.bullish}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bearish</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{stats.bearish}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({filteredData.length})</TabsTrigger>
                <TabsTrigger value="overbought">
                  Overbought ({stats.overbought})
                </TabsTrigger>
                <TabsTrigger value="oversold">
                  Oversold ({stats.oversold})
                </TabsTrigger>
                <TabsTrigger value="reversals">
                  Reversals ({stats.reversals})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <CryptoTable
                  data={filteredData}
                  sort={sort}
                  onSort={handleSort}
                />
              </TabsContent>
              <TabsContent value="overbought" className="mt-4">
                <CryptoTable
                  data={filteredData.filter((d) => d.isOverbought)}
                  sort={sort}
                  onSort={handleSort}
                />
              </TabsContent>
              <TabsContent value="oversold" className="mt-4">
                <CryptoTable
                  data={filteredData.filter((d) => d.isOversold)}
                  sort={sort}
                  onSort={handleSort}
                />
              </TabsContent>
              <TabsContent value="reversals" className="mt-4">
                <CryptoTable
                  data={filteredData.filter((d) => d.reversalSignal)}
                  sort={sort}
                  onSort={handleSort}
                />
              </TabsContent>
            </Tabs>

            {isLoading && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Activity className="h-4 w-4 animate-pulse" />
                <span className="text-muted-foreground">Loading data...</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <ConfigPanel
              config={config}
              filter={filter}
              selectedSymbols={selectedSymbols}
              onConfigChange={setConfig}
              onFilterChange={setFilter}
              onSymbolRemove={toggleSymbol}
              onRefresh={fetchData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
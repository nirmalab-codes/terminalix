'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import { BinanceAPI } from '@/lib/binance';
import { BinanceFuturesAPI } from '@/lib/binance-futures';
import { getWebSocketManager } from '@/lib/websocket-manager';
import {
  calculateRSI,
  calculateStochRSI,
  detectReversal,
  determineTrend,
} from '@/lib/indicators';
import { detectAdvancedSignal } from '@/lib/signal-detector';
import { CryptoData, MarketData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CryptoTableInfinite as CryptoTable } from './crypto-table-infinite';
import { ConfigPanel } from './config-panel';
import { SignalMarquee } from './signal-marquee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Wifi, Triangle } from 'lucide-react';

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
  const [futuresAPI] = useState(() => new BinanceFuturesAPI());
  const [wsManager] = useState(() => getWebSocketManager());
  const [isConnected, setIsConnected] = useState(false);
  const [priceHistory, setPriceHistory] = useState<Map<string, number[]>>(new Map());
  const [rsiHistory, setRsiHistory] = useState<Map<string, number[]>>(new Map());
  // Multi-timeframe price history
  const [multiTfPriceHistory, setMultiTfPriceHistory] = useState<Map<string, Map<string, number[]>>>(new Map());
  // Store initial prices for calculating percentage changes
  const [priceChangeData, setPriceChangeData] = useState<Map<string, Record<string, number>>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const klineUnsubscribesRef = useRef<Map<string, () => void>>(new Map());

  // Calculate indicators for a symbol
  const calculateIndicators = useCallback((
    data: Partial<MarketData>,
    symbol: string
  ): Partial<CryptoData> => {
    const history = priceHistory.get(symbol) || [];
    const updatedHistory = [...history, data.price || 0].slice(-100);
    
    // Update price history
    setPriceHistory(prev => {
      const newMap = new Map(prev);
      newMap.set(symbol, updatedHistory);
      return newMap;
    });

    const rsi = calculateRSI(updatedHistory, config.rsiPeriod);
    
    const rsiHist = rsiHistory.get(symbol) || [];
    const updatedRsiHist = [...rsiHist, rsi].slice(-50);
    
    // Update RSI history
    setRsiHistory(prev => {
      const newMap = new Map(prev);
      newMap.set(symbol, updatedRsiHist);
      return newMap;
    });

    const stochRsi = calculateStochRSI(updatedRsiHist, config.stochRsiPeriod);
    const previousRsi = updatedRsiHist[updatedRsiHist.length - 2] || rsi;
    const previousStochRsi = updatedRsiHist.length > 1 
      ? calculateStochRSI(updatedRsiHist.slice(0, -1), config.stochRsiPeriod).value 
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
    const trend = determineTrend(rsi, data.priceChangePercent || 0);
    
    // Get current crypto data to include multi-timeframe values
    const currentData = cryptoData.find(c => c.symbol === data.symbol);
    
    // Calculate advanced signal with all available data
    const signal = detectAdvancedSignal({
      ...data,
      rsi,
      stochRsi: stochRsi.value,
      stochRsiK: stochRsi.k,
      stochRsiD: stochRsi.d,
      // Include multi-timeframe data if available
      ...(currentData ? {
        rsi15m: currentData.rsi15m,
        rsi30m: currentData.rsi30m,
        rsi1h: currentData.rsi1h,
        rsi4h: currentData.rsi4h,
        stochRsi15m: currentData.stochRsi15m,
        stochRsi30m: currentData.stochRsi30m,
        stochRsi1h: currentData.stochRsi1h,
        stochRsi4h: currentData.stochRsi4h,
        priceChange15m: currentData.priceChange15m,
        priceChange1h: currentData.priceChange1h,
        priceChange4h: currentData.priceChange4h,
      } : {})
    });

    return {
      ...data,
      rsi,
      stochRsi: stochRsi.value,
      stochRsiK: stochRsi.k,
      stochRsiD: stochRsi.d,
      isOverbought,
      isOversold,
      reversalSignal,
      trend,
      signal,
      lastUpdate: Date.now(),
    };
  }, [config, priceHistory, rsiHistory, cryptoData]);

  // Initial data fetch (REST API - only once) - OPTIMIZED VERSION
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let symbols = selectedSymbols;
      let marketData: any[] = [];
      
      if (symbols.length === 0) {
        // Get all Futures pairs with data in one call
        const futuresData = await futuresAPI.getTopFuturesData(); // Get all futures pairs
        symbols = futuresData.symbols;
        marketData = futuresData.marketData;
        console.log(`Loaded ${symbols.length} Futures pairs`);
      } else {
        // If specific symbols selected, get their data
        marketData = await binanceAPI.getMarketData(symbols);
      }
      
      // Fetch all klines in parallel for much faster loading
      console.log('Fetching klines for all symbols in parallel...');
      const startTime = Date.now();
      
      // Get initial klines for current interval for all symbols at once
      const initialKlines = await futuresAPI.getInitialKlines(symbols, config.interval, 50);
      
      // Process all market data with their klines
      const cryptoDataResults: CryptoData[] = marketData.map((data) => {
        const klines = initialKlines.get(data.symbol) || [];
          
        // Initialize price history
        if (klines.length > 0) {
          setPriceHistory(prev => {
            const newMap = new Map(prev);
            newMap.set(data.symbol, klines);
            return newMap;
          });
        }

        const rsi = klines.length > config.rsiPeriod ? calculateRSI(klines, config.rsiPeriod) : 50;
        
        // Calculate RSI history for StochRSI
        const rsiHistoryValues: number[] = [];
        if (klines.length > config.rsiPeriod) {
          for (let i = config.rsiPeriod; i < klines.length; i++) {
            const periodPrices = klines.slice(i - config.rsiPeriod, i + 1);
            const periodRsi = calculateRSI(periodPrices, config.rsiPeriod);
            rsiHistoryValues.push(periodRsi);
          }
          rsiHistoryValues.push(rsi);
        }

        const stochRsi = rsiHistoryValues.length > config.stochRsiPeriod 
          ? calculateStochRSI(rsiHistoryValues, config.stochRsiPeriod)
          : { value: 0.5, k: 0.5, d: 0.5 };
          
        const isOverbought = rsi >= config.overboughtLevel;
        const isOversold = rsi <= config.oversoldLevel;
        const trend = determineTrend(rsi, data.priceChangePercent);
        
        // Calculate signal
        const signal = detectAdvancedSignal({
          ...data,
          rsi,
          stochRsi: stochRsi.value,
          stochRsiK: stochRsi.k,
          stochRsiD: stochRsi.d,
          priceChange24h: data.priceChangePercent,
        });

        return {
          ...data,
          id: data.symbol,
          rsi,
          priceChange24h: data.priceChangePercent,
          stochRsi: stochRsi.value,
          stochRsiK: stochRsi.k,
          stochRsiD: stochRsi.d,
          isOverbought,
          isOversold,
          reversalSignal: false,
          trend,
          signal,
          lastUpdate: Date.now(),
        } as CryptoData;
      });
      setCryptoData(cryptoDataResults);
      
      // Setup WebSocket subscriptions for real-time updates
      setupWebSocketSubscriptions(symbols);
      
      // Fetch multi-timeframe data progressively after initial load
      setTimeout(() => {
        fetchMultiTimeframeData(symbols);
      }, 1000);
      
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to fetch initial data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [selectedSymbols, config, binanceAPI, setCryptoData, setLoading, setError]);

  // Fetch multi-timeframe data in parallel for much faster loading
  const fetchMultiTimeframeData = useCallback(async (symbols: string[]) => {
    const timeframes = ['15m', '30m', '1h', '4h'];
    const futuresAPI = new BinanceFuturesAPI();
    
    try {
      // Fetch all klines data in parallel batches
      const allKlinesData = await futuresAPI.batchFetchKlines(symbols, timeframes, 50);
      
      // Process all the fetched data
      for (const [symbol, timeframeData] of allKlinesData.entries()) {
        // Update multi-timeframe price history
        setMultiTfPriceHistory(prev => {
          const newMap = new Map(prev);
          newMap.set(symbol, timeframeData);
          return newMap;
        });
        
        const updates: any = {};
        
        for (const [tf, klines] of timeframeData.entries()) {
          if (klines.length > 0) {
            // Calculate price change for this timeframe
            const firstPrice = klines[0];
            const lastPrice = klines[klines.length - 1];
            const priceChangePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
            
            const tfSuffix = tf === '15m' ? '15m' : tf === '30m' ? '30m' : tf === '1h' ? '1h' : '4h';
            
            updates[`priceChange${tfSuffix}`] = priceChangePercent;
            
            // Calculate RSI and StochRSI if we have enough data
            if (klines.length > config.rsiPeriod) {
              const rsiValue = calculateRSI(klines, config.rsiPeriod);
              
              // Calculate RSI history for StochRSI
              const rsiHistoryValues: number[] = [];
              for (let i = config.rsiPeriod; i < klines.length; i++) {
                const periodPrices = klines.slice(i - config.rsiPeriod, i + 1);
                const periodRsi = calculateRSI(periodPrices, config.rsiPeriod);
                rsiHistoryValues.push(periodRsi);
              }
              rsiHistoryValues.push(rsiValue);
              
              // Calculate StochRSI
              const stochRsiData = calculateStochRSI(rsiHistoryValues, config.stochRsiPeriod);
              
              updates[`rsi${tfSuffix}`] = rsiValue;
              updates[`stochRsi${tfSuffix}`] = stochRsiData.value;
              updates[`stochRsiK${tfSuffix}`] = stochRsiData.k;
              updates[`stochRsiD${tfSuffix}`] = stochRsiData.d;
            }
          }
        }
        
        // Update all timeframes for this symbol at once
        if (Object.keys(updates).length > 0) {
          // Get current item to recalculate signal with new data
          const currentItem = cryptoData.find(c => c.symbol === symbol);
          if (currentItem) {
            // Recalculate signal with new multi-timeframe data
            const updatedSignal = detectAdvancedSignal({
              ...currentItem,
              ...updates,
            });
            
            updateCryptoItem(symbol, {
              ...updates,
              signal: updatedSignal
            });
          } else {
            updateCryptoItem(symbol, updates);
          }
        }
      }
      
      console.log(`Fetched multi-timeframe data for ${symbols.length} symbols in parallel`);
    } catch (error) {
      console.error('Error fetching multi-timeframe data:', error);
    }
  }, [config.rsiPeriod, config.stochRsiPeriod, updateCryptoItem, cryptoData]);

  // Setup WebSocket subscriptions
  const setupWebSocketSubscriptions = useCallback((symbols: string[]) => {
    // Unsubscribe previous subscriptions
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    // Clear kline subscriptions
    klineUnsubscribesRef.current.forEach(unsub => unsub());
    klineUnsubscribesRef.current.clear();

    // Subscribe to ticker updates for all symbols
    const unsubscribeTickers = wsManager.subscribeMultipleTickers(symbols, (data) => {
      if (data.symbol) {
        const indicators = calculateIndicators(data, data.symbol);
        updateCryptoItem(data.symbol, indicators);
      }
    });

    // Subscribe to kline updates for RSI calculation (multiple timeframes)
    symbols.forEach(symbol => {
      // Subscribe to current interval
      const unsubscribeKline = wsManager.subscribeKline(symbol, config.interval, (klineData) => {
        // Update price history with kline close price
        setPriceHistory(prev => {
          const newMap = new Map(prev);
          const history = newMap.get(symbol) || [];
          const updatedHistory = [...history, klineData.close].slice(-100);
          newMap.set(symbol, updatedHistory);
          return newMap;
        });
      });
      
      klineUnsubscribesRef.current.set(`${symbol}_${config.interval}`, unsubscribeKline);
      
      // Subscribe to multiple timeframes for RSI and price change calculation
      const timeframes = ['15m', '30m', '1h', '4h'];
      timeframes.forEach(tf => {
        const unsubscribeTf = wsManager.subscribeKline(symbol, tf, (klineData) => {
          // Update multi-timeframe price history
          setMultiTfPriceHistory(prev => {
            const newMap = new Map(prev);
            const symbolTfMap = newMap.get(symbol) || new Map();
            const history = symbolTfMap.get(tf) || [];
            const updatedHistory = [...history, klineData.close].slice(-100);
            symbolTfMap.set(tf, updatedHistory);
            newMap.set(symbol, symbolTfMap);
            return newMap;
          });
          
          // Calculate price change percentage from open to current close
          const openPrice = klineData.open;
          const closePrice = klineData.close;
          const priceChangePercent = ((closePrice - openPrice) / openPrice) * 100;
          
          // Update price change data
          setPriceChangeData(prev => {
            const newMap = new Map(prev);
            const symbolData = newMap.get(symbol) || {};
            symbolData[tf] = priceChangePercent;
            newMap.set(symbol, symbolData);
            return newMap;
          });
          
          // Calculate and update RSI and StochRSI for this timeframe
          const symbolTfMap = multiTfPriceHistory.get(symbol);
          if (symbolTfMap) {
            const history = symbolTfMap.get(tf);
            if (history && history.length > config.rsiPeriod) {
              const rsiValue = calculateRSI(history, config.rsiPeriod);
              
              // Calculate RSI history for StochRSI
              const rsiHistoryValues: number[] = [];
              for (let i = config.rsiPeriod; i < history.length; i++) {
                const periodPrices = history.slice(i - config.rsiPeriod, i + 1);
                const periodRsi = calculateRSI(periodPrices, config.rsiPeriod);
                rsiHistoryValues.push(periodRsi);
              }
              rsiHistoryValues.push(rsiValue);
              
              // Calculate StochRSI
              const stochRsiData = calculateStochRSI(rsiHistoryValues, config.stochRsiPeriod);
              
              // Get price change for this timeframe
              const changeData = priceChangeData.get(symbol);
              const priceChangeKey = `priceChange${tf === '15m' ? '15m' : tf === '30m' ? '30m' : tf === '1h' ? '1h' : '4h'}`;
              const tfSuffix = tf === '15m' ? '15m' : tf === '30m' ? '30m' : tf === '1h' ? '1h' : '4h';
              
              // Update the specific timeframe RSI, StochRSI and price change
              updateCryptoItem(symbol, {
                [`rsi${tfSuffix}`]: rsiValue,
                [`stochRsi${tfSuffix}`]: stochRsiData.value,
                [`stochRsiK${tfSuffix}`]: stochRsiData.k,
                [`stochRsiD${tfSuffix}`]: stochRsiData.d,
                [priceChangeKey]: priceChangePercent
              });
            }
          }
        });
        
        klineUnsubscribesRef.current.set(`${symbol}_${tf}`, unsubscribeTf);
      });
    });

    unsubscribeRef.current = unsubscribeTickers;
    setIsConnected(true);
  }, [wsManager, config.interval, calculateIndicators, updateCryptoItem]);

  // Check WebSocket connection status
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(wsManager.isConnectionActive());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, [wsManager]);

  // Initial data fetch on mount
  useEffect(() => {
    fetchInitialData();
    
    return () => {
      // Cleanup WebSocket subscriptions
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      klineUnsubscribesRef.current.forEach(unsub => unsub());
    };
  }, []); // Only run once on mount

  // Re-fetch when symbols or interval changes
  useEffect(() => {
    if (cryptoData.length > 0) {
      const symbols = selectedSymbols.length > 0 ? selectedSymbols : cryptoData.map(d => d.symbol);
      setupWebSocketSubscriptions(symbols);
    }
  }, [selectedSymbols, config.interval]);

  // Re-calculate indicators when RSI/Stoch settings change
  useEffect(() => {
    if (cryptoData.length > 0) {
      // Recalculate all indicators with new settings
      const updatedData = cryptoData.map(item => {
        const history = priceHistory.get(item.symbol) || [];
        if (history.length === 0) return item;
        
        const rsi = calculateRSI(history, config.rsiPeriod);
        const rsiHist = rsiHistory.get(item.symbol) || [rsi];
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
        const trend = determineTrend(rsi, item.priceChangePercent);
        
        return {
          ...item,
          rsi,
          stochRsi: stochRsi.value,
          stochRsiK: stochRsi.k,
          stochRsiD: stochRsi.d,
          isOverbought,
          isOversold,
          reversalSignal,
          trend,
        };
      });
      
      setCryptoData(updatedData);
    }
  }, [config.rsiPeriod, config.stochRsiPeriod, config.overboughtLevel, config.oversoldLevel]);

  const handleRefresh = () => {
    fetchInitialData();
  };

  const filteredData = React.useMemo(() => {
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
        // Sort by status priority: Overbought > Oversold > Neutral
        const aStatus = a.isOverbought ? 3 : a.isOversold ? 2 : 1;
        const bStatus = b.isOverbought ? 3 : b.isOversold ? 2 : 1;
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

  const stats = React.useMemo(() => {
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
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Settings, Filter, RefreshCw, Activity } from 'lucide-react';
import { ConfigSettings, FilterConfig } from '@/lib/types';
import { useStore } from '@/lib/store';

interface ConfigPanelProps {
  config: ConfigSettings;
  filter: FilterConfig;
  selectedSymbols: string[];
  onConfigChange: (config: Partial<ConfigSettings>) => void;
  onFilterChange: (filter: Partial<FilterConfig>) => void;
  onSymbolRemove: (symbol: string) => void;
  onRefresh: () => void;
}

export function ConfigPanel({
  config,
  filter,
  selectedSymbols,
  onConfigChange,
  onFilterChange,
  onSymbolRemove,
  onRefresh,
}: ConfigPanelProps) {
  // Local state for indicator settings
  const [localConfig, setLocalConfig] = useState({
    rsiPeriod: config.rsiPeriod,
    stochRsiPeriod: config.stochRsiPeriod,
    overboughtLevel: config.overboughtLevel,
    oversoldLevel: config.oversoldLevel,
    interval: config.interval,
  });

  // Check if settings have changed
  const hasChanges = 
    localConfig.rsiPeriod !== config.rsiPeriod ||
    localConfig.stochRsiPeriod !== config.stochRsiPeriod ||
    localConfig.overboughtLevel !== config.overboughtLevel ||
    localConfig.oversoldLevel !== config.oversoldLevel ||
    localConfig.interval !== config.interval;

  const intervals = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '2h', label: '2 Hours' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ];

  const refreshIntervals = [
    { value: '5000', label: '5 seconds' },
    { value: '10000', label: '10 seconds' },
    { value: '30000', label: '30 seconds' },
    { value: '60000', label: '1 minute' },
    { value: '120000', label: '2 minutes' },
    { value: '300000', label: '5 minutes' },
  ];

  const handleApplySettings = () => {
    onConfigChange({
      rsiPeriod: localConfig.rsiPeriod,
      stochRsiPeriod: localConfig.stochRsiPeriod,
      overboughtLevel: localConfig.overboughtLevel,
      oversoldLevel: localConfig.oversoldLevel,
      interval: localConfig.interval,
    });
  };

  const handleResetSettings = () => {
    setLocalConfig({
      rsiPeriod: config.rsiPeriod,
      stochRsiPeriod: config.stochRsiPeriod,
      overboughtLevel: config.overboughtLevel,
      oversoldLevel: config.oversoldLevel,
      interval: config.interval,
    });
  };

  // Update local state when global config changes
  useEffect(() => {
    setLocalConfig({
      rsiPeriod: config.rsiPeriod,
      stochRsiPeriod: config.stochRsiPeriod,
      overboughtLevel: config.overboughtLevel,
      oversoldLevel: config.oversoldLevel,
      interval: config.interval,
    });
  }, [config.rsiPeriod, config.stochRsiPeriod, config.overboughtLevel, config.oversoldLevel, config.interval]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const cryptoData = useStore.getState().cryptoData;
    const overbought = cryptoData.filter((item) => item.isOverbought).length;
    const oversold = cryptoData.filter((item) => item.isOversold).length;
    const reversals = cryptoData.filter((item) => item.reversalSignal).length;
    const bullish = cryptoData.filter((item) => item.trend === 'bullish').length;
    const bearish = cryptoData.filter((item) => item.trend === 'bearish').length;
    
    return { overbought, oversold, reversals, bullish, bearish };
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Market Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overbought</span>
                <span className="text-sm font-bold text-red-500">{stats.overbought}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Oversold</span>
                <span className="text-sm font-bold text-green-500">{stats.oversold}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reversals</span>
                <span className="text-sm font-bold text-yellow-500">{stats.reversals}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bullish</span>
                <span className="text-sm font-bold text-green-500">{stats.bullish}↑</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bearish</span>
                <span className="text-sm font-bold text-red-500">{stats.bearish}↓</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Indicator Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rsi-period">RSI Period</Label>
              <Input
                id="rsi-period"
                type="number"
                value={localConfig.rsiPeriod}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, rsiPeriod: parseInt(e.target.value) || 7 })
                }
                min="2"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stoch-period">Stoch RSI Period</Label>
              <Input
                id="stoch-period"
                type="number"
                value={localConfig.stochRsiPeriod}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, stochRsiPeriod: parseInt(e.target.value) || 7 })
                }
                min="2"
                max="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overbought">Overbought Level</Label>
              <Input
                id="overbought"
                type="number"
                value={localConfig.overboughtLevel}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, overboughtLevel: parseInt(e.target.value) || 70 })
                }
                min="50"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oversold">Oversold Level</Label>
              <Input
                id="oversold"
                type="number"
                value={localConfig.oversoldLevel}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, oversoldLevel: parseInt(e.target.value) || 30 })
                }
                min="0"
                max="50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interval">Time Interval</Label>
              <Select
                value={localConfig.interval}
                onValueChange={(value) => setLocalConfig({ ...localConfig, interval: value })}
              >
                <SelectTrigger id="interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intervals.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refresh">Refresh Interval</Label>
              <Select
                value={config.refreshInterval.toString()}
                onValueChange={(value) => onConfigChange({ refreshInterval: parseInt(value) })}
              >
                <SelectTrigger id="refresh">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {refreshIntervals.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Apply/Reset buttons for indicator settings */}
          <div className="flex gap-2">
            <Button 
              onClick={handleApplySettings} 
              className="flex-1"
              disabled={!hasChanges}
              variant={hasChanges ? "default" : "secondary"}
            >
              Apply Settings
            </Button>
            <Button 
              onClick={handleResetSettings}
              variant="outline"
              disabled={!hasChanges}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-overbought">Show Overbought Only</Label>
              <Switch
                id="show-overbought"
                checked={filter.showOverbought}
                onCheckedChange={(checked) =>
                  onFilterChange({ showOverbought: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-oversold">Show Oversold Only</Label>
              <Switch
                id="show-oversold"
                checked={filter.showOversold}
                onCheckedChange={(checked) =>
                  onFilterChange({ showOversold: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-reversals">Show Reversals Only</Label>
              <Switch
                id="show-reversals"
                checked={filter.showReversals}
                onCheckedChange={(checked) =>
                  onFilterChange({ showReversals: checked })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-volume">Min Volume (USD)</Label>
            <Input
              id="min-volume"
              type="number"
              value={filter.minVolume}
              onChange={(e) =>
                onFilterChange({ minVolume: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="100000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-change">Min Price Change (%)</Label>
            <Input
              id="min-change"
              type="number"
              value={filter.minPriceChange}
              onChange={(e) =>
                onFilterChange({ minPriceChange: parseFloat(e.target.value) || -100 })
              }
              step="0.1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="search">Search Symbol</Label>
            <Input
              id="search"
              type="text"
              placeholder="BTC, ETH..."
              value={filter.searchTerm}
              onChange={(e) =>
                onFilterChange({ searchTerm: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Selected Symbols</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <div className="flex flex-wrap gap-2">
            {selectedSymbols.map((symbol) => (
              <Badge
                key={symbol}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {symbol.replace('USDT', '')}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => onSymbolRemove(symbol)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          {selectedSymbols.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No symbols selected. Top volume pairs will be shown.
            </p>
          )}
        </CardContent>
      </Card>

      <Button 
        onClick={onRefresh} 
        className="w-full"
        variant="outline"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Data
      </Button>
    </div>
  );
}
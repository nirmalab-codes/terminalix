'use client';

import React from 'react';
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
import { X, Settings, Filter } from 'lucide-react';
import { ConfigSettings, FilterConfig } from '@/lib/types';

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
  const intervals = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Indicator Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rsi-period">RSI Period</Label>
              <Input
                id="rsi-period"
                type="number"
                value={config.rsiPeriod}
                onChange={(e) =>
                  onConfigChange({ rsiPeriod: parseInt(e.target.value) })
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
                value={config.stochRsiPeriod}
                onChange={(e) =>
                  onConfigChange({ stochRsiPeriod: parseInt(e.target.value) })
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
                value={config.overboughtLevel}
                onChange={(e) =>
                  onConfigChange({ overboughtLevel: parseInt(e.target.value) })
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
                value={config.oversoldLevel}
                onChange={(e) =>
                  onConfigChange({ oversoldLevel: parseInt(e.target.value) })
                }
                min="0"
                max="50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Time Interval</Label>
            <Select
              value={config.interval}
              onValueChange={(value) => onConfigChange({ interval: value })}
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
            <Label htmlFor="refresh">Refresh Interval (ms)</Label>
            <Input
              id="refresh"
              type="number"
              value={config.refreshInterval}
              onChange={(e) =>
                onConfigChange({ refreshInterval: parseInt(e.target.value) })
              }
              min="1000"
              step="1000"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                onFilterChange({ minVolume: parseFloat(e.target.value) })
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
                onFilterChange({ minPriceChange: parseFloat(e.target.value) })
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
        <CardHeader>
          <CardTitle>Selected Symbols</CardTitle>
        </CardHeader>
        <CardContent>
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

      <Button onClick={onRefresh} className="w-full">
        Refresh Data
      </Button>
    </div>
  );
}
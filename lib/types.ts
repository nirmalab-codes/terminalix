export interface MarketData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: number;
}

export interface RSIData {
  symbol: string;
  rsi: number;
  stochRsi: number;
  stochRsiK: number;
  stochRsiD: number;
  isOverbought: boolean;
  isOversold: boolean;
  trend: 'bullish' | 'bearish' | 'neutral';
  reversalSignal: boolean;
}

export interface CryptoData extends MarketData, RSIData {
  id: string;
  lastUpdate: number;
}

export interface ConfigSettings {
  rsiPeriod: number;
  stochRsiPeriod: number;
  overboughtLevel: number;
  oversoldLevel: number;
  interval: string;
  symbols: string[];
  refreshInterval: number;
  volumeThreshold: number;
}

export interface FilterConfig {
  showOverbought: boolean;
  showOversold: boolean;
  showReversals: boolean;
  minVolume: number;
  minPriceChange: number;
  searchTerm: string;
}

export interface SortConfig {
  field: keyof CryptoData;
  direction: 'asc' | 'desc';
}
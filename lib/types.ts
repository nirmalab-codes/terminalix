export interface MarketData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  priceChange15m?: number;
  priceChange30m?: number;
  priceChange1h?: number;
  priceChange4h?: number;
  priceChange24h?: number;
  priceChange1w?: number;
  volume: number;
  quoteVolume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: number;
}

export interface SignalData {
  type: 'LONG' | 'SHORT' | 'NEUTRAL';
  strength: 'STRONG' | 'MEDIUM' | 'WEAK';
  timeframe: 'SHORT' | 'MID' | 'LONG'; // Short-term, Mid-term, Long-term
  reason: string;
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
  signal?: SignalData;
  // Multi-timeframe RSI data
  rsi15m?: number;
  rsi30m?: number;
  rsi1h?: number;
  rsi4h?: number;
  rsi1w?: number;
  // Multi-timeframe StochRSI data
  stochRsi15m?: number;
  stochRsi30m?: number;
  stochRsi1h?: number;
  stochRsi4h?: number;
  stochRsi1w?: number;
  stochRsiK15m?: number;
  stochRsiK30m?: number;
  stochRsiK1h?: number;
  stochRsiK4h?: number;
  stochRsiK1w?: number;
  stochRsiD15m?: number;
  stochRsiD30m?: number;
  stochRsiD1h?: number;
  stochRsiD4h?: number;
  stochRsiD1w?: number;
}

export interface CryptoData extends MarketData, RSIData {
  id: string;
  lastUpdate: number;
  scalpingSignal?: {
    type: 'LONG' | 'SHORT' | 'NEUTRAL';
    strength: 'STRONG' | 'MEDIUM' | 'WEAK';
    strategy: string;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3?: number;
    riskRewardRatio: number;
    confidence: number;
    reason: string;
  };
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
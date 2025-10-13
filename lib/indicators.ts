import { RSI, StochasticRSI, SMA } from 'trading-signals';

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50;
  }

  const rsi = new RSI(period);
  for (const price of prices) {
    rsi.update(price, false);
  }

  const result = rsi.getResult();
  return result ? Number(result) : 50;
}

export function calculateStochRSI(
  prices: number[],
  stochPeriod: number = 14,
  kPeriod: number = 3,
  dPeriod: number = 3
): { k: number; d: number; value: number } {
  // Need enough data for StochRSI calculation (RSI uses 14 periods by default)
  if (prices.length < 14 + stochPeriod) {
    return { k: 50, d: 50, value: 50 };
  }

  // StochasticRSI from trading-signals expects raw prices
  // It calculates RSI internally (using 14 periods), then applies stochastic formula
  // Constructor: (stochRSI interval, optional SmoothingRSI type, optional k/d smoothing)
  const stochRsi = new StochasticRSI(
    stochPeriod,     // StochRSI lookback period (default: 14)
    SMA,             // Smoothing indicator for internal RSI calculation
    {
      k: new SMA(kPeriod),  // %K smoothing (default: 3)
      d: new SMA(dPeriod),  // %D smoothing (default: 3)
    }
  );

  // Feed prices in chronological order (oldest to newest)
  for (const price of prices) {
    stochRsi.update(price, false);
  }

  const result = stochRsi.getResult();

  // StochRSI returns values in 0-1 range, convert to 0-100
  const stochRsiValue = result ? Number(result) * 100 : 50;

  // Get K and D from the smoothing averages (convert 0-1 to 0-100 range)
  const k = stochRsi.smoothing?.k?.getResult() ? Number(stochRsi.smoothing.k.getResult()) * 100 : 50;
  const d = stochRsi.smoothing?.d?.getResult() ? Number(stochRsi.smoothing.d.getResult()) * 100 : 50;

  return { k, d, value: stochRsiValue };
}

export function detectReversal(
  rsi: number,
  previousRsi: number,
  stochRsi: number,
  previousStochRsi: number,
  overbought: number = 70,
  oversold: number = 30
): boolean {
  // RSI reversal signals
  const rsiCrossingOversold = previousRsi <= oversold && rsi > oversold;
  const rsiCrossingOverbought = previousRsi >= overbought && rsi < overbought;
  
  // Stoch RSI reversal signals (stochRsi is in 0-1 range, so 0.2 = 20%, 0.8 = 80%)
  const stochRsiCrossingOversold = previousStochRsi <= 0.2 && stochRsi > 0.2;
  const stochRsiCrossingOverbought = previousStochRsi >= 0.8 && stochRsi < 0.8;
  
  // Additional reversal patterns
  const rsiDivergence = (rsi <= oversold && stochRsi > 0.2) || (rsi >= overbought && stochRsi < 0.8);

  return (
    rsiCrossingOversold ||
    rsiCrossingOverbought ||
    stochRsiCrossingOversold ||
    stochRsiCrossingOverbought ||
    rsiDivergence
  );
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0];

  const multiplier = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

export function determineTrend(
  rsi: number,
  priceChange: number
): 'bullish' | 'bearish' | 'neutral' {
  if (rsi > 50 && priceChange > 0) return 'bullish';
  if (rsi < 50 && priceChange < 0) return 'bearish';
  return 'neutral';
}
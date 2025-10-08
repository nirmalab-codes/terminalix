import { RSI, StochasticRSI, SMA } from 'trading-signals';

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50;
  }

  const rsi = new RSI(period);
  for (const price of prices) {
    rsi.update(price);
  }

  const result = rsi.getResult();
  return result ? Number(result) : 50;
}

export function calculateStochRSI(
  prices: number[],
  period: number = 14,
  kPeriod: number = 3,
  dPeriod: number = 3
): { k: number; d: number; value: number } {
  if (prices.length < period + 5) {
    return { k: 50, d: 50, value: 0.5 };
  }

  // StochasticRSI constructor: (interval, SmoothingRSI?, smoothing?)
  const stochRsi = new StochasticRSI(
    period,
    SMA, // Pass the class type, not instance
    {
      k: new SMA(kPeriod),
      d: new SMA(dPeriod),
    }
  );

  for (const price of prices) {
    stochRsi.update(price);
  }

  const result = stochRsi.getResult();
  const stochRsiValue = result ? Number(result) / 100 : 0.5; // Convert to 0-1 range

  // Get K and D from the smoothing averages
  const k = stochRsi.smoothing.k.getResult() ? Number(stochRsi.smoothing.k.getResult()) : 50;
  const d = stochRsi.smoothing.d.getResult() ? Number(stochRsi.smoothing.d.getResult()) : 50;

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
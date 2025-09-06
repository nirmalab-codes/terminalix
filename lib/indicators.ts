export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50;
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    if (changes[i] > 0) {
      avgGain = (avgGain * (period - 1) + changes[i]) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(changes[i])) / period;
    }
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

export function calculateStochRSI(
  rsiValues: number[],
  period: number = 14,
  kPeriod: number = 3,
  dPeriod: number = 3
): { k: number; d: number; value: number } {
  if (rsiValues.length < period) {
    return { k: 50, d: 50, value: 0.5 }; // Return K and D as 0-100, value as 0-1
  }

  // Calculate StochRSI values for the recent period
  const stochRsiValues: number[] = [];
  
  for (let i = period - 1; i < rsiValues.length; i++) {
    const periodRSI = rsiValues.slice(i - period + 1, i + 1);
    const currentRSI = rsiValues[i];
    const minRSI = Math.min(...periodRSI);
    const maxRSI = Math.max(...periodRSI);
    
    if (maxRSI === minRSI) {
      stochRsiValues.push(50); // Middle value when no range
    } else {
      // StochRSI formula: ((RSI - RSI Low) / (RSI High - RSI Low)) * 100
      const stochRSI = ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
      stochRsiValues.push(stochRSI);
    }
  }

  // Calculate %K (SMA of StochRSI)
  let k = stochRsiValues[stochRsiValues.length - 1];
  if (stochRsiValues.length >= kPeriod) {
    const kValues = stochRsiValues.slice(-kPeriod);
    k = kValues.reduce((sum, val) => sum + val, 0) / kPeriod;
  }

  // Calculate %D (SMA of %K)
  let d = k;
  if (stochRsiValues.length >= kPeriod + dPeriod - 1) {
    const dValues: number[] = [];
    for (let i = 0; i < dPeriod; i++) {
      const idx = stochRsiValues.length - dPeriod + i;
      if (idx >= kPeriod - 1) {
        const kVals = stochRsiValues.slice(idx - kPeriod + 1, idx + 1);
        dValues.push(kVals.reduce((sum, val) => sum + val, 0) / kPeriod);
      }
    }
    if (dValues.length > 0) {
      d = dValues.reduce((sum, val) => sum + val, 0) / dValues.length;
    }
  }

  // Return k and d as 0-100 range, value as 0-1 for compatibility
  return { k, d, value: k / 100 };
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
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
  period: number = 14
): { k: number; d: number; value: number } {
  if (rsiValues.length < period) {
    return { k: 0.5, d: 0.5, value: 0.5 }; // Return as 0-1 range
  }

  const recentRSI = rsiValues.slice(-period);
  const currentRSI = rsiValues[rsiValues.length - 1];
  const minRSI = Math.min(...recentRSI);
  const maxRSI = Math.max(...recentRSI);

  if (maxRSI === minRSI) {
    return { k: 0.5, d: 0.5, value: 0.5 }; // Return as 0-1 range
  }

  const stochRSI = (currentRSI - minRSI) / (maxRSI - minRSI); // Keep as 0-1 range

  const kPeriod = 3;

  let k = stochRSI;
  const d = stochRSI;

  if (rsiValues.length >= period + kPeriod) {
    const kValues: number[] = [];
    for (let i = 0; i < kPeriod; i++) {
      const idx = rsiValues.length - kPeriod + i;
      const rsi = rsiValues[idx];
      const periodRSI = rsiValues.slice(idx - period + 1, idx + 1);
      const min = Math.min(...periodRSI);
      const max = Math.max(...periodRSI);
      if (max !== min) {
        kValues.push((rsi - min) / (max - min)); // Keep as 0-1 range
      }
    }
    k = kValues.length > 0 ? kValues.reduce((a, b) => a + b, 0) / kValues.length : stochRSI;
  }

  return { k, d, value: stochRSI };
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
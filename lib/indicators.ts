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
    return { k: 50, d: 50, value: 50 };
  }

  const recentRSI = rsiValues.slice(-period);
  const currentRSI = rsiValues[rsiValues.length - 1];
  const minRSI = Math.min(...recentRSI);
  const maxRSI = Math.max(...recentRSI);

  if (maxRSI === minRSI) {
    return { k: 50, d: 50, value: 50 };
  }

  const stochRSI = ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;

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
        kValues.push(((rsi - min) / (max - min)) * 100);
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
  const rsiCrossingOversold = previousRsi <= oversold && rsi > oversold;
  const rsiCrossingOverbought = previousRsi >= overbought && rsi < overbought;
  
  const stochRsiCrossingOversold = previousStochRsi <= 20 && stochRsi > 20;
  const stochRsiCrossingOverbought = previousStochRsi >= 80 && stochRsi < 80;

  return (
    rsiCrossingOversold ||
    rsiCrossingOverbought ||
    stochRsiCrossingOversold ||
    stochRsiCrossingOverbought
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
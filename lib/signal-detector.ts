import { SignalData, CryptoData } from './types';

export function detectAdvancedSignal(data: Partial<CryptoData>): SignalData {
  const {
    rsi = 50,
    stochRsi = 50,
    stochRsiK = 50,
    stochRsiD = 50,
    rsi15m,
    rsi30m,
    rsi1h,
    rsi4h,
    stochRsi15m,
    stochRsi30m,
    stochRsi1h,
    stochRsi4h,
    priceChangePercent = 0,
    priceChange15m,
    priceChange1h,
    priceChange4h,
  } = data;

  // Calculate signal scores for different timeframes
  let shortTermScore = 0; // 15m-30m
  let midTermScore = 0;   // 1h-4h
  let longTermScore = 0;  // 4h+

  // Short-term analysis (15m-30m)
  if (rsi15m !== undefined) {
    if (rsi15m < 30) shortTermScore += 2; // Oversold
    else if (rsi15m < 40) shortTermScore += 1;
    else if (rsi15m > 70) shortTermScore -= 2; // Overbought
    else if (rsi15m > 60) shortTermScore -= 1;
  }

  if (rsi30m !== undefined) {
    if (rsi30m < 30) shortTermScore += 2;
    else if (rsi30m < 40) shortTermScore += 1;
    else if (rsi30m > 70) shortTermScore -= 2;
    else if (rsi30m > 60) shortTermScore -= 1;
  }

  if (stochRsi15m !== undefined) {
    if (stochRsi15m < 20) shortTermScore += 2;
    else if (stochRsi15m < 30) shortTermScore += 1;
    else if (stochRsi15m > 80) shortTermScore -= 2;
    else if (stochRsi15m > 70) shortTermScore -= 1;
  }

  // Mid-term analysis (1h-4h)
  if (rsi1h !== undefined) {
    if (rsi1h < 30) midTermScore += 3;
    else if (rsi1h < 40) midTermScore += 1.5;
    else if (rsi1h > 70) midTermScore -= 3;
    else if (rsi1h > 60) midTermScore -= 1.5;
  }

  if (rsi4h !== undefined) {
    if (rsi4h < 30) midTermScore += 3;
    else if (rsi4h < 40) midTermScore += 1.5;
    else if (rsi4h > 70) midTermScore -= 3;
    else if (rsi4h > 60) midTermScore -= 1.5;
  }

  if (stochRsi1h !== undefined) {
    if (stochRsi1h < 20) midTermScore += 2;
    else if (stochRsi1h < 30) midTermScore += 1;
    else if (stochRsi1h > 80) midTermScore -= 2;
    else if (stochRsi1h > 70) midTermScore -= 1;
  }

  // Long-term analysis (current + 4h)
  if (rsi < 30) longTermScore += 4;
  else if (rsi < 40) longTermScore += 2;
  else if (rsi > 70) longTermScore -= 4;
  else if (rsi > 60) longTermScore -= 2;

  if (stochRsi < 20) longTermScore += 3;
  else if (stochRsi < 30) longTermScore += 1.5;
  else if (stochRsi > 80) longTermScore -= 3;
  else if (stochRsi > 70) longTermScore -= 1.5;

  // StochRSI K/D crossover detection
  const kdDiff = stochRsiK - stochRsiD;
  if (Math.abs(kdDiff) < 5) {
    // Potential crossover (within 5 points)
    if (stochRsi < 30 && kdDiff > 0) {
      shortTermScore += 2; // Bullish crossover in oversold
    } else if (stochRsi > 70 && kdDiff < 0) {
      shortTermScore -= 2; // Bearish crossover in overbought
    }
  }

  // Price momentum analysis
  if (priceChange15m !== undefined) {
    if (priceChange15m > 2) shortTermScore += 1;
    else if (priceChange15m < -2) shortTermScore -= 1;
  }

  if (priceChange1h !== undefined) {
    if (priceChange1h > 3) midTermScore += 1;
    else if (priceChange1h < -3) midTermScore -= 1;
  }

  if (priceChange4h !== undefined) {
    if (priceChange4h > 5) longTermScore += 1;
    else if (priceChange4h < -5) longTermScore -= 1;
  }

  // Determine primary signal based on combined scores
  const totalScore = shortTermScore + midTermScore + longTermScore;
  const avgShortScore = shortTermScore / 4;
  const avgMidScore = midTermScore / 4;
  const avgLongScore = longTermScore / 4;

  let signalType: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
  let timeframe: 'SHORT' | 'MID' | 'LONG' = 'SHORT';
  let strength: 'STRONG' | 'MEDIUM' | 'WEAK' = 'WEAK';
  let reason = '';

  // Determine signal type and timeframe
  if (totalScore >= 6) {
    signalType = 'LONG';
    strength = 'STRONG';
  } else if (totalScore >= 3) {
    signalType = 'LONG';
    strength = 'MEDIUM';
  } else if (totalScore >= 1) {
    signalType = 'LONG';
    strength = 'WEAK';
  } else if (totalScore <= -6) {
    signalType = 'SHORT';
    strength = 'STRONG';
  } else if (totalScore <= -3) {
    signalType = 'SHORT';
    strength = 'MEDIUM';
  } else if (totalScore <= -1) {
    signalType = 'SHORT';
    strength = 'WEAK';
  }

  // Determine timeframe based on which score contributed most
  if (Math.abs(avgLongScore) >= Math.abs(avgMidScore) && Math.abs(avgLongScore) >= Math.abs(avgShortScore)) {
    timeframe = 'LONG';
  } else if (Math.abs(avgMidScore) >= Math.abs(avgShortScore)) {
    timeframe = 'MID';
  } else {
    timeframe = 'SHORT';
  }

  // Generate reason based on conditions
  const reasons: string[] = [];
  
  if (signalType === 'LONG') {
    if (rsi < 30) reasons.push('RSI oversold');
    if (stochRsi < 20) reasons.push('StochRSI oversold');
    if (kdDiff > 0 && stochRsi < 30) reasons.push('Bullish crossover');
    if (rsi4h && rsi4h < 40) reasons.push('4H oversold');
    reason = reasons.length > 0 ? reasons.join(', ') : 'Technical buy signal';
  } else if (signalType === 'SHORT') {
    if (rsi > 70) reasons.push('RSI overbought');
    if (stochRsi > 80) reasons.push('StochRSI overbought');
    if (kdDiff < 0 && stochRsi > 70) reasons.push('Bearish crossover');
    if (rsi4h && rsi4h > 60) reasons.push('4H overbought');
    reason = reasons.length > 0 ? reasons.join(', ') : 'Technical sell signal';
  } else {
    reason = 'No clear signal';
  }

  return {
    type: signalType,
    strength,
    timeframe,
    reason
  };
}

// Helper function to get signal color (with overload support)
export function getSignalColor(typeOrSignal: 'LONG' | 'SHORT' | 'NEUTRAL' | SignalData | undefined, strength?: 'STRONG' | 'MEDIUM' | 'WEAK'): string {
  let type: 'LONG' | 'SHORT' | 'NEUTRAL';
  let str: 'STRONG' | 'MEDIUM' | 'WEAK' | undefined;
  
  if (typeof typeOrSignal === 'object' && typeOrSignal) {
    type = typeOrSignal.type;
    str = typeOrSignal.strength;
  } else if (typeof typeOrSignal === 'string') {
    type = typeOrSignal;
    str = strength;
  } else {
    return 'text-zinc-400';
  }
  
  if (type === 'LONG') {
    switch (str) {
      case 'STRONG': return 'text-green-500';
      case 'MEDIUM': return 'text-green-400';
      case 'WEAK': return 'text-green-300';
      default: return 'text-green-500';
    }
  } else if (type === 'SHORT') {
    switch (str) {
      case 'STRONG': return 'text-red-500';
      case 'MEDIUM': return 'text-red-400';
      case 'WEAK': return 'text-red-300';
      default: return 'text-red-500';
    }
  }
  
  return 'text-zinc-400';
}

// Helper function to get signal background (with overload support)
export function getSignalBg(typeOrSignal: 'LONG' | 'SHORT' | 'NEUTRAL' | SignalData | undefined, strength?: 'STRONG' | 'MEDIUM' | 'WEAK'): string {
  let type: 'LONG' | 'SHORT' | 'NEUTRAL';
  let str: 'STRONG' | 'MEDIUM' | 'WEAK' | undefined;
  
  if (typeof typeOrSignal === 'object' && typeOrSignal) {
    type = typeOrSignal.type;
    str = typeOrSignal.strength;
  } else if (typeof typeOrSignal === 'string') {
    type = typeOrSignal;
    str = strength;
  } else {
    return '';
  }
  
  if (type === 'LONG') {
    switch (str) {
      case 'STRONG': return 'bg-green-500/20';
      case 'MEDIUM': return 'bg-green-500/10';
      case 'WEAK': return 'bg-green-500/5';
      default: return 'bg-green-500/10';
    }
  } else if (type === 'SHORT') {
    switch (str) {
      case 'STRONG': return 'bg-red-500/20';
      case 'MEDIUM': return 'bg-red-500/10';
      case 'WEAK': return 'bg-red-500/5';
      default: return 'bg-red-500/10';
    }
  }
  
  return '';
}

// Get signal icon as JSX element
export function getSignalIcon(type: 'LONG' | 'SHORT' | 'NEUTRAL', size: number = 12): React.ReactElement | null {
  const React = require('react');
  const { TrendingUp, TrendingDown } = require('lucide-react');
  
  if (type === 'LONG') {
    return React.createElement(TrendingUp, { className: `w-${size/4} h-${size/4}` });
  } else if (type === 'SHORT') {
    return React.createElement(TrendingDown, { className: `w-${size/4} h-${size/4}` });
  }
  
  return null;
}

// Get timeframe label
export function getTimeframeLabel(timeframe: 'SHORT' | 'MID' | 'LONG'): string {
  switch (timeframe) {
    case 'SHORT': return 'ST'; // Short-term
    case 'MID': return 'MT';   // Mid-term
    case 'LONG': return 'LT';  // Long-term
    default: return '';
  }
}
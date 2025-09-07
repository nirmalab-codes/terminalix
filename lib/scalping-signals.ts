import { CryptoData } from './types';

// Enhanced signal data with SMC concepts
export interface ScalpingSignal {
  type: 'LONG' | 'SHORT' | 'NEUTRAL';
  strength: 'STRONG' | 'MEDIUM' | 'WEAK';
  strategy: 'FVG' | 'ORDER_BLOCK' | 'SUPPLY_DEMAND' | 'LIQUIDITY_SWEEP' | 'BREAK_RETEST' | 'REVERSAL' | 'MOMENTUM';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3?: number;
  riskRewardRatio: number;
  confidence: number; // 0-100%
  reason: string;
  indicators: {
    rsi: number;
    stochRsi: number;
    volume: number;
    priceAction: string;
  };
  timeframe: string;
  invalidation: string; // What invalidates this signal
}

// Market structure levels
export interface MarketStructure {
  orderBlocks: OrderBlock[];
  fvgZones: FVGZone[];
  supplyDemandZones: SupplyDemandZone[];
  liquidityPools: LiquidityPool[];
  pivotPoints: PivotPoint[];
}

export interface OrderBlock {
  type: 'BULLISH' | 'BEARISH';
  high: number;
  low: number;
  volume: number;
  timestamp: number;
  strength: 'STRONG' | 'MEDIUM' | 'WEAK';
}

export interface FVGZone {
  type: 'BULLISH' | 'BEARISH';
  high: number;
  low: number;
  mid: number;
  timestamp: number;
  filled: boolean;
}

export interface SupplyDemandZone {
  type: 'SUPPLY' | 'DEMAND';
  high: number;
  low: number;
  strength: number; // 1-10
  touches: number; // How many times tested
  timestamp: number;
}

export interface LiquidityPool {
  level: number;
  type: 'BUY_STOPS' | 'SELL_STOPS';
  strength: number;
}

export interface PivotPoint {
  type: 'HIGH' | 'LOW';
  price: number;
  timestamp: number;
}

// Calculate ATR for dynamic SL/TP
function calculateATR(klines: any[], period: number = 14): number {
  if (klines.length < period) return 0;
  
  let atr = 0;
  for (let i = klines.length - period; i < klines.length; i++) {
    const high = parseFloat(klines[i][2]);
    const low = parseFloat(klines[i][3]);
    const prevClose = i > 0 ? parseFloat(klines[i-1][4]) : parseFloat(klines[i][1]);
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    atr += tr;
  }
  
  return atr / period;
}

// Detect Fair Value Gaps (FVG)
export function detectFVG(klines: any[]): FVGZone[] {
  const fvgZones: FVGZone[] = [];
  
  if (klines.length < 3) return fvgZones;
  
  for (let i = 2; i < klines.length; i++) {
    const candle1 = {
      high: parseFloat(klines[i-2][2]),
      low: parseFloat(klines[i-2][3]),
      close: parseFloat(klines[i-2][4])
    };
    
    const candle2 = {
      high: parseFloat(klines[i-1][2]),
      low: parseFloat(klines[i-1][3])
    };
    
    const candle3 = {
      high: parseFloat(klines[i][2]),
      low: parseFloat(klines[i][3]),
      open: parseFloat(klines[i][1])
    };
    
    // Bullish FVG: Gap between candle 1 high and candle 3 low
    if (candle1.high < candle3.low) {
      fvgZones.push({
        type: 'BULLISH',
        high: candle3.low,
        low: candle1.high,
        mid: (candle3.low + candle1.high) / 2,
        timestamp: parseInt(klines[i][0]),
        filled: false
      });
    }
    
    // Bearish FVG: Gap between candle 3 high and candle 1 low
    if (candle3.high < candle1.low) {
      fvgZones.push({
        type: 'BEARISH',
        high: candle1.low,
        low: candle3.high,
        mid: (candle1.low + candle3.high) / 2,
        timestamp: parseInt(klines[i][0]),
        filled: false
      });
    }
  }
  
  return fvgZones.slice(-5); // Return last 5 FVGs
}

// Detect Order Blocks
export function detectOrderBlocks(klines: any[]): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  
  if (klines.length < 10) return orderBlocks;
  
  for (let i = 5; i < klines.length - 5; i++) {
    const currentVolume = parseFloat(klines[i][5]);
    const avgVolume = klines.slice(i-5, i).reduce((sum, k) => sum + parseFloat(k[5]), 0) / 5;
    
    // High volume candle (potential order block)
    if (currentVolume > avgVolume * 1.5) {
      const open = parseFloat(klines[i][1]);
      const close = parseFloat(klines[i][4]);
      const high = parseFloat(klines[i][2]);
      const low = parseFloat(klines[i][3]);
      
      // Check if followed by strong move
      const nextCandles = klines.slice(i+1, i+4);
      let strongMove = false;
      let moveDirection = 0;
      
      for (const candle of nextCandles) {
        const movePercent = ((parseFloat(candle[4]) - close) / close) * 100;
        if (Math.abs(movePercent) > 0.5) {
          strongMove = true;
          moveDirection = movePercent > 0 ? 1 : -1;
          break;
        }
      }
      
      if (strongMove) {
        const strength = currentVolume > avgVolume * 2 ? 'STRONG' : 
                        currentVolume > avgVolume * 1.5 ? 'MEDIUM' : 'WEAK';
        
        orderBlocks.push({
          type: moveDirection > 0 ? 'BULLISH' : 'BEARISH',
          high: high,
          low: low,
          volume: currentVolume,
          timestamp: parseInt(klines[i][0]),
          strength: strength
        });
      }
    }
  }
  
  return orderBlocks.slice(-10); // Return last 10 order blocks
}

// Detect Supply and Demand Zones
export function detectSupplyDemandZones(klines: any[]): SupplyDemandZone[] {
  const zones: SupplyDemandZone[] = [];
  
  if (klines.length < 20) return zones;
  
  // Find swing highs and lows
  for (let i = 10; i < klines.length - 10; i++) {
    const high = parseFloat(klines[i][2]);
    const low = parseFloat(klines[i][3]);
    
    // Check if swing high (supply zone)
    const isSwingHigh = klines.slice(i-5, i).every(k => parseFloat(k[2]) <= high) &&
                        klines.slice(i+1, i+6).every(k => parseFloat(k[2]) <= high);
    
    // Check if swing low (demand zone)
    const isSwingLow = klines.slice(i-5, i).every(k => parseFloat(k[3]) >= low) &&
                       klines.slice(i+1, i+6).every(k => parseFloat(k[3]) >= low);
    
    if (isSwingHigh) {
      // Calculate zone strength based on volume and rejection
      const volume = parseFloat(klines[i][5]);
      const avgVolume = klines.slice(i-10, i).reduce((sum, k) => sum + parseFloat(k[5]), 0) / 10;
      const strength = Math.min(10, Math.round((volume / avgVolume) * 5));
      
      zones.push({
        type: 'SUPPLY',
        high: high * 1.002, // Add small buffer
        low: high * 0.998,
        strength: strength,
        touches: 1,
        timestamp: parseInt(klines[i][0])
      });
    }
    
    if (isSwingLow) {
      const volume = parseFloat(klines[i][5]);
      const avgVolume = klines.slice(i-10, i).reduce((sum, k) => sum + parseFloat(k[5]), 0) / 10;
      const strength = Math.min(10, Math.round((volume / avgVolume) * 5));
      
      zones.push({
        type: 'DEMAND',
        high: low * 1.002,
        low: low * 0.998,
        strength: strength,
        touches: 1,
        timestamp: parseInt(klines[i][0])
      });
    }
  }
  
  // Merge nearby zones and count touches
  const mergedZones = zones.reduce((acc, zone) => {
    const similar = acc.find(z => 
      z.type === zone.type && 
      Math.abs(z.low - zone.low) / zone.low < 0.005
    );
    
    if (similar) {
      similar.touches++;
      similar.strength = Math.min(10, similar.strength + 1);
    } else {
      acc.push(zone);
    }
    
    return acc;
  }, [] as SupplyDemandZone[]);
  
  return mergedZones.slice(-10); // Return last 10 zones
}

// Detect Liquidity Pools (Stop Hunt areas)
export function detectLiquidityPools(klines: any[]): LiquidityPool[] {
  const pools: LiquidityPool[] = [];
  
  if (klines.length < 50) return pools;
  
  // Find recent highs and lows where stops likely accumulate
  const recentHighs: number[] = [];
  const recentLows: number[] = [];
  
  for (let i = 20; i < klines.length; i++) {
    const high = parseFloat(klines[i][2]);
    const low = parseFloat(klines[i][3]);
    
    // Check if local high (where sell stops accumulate above)
    const isLocalHigh = klines.slice(i-10, i).every(k => parseFloat(k[2]) <= high) &&
                       klines.slice(i+1, Math.min(i+11, klines.length)).every(k => parseFloat(k[2]) <= high);
    
    // Check if local low (where buy stops accumulate below)
    const isLocalLow = klines.slice(i-10, i).every(k => parseFloat(k[3]) >= low) &&
                      klines.slice(i+1, Math.min(i+11, klines.length)).every(k => parseFloat(k[3]) >= low);
    
    if (isLocalHigh) recentHighs.push(high);
    if (isLocalLow) recentLows.push(low);
  }
  
  // Cluster nearby levels
  const clusterLevels = (levels: number[], threshold: number = 0.002) => {
    const clusters: { level: number; count: number }[] = [];
    
    levels.forEach(level => {
      const cluster = clusters.find(c => Math.abs(c.level - level) / level < threshold);
      if (cluster) {
        cluster.count++;
        cluster.level = (cluster.level + level) / 2; // Average
      } else {
        clusters.push({ level, count: 1 });
      }
    });
    
    return clusters.filter(c => c.count >= 2); // At least 2 touches
  };
  
  const highClusters = clusterLevels(recentHighs);
  const lowClusters = clusterLevels(recentLows);
  
  highClusters.forEach(cluster => {
    pools.push({
      level: cluster.level,
      type: 'SELL_STOPS',
      strength: Math.min(10, cluster.count * 2)
    });
  });
  
  lowClusters.forEach(cluster => {
    pools.push({
      level: cluster.level,
      type: 'BUY_STOPS',
      strength: Math.min(10, cluster.count * 2)
    });
  });
  
  return pools;
}

// Main scalping signal detector with SMC
export function detectScalpingSignal(
  data: Partial<CryptoData>,
  klines: any[],
  currentPrice: number
): ScalpingSignal {
  // Default neutral signal
  const signal: ScalpingSignal = {
    type: 'NEUTRAL',
    strength: 'WEAK',
    strategy: 'MOMENTUM',
    entry: currentPrice,
    stopLoss: currentPrice,
    takeProfit1: currentPrice,
    takeProfit2: currentPrice,
    riskRewardRatio: 0,
    confidence: 0,
    reason: 'No clear signal',
    indicators: {
      rsi: data.rsi || 50,
      stochRsi: data.stochRsi || 0.5,
      volume: data.volume || 0,
      priceAction: 'NEUTRAL'
    },
    timeframe: '5m',
    invalidation: 'Price crosses stop loss'
  };
  
  if (klines.length < 50) return signal;
  
  // Calculate ATR for dynamic SL/TP
  const atr = calculateATR(klines);
  
  // Detect market structure
  const fvgZones = detectFVG(klines);
  const orderBlocks = detectOrderBlocks(klines);
  const sdZones = detectSupplyDemandZones(klines);
  const liquidityPools = detectLiquidityPools(klines);
  
  // Volume analysis
  const currentVolume = parseFloat(klines[klines.length - 1][5]);
  const avgVolume = klines.slice(-20).reduce((sum, k) => sum + parseFloat(k[5]), 0) / 20;
  const volumeRatio = currentVolume / avgVolume;
  
  // Price action analysis
  const lastCandle = klines[klines.length - 1];
  const prevCandle = klines[klines.length - 2];
  const candleBody = Math.abs(parseFloat(lastCandle[4]) - parseFloat(lastCandle[1]));
  const candleRange = parseFloat(lastCandle[2]) - parseFloat(lastCandle[3]);
  const bodyRatio = candleBody / candleRange;
  
  // RSI and StochRSI conditions
  const rsi = data.rsi || 50;
  const stochRsi = data.stochRsi || 0.5;
  const stochRsiK = data.stochRsiK || 0.5;
  const stochRsiD = data.stochRsiD || 0.5;
  
  let bestSignal: ScalpingSignal | null = null;
  let highestConfidence = 0;
  
  // 1. FVG Strategy
  const bullishFVG = fvgZones.find(z => z.type === 'BULLISH' && !z.filled && currentPrice <= z.high && currentPrice >= z.low);
  const bearishFVG = fvgZones.find(z => z.type === 'BEARISH' && !z.filled && currentPrice >= z.low && currentPrice <= z.high);
  
  if (bullishFVG && rsi < 60 && volumeRatio > 1.2) {
    const entry = bullishFVG.mid;
    const stopLoss = bullishFVG.low - atr * 0.5;
    const tp1 = entry + atr * 1.5;
    const tp2 = entry + atr * 2.5;
    const tp3 = entry + atr * 4;
    const rr = (tp1 - entry) / (entry - stopLoss);
    
    const confidence = Math.min(95, 
      30 + // Base
      (rsi < 40 ? 20 : 10) + // RSI bonus
      (volumeRatio > 2 ? 20 : 10) + // Volume bonus
      (stochRsiK > stochRsiD ? 15 : 0) // StochRSI cross
    );
    
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestSignal = {
        type: 'LONG',
        strength: confidence > 70 ? 'STRONG' : confidence > 50 ? 'MEDIUM' : 'WEAK',
        strategy: 'FVG',
        entry: entry,
        stopLoss: stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskRewardRatio: rr,
        confidence: confidence,
        reason: `Bullish FVG fill at ${entry.toFixed(2)}, RSI: ${rsi.toFixed(0)}, Volume: ${volumeRatio.toFixed(1)}x`,
        indicators: {
          rsi: rsi,
          stochRsi: stochRsi,
          volume: volumeRatio,
          priceAction: 'BULLISH_FVG'
        },
        timeframe: '5m',
        invalidation: `Price closes below ${stopLoss.toFixed(2)}`
      };
    }
  }
  
  if (bearishFVG && rsi > 40 && volumeRatio > 1.2) {
    const entry = bearishFVG.mid;
    const stopLoss = bearishFVG.high + atr * 0.5;
    const tp1 = entry - atr * 1.5;
    const tp2 = entry - atr * 2.5;
    const tp3 = entry - atr * 4;
    const rr = (entry - tp1) / (stopLoss - entry);
    
    const confidence = Math.min(95,
      30 + // Base
      (rsi > 60 ? 20 : 10) + // RSI bonus
      (volumeRatio > 2 ? 20 : 10) + // Volume bonus
      (stochRsiK < stochRsiD ? 15 : 0) // StochRSI cross
    );
    
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestSignal = {
        type: 'SHORT',
        strength: confidence > 70 ? 'STRONG' : confidence > 50 ? 'MEDIUM' : 'WEAK',
        strategy: 'FVG',
        entry: entry,
        stopLoss: stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskRewardRatio: rr,
        confidence: confidence,
        reason: `Bearish FVG fill at ${entry.toFixed(2)}, RSI: ${rsi.toFixed(0)}, Volume: ${volumeRatio.toFixed(1)}x`,
        indicators: {
          rsi: rsi,
          stochRsi: stochRsi,
          volume: volumeRatio,
          priceAction: 'BEARISH_FVG'
        },
        timeframe: '5m',
        invalidation: `Price closes above ${stopLoss.toFixed(2)}`
      };
    }
  }
  
  // 2. Order Block Strategy
  const bullishOB = orderBlocks.find(ob => 
    ob.type === 'BULLISH' && 
    currentPrice >= ob.low && 
    currentPrice <= ob.high &&
    ob.strength !== 'WEAK'
  );
  
  const bearishOB = orderBlocks.find(ob => 
    ob.type === 'BEARISH' && 
    currentPrice >= ob.low && 
    currentPrice <= ob.high &&
    ob.strength !== 'WEAK'
  );
  
  if (bullishOB && rsi < 55 && volumeRatio > 1.0) {
    const entry = (bullishOB.high + bullishOB.low) / 2;
    const stopLoss = bullishOB.low - atr * 0.3;
    const tp1 = entry + atr * 2;
    const tp2 = entry + atr * 3;
    const tp3 = entry + atr * 5;
    const rr = (tp1 - entry) / (entry - stopLoss);
    
    const confidence = Math.min(90,
      35 + // Base
      (bullishOB.strength === 'STRONG' ? 25 : 15) + // OB strength
      (rsi < 35 ? 15 : 5) + // RSI bonus
      (volumeRatio > 1.5 ? 15 : 5) // Volume bonus
    );
    
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestSignal = {
        type: 'LONG',
        strength: bullishOB.strength,
        strategy: 'ORDER_BLOCK',
        entry: entry,
        stopLoss: stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskRewardRatio: rr,
        confidence: confidence,
        reason: `Bullish Order Block bounce, ${bullishOB.strength} strength, Volume: ${bullishOB.volume.toFixed(0)}`,
        indicators: {
          rsi: rsi,
          stochRsi: stochRsi,
          volume: volumeRatio,
          priceAction: 'BULLISH_OB'
        },
        timeframe: '5m',
        invalidation: `Price closes below ${stopLoss.toFixed(2)} (OB low)`
      };
    }
  }
  
  // 3. Supply/Demand Zone Strategy
  const demandZone = sdZones.find(z => 
    z.type === 'DEMAND' && 
    currentPrice >= z.low && 
    currentPrice <= z.high &&
    z.strength >= 5
  );
  
  const supplyZone = sdZones.find(z => 
    z.type === 'SUPPLY' && 
    currentPrice >= z.low && 
    currentPrice <= z.high &&
    z.strength >= 5
  );
  
  if (demandZone && rsi < 50 && stochRsi < 0.3) {
    const entry = currentPrice;
    const stopLoss = demandZone.low - atr * 0.5;
    const tp1 = entry + atr * 1.5;
    const tp2 = entry + atr * 3;
    const rr = (tp1 - entry) / (entry - stopLoss);
    
    const confidence = Math.min(85,
      30 + // Base
      (demandZone.strength * 5) + // Zone strength
      (demandZone.touches > 2 ? 10 : 5) + // Multiple touches
      (rsi < 30 ? 15 : 5) // RSI bonus
    );
    
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestSignal = {
        type: 'LONG',
        strength: demandZone.strength > 7 ? 'STRONG' : demandZone.strength > 5 ? 'MEDIUM' : 'WEAK',
        strategy: 'SUPPLY_DEMAND',
        entry: entry,
        stopLoss: stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        riskRewardRatio: rr,
        confidence: confidence,
        reason: `Demand zone bounce, Strength: ${demandZone.strength}/10, Touches: ${demandZone.touches}`,
        indicators: {
          rsi: rsi,
          stochRsi: stochRsi,
          volume: volumeRatio,
          priceAction: 'DEMAND_ZONE'
        },
        timeframe: '5m',
        invalidation: `Price closes below demand zone at ${demandZone.low.toFixed(2)}`
      };
    }
  }
  
  // 4. Liquidity Sweep Strategy
  const nearbyLiquidityPool = liquidityPools.find(pool => {
    const distance = Math.abs(currentPrice - pool.level) / currentPrice;
    return distance < 0.002; // Within 0.2% of liquidity
  });
  
  if (nearbyLiquidityPool && volumeRatio > 1.5) {
    const isLiquidityGrab = nearbyLiquidityPool.type === 'BUY_STOPS' ? 
      currentPrice < nearbyLiquidityPool.level : 
      currentPrice > nearbyLiquidityPool.level;
    
    if (isLiquidityGrab) {
      const entry = currentPrice;
      const isBullish = nearbyLiquidityPool.type === 'BUY_STOPS';
      const stopLoss = isBullish ? 
        nearbyLiquidityPool.level - atr * 1 : 
        nearbyLiquidityPool.level + atr * 1;
      const tp1 = isBullish ? 
        entry + atr * 2 : 
        entry - atr * 2;
      const tp2 = isBullish ? 
        entry + atr * 4 : 
        entry - atr * 4;
      const rr = Math.abs(tp1 - entry) / Math.abs(entry - stopLoss);
      
      const confidence = Math.min(80,
        35 + // Base
        (nearbyLiquidityPool.strength * 3) + // Liquidity strength
        (volumeRatio > 2 ? 20 : 10) + // Volume spike
        (bodyRatio > 0.7 ? 10 : 0) // Strong candle
      );
      
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestSignal = {
          type: isBullish ? 'LONG' : 'SHORT',
          strength: confidence > 65 ? 'STRONG' : confidence > 45 ? 'MEDIUM' : 'WEAK',
          strategy: 'LIQUIDITY_SWEEP',
          entry: entry,
          stopLoss: stopLoss,
          takeProfit1: tp1,
          takeProfit2: tp2,
          riskRewardRatio: rr,
          confidence: confidence,
          reason: `Liquidity sweep at ${nearbyLiquidityPool.level.toFixed(2)}, ${nearbyLiquidityPool.type}`,
          indicators: {
            rsi: rsi,
            stochRsi: stochRsi,
            volume: volumeRatio,
            priceAction: 'LIQUIDITY_SWEEP'
          },
          timeframe: '5m',
          invalidation: `Price continues beyond liquidity level`
        };
      }
    }
  }
  
  // 5. Momentum/Reversal Strategy (Fallback)
  if (!bestSignal || highestConfidence < 40) {
    // Strong oversold reversal
    if (rsi < 25 && stochRsi < 0.2 && stochRsiK > stochRsiD && volumeRatio > 1.3) {
      const entry = currentPrice;
      const stopLoss = currentPrice - atr * 1;
      const tp1 = entry + atr * 1.5;
      const tp2 = entry + atr * 3;
      const rr = (tp1 - entry) / (entry - stopLoss);
      
      const confidence = Math.min(70,
        20 + // Base
        (rsi < 20 ? 20 : 10) + // Extreme oversold
        (stochRsi < 0.1 ? 15 : 5) + // StochRSI extreme
        (volumeRatio > 2 ? 15 : 5) // Volume
      );
      
      bestSignal = {
        type: 'LONG',
        strength: confidence > 60 ? 'MEDIUM' : 'WEAK',
        strategy: 'REVERSAL',
        entry: entry,
        stopLoss: stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        riskRewardRatio: rr,
        confidence: confidence,
        reason: `Oversold reversal, RSI: ${rsi.toFixed(0)}, StochRSI: ${(stochRsi * 100).toFixed(0)}`,
        indicators: {
          rsi: rsi,
          stochRsi: stochRsi,
          volume: volumeRatio,
          priceAction: 'OVERSOLD_REVERSAL'
        },
        timeframe: '5m',
        invalidation: `RSI continues below 20`
      };
    }
    
    // Strong overbought reversal
    else if (rsi > 75 && stochRsi > 0.8 && stochRsiK < stochRsiD && volumeRatio > 1.3) {
      const entry = currentPrice;
      const stopLoss = currentPrice + atr * 1;
      const tp1 = entry - atr * 1.5;
      const tp2 = entry - atr * 3;
      const rr = (entry - tp1) / (stopLoss - entry);
      
      const confidence = Math.min(70,
        20 + // Base
        (rsi > 80 ? 20 : 10) + // Extreme overbought
        (stochRsi > 0.9 ? 15 : 5) + // StochRSI extreme
        (volumeRatio > 2 ? 15 : 5) // Volume
      );
      
      bestSignal = {
        type: 'SHORT',
        strength: confidence > 60 ? 'MEDIUM' : 'WEAK',
        strategy: 'REVERSAL',
        entry: entry,
        stopLoss: stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        riskRewardRatio: rr,
        confidence: confidence,
        reason: `Overbought reversal, RSI: ${rsi.toFixed(0)}, StochRSI: ${(stochRsi * 100).toFixed(0)}`,
        indicators: {
          rsi: rsi,
          stochRsi: stochRsi,
          volume: volumeRatio,
          priceAction: 'OVERBOUGHT_REVERSAL'
        },
        timeframe: '5m',
        invalidation: `RSI continues above 80`
      };
    }
  }
  
  return bestSignal || signal;
}

// Calculate position size based on risk
export function calculatePositionSize(
  capital: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): number {
  const riskAmount = capital * (riskPercent / 100);
  const stopLossPercent = Math.abs((entryPrice - stopLoss) / entryPrice);
  const positionSize = riskAmount / stopLossPercent;
  
  return Math.floor(positionSize * 100) / 100; // Round down to 2 decimals
}

// Format signal for display
export function formatSignalDisplay(signal: ScalpingSignal): string {
  if (signal.type === 'NEUTRAL') return 'No Signal';
  
  const direction = signal.type === 'LONG' ? '🟢 LONG' : '🔴 SHORT';
  const strategy = signal.strategy.replace('_', ' ');
  const confidence = `${signal.confidence.toFixed(0)}%`;
  const rr = `RR ${signal.riskRewardRatio.toFixed(1)}`;
  
  return `${direction} | ${strategy} | ${confidence} | ${rr}`;
}
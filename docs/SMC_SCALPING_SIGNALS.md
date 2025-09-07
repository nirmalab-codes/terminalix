# Smart Money Concepts (SMC) Scalping Signal System

## 📊 Signal Strategies Overview

### 1. **FVG (Fair Value Gap)**
**What**: Price imbalance zones where market moved too fast
**Entry**: When price returns to fill the gap
**Best for**: Quick scalps with high probability
```
Signal Conditions:
- Bullish FVG + RSI < 60 + Volume > 1.2x
- Entry: Middle of FVG zone
- SL: Below FVG low
- TP1: 1.5x ATR | TP2: 2.5x ATR | TP3: 4x ATR
```

### 2. **Order Blocks**
**What**: Areas of high volume institutional activity
**Entry**: When price retests the order block
**Best for**: Strong reversal points
```
Signal Conditions:
- Strong Order Block + RSI < 55 + Volume confirmation
- Entry: Middle of order block
- SL: Below/above order block
- TP1: 2x ATR | TP2: 3x ATR | TP3: 5x ATR
```

### 3. **Supply/Demand Zones**
**What**: Price levels with multiple rejections
**Entry**: At zone boundaries
**Best for**: Range trading
```
Signal Conditions:
- Zone strength > 5/10 + RSI confirmation
- Entry: At zone touch
- SL: Outside zone
- TP1: 1.5x ATR | TP2: 3x ATR
```

### 4. **Liquidity Sweeps**
**What**: Stop hunting areas where liquidity accumulates
**Entry**: After liquidity grab reversal
**Best for**: Quick reversals after stop hunts
```
Signal Conditions:
- Near liquidity pool + Volume spike > 1.5x
- Entry: After sweep
- SL: Beyond liquidity level
- TP1: 2x ATR | TP2: 4x ATR
```

### 5. **Momentum/Reversal**
**What**: Extreme oversold/overbought conditions
**Entry**: On reversal confirmation
**Best for**: Mean reversion trades
```
Signal Conditions:
- RSI < 25 or > 75 + StochRSI extreme + Volume
- Entry: Current price
- SL: 1x ATR
- TP1: 1.5x ATR | TP2: 3x ATR
```

## 🎯 Signal Components

### Each Signal Provides:
```javascript
{
  type: 'LONG' | 'SHORT' | 'NEUTRAL',
  strength: 'STRONG' | 'MEDIUM' | 'WEAK',
  strategy: 'FVG' | 'ORDER_BLOCK' | 'SUPPLY_DEMAND' | 'LIQUIDITY_SWEEP' | 'REVERSAL',
  entry: 45250.50,        // Exact entry price
  stopLoss: 45100.00,     // Stop loss level
  takeProfit1: 45400.00,  // First target (50% position)
  takeProfit2: 45550.00,  // Second target (30% position)
  takeProfit3: 45700.00,  // Runner target (20% position)
  riskRewardRatio: 3.0,   // Risk/Reward ratio
  confidence: 75,         // Signal confidence 0-100%
  reason: "Bullish FVG fill at 45250, RSI: 35, Volume: 2.1x",
  invalidation: "Price closes below 45100"
}
```

## 📈 Confidence Scoring

### Confidence Calculation:
- **Base Score**: 20-35% (varies by strategy)
- **RSI Alignment**: +5-20%
- **Volume Confirmation**: +5-20%
- **StochRSI Cross**: +5-15%
- **Zone/Level Strength**: +5-25%
- **Multiple Touches**: +5-10%

### Confidence Levels:
- **80-100%**: Very high probability (rare)
- **60-80%**: High probability (take these)
- **40-60%**: Medium probability (be selective)
- **< 40%**: Low probability (skip or small size)

## 🔄 Multi-Timeframe Confirmation

### Timeframe Hierarchy:
1. **1m**: Entry timing (execution)
2. **5m**: Primary signal (main strategy)
3. **15m**: Trend confirmation
4. **1h**: Major levels
5. **4h**: Overall bias

### Best Signals Have:
- 5m signal aligned with 15m trend
- 1h RSI not at extremes (unless reversal)
- 4h trend supporting direction
- 1m showing entry pattern

## 💰 Position Management

### Entry Rules:
```javascript
// Position sizing formula
Position Size = (Capital * Risk%) / (Entry - StopLoss)

// Example:
Capital: $10,000
Risk: 1% = $100
Entry: $45,250
Stop: $45,100
Position Size = $100 / $150 = 0.67 BTC
```

### Exit Strategy:
1. **TP1 (50%)**: Quick profit at 1.5-2x ATR
2. **TP2 (30%)**: Momentum target at 2.5-3x ATR
3. **TP3 (20%)**: Runner with trailing stop

### Risk Management:
- Max risk per trade: 1%
- Daily loss limit: 3%
- Win rate target: > 60%
- Minimum RR: 1.5:1

## ⚡ Quick Reference

### LONG Signal Checklist:
- [ ] Strategy identified (FVG/OB/SD)
- [ ] RSI not overbought (< 70)
- [ ] Volume confirmation (> avg)
- [ ] Clear stop loss level
- [ ] RR ratio > 1.5
- [ ] Confidence > 50%

### SHORT Signal Checklist:
- [ ] Strategy identified (FVG/OB/SD)
- [ ] RSI not oversold (> 30)
- [ ] Volume confirmation (> avg)
- [ ] Clear stop loss level
- [ ] RR ratio > 1.5
- [ ] Confidence > 50%

## 🚫 Signal Invalidation

### Cancel/Exit Signal If:
1. Price closes beyond stop loss
2. RSI divergence appears
3. Volume dries up
4. Market structure breaks
5. News event impacts market
6. Signal timeframe expires (5-15 min)

## 📱 Dashboard Interpretation

### Signal Display:
```
🟢 LONG | FVG | 75% | RR 3.0
Entry: 45,250 | SL: 45,100 | TP: 45,550
```

### Color Coding:
- **Green**: LONG signals
- **Red**: SHORT signals
- **Yellow**: NEUTRAL/waiting
- **Brightness**: Signal strength

### Priority Order:
1. FVG signals (highest win rate)
2. Order Block signals (strong reversal)
3. Supply/Demand (range trading)
4. Liquidity Sweeps (quick scalps)
5. Momentum (fallback strategy)

## 🎓 Tips for Success

1. **Wait for A+ Setups**: Only trade confidence > 60%
2. **Respect Stop Loss**: Never move SL against you
3. **Scale Out**: Take partial profits at TP1
4. **Track Performance**: Journal every trade
5. **Stay Disciplined**: Follow the system exactly

---

*The system combines Smart Money Concepts with traditional indicators for high-probability scalping signals with clear entry, exit, and risk management rules.*
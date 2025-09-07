# Technical Indicators Guide for Scalping

## 🔍 Primary Indicators (MUST WATCH)

### 1. RSI (Relative Strength Index)
**Purpose**: Momentum oscillator measuring speed and magnitude of price changes

**Key Levels**:
- **70-100**: Overbought (potential SHORT)
- **30-0**: Oversold (potential LONG)
- **50**: Neutral (trend confirmation)

**Scalping Settings**:
```
Period: 7 (aggressive) or 14 (standard)
Timeframes: 1m, 5m, 15m
```

**Trading Signals**:
- **Bullish Divergence**: Price makes lower low, RSI makes higher low → BUY
- **Bearish Divergence**: Price makes higher high, RSI makes lower high → SELL
- **Failure Swing**: RSI fails to reach overbought/oversold → Reversal

### 2. Stochastic RSI
**Purpose**: More sensitive version of RSI, faster signals

**Components**:
- **%K Line**: Fast line (blue)
- **%D Line**: Slow line (orange)

**Scalping Signals**:
```javascript
// LONG Signal
if (StochRSI_K < 20 && StochRSI_K crosses above StochRSI_D) {
  BULLISH_SIGNAL();
}

// SHORT Signal
if (StochRSI_K > 80 && StochRSI_K crosses below StochRSI_D) {
  BEARISH_SIGNAL();
}
```

### 3. Volume Profile
**Key Concepts**:
- **POC (Point of Control)**: Highest volume price level
- **VAH (Value Area High)**: Upper boundary of 70% volume
- **VAL (Value Area Low)**: Lower boundary of 70% volume

**Scalping Application**:
- Price above VAH → Look for LONG
- Price below VAL → Look for SHORT
- Price at POC → Expect consolidation

### 4. MACD (Moving Average Convergence Divergence)
**Settings for Scalping**:
```
Fast EMA: 12
Slow EMA: 26
Signal: 9
Timeframe: 5m, 15m
```

**Signals**:
- **MACD crosses above Signal** → BUY
- **MACD crosses below Signal** → SELL
- **Histogram growing** → Momentum increasing
- **Histogram shrinking** → Momentum decreasing

## 📊 Supporting Indicators

### 5. Bollinger Bands
**Components**:
- **Upper Band**: 20 SMA + (2 × Standard Deviation)
- **Middle Band**: 20 SMA
- **Lower Band**: 20 SMA - (2 × Standard Deviation)

**Scalping Strategy**:
```
1. Price touches lower band + RSI < 30 = BUY
2. Price touches upper band + RSI > 70 = SELL
3. Band squeeze = Volatility incoming
4. Band expansion = Trending market
```

### 6. EMA (Exponential Moving Average)
**Scalping EMAs**:
- **9 EMA**: Immediate trend
- **21 EMA**: Short-term trend
- **50 EMA**: Medium trend
- **200 EMA**: Major trend

**Trading Rules**:
- Price > All EMAs = Strong UPTREND
- Price < All EMAs = Strong DOWNTREND
- EMA Cross = Potential reversal

### 7. ATR (Average True Range)
**Purpose**: Measure volatility for stop loss/take profit

**Application**:
```
Stop Loss = Entry ± (1.5 × ATR)
Take Profit = Entry ± (2-3 × ATR)
Position Size = Risk Amount / (ATR × Multiplier)
```

### 8. Fibonacci Retracement
**Key Levels**:
- **23.6%**: Weak retracement
- **38.2%**: Moderate retracement
- **50%**: Psychological level
- **61.8%**: Golden ratio (strongest)
- **78.6%**: Deep retracement

**Scalping Entry**:
- Uptrend: Buy at 38.2-61.8% retracement
- Downtrend: Sell at 38.2-61.8% retracement

## 🎯 Indicator Combinations

### Combo 1: "Triple Confirmation"
```
RSI + Stochastic RSI + Volume
- RSI < 30
- StochRSI oversold cross
- Volume spike > 2x average
= HIGH PROBABILITY LONG
```

### Combo 2: "Trend Momentum"
```
EMA + MACD + RSI
- Price > 9 & 21 EMA
- MACD positive & rising
- RSI > 50 but < 70
= TREND CONTINUATION LONG
```

### Combo 3: "Reversal Setup"
```
Bollinger Bands + RSI + Volume
- Price outside bands
- RSI divergence
- Volume declining
= REVERSAL IMMINENT
```

## 📈 Market Structure Indicators

### 9. Support & Resistance
**Identification**:
- Previous highs/lows
- Round numbers (100, 1000)
- Fibonacci levels
- Moving averages
- Volume nodes

**Trading**:
- Buy at support, sell at resistance
- Breakout with volume confirmation
- False breakout = Reversal opportunity

### 10. Order Flow
**Components**:
- **Bid/Ask Spread**: Tighter = More liquid
- **DOM (Depth of Market)**: Order imbalance
- **Time & Sales**: Actual trades
- **CVD (Cumulative Volume Delta)**: Buy vs Sell pressure

**Signals**:
```
Large BID orders appearing = Support forming
Large ASK orders appearing = Resistance forming
Aggressive buying (market orders) = Bullish
Aggressive selling (market orders) = Bearish
```

## ⚡ Quick Reference Matrix

| Indicator | Bullish Signal | Bearish Signal | Best Timeframe |
|-----------|---------------|----------------|----------------|
| RSI | < 30 | > 70 | 5m, 15m |
| StochRSI | < 20 + Cross up | > 80 + Cross down | 1m, 5m |
| MACD | Cross above signal | Cross below signal | 15m, 30m |
| EMA | Price > EMA | Price < EMA | 5m, 15m |
| Volume | Spike on up move | Spike on down move | All |
| Bollinger | Touch lower band | Touch upper band | 5m, 15m |

## 🔔 Alert Conditions

### Priority 1 (STRONG):
```javascript
// Oversold Bounce Alert
RSI(5m) < 25 && 
StochRSI(5m) < 20 && 
Volume > MA(Volume, 20) * 2

// Overbought Reversal Alert  
RSI(5m) > 75 &&
StochRSI(5m) > 80 &&
Volume > MA(Volume, 20) * 2
```

### Priority 2 (MEDIUM):
```javascript
// Trend Continuation Alert
Price > EMA(21) &&
MACD > Signal &&
RSI between 40-60

// Divergence Alert
Price.newHigh() && !RSI.newHigh() ||
Price.newLow() && !RSI.newLow()
```

## 📝 Indicator Checklist

### Before Entry:
- [ ] Check RSI level (not extreme unless reversal trade)
- [ ] Confirm with StochRSI direction
- [ ] Volume above average?
- [ ] Price relative to key MAs
- [ ] Near support/resistance?
- [ ] MACD momentum aligned?
- [ ] Multiple timeframe confluence?

### During Trade:
- [ ] Monitor RSI for divergence
- [ ] Watch volume for exhaustion
- [ ] Track price vs VWAP
- [ ] Observe order flow changes

### Exit Signals:
- [ ] RSI reaching opposite extreme
- [ ] Volume drying up
- [ ] MACD crossing opposite
- [ ] Break of key MA
- [ ] Target/Stop reached

## 💡 Pro Tips

1. **Less is More**: Don't use all indicators, pick 3-4 that work for you
2. **Confluence**: Best trades have 3+ indicators agreeing
3. **Context Matters**: Indicators work differently in trending vs ranging markets
4. **Timeframe Sync**: Higher timeframe = stronger signal
5. **Volume Confirms**: No volume = weak signal
6. **Practice**: Backtest each indicator separately first

## ⚠️ Indicator Limitations

### RSI:
- Can stay overbought/oversold in strong trends
- Lagging indicator
- False signals in choppy markets

### Moving Averages:
- Lag behind price
- Whipsaws in ranging markets
- Not predictive, only reactive

### Volume:
- Can be manipulated
- Different on each exchange
- Doesn't show direction alone

### Stochastic:
- Too many false signals in trending markets
- Needs confirmation from other indicators

---

*Remember: No indicator is perfect. Always use multiple confirmations and proper risk management.*
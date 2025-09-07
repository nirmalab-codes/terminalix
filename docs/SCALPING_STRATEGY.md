# Scalping Trading Strategy Guide

## 📊 Key Indicators for Scalping

### 1. **RSI (Relative Strength Index)**
- **Period**: 7 (untuk scalping lebih sensitif)
- **Overbought**: > 70 (potential reversal down)
- **Oversold**: < 30 (potential reversal up)
- **Best Signal**: Divergence dengan price action

### 2. **Stochastic RSI**
- **More sensitive** dari RSI biasa
- **Cross signals**: K line cross D line
- **Extreme zones**: < 20 (oversold), > 80 (overbought)
- **Multiple timeframe**: Konfirmasi dari 15m, 30m, 1h

### 3. **Volume Indicators**
```
- Volume > 2x average = Strong momentum
- Volume spike + price rejection = Potential reversal
- Declining volume in trend = Weakening momentum
```

### 4. **Moving Averages**
- **EMA 9 & 21** (Fast signals)
- **Cross strategy**: Golden cross (bullish), Death cross (bearish)
- **Dynamic support/resistance**

### 5. **VWAP (Volume Weighted Average Price)**
- Price above VWAP = Bullish bias
- Price below VWAP = Bearish bias
- VWAP as dynamic support/resistance

### 6. **Order Flow / Market Depth**
- **Bid/Ask ratio**: Tekanan beli vs jual
- **Large orders**: Support/resistance levels
- **Order book imbalance**: Potential direction

## 🎯 Scalping Entry Signals

### LONG Entry Conditions:
```javascript
if (
  RSI < 30 && // Oversold
  StochRSI_K > StochRSI_D && // Bullish cross
  Volume > Average_Volume * 1.5 && // Volume confirmation
  Price > VWAP // Above VWAP
) {
  ENTER_LONG();
}
```

### SHORT Entry Conditions:
```javascript
if (
  RSI > 70 && // Overbought
  StochRSI_K < StochRSI_D && // Bearish cross
  Volume > Average_Volume * 1.5 && // Volume confirmation
  Price < VWAP // Below VWAP
) {
  ENTER_SHORT();
}
```

## ⚡ Quick Scalping Strategies

### 1. **Range Scalping**
- Identify clear support/resistance
- Buy at support, sell at resistance
- Stop loss: Below/above range
- Target: 0.5-1% profit

### 2. **Momentum Scalping**
- Wait for volume spike (>2x average)
- Enter on breakout with volume
- Ride momentum for 1-3 minutes
- Exit on volume decline

### 3. **Reversal Scalping**
- RSI extreme levels (>70 or <30)
- Wait for rejection candle
- Confirm with volume
- Quick in/out (30 seconds - 2 minutes)

### 4. **News Scalping**
- Monitor economic calendar
- Position before high-impact news
- Ride initial volatility
- Exit within 5 minutes

## 📈 Multi-Timeframe Analysis

### Timeframe Hierarchy:
1. **1W (Weekly)** - Major trend direction
2. **1D (Daily)** - Key support/resistance levels
3. **4H** - Medium-term trend
4. **1H** - Short-term bias
5. **15M** - Entry timing
6. **5M** - Fine-tune entry
7. **1M** - Execution

### Confluence Strategy:
```
Best Entry = 3+ timeframes align
- 1H: Oversold
- 15M: Bullish divergence
- 5M: Support bounce
- 1M: Volume spike
```

## 💰 Risk Management Rules

### Position Sizing:
- **Per trade risk**: Max 1% of capital
- **Daily loss limit**: 3% of capital
- **Leverage**: Max 10x (beginners 2-5x)

### Stop Loss Placement:
- **Fixed**: 0.5-1% from entry
- **ATR-based**: 1.5x ATR
- **Structure**: Below/above recent swing

### Take Profit:
- **Target 1**: 1:1 Risk/Reward (50% position)
- **Target 2**: 1:2 Risk/Reward (30% position)
- **Runner**: Trail stop for remaining 20%

## 🔥 High Probability Setups

### Setup 1: "Oversold Bounce"
```
- RSI < 25 on 15M
- StochRSI < 20 on 5M
- Touch major support
- Volume spike
- Entry: Market buy
- SL: Below support
- TP: Previous resistance
```

### Setup 2: "Breakout Continuation"
```
- Break resistance with volume
- Retest as support
- RSI > 50 maintaining
- Entry: On retest
- SL: Below new support
- TP: Measured move
```

### Setup 3: "Divergence Reversal"
```
- Price makes new high/low
- RSI shows divergence
- Volume declining
- Entry: On confirmation candle
- SL: Beyond extreme
- TP: 50% retracement
```

## 📱 Using Our Trading Dashboard

### Features for Scalping:
1. **Multi-timeframe RSI** - Quick overview all timeframes
2. **Volume alerts** - Spot unusual activity
3. **Price change %** - Momentum tracking
4. **Signal system** - Automated entry signals
5. **Real-time updates** - WebSocket live data

### Dashboard Interpretation:
```
GREEN Signals = Potential LONG
- RSI Oversold + Volume spike
- Multiple timeframes align
- Positive price momentum

RED Signals = Potential SHORT
- RSI Overbought + Volume spike
- Multiple timeframes align
- Negative price momentum
```

## ⚠️ Common Scalping Mistakes

1. **Overtrading** - Quality over quantity
2. **No stop loss** - Always use protection
3. **Revenge trading** - Stick to plan
4. **FOMO entries** - Wait for setup
5. **Holding losers** - Cut losses quick
6. **Ignoring fees** - Calculate net profit
7. **Fighting trend** - Follow the flow

## 📝 Daily Scalping Checklist

### Pre-Market:
- [ ] Check economic calendar
- [ ] Identify key levels (S/R)
- [ ] Note major trend direction
- [ ] Set daily loss limit
- [ ] Prepare watchlist (3-5 pairs)

### During Trading:
- [ ] Wait for A+ setups only
- [ ] Confirm multi-timeframe
- [ ] Check volume confirmation
- [ ] Set SL before entry
- [ ] Journal each trade

### Post-Market:
- [ ] Review P&L
- [ ] Analyze mistakes
- [ ] Update strategy notes
- [ ] Plan tomorrow's levels

## 🎓 Advanced Tips

### Psychology:
- Trade like a robot (no emotions)
- Accept losses as business cost
- Focus on process, not P&L
- Take breaks every hour
- Stop if 3 losses in a row

### Market Selection:
- **Best pairs**: BTC, ETH, BNB (high liquidity)
- **Best hours**: US/EU overlap
- **Avoid**: Low volume pairs
- **Avoid**: Major news events (unless news trading)

### Continuous Improvement:
1. Backtest strategies minimum 100 trades
2. Forward test with small size
3. Scale up gradually
4. Keep detailed journal
5. Review weekly performance

## 📊 Performance Metrics

Track these KPIs:
- **Win rate**: Target > 60%
- **Risk/Reward**: Minimum 1:1.5
- **Profit factor**: > 1.5
- **Max drawdown**: < 10%
- **Sharpe ratio**: > 2.0

---

*Remember: Scalping requires discipline, fast execution, and emotional control. Start small, be consistent, and scale gradually as you improve.*
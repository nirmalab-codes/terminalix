# Crypto Trading Dashboard

A robust real-time cryptocurrency trading dashboard that monitors RSI (Relative Strength Index) and Stochastic RSI indicators to identify overbought/oversold conditions and potential reversal signals.

## Features

### Core Functionality
- **Real-time RSI & Stochastic RSI Monitoring**: Track technical indicators for multiple cryptocurrency pairs
- **Overbought/Oversold Detection**: Configurable thresholds for identifying market extremes
- **Reversal Signal Detection**: Automatic identification of potential trend reversals
- **Live Price Updates**: WebSocket integration for real-time price data
- **Volume Analysis**: Monitor trading volume and filter by minimum thresholds

### User Interface
- **Dark Mode**: Professional dark theme optimized for extended viewing
- **Sortable Data Table**: Sort by any metric (price, volume, RSI, changes)
- **Advanced Filtering**: Filter by overbought/oversold status, reversals, volume, and price changes
- **Tabbed Views**: Quickly switch between all tokens, overbought, oversold, and reversal signals
- **Statistics Dashboard**: Real-time count of market conditions

### Configuration
- **Adjustable RSI Period**: Customize RSI calculation period (default: 14)
- **Stochastic RSI Settings**: Configure Stochastic RSI parameters
- **Overbought/Oversold Levels**: Set custom threshold levels
- **Time Intervals**: Choose from 1m, 5m, 15m, 30m, 1h, 4h, 1d
- **Refresh Rate**: Control data update frequency
- **Symbol Selection**: Track specific trading pairs or auto-select top volume pairs

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: Zustand with persistence
- **API Integration**: Binance REST & WebSocket APIs
- **Charts**: Recharts (optional for future enhancements)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crypto-trading-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration Guide

### Indicator Settings

- **RSI Period**: Number of periods for RSI calculation (2-100)
- **Stoch RSI Period**: Number of periods for Stochastic RSI (2-100)
- **Overbought Level**: RSI value above which asset is considered overbought (50-100)
- **Oversold Level**: RSI value below which asset is considered oversold (0-50)

### Filters

- **Show Overbought Only**: Display only tokens with RSI above overbought level
- **Show Oversold Only**: Display only tokens with RSI below oversold level
- **Show Reversals Only**: Display only tokens showing reversal signals
- **Min Volume**: Minimum 24h volume in USD
- **Min Price Change**: Minimum 24h price change percentage

## API Usage

The dashboard uses Binance public APIs:
- REST API for historical data and market statistics
- WebSocket streams for real-time price updates

No API key is required for public market data.

## Technical Indicators

### RSI (Relative Strength Index)
- Measures momentum and identifies overbought/oversold conditions
- Values range from 0-100
- Default levels: >70 overbought, <30 oversold

### Stochastic RSI
- Applies stochastic oscillator to RSI values
- More sensitive to price changes than regular RSI
- Shows K and D lines for crossover signals

### Reversal Detection
The system detects potential reversals when:
- RSI crosses overbought/oversold thresholds
- Stochastic RSI shows extreme readings with directional changes
- Price action confirms indicator signals

## Performance Optimization

- **Data Caching**: Reduces API calls with intelligent caching
- **Batch Updates**: Groups multiple updates for better performance
- **Lazy Loading**: Loads data on demand
- **WebSocket Management**: Efficient connection handling for real-time updates

## Project Structure

```
crypto-trading-dashboard/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with dark mode
│   ├── page.tsx           # Main dashboard page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── dashboard.tsx      # Main dashboard component
│   ├── crypto-table.tsx   # Data table component
│   └── config-panel.tsx   # Settings panel
├── lib/                   # Utilities and services
│   ├── binance.ts        # Binance API integration
│   ├── indicators.ts      # RSI/StochRSI calculations
│   ├── store.ts          # Zustand state management
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Utility functions
└── components/ui/         # shadcn/ui components
```

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Docker
```bash
docker build -t crypto-dashboard .
docker run -p 3000:3000 crypto-dashboard
```

### Static Export
```bash
npm run build
npm run export
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Future Enhancements

- [ ] Additional indicators (MACD, Bollinger Bands)
- [ ] Price alerts and notifications
- [ ] Historical data charts
- [ ] Portfolio tracking
- [ ] Multi-exchange support
- [ ] Mobile responsive improvements
- [ ] Export data to CSV/Excel
- [ ] Custom watchlists
- [ ] Backtesting capabilities
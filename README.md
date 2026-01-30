# Stonkscan

**stonkscan.com** — A modern, real-time financial market analytics platform built with Next.js 14, TypeScript, and the Financial Modeling Prep API.

![Stonkscan](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)

## Features

### 📈 Stock Market Overview
- Real-time data for S&P 500 (SPY), NASDAQ (QQQ), and Dow Jones (DIA) ETFs
- Current prices with **intraday percentage changes** (vs today's open)
- **Hourly sparkline charts** showing today's trading activity
- Auto-refresh every minute during market hours (9:30 AM - 4:00 PM EST)
- **Note**: Using ETFs instead of indices (free tier limitation of Twelve Data)

### 🪙 Cryptocurrency Prices
- Real-time prices for **3 top cryptocurrencies**: Bitcoin (BTC), Ethereum (ETH), Solana (SOL)
- **Interactive flip cards** - click to toggle between 24h and 7-day views
- **24-hour sparkline charts** on the front (intraday trends)
- **7-day sparkline charts** on the back (weekly trends)
- Price changes and percentages for both timeframes
- Beautiful cards with crypto logos and smooth 3D animations
- Auto-refresh every minute
- **Powered by CoinGecko API** (no API key required!)

### 📉 Economic Indicators
- **Real economic data** from the Federal Reserve (FRED API)
- **Inflation (CPI)**: Consumer Price Index with year-over-year percentage
- **Unemployment Rate**: Current U.S. unemployment statistics  
- **Federal Funds Rate**: Fed's target interest rate
- **24-month historical charts** for trend analysis
- **Free forever** - Requires FRED API key (2-minute signup)

### 🎯 Fed Rate Probabilities
- **Market-implied probabilities** from CME FedWatch Tool
- Based on 30-Day Fed Funds futures pricing
- Probability percentages for December FOMC meeting outcomes
- Shows target rate ranges with color-coded probability bars
- Industry-standard tool used by Wall Street professionals
- **Auto-refresh every 15 minutes**
- **Note**: Currently displays demo data (real data requires market data subscription)

### 🧮 Technical Indicators Widget
- Search any stock symbol (default: AAPL)
- **15-minute intraday intervals** for real-time analysis
- Comprehensive technical analysis including:
  - Simple Moving Averages (SMA 20 & 50)
  - Exponential Moving Averages (EMA 12 & 26)
  - Relative Strength Index (RSI 14)
  - MACD (Moving Average Convergence Divergence)
  - Bollinger Bands
- Interactive price charts with overlays
- Separate indicator visualization charts

### 🤖 AI Stock Assistant
- **Interactive AI-powered chat** to explain stocks and answer your questions
- Ask about valuations, metrics (P/E ratio, EPS, Market Cap), and trends
- Context-aware responses based on current stock data
- Suggested questions to get started quickly
- Educational insights without specific investment advice
- **Powered by OpenAI GPT-4o-mini**
- Accessible from any stock detail modal

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **Charts**: Recharts
- **Data Sources**: Twelve Data API (stocks), CoinGecko API (crypto), FRED API (economic data), CME FedWatch (rate probabilities)
- **AI**: OpenAI GPT-4o-mini (stock analysis & explanations)
- **Icons**: Lucide React

## Design System

### Colors
- Background: `#1E1E1E` (neutral dark grey)
- Card Background: `#2A2A2A`
- Primary Text: `#EDEDED` (soft white)
- Secondary Text: `#BEBEBE`
- Accent Color: `#4A90E2` (sharp blue)

### Typography
- Font Family: Inter
- Font Weights: 300–400 (light to normal)
- Section headers use slightly heavier weights

### UI Style
- Smooth rounded corners: `rounded-xl`
- Subtle shadows: `shadow-md`
- Clean spacing: `px-6 py-4`
- High contrast charts with thin lines
- Minimal UI with no borders except separators

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- **Twelve Data API key** ([Get one free here](https://twelvedata.com/)) - For stock market data
- **FRED API key** ([Get one free here](https://fred.stlouisfed.org/)) - For economic indicators
- **OpenAI API key** ([Get one here](https://platform.openai.com/api-keys)) - For AI Stock Assistant (optional but recommended)
- CoinGecko API key (optional - works without it!) ([Get one here](https://www.coingecko.com/en/api)) - For crypto

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd stonkscan
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
TWELVE_DATA_API_KEY=your_twelve_data_key_here
FRED_API_KEY=your_fred_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
# COINGECKO_API_KEY=your_api_key_here (optional)
```

Replace with your actual API keys:
- **TWELVE_DATA_API_KEY**: For stock market data (required)
- **FRED_API_KEY**: For economic indicators (required) - Get at https://fred.stlouisfed.org/
- **OPENAI_API_KEY**: For AI Stock Assistant (optional but recommended) - Get at https://platform.openai.com/api-keys
- **COINGECKO_API_KEY**: For crypto (optional - works without it!)

**Quick setup for Windows PowerShell:**
```powershell
echo "TWELVE_DATA_API_KEY=85cae53013c54d9d892031c93fc7e310" > .env.local
echo "FRED_API_KEY=your_fred_key_here" >> .env.local
echo "OPENAI_API_KEY=your_openai_key_here" >> .env.local
```

**For detailed AI setup instructions, see [AI_SETUP.md](AI_SETUP.md)**

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
stonkscan/
├── app/
│   ├── api/
│   │   ├── market-overview/      # Stock market indices API
│   │   ├── economic-indicators/  # Economic data API
│   │   ├── technical-indicators/ # Technical analysis API
│   │   ├── stock-search/         # Stock search API
│   │   ├── stock-details/        # Stock details API
│   │   ├── stock-ai/             # AI Stock Assistant API
│   │   └── cme-fedwatch/         # Fed rate probability API
│   ├── globals.css               # Global styles & theme
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main dashboard page
├── components/
│   ├── dashboard/
│   │   ├── MarketOverview.tsx    # Market indices component
│   │   ├── EconomicIndicators.tsx# Economic data component
│   │   ├── TechnicalIndicators.tsx# Technical analysis component
│   │   ├── StockSearch.tsx       # Stock search component
│   │   ├── StockDetailModal.tsx  # Stock details modal
│   │   ├── StockAI.tsx           # AI Stock Assistant component
│   │   └── RatePredictions.tsx   # CME FedWatch probabilities component
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── label.tsx
├── lib/
│   └── utils.ts                  # Utility functions
└── ...config files
```

## API Routes

### Cryptocurrency Prices
- **Endpoint**: `/api/crypto-prices`
- **Method**: GET
- **Returns**: Real-time cryptocurrency data including prices, 24h changes, sparklines, market cap, and volume
- **Cryptocurrencies**: Bitcoin (BTC), Ethereum (ETH), Solana (SOL)
- **Updates**: Every 1 minute
- **Source**: CoinGecko API (no authentication required)

### Market Overview
- **Endpoint**: `/api/market-overview`
- **Method**: GET
- **Returns**: Current data and hourly intraday history for SPY, QQQ, and DIA ETFs (tracking S&P 500, NASDAQ, Dow Jones)
- **Interval**: 1 hour (shows today's trading activity)
- **Updates**: Every 1 minute during market hours
- **Note**: Direct index data (SPX, NDX, DJI) requires Twelve Data paid plan

### Economic Indicators
- **Endpoint**: `/api/economic-indicators-fred`
- **Method**: GET
- **Returns**: Real-time economic data including CPI (inflation), unemployment rate, and federal funds rate
- **Historical Data**: Last 24 months for each indicator
- **Source**: FRED API (Federal Reserve Economic Data)
- **Updates**: Monthly (CPI, unemployment) or after FOMC meetings (Fed Funds)

### Technical Indicators
- **Endpoint**: `/api/technical-indicators?symbol={TICKER}`
- **Method**: GET
- **Parameters**: `symbol` (stock ticker, e.g., AAPL)
- **Returns**: Current price, technical indicators, and 15-minute intraday historical data
- **Interval**: 15 minutes (60 periods = ~15 hours of trading)
- **Perfect for**: Day trading and real-time analysis

### Stock AI Assistant
- **Endpoint**: `/api/stock-ai`
- **Method**: POST
- **Body**: `{ message, stockData, conversationHistory }`
- **Returns**: AI-generated response explaining stock metrics, valuations, or answering questions
- **Model**: OpenAI GPT-4o-mini
- **Features**: Context-aware, educational, maintains conversation history

### Fed Rate Probabilities
- **Endpoint**: `/api/cme-fedwatch`
- **Method**: GET
- **Returns**: Implied probabilities for Fed rate decisions based on futures pricing
- **Source**: CME FedWatch Tool (demo data - real data requires subscription)
- **Updates**: Every 15 minutes
- **Note**: Professional market data subscription required for real-time data

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This project can be deployed on:
- **Vercel** (recommended for Next.js)
- **Netlify**
- Any Node.js hosting platform

Don't forget to set the `TWELVE_DATA_API_KEY` environment variable in your deployment platform.

### API Rate Limits

Twelve Data free tier includes:
- 8 API calls per minute
- 800 API calls per day

The dashboard is optimized to stay within these limits.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- Stock market data provided by [Twelve Data](https://twelvedata.com/)
- Economic data provided by [FRED](https://fred.stlouisfed.org/) (Federal Reserve Bank of St. Louis)
- Cryptocurrency data provided by [CoinGecko](https://www.coingecko.com/)
- Fed rate probabilities based on [CME FedWatch Tool](https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html)
- AI-powered analysis by [OpenAI](https://openai.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Charts powered by [Recharts](https://recharts.org/)

## API Key Setup

- See [TWELVE_DATA_SETUP.md](TWELVE_DATA_SETUP.md) for Twelve Data API setup
- See [FRED_SETUP.md](FRED_SETUP.md) for FRED API setup  
- See [AI_SETUP.md](AI_SETUP.md) for AI Stock Assistant setup
- See [CME_FEDWATCH_SETUP.md](CME_FEDWATCH_SETUP.md) for Fed rate probabilities setup

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with ❤️ using Next.js 14

